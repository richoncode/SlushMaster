from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import shutil
import os
from pathlib import Path
import cv2
import torch
import numpy as np
from ultralytics import YOLO
from pydantic import BaseModel
# Try importing SAM 2, handle if not installed yet (during dev)
try:
    from sam2.build_sam import build_sam2_video_predictor, build_sam2
    from sam2.sam2_image_predictor import SAM2ImagePredictor
    from sam2.automatic_mask_generator import SAM2AutomaticMaskGenerator
except ImportError:
    print("SAM 2 not installed yet")
    build_sam2_video_predictor = None
    build_sam2 = None
    SAM2ImagePredictor = None

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("backend/uploads")
PROCESSED_DIR = Path("backend/processed")
UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

# Load models (lazy loading recommended but for simplicity here)
device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Using device: {device}")

# YOLO model - lazy loaded
yolo_model = None

def get_yolo_model():
    global yolo_model
    if yolo_model is None:
        print("Loading YOLO model...")
        yolo_model = YOLO("yolov8m.pt")
    return yolo_model

# SAM 2 models
sam2_checkpoint = "sam2_hiera_large.pt"
model_cfg = "sam2_hiera_l.yaml"  # Use model_cfg consistently
predictor = None
image_predictor = None  # For single frame segmentation

# Logging storage
processing_logs = {} # filename -> list of log strings

# Progress tracking for full video segmentation
segmentation_progress = {}  # filename -> {status, current_frame, total_frames, message, error}

def log_event(filename: str, message: str):
    if filename not in processing_logs:
        processing_logs[filename] = []
    processing_logs[filename].append(message)
    print(f"[{filename}] {message}")

def init_sam2():
    '''Initialize SAM 2 models'''
    global predictor, image_predictor
    if predictor is None:
        if build_sam2_video_predictor is None or build_sam2 is None or SAM2ImagePredictor is None:
            print("SAM 2 modules not imported, skipping initialization.")
            return

        try:
            # Video predictor for potential future use
            predictor = build_sam2_video_predictor(model_cfg, sam2_checkpoint, device=device)
            print("SAM 2 video predictor initialized")
            
            # Image predictor for single-frame segmentation
            sam2_model = build_sam2(model_cfg, sam2_checkpoint, device=device)
            image_predictor = SAM2ImagePredictor(sam2_model)
            print("SAM 2 image predictor initialized")
        except Exception as e:
            print(f"Failed to initialize SAM 2: {e}")

@app.get("/")
async def root():
    return {"message": "SAMPlayground Backend is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    try:
        file_path = UPLOAD_DIR / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"filename": file.filename, "url": f"http://localhost:8000/video/{file.filename}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/video/{filename}")
async def get_video(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        # Check processed
        file_path = PROCESSED_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(file_path)

def process_video_task(filename: str):
    init_sam2()
    if not predictor:
        log_event(filename, "SAM 2 not ready/installed")
        return

    video_path = UPLOAD_DIR / filename
    output_path = PROCESSED_DIR / f"processed_{filename}"
    
    log_event(filename, f"Processing video: {video_path}")
    
    # 1. Extract frames
    frames_dir = Path("temp_frames") / filename.split('.')[0]
    if frames_dir.exists():
        shutil.rmtree(frames_dir, ignore_errors=True)
    frames_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    frame_names = []
    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_name = f"{frame_idx:05d}.jpg"
        cv2.imwrite(str(frames_dir / frame_name), frame)
        frame_names.append(frame_name)
        frame_idx += 1
    cap.release()
    
    cap.release()
    
    log_event(filename, f"Extracted {len(frame_names)} frames")

    # 2. Detect people on the first frame (or periodic)
    # For simplicity, detect on frame 0 and propagate
    first_frame_path = frames_dir / frame_names[0]
    model = get_yolo_model()
    results = model(first_frame_path)
    
    bboxes = []
    for result in results:
        for box in result.boxes:
            if int(box.cls) == 0: # 0 is person in COCO
                # xyxy
                bboxes.append(box.xyxy[0].cpu().numpy())
    
    log_event(filename, f"Detected {len(bboxes)} people on first frame using YOLO")

    if not bboxes:
        log_event(filename, "No people detected, copying original video")
        # Just copy original
        shutil.copy(video_path, output_path)
        return

    # 3. Initialize SAM 2 state
    inference_state = predictor.init_state(video_path=str(frames_dir))
    predictor.reset_state(inference_state)

    # 4. Add prompts (boxes)
    for i, box in enumerate(bboxes):
        predictor.add_new_points_or_box(
            inference_state=inference_state,
            frame_idx=0,
            obj_id=i+1,
            box=box
        )

    # 5. Propagate and visualize
    # Create video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    video_segments = {} # frame_idx -> {obj_id -> mask}
    
    for out_frame_idx, out_obj_ids, out_mask_logits in predictor.propagate_in_video(inference_state):
        if out_frame_idx % 10 == 0:
            log_event(filename, f"Propagating masks for frame {out_frame_idx}")
        video_segments[out_frame_idx] = {
            out_obj_id: (out_mask_logits[i] > 0.0).cpu().numpy()
            for i, out_obj_id in enumerate(out_obj_ids)
        }

    # Render
    for i, frame_name in enumerate(frame_names):
        frame = cv2.imread(str(frames_dir / frame_name))
        if i in video_segments:
            for obj_id, mask in video_segments[i].items():
                # mask is (1, H, W)
                mask = mask[0]
                # Paint green
                # Create green overlay
                green_overlay = np.zeros_like(frame)
                green_overlay[:, :] = [0, 255, 0] # BGR
                
                # Apply mask
                # alpha blend
                alpha = 0.5
                mask_indices = mask > 0
                frame[mask_indices] = cv2.addWeighted(frame[mask_indices], 1-alpha, green_overlay[mask_indices], alpha, 0)
        
        out.write(frame)

    out.release()
    out.release()
    # Cleanup frames
    if frames_dir.exists():
        shutil.rmtree(frames_dir, ignore_errors=True)
    log_event(filename, f"Processed video saved to {output_path}")

@app.post("/process-video")
async def process_video(filename: str, background_tasks: BackgroundTasks):
    # Check if file exists
    if not (UPLOAD_DIR / filename).exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Delete existing processed file if it exists to force reprocessing
    output_path = PROCESSED_DIR / f"processed_{filename}"
    if output_path.exists():
        os.remove(output_path)
    
    # Clear logs
    processing_logs[filename] = []
    log_event(filename, "Starting processing task")
    
    background_tasks.add_task(process_video_task, filename)
    return {"status": "processing", "message": "Video processing started", "output_filename": f"processed_{filename}"}

@app.get("/logs/{filename}")
async def get_logs(filename: str):
    if filename in processing_logs:
        return {"logs": processing_logs[filename]}
    return {"logs": []}

@app.delete("/cache/{filename}")
async def delete_cache(filename: str):
    output_path = PROCESSED_DIR / f"processed_{filename}"
    if output_path.exists():
        os.remove(output_path)
        return {"status": "deleted"}
    return {"status": "not_found"}

@app.get("/status/{filename}")
async def get_status(filename: str):
    output_path = PROCESSED_DIR / filename
    if output_path.exists():
        return {"status": "completed", "url": f"http://localhost:8000/video/{filename}"}
    return {"status": "processing"}

@app.post("/detect-field-corners")
def detect_field_corners(filename: str):
    """Detect 4 corners of soccer field for both top and bottom stereo views"""
    video_path = UPLOAD_DIR / filename
    
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Extract first frame
    cap = cv2.VideoCapture(str(video_path))
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        raise HTTPException(status_code=500, detail="Failed to read video")
    
    height, width = frame.shape[:2]
    
    # Split into top and bottom halves (stereo)
    top_frame = frame[0:height//2, :]
    bottom_frame = frame[height//2:, :]
    
    def detect_field_bounds(img, y_offset=0):
        """Detect field corners using green color threshold"""
        # Convert to HSV for green detection
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        
        # Green field range (adjust as needed)
        lower_green = np.array([35, 40, 40])
        upper_green = np.array([85, 255, 255])
        
        mask = cv2.inRange(hsv, lower_green, upper_green)
        
        # Find contours
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            # Default to full frame
            h, w = img.shape[:2]
            return [
                {"x": int(w * 0.1), "y": int(h * 0.1 + y_offset)},
                {"x": int(w * 0.9), "y": int(h * 0.1 + y_offset)},
                {"x": int(w * 0.9), "y": int(h * 0.9 + y_offset)},
                {"x": int(w * 0.1), "y": int(h * 0.9 + y_offset)}
            ]
        
        # Get largest contour (assumed to be field)
        largest = max(contours, key=cv2.contourArea)
        
        # Get bounding rect and approximate corners
        x, y, w, h = cv2.boundingRect(largest)
        
        return [
            {"x": x, "y": y + y_offset},
            {"x": x + w, "y": y + y_offset},
            {"x": x + w, "y": y + h + y_offset},
            {"x": x, "y": y + h + y_offset}
        ]
    
    top_corners = detect_field_bounds(top_frame, 0)
    bottom_corners = detect_field_bounds(bottom_frame, height//2)
    
    return {
        "top_corners": top_corners,
        "bottom_corners": bottom_corners,
        "frame_width": width,
        "frame_height": height
    }

@app.post("/detect-players")
def detect_players(request: dict):
    """Detect players within field bounds for both views"""
    filename = request.get('filename')
    top_corners = request.get('top_corners')
    bottom_corners = request.get('bottom_corners')
    
    video_path = UPLOAD_DIR / filename
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Extract first frame
    cap = cv2.VideoCapture(str(video_path))
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        raise HTTPException(status_code=500, detail="Failed to read video")
    
    height, width = frame.shape[:2]
    
    # Split into top and bottom
    top_frame = frame[0:height//2, :]
    bottom_frame = frame[height//2:, :]
    
    def detect_in_region(img, corners, y_offset=0, view_name=""):
        """Run YOLO on cropped region with preprocessing"""
        # Get bounding box from corners
        xs = [c["x"] for c in corners]
        ys = [c["y"] - y_offset for c in corners]
        x1, x2 = min(xs), max(xs)
        y1, y2 = min(ys), max(ys)
        
        # Crop
        cropped = img[max(0, y1):min(img.shape[0], y2), max(0, x1):min(img.shape[1], x2)]
        crop_height, crop_width = cropped.shape[:2]
        
        # Preprocess: Enhance contrast and sharpness for better small object detection
        # Convert to LAB color space for better contrast control
        lab = cv2.cvtColor(cropped, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        
        # Merge and convert back
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # Sharpen the image
        kernel = np.array([[-1,-1,-1],
                          [-1, 9,-1],
                          [-1,-1,-1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)
        
        # Run YOLO with very low confidence threshold for distant small objects
        model = get_yolo_model()
        results = model(sharpened, conf=0.05, verbose=False)  # Lowered to 0.05
        
        players = []
        for result in results:
            for box in result.boxes:
                if int(box.cls) == 0:  # person
                    xyxy = box.xyxy[0].cpu().numpy()
                    players.append({
                        "x1": int(xyxy[0] + x1),
                        "y1": int(xyxy[1] + y1 + y_offset),
                        "x2": int(xyxy[2] + x1),
                        "y2": int(xyxy[3] + y1 + y_offset),
                        "confidence": float(box.conf[0])
                    })
        
        # Sort by x position (left to right)
        players.sort(key=lambda p: p["x1"])
        
        metadata = {
            "view": view_name,
            "crop_size": f"{crop_width}x{crop_height}",
            "detections": len(players)
        }
        
        return players, metadata
    
    top_players, top_metadata = detect_in_region(top_frame, top_corners, 0, "Left (Top)")
    bottom_players, bottom_metadata = detect_in_region(bottom_frame, bottom_corners, height//2, "Right (Bottom)")
    
    # Calculate similarity (simple count comparison)
    similarity = 1.0 - abs(len(top_players) - len(bottom_players)) / max(len(top_players), len(bottom_players), 1)
    
    return {
        "top_players": top_players,
        "bottom_players": bottom_players,
        "similarity": similarity,
        "metadata": {
            "model": "yolov8m",
            "confidence_threshold": 0.05,
            "preprocessing": "CLAHE + Sharpening",
            "frame_size": f"{width}x{height}",
            "top_view": top_metadata,
            "bottom_view": bottom_metadata,
            "detected_separately": True
        }
    }

@app.post("/segment-first-frame")
def segment_first_frame(request: dict):
    """Segment players on first frame using SAM 2"""
    filename = request.get('filename')
    top_players = request.get('top_players')
    bottom_players = request.get('bottom_players')
    
    init_sam2()
    if not predictor:
        raise HTTPException(status_code=500, detail="SAM 2 not initialized")
    
    video_path = UPLOAD_DIR / filename
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Extract first frame
    cap = cv2.VideoCapture(str(video_path))
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        raise HTTPException(status_code=500, detail="Failed to read video")
    
    # Save frame temporarily
    temp_frame_path = PROCESSED_DIR / "temp_first_frame.jpg"
    cv2.imwrite(str(temp_frame_path), frame)
    
    # Process top and bottom separately
    height, width = frame.shape[:2]
    top_frame = frame[0:height//2, :].copy()
    bottom_frame = frame[height//2:, :].copy()
    
    def segment_view(img, players, color, y_offset=0):
        """Segment players in one view using SAM 2 image predictor"""
        if not players:
            print("No players to segment")
            return img
        
        print(f"Segmenting {len(players)} players with y_offset={y_offset}...")
        result_img = img.copy()
        
        # Set the image for SAM 2
        image_predictor.set_image(result_img)
        
        for idx, player in enumerate(players):
            # Get bounding box - adjust y-coordinates for offset
            x1, y1, x2, y2 = player['x1'], player['y1'] - y_offset, player['x2'], player['y2'] - y_offset
            
            print(f"  Player {idx + 1}: bbox ({x1}, {y1}, {x2}, {y2})")
            
            # Validate bbox
            if x2 <= x1 or y2 <= y1 or x1 < 0 or y1 < 0 or x2 > img.shape[1] or y2 > img.shape[0]:
                print(f"    ⚠️  Invalid or out-of-bounds bbox, skipping")
                continue
                
            # Use SAM 2 with bbox prompt
            print(f"    Running SAM 2...")
            try:
                masks, scores, _ = image_predictor.predict(
                    box=np.array([x1, y1, x2, y2]),
                    multimask_output=False
                )
                
                if masks is None or len(masks) == 0:
                    print(f"    ⚠️  No masks generated")
                    continue
                    
                # Convert mask to boolean (SAM 2 returns float/int masks)
                mask = masks[0].astype(bool)
                print(f"    ✓ Mask generated (shape={mask.shape}, score={scores[0]:.3f}, type={mask.dtype})")
                
                # Create colored overlay
                overlay = np.zeros_like(result_img)
                overlay[mask] = color
                
                # Blend - safe indexing
                try:
                    if mask.any():
                        result_img[mask] = cv2.addWeighted(result_img[mask], 0.4, overlay[mask], 0.6, 0)
                        print(f"    ✓ Orange overlay applied")
                    else:
                        print(f"    ⚠️  Empty mask")
                except Exception as blend_error:
                    print(f"    ❌ Blend error: {str(blend_error)}")
                    
            except Exception as e:
                print(f"    ❌ SAM 2 error: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        return result_img
    
    # Bright orange color for all players
    orange_color = [0, 165, 255]  # BGR format: bright orange
    
    # Segment both views
    print(f"Segmenting top view with {len(top_players)} players...")
    top_result = segment_view(top_frame, top_players, orange_color, y_offset=0)
    
    print(f"Segmenting bottom view with {len(bottom_players)} players...")
    bottom_result = segment_view(bottom_frame, bottom_players, orange_color, y_offset=height//2)
    
    # Combine
    result_frame = np.vstack([top_result, bottom_result])
    
    # Save result
    result_path = PROCESSED_DIR / f"segmented_{filename.replace('.mp4', '.jpg')}"
    cv2.imwrite(str(result_path), result_frame)
    
    return {
        "result_url": f"http://localhost:8000/video/{result_path.name}",
        "top_player_count": len(top_players),
        "bottom_player_count": len(bottom_players)
    }

def segment_full_video_task(filename: str, top_players: list, bottom_players: list):
    """Background task to segment all frames of a video using SAM 2 Video Propagation"""
    global segmentation_progress
    
    try:
        init_sam2()
        if not predictor:
            segmentation_progress[filename] = {
                "status": "error",
                "message": "SAM 2 Video Predictor not initialized",
                "current_frame": 0,
                "total_frames": 0
            }
            return
        
        video_path = UPLOAD_DIR / filename
        output_filename = f"segmented_full_{filename}"
        output_path = PROCESSED_DIR / output_filename
        
        # 1. Extract frames
        frames_dir = Path("temp_frames") / filename.split('.')[0]
        top_dir = frames_dir / "top"
        bottom_dir = frames_dir / "bottom"
        
        if frames_dir.exists():
            shutil.rmtree(frames_dir, ignore_errors=True)
        top_dir.mkdir(parents=True, exist_ok=True)
        bottom_dir.mkdir(parents=True, exist_ok=True)
        
        cap = cv2.VideoCapture(str(video_path))
        fps = cap.get(cv2.CAP_PROP_FPS)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        
        segmentation_progress[filename] = {
            "status": "processing",
            "message": f"Extracting {total_frames} frames...",
            "current_frame": 0,
            "total_frames": total_frames,
            "percent": 0
        }
        
        frame_idx = 0
        frame_names = []
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_name = f"{frame_idx:05d}.jpg"
            frame_names.append(frame_name)
            
            # Split and save
            top_frame = frame[0:height//2, :]
            bottom_frame = frame[height//2:, :]
            
            cv2.imwrite(str(top_dir / frame_name), top_frame)
            cv2.imwrite(str(bottom_dir / frame_name), bottom_frame)
            
            frame_idx += 1
            if frame_idx % 50 == 0:
                percent = int((frame_idx / total_frames) * 10) # Extraction is 10% of work
                segmentation_progress[filename]["percent"] = percent
                segmentation_progress[filename]["current_frame"] = frame_idx
        
        cap.release()
        
        # Helper to run propagation
        def run_view_propagation(view_dir, players, view_name, y_offset=0):
            if not players:
                return {}
            
            segmentation_progress[filename]["message"] = f"Initializing SAM 2 for {view_name} view..."
            
            # Init state
            inference_state = predictor.init_state(video_path=str(view_dir))
            predictor.reset_state(inference_state)
            
            # Add prompts to frame 0
            for i, player in enumerate(players):
                # Adjust y for bottom view if needed (though we cropped, so y is relative to crop)
                # If players come from detection on full frame, we need to adjust
                # If players come from detection on split frame (which they do in detect_players),
                # top players are relative to top frame.
                # bottom players are relative to full frame (y + height//2).
                # Since we cropped bottom_frame, we need to subtract offset for bottom players.
                
                x1, y1, x2, y2 = player['x1'], player['y1'] - y_offset, player['x2'], player['y2'] - y_offset
                
                predictor.add_new_points_or_box(
                    inference_state=inference_state,
                    frame_idx=0,
                    obj_id=i+1,
                    box=np.array([x1, y1, x2, y2])
                )
            
            # Propagate
            masks_per_frame = {}
            for out_frame_idx, out_obj_ids, out_mask_logits in predictor.propagate_in_video(inference_state):
                masks_per_frame[out_frame_idx] = {
                    out_obj_id: (out_mask_logits[i] > 0.0).cpu().numpy()
                    for i, out_obj_id in enumerate(out_obj_ids)
                }
                
                # Update progress (propagation is 40% of work per view)
                # Base percent: 10% (extraction)
                # Top view: 10-50%
                # Bottom view: 50-90%
                base_pct = 10 if view_name == "Top" else 50
                curr_pct = base_pct + int((out_frame_idx / total_frames) * 40)
                
                segmentation_progress[filename].update({
                    "message": f"Tracking {view_name} view: Frame {out_frame_idx}/{total_frames}",
                    "current_frame": out_frame_idx,
                    "percent": curr_pct
                })
                
            return masks_per_frame

        # Run Top View
        top_masks = run_view_propagation(top_dir, top_players, "Top", y_offset=0)
        
        # Run Bottom View
        bottom_masks = run_view_propagation(bottom_dir, bottom_players, "Bottom", y_offset=height//2)
        
        # Render Video
        segmentation_progress[filename]["message"] = "Rendering final video..."
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))
        orange_color = [0, 165, 255]
        
        for i, frame_name in enumerate(frame_names):
            # Read original split frames
            t_frame = cv2.imread(str(top_dir / frame_name))
            b_frame = cv2.imread(str(bottom_dir / frame_name))
            
            # Apply Top Masks
            if i in top_masks:
                for obj_id, mask in top_masks[i].items():
                    mask = mask[0] # (1, H, W) -> (H, W)
                    overlay = np.zeros_like(t_frame)
                    overlay[mask] = orange_color
                    if mask.any():
                        t_frame[mask] = cv2.addWeighted(t_frame[mask], 0.4, overlay[mask], 0.6, 0)
            
            # Apply Bottom Masks
            if i in bottom_masks:
                for obj_id, mask in bottom_masks[i].items():
                    mask = mask[0]
                    overlay = np.zeros_like(b_frame)
                    overlay[mask] = orange_color
                    if mask.any():
                        b_frame[mask] = cv2.addWeighted(b_frame[mask], 0.4, overlay[mask], 0.6, 0)
            
            # Combine
            final_frame = np.vstack([t_frame, b_frame])
            out.write(final_frame)
            
            # Update progress (Rendering is last 10%)
            pct = 90 + int((i / total_frames) * 10)
            segmentation_progress[filename].update({
                "message": f"Rendering video: Frame {i}/{total_frames}",
                "current_frame": i,
                "percent": pct
            })
            
        out.release()
        
        # Cleanup
        if frames_dir.exists():
            shutil.rmtree(frames_dir, ignore_errors=True)
            
        # Complete
        segmentation_progress[filename] = {
            "status": "completed",
            "message": f"Segmentation complete! Processed {total_frames} frames.",
            "current_frame": total_frames,
            "total_frames": total_frames,
            "percent": 100,
            "result_url": f"http://localhost:8000/video/{output_filename}"
        }
        
    except Exception as e:
        print(f"Error in full video segmentation: {e}")
        import traceback
        traceback.print_exc()
        segmentation_progress[filename] = {
            "status": "error",
            "message": f"Error: {str(e)}",
            "current_frame": 0,
            "total_frames": 0,
            "error": str(e)
        }

# Force reload comment

@app.post("/segment-full-video")
async def segment_full_video(request: dict, background_tasks: BackgroundTasks):
    """Start full video segmentation in background"""
    filename = request.get('filename')
    top_players = request.get('top_players', [])
    bottom_players = request.get('bottom_players', [])
    
    video_path = UPLOAD_DIR / filename
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Initialize progress
    segmentation_progress[filename] = {
        "status": "starting",
        "message": "Initializing full video segmentation...",
        "current_frame": 0,
        "total_frames": 0,
        "percent": 0
    }
    
    # Start background task
    background_tasks.add_task(segment_full_video_task, filename, top_players, bottom_players)
    
    return {
        "status": "processing",
        "message": "Full video segmentation started",
        "output_filename": f"segmented_full_{filename}"
    }

@app.get("/segment-progress/{filename}")
async def get_segment_progress(filename: str):
    """Get progress of full video segmentation"""
    if filename in segmentation_progress:
        return segmentation_progress[filename]
    return {
        "status": "not_found",
        "message": "No segmentation in progress for this video",
        "current_frame": 0,
        "total_frames": 0,
        "percent": 0
    }
