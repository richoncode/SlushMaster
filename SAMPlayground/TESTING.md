# Testing & Development Guide

## APIs & URLs
- **Backend API**: `http://localhost:8000`
- **Frontend App**: `http://localhost:5173`
- **Video Loading URL**: `http://localhost:8000/video/<filename>`
  - Example: `http://localhost:8000/video/usmnt-1min-2.mp4`

## Setup & Running
If the application is not loading, follow these steps to restart the services.

### 1. Start Backend
Run the FastAPI backend server from the project root.
```bash
# From project root
source backend/venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

### 2. Start Frontend
Run the Vite development server.
```bash
cd frontend
npm run dev
```

## Troubleshooting
- **Frontend won't load**: Ensure port 5173 is active.
- **Video load error**: Ensure backend is running on port 8000 and the file exists in `backend/uploads`.
