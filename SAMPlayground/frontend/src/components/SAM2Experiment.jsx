import React, { useState, useRef, useEffect } from 'react'
import VideoUploader from './VideoUploader'
import ErrorBoundary from './ErrorBoundary'
import SequentialResults from './SequentialResults'
import './SAM2Experiment.css'

function SAM2Experiment({ experimentId }) {
    const [experiment, setExperiment] = useState(null)
    const [experimentName, setExperimentName] = useState('unnamed experiment')
    const [editingName, setEditingName] = useState(false)
    const [videoUrl, setVideoUrl] = useState(null)
    // Removed currentStep - using timeline as source of truth
    const [frameData, setFrameData] = useState(null)
    const [bounds, setBounds] = useState({ top: [], bottom: [] })
    const [players, setPlayers] = useState({ top: [], bottom: [], similarity: 0 })
    const [segmentResult, setSegmentResult] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('')
    const [fullVideoMessage, setFullVideoMessage] = useState('')
    const [fullVideoProgress, setFullVideoProgress] = useState(null) // {percent, message, status}
    const [fullVideoResult, setFullVideoResult] = useState(null) // Result URL when complete
    const [errorLog, setErrorLog] = useState([]) // Track all errors
    const [draggingBound, setDraggingBound] = useState(null)
    const [hoveredBound, setHoveredBound] = useState(null)
    const canvasRef = useRef(null)
    const videoRef = useRef(null)

    // Helper: Get latest timeline entry of a given type
    const getLatestTimelineEntry = (stepType) => {
        if (!experiment || !experiment.timeline) return null
        return experiment.timeline.slice().reverse().find(entry => entry.step_type === stepType)
    }

    // Helper: Check if a step has been completed
    const hasCompletedStep = (stepType) => {
        return getLatestTimelineEntry(stepType) !== null
    }

    // Helper: Determine what UI to show based on timeline
    const shouldShowBoundsAdjustment = () => videoUrl && (frameData || (bounds.top && bounds.top.length > 0))
    const shouldShowPlayerDetection = () => hasCompletedStep('video_loaded') || hasCompletedStep('bounds_adjusted')
    const shouldShowSegmentation = () => hasCompletedStep('players_detected')

    // Load experiment data
    useEffect(() => {
        if (experimentId) {
            loadExperiment()
        }
    }, [experimentId])

    const loadExperiment = async () => {
        try {
            const response = await fetch(`http://localhost:8000/experiments/${experimentId}`)
            if (!response.ok) throw new Error('Failed to load experiment')
            const data = await response.json()
            setExperiment(data)
            setExperimentName(data.name)

            // Restore UI state from timeline
            if (data.timeline && data.timeline.length > 0) {
                // Find the latest video_loaded entry
                const videoEntry = data.timeline.find(entry => entry.step_type === 'video_loaded')
                if (videoEntry && videoEntry.data) {
                    setVideoUrl(videoEntry.data.video_url)

                    // Re-trigger video loading to get bounds
                    const filename = videoEntry.data.video_url.split('/').pop()
                    try {
                        const boundsResponse = await fetch(`http://localhost:8000/detect-field-corners?filename=${filename}`, {
                            method: 'POST'
                        })
                        if (boundsResponse.ok) {
                            const boundsData = await boundsResponse.json()
                            setFrameData(boundsData)

                            // Check for bounds_adjusted entry or use detected bounds
                            const boundsEntry = data.timeline.reverse().find(entry => entry.step_type === 'bounds_adjusted')
                            if (boundsEntry && boundsEntry.data) {
                                setBounds({
                                    top: boundsEntry.data.top_corners || boundsData.top_corners,
                                    bottom: boundsEntry.data.bottom_corners || boundsData.bottom_corners
                                })
                            } else {
                                setBounds({ top: boundsData.top_corners, bottom: boundsData.bottom_corners })
                            }

                            // Check for player detection
                            const playersEntry = data.timeline.reverse().find(entry => entry.step_type === 'players_detected')
                            if (playersEntry && playersEntry.data) {
                                // Player data available in timeline - UI will show based on timeline
                                // Note: Full player bbox data is now stored in timeline
                            }
                            // UI state determined by timeline, not currentStep
                        }
                    } catch (error) {
                        console.error('Error restoring video state:', error)
                    }
                }
            }
        } catch (error) {
            console.error('Error loading experiment:', error)
        }
    }

    const saveTimelineEntry = async (step_type, data) => {
        try {
            await fetch(`http://localhost:8000/experiments/${experimentId}/timeline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step_type, data })
            })
            loadExperiment() // Reload to get updated timeline
        } catch (error) {
            console.error('Error saving timeline entry:', error)
        }
    }

    const updateExperimentName = async (newName) => {
        try {
            console.log('updateExperimentName called with:', newName)
            const response = await fetch(`http://localhost:8000/experiments/${experimentId}/name`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            })
            console.log('Response status:', response.status)
            if (response.ok) {
                const data = await response.json()
                console.log('Response data:', data)
                setExperimentName(newName)
                loadExperiment()
            } else {
                console.error('Failed to update name, status:', response.status)
            }
        } catch (error) {
            console.error('Error updating experiment name:', error)
        }
    }

    const [isEditingName, setIsEditingName] = useState(false)
    const [tempName, setTempName] = useState('')
    const nameInputRef = useRef(null)

    useEffect(() => {
        if (isEditingName && nameInputRef.current) {
            nameInputRef.current.focus()
        }
    }, [isEditingName])

    const startEditingName = () => {
        setTempName(experimentName)
        setIsEditingName(true)
    }

    const saveName = () => {
        if (tempName && tempName.trim() && tempName !== experimentName) {
            updateExperimentName(tempName.trim())
        }
        setIsEditingName(false)
    }

    const handleNameKeyDown = (e) => {
        if (e.key === 'Enter') {
            saveName()
        } else if (e.key === 'Escape') {
            setIsEditingName(false)
        }
    }

    // Step 1: Load video and detect axis-aligned field bounds
    const handleVideoLoaded = async (url, videoType = 'uploaded') => {
        console.log('handleVideoLoaded called with url:', url)
        setVideoUrl(url)
        const filename = url.split('/').pop()

        // Save video to experiment
        await fetch(`http://localhost:8000/experiments/${experimentId}/video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ video_url: url, video_type: videoType })
        })

        // Save timeline entry
        await saveTimelineEntry('video_loaded', { video_url: url, video_name: filename, video_type: videoType })

        setIsLoading(true)
        console.log('Starting detect-field-corners request for:', filename)
        try {
            const response = await fetch(`http://localhost:8000/detect-field-corners?filename=${filename}`, {
                method: 'POST'
            })

            console.log('Response status:', response.status, response.ok)

            if (!response.ok) {
                const errorText = await response.text()
                const errorMsg = `Axis Aligned Field Bounds detection failed: ${response.status} - ${errorText}`
                console.error(errorMsg)
                await saveTimelineEntry('error', { message: errorMsg, stack: errorText })
                setIsLoading(false)
                return
            }

            const data = await response.json()
            console.log('Received field bounds data:', data)
            setFrameData(data)
            console.log('Set frameData to:', data)
            setBounds({ top: data.top_corners, bottom: data.bottom_corners })
            console.log('Set bounds:', { top: data.top_corners, bottom: data.bottom_corners })

            // Save initial bounds to timeline so they persist
            await saveTimelineEntry('bounds_adjusted', {
                top_corners: data.top_corners,
                bottom_corners: data.bottom_corners
            })
            // UI state now determined by timeline, not currentStep
        } catch (error) {
            const errorMsg = `Error loading video: ${error.message}`
            console.error(errorMsg, error)
            await saveTimelineEntry('error', { message: errorMsg, stack: error.stack })
        }
        setIsLoading(false)
        console.log('handleVideoLoaded complete, isLoading set to false')
    }

    // Draw axis-aligned field bounds on canvas
    useEffect(() => {
        if (shouldShowBoundsAdjustment() && canvasRef.current && videoRef.current && frameData) {
            const canvas = canvasRef.current
            const video = videoRef.current
            const ctx = canvas.getContext('2d')

            canvas.width = video.videoWidth || frameData.frame_width
            canvas.height = video.videoHeight || frameData.frame_height

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Draw circles for bound points
            const drawBound = (bound, color, label, isHovered) => {
                if (isHovered) {
                    // Hollow circle on hover
                    ctx.strokeStyle = color
                    ctx.lineWidth = 3
                    ctx.beginPath()
                    ctx.arc(bound.x, bound.y, 15, 0, 2 * Math.PI)
                    ctx.stroke()
                } else {
                    // Filled circle
                    ctx.fillStyle = color
                    ctx.beginPath()
                    ctx.arc(bound.x, bound.y, 10, 0, 2 * Math.PI)
                    ctx.fill()
                }
                ctx.fillStyle = 'white'
                ctx.font = '12px Arial'
                ctx.fillText(label, bound.x + 15, bound.y + 5)
            }

            // Blue for top (left eye), Red for bottom (right eye)
            bounds.top.forEach((c, i) => {
                const isHovered = hoveredBound && hoveredBound.type === 'top' && hoveredBound.index === i
                drawBound(c, 'blue', `L${i + 1}`, isHovered)
            })
            bounds.bottom.forEach((c, i) => {
                const isHovered = hoveredBound && hoveredBound.type === 'bottom' && hoveredBound.index === i
                drawBound(c, 'red', `R${i + 1}`, isHovered)
            })
        }
    }, [bounds, frameData, hoveredBound, videoUrl])

    // Handle corner dragging
    const handleMouseDown = (e) => {
        if (!shouldShowBoundsAdjustment() || !canvasRef.current) return

        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY

        // Find nearest corner
        const allCorners = [
            ...bounds.top.map((c, i) => ({ ...c, type: 'top', index: i })),
            ...bounds.bottom.map((c, i) => ({ ...c, type: 'bottom', index: i }))
        ]

        for (const corner of allCorners) {
            const dist = Math.sqrt((x - corner.x) ** 2 + (y - corner.y) ** 2)
            if (dist < 15) {
                setDraggingCorner(corner)
                break
            }
        }
    }

    const handleMouseMove = (e) => {
        if (!canvasRef.current) return

        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY

        if (draggingBound) {
            // Dragging - update position
            const newBounds = { ...corners }
            if (draggingBound.type === 'top') {
                newBounds.top[draggingBound.index] = { x: Math.round(x), y: Math.round(y) }
            } else {
                newBounds.bottom[draggingBound.index] = { x: Math.round(x), y: Math.round(y) }
            }
            setBounds(newBounds)
        } else if (shouldShowBoundsAdjustment()) {
            // Hovering - find nearest corner
            const allCorners = [
                ...bounds.top.map((c, i) => ({ ...c, type: 'top', index: i })),
                ...bounds.bottom.map((c, i) => ({ ...c, type: 'bottom', index: i }))
            ]

            let nearestCorner = null
            for (const corner of allCorners) {
                const dist = Math.sqrt((x - corner.x) ** 2 + (y - corner.y) ** 2)
                if (dist < 20) {
                    nearestCorner = corner
                    break
                }
            }
            setHoveredCorner(nearestCorner)
        }
    }

    const handleMouseLeave = () => {
        setDraggingBound(null)
        setHoveredBound(null)
    }

    const handleMouseUp = async () => {
        if (draggingBound) {
            // Save final bound positions to timeline
            await saveTimelineEntry('bounds_adjusted', {
                top_corners: bounds.top,
                bottom_corners: bounds.bottom
            })
        }
        setDraggingBound(null)
    }

    // Legacy handler - keeping for compatibility
    const legacyHandleMouseMove = (e) => {
        if (!draggingBound || !canvasRef.current) return

        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY

        const newBounds = { ...corners }
        if (draggingBound.type === 'top') {
            newBounds.top[draggingBound.index] = { x: Math.round(x), y: Math.round(y) }
        } else {
            newBounds.bottom[draggingBound.index] = { x: Math.round(x), y: Math.round(y) }
        }
        setBounds(newBounds)
    }

    // Step 2: Detect players
    const handleDetectPlayers = async () => {
        const filename = videoUrl.split('/').pop()

        setIsLoading(true)
        setLoadingMessage('Detecting players with YOLO...')
        const startTime = performance.now() // Start timing

        try {
            const response = await fetch('http://localhost:8000/detect-players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename,
                    top_corners: bounds.top,
                    bottom_corners: bounds.bottom
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                const errorMsg = `Player detection failed: ${response.status} - ${errorText}`
                console.error(errorMsg)
                setErrorLog(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: errorMsg, stack: errorText }])
                setLoadingMessage('')
                setIsLoading(false)
                return
            }

            const data = await response.json()
            const endTime = performance.now()
            const executionTime = (endTime - startTime) / 1000 // Seconds
            console.log('Detected players:', data)

            // Set players with safe defaults to prevent rendering errors
            setPlayers({
                top: data.top_players || [],
                bottom: data.bottom_players || [],
                similarity: data.similarity || 0,
                metadata: data.metadata || {}
            })

            // Save timeline entry with full player bbox data AND execution time
            await saveTimelineEntry('players_detected', {
                top_count: data.top_players?.length || 0,
                bottom_count: data.bottom_players?.length || 0,
                similarity: data.similarity || 0,
                top_players: data.top_players || [],
                bottom_players: data.bottom_players || [],
                metadata: data.metadata || {},
                execution_time: executionTime
            })

            setLoadingMessage('')
        } catch (error) {
            const errorMsg = `Error detecting players: ${error.message}`
            console.error(errorMsg, error)
            setErrorLog(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: errorMsg, stack: error.stack }])
            setLoadingMessage(errorMsg)
            // DON'T reset currentStep - stay on current step and show error
        } finally {
            setIsLoading(false)
        }
    }

    // Draw player bboxes
    useEffect(() => {
        if (players.top.length > 0 && canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current
            const video = videoRef.current
            const ctx = canvas.getContext('2d')

            canvas.width = video.videoWidth || frameData.frame_width
            canvas.height = video.videoHeight || frameData.frame_height

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Draw yellow boxes
            ctx.strokeStyle = 'yellow'
            ctx.lineWidth = 3 // Changed from 2 to 3

            players.top.forEach(p => {
                ctx.strokeRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1)
            })

            players.bottom.forEach(p => {
                ctx.strokeRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1)
            })
        }
    }, [players, frameData])

    // Step 3: Segment players
    const handleSegmentPlayers = async () => {
        const filename = videoUrl.split('/').pop()

        // Display input data
        const inputData = {
            filename,
            top_players: players.top || [],
            bottom_players: players.bottom || [],
            top_count: (players.top || []).length,
            bottom_count: (players.bottom || []).length
        }

        console.log('Segmentation Input:', inputData)
        setLoadingMessage(`Starting segmentation with ${inputData.top_count} top players and ${inputData.bottom_count} bottom players...`)
        setIsLoading(true)

        try {
            setLoadingMessage('Sending request to SAM 2...')

            const response = await fetch('http://localhost:8000/segment-first-frame', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename,
                    top_players: players.top || [],
                    bottom_players: players.bottom || []
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                const errorMsg = `Segmentation failed: ${response.status} - ${errorText}`
                console.error(errorMsg)
                setErrorLog(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: errorMsg, stack: errorText }])
                setLoadingMessage(errorMsg)
                setIsLoading(false)
                return
            }

            setLoadingMessage('Processing SAM 2 response...')
            const data = await response.json()
            console.log('Segmentation result:', data)

            // DON'T change step - show result inline
            setSegmentResult(data)
            setLoadingMessage('✓ First frame segmentation complete!')

            // Save timeline entry
            await saveTimelineEntry('segmentation_completed', {
                top_player_count: data.top_player_count,
                bottom_player_count: data.bottom_player_count,
                result_url: data.result_url
            })

            // Clear loading message after short delay
            setTimeout(() => setLoadingMessage(''), 2000)
        } catch (error) {
            const errorMsg = `Error segmenting: ${error.message}`
            console.error(errorMsg, error)
            setErrorLog(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: errorMsg, stack: error.stack }])
            setLoadingMessage(errorMsg)
        } finally {
            setIsLoading(false)
        }
    }

    // Step 4: Segment full video
    const handleSegmentFullVideo = async () => {
        const filename = videoUrl.split('/').pop()

        try {
            setFullVideoProgress({ percent: 0, message: 'Starting full video segmentation...', status: 'starting' })

            const response = await fetch('http://localhost:8000/segment-full-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename,
                    top_players: players.top || [],
                    bottom_players: players.bottom || []
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                setFullVideoProgress({ percent: 0, message: `Error: ${errorText}`, status: 'error' })
                return
            }

            // Start polling for progress
            const pollInterval = setInterval(async () => {
                try {
                    const progressResponse = await fetch(`http://localhost:8000/segment-progress/${filename}`)
                    const progressData = await progressResponse.json()

                    setFullVideoProgress({
                        percent: progressData.percent || 0,
                        message: progressData.message || 'Processing...',
                        status: progressData.status,
                        current_frame: progressData.current_frame,
                        total_frames: progressData.total_frames
                    })

                    if (progressData.status === 'completed') {
                        clearInterval(pollInterval)
                        setFullVideoResult(progressData.result_url)
                        setFullVideoMessage('✅ Full video segmentation complete!')
                        setTimeout(() => setFullVideoMessage(''), 4000)
                    } else if (progressData.status === 'error') {
                        clearInterval(pollInterval)
                        setFullVideoMessage(`❌ Error: ${progressData.message}`)
                    }
                } catch (error) {
                    console.error('Error polling progress:', error)
                }
            }, 1000) // Poll every second

        } catch (error) {
            console.error('Error starting full video segmentation:', error)
            setFullVideoProgress({ percent: 0, message: `Error: ${error.message}`, status: 'error' })
        }
    }

    const formatDate = (isoString) => {
        if (!isoString) return ''
        const date = new Date(isoString)
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="sam2-experiment">
            {/* Experiment Header */}
            <div className="experiment-header">
                <div className="experiment-title-row">
                    {isEditingName ? (
                        <input
                            ref={nameInputRef}
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onBlur={saveName}
                            onKeyDown={handleNameKeyDown}
                            className="experiment-name-input"
                        />
                    ) : (
                        <>
                            <h2 onClick={startEditingName} title="Click to edit">
                                {experimentName}
                            </h2>
                            <button onClick={startEditingName} className="edit-name-button" title="Edit name">✏️</button>
                        </>
                    )}
                </div>
                {experiment && (
                    <p className="experiment-meta">
                        Last updated: {new Date(experiment.updated_at).toLocaleString()}
                    </p>
                )}
            </div>

            <div className="workspace">
                {!videoUrl && (
                    <div className="upload-section">
                        <h3>Load a Video</h3>
                        <div className="video-selection-compact">
                            <VideoUploader onUploadComplete={handleVideoLoaded} />
                            <button
                                className="secondary-button"
                                onClick={() => handleVideoLoaded('http://localhost:8000/video/usmnt-1min-2.mp4', 'test')}
                            >
                                🎬 USMNT Clip
                            </button>
                            <button
                                className="secondary-button"
                                onClick={() => handleVideoLoaded('http://localhost:8000/video/usmnt-1min-2_5s.mp4', 'test')}
                            >
                                ⚡ 5-sec Clip
                            </button>
                        </div>
                    </div>
                )}

                {videoUrl && (
                    <div className="video-section">

                        <div className="video-wrapper">
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className="main-video"
                                onLoadedMetadata={() => {
                                    // Re-render when video loads
                                    if (shouldShowBoundsAdjustment()) setBounds({ ...bounds })
                                    if (players.top.length > 0) setPlayers({ ...players })
                                }}
                                // Keep video visible across steps
                                style={{ display: videoUrl ? 'block' : 'none' }}
                            />
                            <canvas
                                ref={canvasRef}
                                className="overlay-canvas"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseLeave}
                                // Keep canvas visible across steps where interaction/drawing is needed
                                style={{ display: videoUrl ? 'block' : 'none' }}
                            />
                        </div>

                        {isLoading && (
                            <div className="loading-overlay">
                                <div className="spinner"></div>
                                <p>{loadingMessage}</p>
                            </div>
                        )}


                        {/* Sequential Results - shows history of actions */}
                        <SequentialResults
                            experiment={experiment}
                            bounds={bounds}
                            players={players}
                            segmentResult={segmentResult}
                        />

                        {/* Action Buttons Panel - shows NEXT available action */}
                        {videoUrl && (
                            <div className="action-panel">
                                {shouldShowBoundsAdjustment() && !players.top.length && (
                                    <button
                                        className="primary-button"
                                        onClick={handleDetectPlayers}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Detecting Players...' : 'Detect Players →'}
                                    </button>
                                )}

                                {players.top.length > 0 && !segmentResult && (
                                    <button
                                        className="primary-button"
                                        onClick={handleSegmentPlayers}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Segmenting...' : 'Segment First Frame →'}
                                    </button>
                                )}

                                {segmentResult && !fullVideoResult && (
                                    <button
                                        className="primary-button"
                                        onClick={handleSegmentFullVideo}
                                        disabled={fullVideoProgress?.status === 'processing'}
                                    >
                                        {fullVideoProgress?.status === 'processing' ? 'Processing...' : 'Segment Full Video →'}
                                    </button>
                                )}

                                {/* Full Video Progress */}
                                {fullVideoProgress && (
                                    <div className="progress-display">
                                        <div className="progress-bar">
                                            <div
                                                className="progress-fill"
                                                style={{ width: `${fullVideoProgress.percent}%` }}
                                            />
                                        </div>
                                        <div className="progress-text">
                                            {fullVideoProgress.message} - {fullVideoProgress.percent}%
                                        </div>
                                        {fullVideoProgress.current_frame && (
                                            <div className="progress-detail">
                                                Frame {fullVideoProgress.current_frame} / {fullVideoProgress.total_frames}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Full Video Result */}
                                {fullVideoResult && (
                                    <div className="video-result">
                                        <h4>✅ Full Video Segmentation Complete</h4>
                                        <video src={fullVideoResult} controls style={{ maxWidth: '100%', borderRadius: '8px' }} />
                                        <a href={fullVideoResult} download className="secondary-button">
                                            Download Segmented Video
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}



                        {
                            errorLog.length > 0 && (
                                <div className="error-log">
                                    <h3>Error Log</h3>
                                    <button className="secondary-button" onClick={() => setErrorLog([])} style={{ marginBottom: '1rem' }}>Clear Errors</button>
                                    {errorLog.map((error, idx) => (
                                        <div key={idx} className="error-item">
                                            <div className="error-header">
                                                <span className="error-time">{error.timestamp}</span>
                                                <span className="error-message">{error.message}</span>
                                            </div>
                                            {error.stack && (
                                                <pre className="error-stack">{error.stack}</pre>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div >
                )
                }
            </div >
        </div >
    )
}

export default SAM2Experiment
