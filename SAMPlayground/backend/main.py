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
import backend.experiment_db as experiment_db
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

def apply_nms(boxes, iou_threshold=0.45):
    """
    Apply Non-Maximum Suppression to a list of player boxes.
    Each box is a dict with x1, y1, x2, y2, confidence.
    """
    if not boxes:
        return []
        
    # Pick top quality first
    boxes = sorted(boxes, key=lambda x: x['confidence'], reverse=True)
    keep = []
    
    while boxes:
        best = boxes.pop(0)
        keep.append(best)
        
        remaining = []
        for box in boxes:
            # Intersection
            ix1 = max(best['x1'], box['x1'])
            iy1 = max(best['y1'], box['y1'])
            ix2 = min(best['x2'], box['x2'])
            iy2 = min(best['y2'], box['y2'])
            
            iw = max(0, ix2 - ix1)
            ih = max(0, iy2 - iy1)
            inter = iw * ih
            
            # Union
            area1 = (best['x2'] - best['x1']) * (best['y2'] - best['y1'])
            area2 = (box['x2'] - box['x1']) * (box['y2'] - box['y1'])
            union = area1 + area2 - inter
            
            iou = inter / union if union > 0 else 0
            if iou < iou_threshold:
                remaining.append(box)
        boxes = remaining
        
    return keep

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
    return {"message": "Richard's Playground Backend is running"}

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
    
    # Hardcoded bounds provided by user
    top_corners = [
        {"x": 1198, "y": 875},
        {"x": 2745, "y": 878},
        {"x": 3350, "y": 1412},
        {"x": 638, "y": 1412}
    ]

    bottom_corners = [
        {"x": 1119, "y": 3037},
        {"x": 2677, "y": 3040},
        {"x": 3237, "y": 3575},
        {"x": 515, "y": 3568}
    ]
    
    return {
        "top_corners": top_corners,
        "bottom_corners": bottom_corners,
        "frame_width": width,
        "frame_height": height
    }


def calculate_los_aabb(p1, p2, p3, p4, t, margin=40):
    """
    Calculate AABB of the LOS polygon at position t, expanded by margin.
    Replicates frontend logic.
    Points are dicts {'x': val, 'y': val}.
    """
    import math

    def lerp(a, b, t):
        return {
            'x': a['x'] + (b['x'] - a['x']) * t,
            'y': a['y'] + (b['y'] - a['y']) * t
        }

    far_dist = math.sqrt((p2['x'] - p1['x'])**2 + (p2['y'] - p1['y'])**2)
    near_dist = math.sqrt((p3['x'] - p4['x'])**2 + (p3['y'] - p4['y'])**2)

    ratio = far_dist / near_dist if near_dist > 0 else 1.0
    w_near = 11
    w_far = 11 * ratio

    l_far = lerp(p1, p2, t)
    l_near = lerp(p4, p3, t)

    dx = l_near['x'] - l_far['x']
    dy = l_near['y'] - l_far['y']
    length = math.sqrt(dx*dx + dy*dy)
    
    if length == 0:
        return None
        
    ux = dx / length
    uy = dy / length

    nx = -uy
    ny = ux

    # calculate polygon corners
    poly = [
        {'x': l_far['x'] + nx * w_far / 2, 'y': l_far['y'] + ny * w_far / 2},
        {'x': l_far['x'] - nx * w_far / 2, 'y': l_far['y'] - ny * w_far / 2},
        {'x': l_near['x'] - nx * w_near / 2, 'y': l_near['y'] - ny * w_near / 2},
        {'x': l_near['x'] + nx * w_near / 2, 'y': l_near['y'] + ny * w_near / 2}
    ]

    xs = [p['x'] for p in poly]
    ys = [p['y'] for p in poly]

    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    return {
        'x1': min_x - margin,
        'y1': min_y - margin,
        'x2': max_x + margin,
        'y2': max_y + margin
    }

@app.post("/detect-players")
async def detect_players(request: dict):
    """Detect players using YOLOv8 with different modes"""
    filename = request.get('filename')
    top_corners = request.get('top_corners', []) 
    bottom_corners = request.get('bottom_corners', [])
    detection_mode = request.get('detection_mode', 'fop')  # 'full', 'fop', 'los', 'grid'
    los_position = request.get('los_position', 0.5)

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
    top_frame = frame[0:height//2, :].copy()
    bottom_frame = frame[height//2:, :].copy()
    
    def detect_in_region(img, corners, y_offset, view_name):
        # Determine detection region based on mode
        region_corners = corners # Default to fop
        
        if detection_mode == 'full':
            h, w = img.shape[:2]
            # Use full image bounds - these are already local to the img (which is a split frame)
            # So no y_offset adjustment needed for these generated local corners
            region_corners = [
                {'x': 0, 'y': 0},
                {'x': w, 'y': 0},
                {'x': w, 'y': h},
                {'x': 0, 'y': h}
            ]
        elif detection_mode == 'los':
             # corners are P1, P2, P3, P4
             if len(corners) == 4:
                 p1, p2, p3, p4 = corners[0], corners[1], corners[2], corners[3]
                 aabb = calculate_los_aabb(p1, p2, p3, p4, los_position)
                 
                 if aabb:
                     h, w = img.shape[:2]
                     # aabb is in GLOBAL coordinates (e.g. y=3000 for bottom view)
                     # We must convert to local coordinates relative to the split image
                     
                     x1 = max(0, int(aabb['x1']))
                     y1 = max(0, int(aabb['y1'] - y_offset))
                     x2 = min(w, int(aabb['x2']))
                     y2 = min(h, int(aabb['y2'] - y_offset))
                     
                     region_corners = [
                         {'x': x1, 'y': y1},
                         {'x': x2, 'y': y1},
                         {'x': x2, 'y': y2},
                         {'x': x1, 'y': y2}
                     ]
        
        # If using 'fop' or 'grid', region_corners are global corners passed in.
        # We need to adjust them to local frame coords if they haven't been processed above
        if detection_mode in ['fop', 'grid']:
             local_corners = []
             for c in region_corners:
                 local_corners.append({
                     'x': c['x'],
                     'y': c['y'] - y_offset
                 })
             region_corners = local_corners

        # Convert simple list to numpy for boundingRect
        points = np.array([[c["x"], c["y"]] for c in region_corners], dtype=np.int32)
        x, y, w, h = cv2.boundingRect(points)
        
        # Ensure valid crop within the image
        x = max(0, x)
        y = max(0, y)
        w = min(w, img.shape[1] - x)
        h = min(h, img.shape[0] - y)
        
        if w <= 0 or h <= 0:
            return [], {"view": view_name, "error": "Invalid region"}

        # Crop to bounding rect of region
        cropped = img[y:y+h, x:x+w]
        
        # Preprocess: Enhance contrast and sharpness for better small object detection
        # Convert to LAB color space for better contrast control
        try:
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
        except Exception:
            sharpened = cropped # Fallback if empty
        
        # Run YOLO with very low confidence threshold for distant small objects
        if detection_mode == 'grid' and len(region_corners) == 4:
            p1, p2, p3, p4 = region_corners[0], region_corners[1], region_corners[2], region_corners[3]
            num_bands = 10
            overlap = 0.2
            band_crops = []
            band_metadata = []
            
            for i in range(num_bands):
                t_start = max(0, (i / num_bands) - overlap/2)
                t_end = min(1, ((i + 1) / num_bands) + overlap/2)
                
                def lerp_p(a, b, t):
                    return {'x': a['x'] + (b['x'] - a['x']) * t, 'y': a['y'] + (b['y'] - a['y']) * t}
                
                b_corners = [lerp_p(p1, p2, t_start), lerp_p(p1, p2, t_end), lerp_p(p4, p3, t_end), lerp_p(p4, p3, t_start)]
                bx, by, bw, bh = cv2.boundingRect(np.array([[c['x'], c['y']] for c in b_corners], dtype=np.int32))
                bx, by = max(0, bx), max(0, by)
                bw, bh = min(bw, img.shape[1] - bx), min(bh, img.shape[0] - by)
                
                if bw > 0 and bh > 0:
                    crop = img[by:by+bh, bx:bx+bw]
                    try:
                        lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)
                        l, a, b = cv2.split(lab)
                        l = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8)).apply(l)
                        enhanced = cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)
                        sharpened_band = cv2.filter2D(enhanced, -1, np.array([[-1,-1,-1], [-1, 9,-1], [-1,-1,-1]]))
                        band_crops.append(sharpened_band)
                    except: band_crops.append(crop)
                    band_metadata.append({'x': bx, 'y': by})
            
            if band_crops:
                batch_results = get_yolo_model()(band_crops, conf=0.05, verbose=False)
                band_players = []
                for idx, result in enumerate(batch_results):
                    meta = band_metadata[idx]
                    for box in result.boxes:
                        if int(box.cls) == 0:
                            b_xyxy = box.xyxy[0].cpu().numpy()
                            band_players.append({
                                'x1': float(b_xyxy[0] + meta['x']),
                                'y1': float(b_xyxy[1] + meta['y'] + y_offset),
                                'x2': float(b_xyxy[2] + meta['x']),
                                'y2': float(b_xyxy[3] + meta['y'] + y_offset),
                                'confidence': float(box.conf[0].cpu().item())
                            })
                return apply_nms(band_players), {"view": view_name, "bands": len(band_crops)}
            return [], {"view": view_name, "error": "No valid bands"}

        # Original single-crop detection
        model = get_yolo_model()
        results = model(sharpened, conf=0.05, verbose=False)  # Lowered to 0.05
        
        players = []
        for result in results:
            for box in result.boxes:
                if int(box.cls) == 0:  # person
                    xyxy = box.xyxy[0].cpu().numpy()
                    players.append({
                        "x1": int(xyxy[0] + x),
                        "y1": int(xyxy[1] + y + y_offset),
                        "x2": int(xyxy[2] + x),
                        "y2": int(xyxy[3] + y + y_offset),
                        "confidence": float(box.conf[0])
                    })
        
        # Sort by x position (left to right)
        players.sort(key=lambda p: p["x1"])
        
        metadata = {
            "view": view_name,
            "crop_size": f"{w}x{h}",
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
            "detection_mode": detection_mode,
            "confidence_threshold": 0.05,
            "preprocessing": "CLAHE + Sharpening",
            "frame_size": f"{width}x{height}",
            "top_view": top_metadata,
            "bottom_view": bottom_metadata,
            "detected_separately": True,
            "frame_number": 0,
            "video_timestamp": 0.0
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

# ===== EXPERIMENT MANAGEMENT ENDPOINTS =====

@app.post("/experiments")
async def create_experiment(request: dict):
    """Create a new experiment"""
    name = request.get('name', 'unnamed experiment')
    experiment_id = experiment_db.create_experiment(name)
    experiment = experiment_db.get_experiment(experiment_id)
    return experiment

@app.get("/experiments")
async def list_experiments():
    """List all experiments"""
    experiments = experiment_db.get_all_experiments()
    return {"experiments": experiments}

@app.get("/experiments/{experiment_id}")
async def get_experiment(experiment_id: int):
    """Get experiment details with full timeline"""
    experiment = experiment_db.get_experiment(experiment_id)
    if not experiment:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return experiment

@app.put("/experiments/{experiment_id}/name")
async def update_experiment_name(experiment_id: int, request: dict):
    """Update experiment name"""
    name = request.get('name')
    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    
    success = experiment_db.update_experiment_name(experiment_id, name)
    if not success:
        raise HTTPException(status_code=404, detail="Experiment not found")
    
    return {"success": True, "experiment_id": experiment_id, "name": name}

@app.delete("/experiments/{experiment_id}")
async def delete_experiment(experiment_id: int):
    """Delete an experiment"""
    success = experiment_db.delete_experiment(experiment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return {"success": True}

@app.post("/experiments/{experiment_id}/timeline")
async def add_timeline_entry(experiment_id: int, request: dict):
    """Add a timeline entry to an experiment"""
    step_type = request.get('step_type')
    data = request.get('data', {})
    replace = request.get('replace', False)
    
    if not step_type:
        raise HTTPException(status_code=400, detail="step_type is required")
    
    entry_id = experiment_db.add_timeline_entry(experiment_id, step_type, data, replace_existing=replace)
    return {"success": True, "entry_id": entry_id}

@app.post("/experiments/{experiment_id}/video")
async def add_experiment_video(experiment_id: int, request: dict):
    """Add a video reference to an experiment"""
    video_url = request.get('video_url')
    video_type = request.get('video_type', 'uploaded')
    
    if not video_url:
        raise HTTPException(status_code=400, detail="video_url is required")
    
    video_id = experiment_db.add_video(experiment_id, video_url, video_type)
    return {"success": True, "video_id": video_id}

