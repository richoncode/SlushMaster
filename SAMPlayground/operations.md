# SAM Playground Operations Manual

This document outlines the architecture, configuration, and operational procedures for the SAM Playground application. It is designed to be machine-readable by LLMs to facilitate automated operations.

## 0. Initial Setup & Installation

Follow these steps to set up the environment from scratch.

### Prerequisites
-   **OS**: macOS (tested), Linux, or Windows.
-   **Python**: Version 3.10 or higher.
-   **Node.js**: Version 18 or higher.
-   **FFmpeg**: Required for video processing.
    -   macOS: `brew install ffmpeg`
    -   Ubuntu: `sudo apt install ffmpeg`

### Step 1: Backend Setup

1.  **Navigate to the project root**:
    ```bash
    cd /path/to/SAMPlayground
    ```

2.  **Create a Python Virtual Environment**:
    It is critical to use a virtual environment to manage dependencies.
    ```bash
    python3 -m venv venv
    ```

3.  **Activate the Virtual Environment**:
    -   **macOS/Linux**:
        ```bash
        source venv/bin/activate
        ```
    -   **Windows**:
        ```bash
        .\venv\Scripts\activate
        ```

4.  **Install Python Dependencies**:
    ```bash
    pip install --upgrade pip
    pip install -r requirements.txt
    ```
    *If `requirements.txt` is missing or fails, install the core packages manually:*
    ```bash
    pip install fastapi uvicorn[standard] opencv-python ultralytics torch python-multipart requests
    ```

5.  **Verify Installation**:
    Check that the key modules are available:
    ```bash
    python -c "import fastapi, cv2, ultralytics, torch; print('Backend dependencies ready')"
    ```

### Step 2: Frontend Setup

1.  **Navigate to the frontend directory**:
    ```bash
    cd frontend
    ```

2.  **Install Node Modules**:
    ```bash
    npm install
    ```

---

## 1. Backend Server

### Specifications
-   **Type**: Python FastAPI
-   **Port**: 8000
-   **Host**: 0.0.0.0
-   **Root Directory**: `SAMPlayground` (Project Root)
-   **Entry Point**: `backend.main:app`

### Operational Procedures

#### Startup
1.  Ensure virtual environment is activated (`source venv/bin/activate`).
2.  Start the server:
    ```bash
    uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
    ```
    *Flag `--reload` is useful for development.*

#### Shutdown
-   Press `Ctrl+C` in the terminal running the server.
-   **Force Kill** (if needed):
    ```bash
    lsof -ti:8000 | xargs kill -9
    ```

#### Health Check
-   **Command**: `curl -s http://localhost:8000/health`
-   **Expected Output**: `{"status": "healthy"}`

## 2. Frontend Server

### Specifications
-   **Type**: Vite Development Server
-   **Port**: 5173
-   **Root Directory**: `SAMPlayground/frontend`

### Operational Procedures

#### Startup
1.  Navigate to `frontend` directory.
2.  Start the server:
    ```bash
    npm run dev
    ```

#### Shutdown
-   Press `Ctrl+C` in the terminal running the server.

#### Health Check
-   **Command**: `curl -I http://localhost:5173`
-   **Expected Output**: HTTP 200 OK

## 3. Common Operational Tasks

### Resetting System State
To clear all processed videos and uploaded files (warning: destructive):
```bash
# From project root
rm -rf backend/processed/*
rm -rf backend/uploads/*
# Note: You may want to keep specific test videos in uploads/
```

### Model Management
-   **YOLO**: The `yolov8m.pt` model is automatically downloaded to the root directory on first use.
-   **SAM 2**: If using Segment Anything 2, ensure the model weights (`.pt`) and config (`.yaml`) are present in the root directory.

### Troubleshooting
-   **Backend fails to start**: Check for missing dependencies. Run `pip install -r requirements.txt`.
-   **Frontend connection refused**: Ensure you are running `npm run dev` inside the `frontend` folder.
-   **Video not loading**: Verify `ffmpeg` is installed and the backend server is running on port 8000.

---
*Document updated on 2025-11-24.*
