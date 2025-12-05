import React, { useState, useRef } from 'react'
import './VideoUploader.css'

function VideoUploader({ onUploadComplete }) {
    const [isDragging, setIsDragging] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = () => {
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const files = e.dataTransfer.files
        if (files.length > 0) {
            handleFileUpload(files[0])
        }
    }

    const handleFileSelect = (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0])
        }
    }

    const handleFileUpload = async (file) => {
        if (!file.type.startsWith('video/')) {
            alert('Please upload a video file')
            return
        }

        setUploading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('http://localhost:8000/upload', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) throw new Error('Upload failed')

            const data = await response.json()
            onUploadComplete(data.url)
        } catch (error) {
            console.error('Error uploading video:', error)
            alert('Failed to upload video')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div
            className={`video-uploader compact ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            title="Click or Drag & Drop Video"
        >
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="video/*"
                style={{ display: 'none' }}
            />

            {uploading ? (
                <div className="upload-status-compact">
                    <div className="spinner-small"></div>
                </div>
            ) : (
                <div className="upload-content-compact">
                    <span className="upload-icon">📤</span>
                    <span className="upload-text">Upload Video</span>
                </div>
            )}
        </div>
    )
}

export default VideoUploader
