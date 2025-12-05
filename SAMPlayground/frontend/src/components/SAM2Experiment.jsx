import React, { useState, useRef, useEffect } from 'react'
import VideoUploader from './VideoUploader'
import ErrorBoundary from './ErrorBoundary'
import './SAM2Experiment.css'

function SAM2Experiment() {
    const [videoUrl, setVideoUrl] = useState(null)
    const [currentStep, setCurrentStep] = useState(0) // 0=upload, 1=corners, 2=players, 3=segment
    const [frameData, setFrameData] = useState(null)
    const [corners, setCorners] = useState({ top: [], bottom: [] })
    const [players, setPlayers] = useState({ top: [], bottom: [], similarity: 0 })
    const [segmentResult, setSegmentResult] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('')
    const [fullVideoMessage, setFullVideoMessage] = useState('')
    const [fullVideoProgress, setFullVideoProgress] = useState(null) // {percent, message, status}
    const [fullVideoResult, setFullVideoResult] = useState(null) // Result URL when complete
    const [results, setResults] = useState([]) // Accumulate results
    const [errorLog, setErrorLog] = useState([]) // Track all errors
    const [draggingCorner, setDraggingCorner] = useState(null)
    const [hoveredCorner, setHoveredCorner] = useState(null)
    const canvasRef = useRef(null)
    const videoRef = useRef(null)

    // Handle React errors from ErrorBoundary
    const handleReactError = (errorData) => {
        setErrorLog(prev => [...prev, errorData])
    }

    // Step 1: Load video and detect field corners
    const handleVideoLoaded = async (url) => {
        console.log('handleVideoLoaded called with url:', url)
        setVideoUrl(url)
        const filename = url.split('/').pop()

        setIsLoading(true)
        console.log('Starting detect-field-corners request for:', filename)
        try {
            const response = await fetch(`http://localhost:8000/detect-field-corners?filename=${filename}`, {
                method: 'POST'
            })

            console.log('Response status:', response.status, response.ok)

            if (!response.ok) {
                const errorText = await response.text()
                const errorMsg = `Field corner detection failed: ${response.status} - ${errorText}`
                console.error(errorMsg)
                setErrorLog(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: errorMsg, stack: errorText }])
                setIsLoading(false)
                return
            }

            const data = await response.json()
            console.log('Received field corner data:', data)
            setFrameData(data)
            console.log('Set frameData to:', data)
            setCorners({ top: data.top_corners, bottom: data.bottom_corners })
            console.log('Set corners:', { top: data.top_corners, bottom: data.bottom_corners })
            setCurrentStep(1)
            console.log('Set currentStep to 1')
        } catch (error) {
            const errorMsg = `Error loading video: ${error.message}`
            console.error(errorMsg, error)
            setErrorLog(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: errorMsg, stack: error.stack }])
        }
        setIsLoading(false)
        console.log('handleVideoLoaded complete, isLoading set to false')
    }

    // Draw corners on canvas
    useEffect(() => {
        if (currentStep === 1 && canvasRef.current && videoRef.current && frameData) {
            const canvas = canvasRef.current
            const video = videoRef.current
            const ctx = canvas.getContext('2d')

            canvas.width = video.videoWidth || frameData.frame_width
            canvas.height = video.videoHeight || frameData.frame_height

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            // Draw circles for corners
            const drawCorner = (corner, color, label, isHovered) => {
                if (isHovered) {
                    // Hollow circle on hover
                    ctx.strokeStyle = color
                    ctx.lineWidth = 3
                    ctx.beginPath()
                    ctx.arc(corner.x, corner.y, 15, 0, 2 * Math.PI)
                    ctx.stroke()
                } else {
                    // Filled circle
                    ctx.fillStyle = color
                    ctx.beginPath()
                    ctx.arc(corner.x, corner.y, 10, 0, 2 * Math.PI)
                    ctx.fill()
                }
                ctx.fillStyle = 'white'
                ctx.font = '12px Arial'
                ctx.fillText(label, corner.x + 15, corner.y + 5)
            }

            // Blue for top (left eye), Red for bottom (right eye)
            corners.top.forEach((c, i) => {
                const isHovered = hoveredCorner && hoveredCorner.type === 'top' && hoveredCorner.index === i
                drawCorner(c, 'blue', `L${i + 1}`, isHovered)
            })
            corners.bottom.forEach((c, i) => {
                const isHovered = hoveredCorner && hoveredCorner.type === 'bottom' && hoveredCorner.index === i
                drawCorner(c, 'red', `R${i + 1}`, isHovered)
            })
        }
    }, [corners, currentStep, frameData, hoveredCorner])

    // Handle corner dragging
    const handleMouseDown = (e) => {
        if (currentStep !== 1 || !canvasRef.current) return

        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY

        // Find nearest corner
        const allCorners = [
            ...corners.top.map((c, i) => ({ ...c, type: 'top', index: i })),
            ...corners.bottom.map((c, i) => ({ ...c, type: 'bottom', index: i }))
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

        if (draggingCorner) {
            // Dragging - update position
            const newCorners = { ...corners }
            if (draggingCorner.type === 'top') {
                newCorners.top[draggingCorner.index] = { x: Math.round(x), y: Math.round(y) }
            } else {
                newCorners.bottom[draggingCorner.index] = { x: Math.round(x), y: Math.round(y) }
            }
            setCorners(newCorners)
        } else if (currentStep === 1) {
            // Hovering - find nearest corner
            const allCorners = [
                ...corners.top.map((c, i) => ({ ...c, type: 'top', index: i })),
                ...corners.bottom.map((c, i) => ({ ...c, type: 'bottom', index: i }))
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
        setDraggingCorner(null)
        setHoveredCorner(null)
    }

    const handleMouseUp = () => {
        setDraggingCorner(null)
    }

    // Legacy handler - keeping for compatibility
    const legacyHandleMouseMove = (e) => {
        if (!draggingCorner || !canvasRef.current) return

        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const x = (e.clientX - rect.left) * scaleX
        const y = (e.clientY - rect.top) * scaleY

        const newCorners = { ...corners }
        if (draggingCorner.type === 'top') {
            newCorners.top[draggingCorner.index] = { x: Math.round(x), y: Math.round(y) }
        } else {
            newCorners.bottom[draggingCorner.index] = { x: Math.round(x), y: Math.round(y) }
        }
        setCorners(newCorners)
    }

    // Step 2: Detect players
    const handleDetectPlayers = async () => {
        const filename = videoUrl.split('/').pop()

        setIsLoading(true)
        setLoadingMessage('Detecting players with YOLO...')
        try {
            const response = await fetch('http://localhost:8000/detect-players', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename,
                    top_corners: corners.top,
                    bottom_corners: corners.bottom
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
            console.log('Detected players:', data)

            // Always accumulate results, even with 0 detections
            const now = new Date()
            setResults(prev => [...prev, {
                type: 'detection',
                timestamp: now.toLocaleTimeString(),
                data: {
                    top_count: data.top_players?.length || 0,
                    bottom_count: data.bottom_players?.length || 0,
                    similarity: data.similarity || 0,
                    metadata: data.metadata || {}
                }
            }])

            // Set players with safe defaults to prevent rendering errors
            setPlayers({
                top: data.top_players || [],
                bottom: data.bottom_players || [],
                similarity: data.similarity || 0,
                metadata: data.metadata || {}
            })

            // Only advance to step 2 if successful AND no errors
            setCurrentStep(2)
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
        if (currentStep === 2 && canvasRef.current && videoRef.current) {
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
    }, [players, currentStep, frameData])

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

            // Accumulate results
            const now = new Date()
            setResults(prev => [...prev, {
                type: 'segmentation',
                timestamp: now.toLocaleString(),
                data: data
            }])

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

    return (
        <div className="sam2-experiment">
            <h2>Stereo Soccer Field Player Segmentation</h2>
            <p className="experiment-description">
                Multi-step workflow for detecting and segmenting players in stereo soccer videos
            </p>

            <div className="workspace">
                {currentStep === 0 && (
                    <div className="upload-section">
                        <VideoUploader onUploadComplete={handleVideoLoaded} />
                        <div className="test-video-section">
                            <p>Or try with a test video:</p>
                            <button
                                className="secondary-button"
                                onClick={() => handleVideoLoaded('http://localhost:8000/video/usmnt-1min-2.mp4')}
                            >
                                Load USMNT Soccer Clip
                            </button>
                            <button
                                className="secondary-button"
                                onClick={() => handleVideoLoaded('http://localhost:8000/video/usmnt-1min-2_5s.mp4')}
                            >
                                Load 5‑sec Clip
                            </button>
                        </div>
                    </div>
                )}

                {currentStep >= 1 && (
                    <div className="video-section">
                        <div className="step-indicator">
                            <span className={currentStep >= 1 ? 'active' : ''}>1. Field Corners</span>
                            <span className={currentStep >= 2 ? 'active' : ''}>2. Players</span>
                            <span className={currentStep >= 3 ? 'active' : ''}>3. Segmentation</span>
                        </div>

                        <div className="video-wrapper">
                            <video
                                ref={videoRef}
                                src={videoUrl}
                                className="main-video"
                                onLoadedMetadata={() => {
                                    if (frameData) {
                                        // This ensures canvas dimensions are set correctly after video metadata loads
                                        // and triggers a re-render of corners/players if currentStep is 1 or 2
                                        if (currentStep === 1) setCorners({ ...corners })
                                        if (currentStep === 2) setPlayers({ ...players })
                                    }
                                }}
                                // Keep video visible across steps
                                style={{ display: currentStep < 3 ? 'block' : 'none' }}
                            />
                            <canvas
                                ref={canvasRef}
                                className="overlay-canvas"
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseLeave}
                                // Keep canvas visible across steps where interaction/drawing is needed
                                style={{ display: currentStep < 3 ? 'block' : 'none' }}
                            />
                        </div>

                        {isLoading && (
                            <div className="loading-overlay">
                                <div className="spinner"></div>
                                <p>{loadingMessage}</p>
                            </div>
                        )}


                        {
                            currentStep === 1 && (
                                <div className="step-content">
                                    <h3>Step 1: Adjust Field Corners</h3>
                                    <p>Drag the circles to adjust field boundaries. Blue = Left (Top), Red = Right (Bottom).</p>
                                    <div className="corner-coordinates">
                                        <div className="corner-group">
                                            <h4 style={{ color: 'blue' }}>Left (Top) Corners:</h4>
                                            {corners.top.map((c, i) => (
                                                <div key={i} className="coord-item">L{i + 1}: ({c.x}, {c.y})</div>
                                            ))}
                                        </div>
                                        <div className="corner-group">
                                            <h4 style={{ color: 'red' }}>Right (Bottom) Corners:</h4>
                                            {corners.bottom.map((c, i) => (
                                                <div key={i} className="coord-item">R{i + 1}: ({c.x}, {c.y})</div>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        className="primary-button"
                                        onClick={handleDetectPlayers}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Processing...' : 'Detect Players →'}
                                    </button>
                                    {loadingMessage && !isLoading && (
                                        <div className="error-message" style={{ marginTop: '1rem', padding: '1rem', background: '#2a1515', border: '2px solid #ff4444', borderRadius: '4px' }}>
                                            <p style={{ color: '#ff6666', margin: 0 }}>{loadingMessage}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        {
                            currentStep === 2 && (
                                <div className="step-content">
                                    <h3>Step 2: Player Detection</h3>

                                    {/* Player Count Badges */}
                                    <div className="player-count-badges">
                                        <div className={`count-badge ${(players.top?.length || 0) > 0 ? 'has-players' : 'no-players'}`}>
                                            <span className="badge-label">Left (Top)</span>
                                            <span className="badge-count">{players.top?.length || 0}</span>
                                            <span className="badge-text">players</span>
                                        </div>
                                        <div className={`count-badge ${(players.bottom?.length || 0) > 0 ? 'has-players' : 'no-players'}`}>
                                            <span className="badge-label">Right (Bottom)</span>
                                            <span className="badge-count">{players.bottom?.length || 0}</span>
                                            <span className="badge-text">players</span>
                                        </div>
                                    </div>

                                    {(players.top?.length || 0) === 0 && (players.bottom?.length || 0) === 0 ? (
                                        <div className="no-detection-message">
                                            <p>⚠️ No players detected in either view</p>
                                            <p className="hint">Try adjusting the field corners to focus on the playing area, or check that players are visible in the video.</p>
                                        </div>
                                    ) : (
                                        <div className="player-lists">
                                            <div className="player-list">
                                                <h4>Top View ({players.top?.length || 0} players)</h4>
                                                <div className="player-items">
                                                    {(players.top || []).map((p, i) => (
                                                        <div key={i} className="player-item">
                                                            Player {i + 1}: ({p.x1}, {p.y1}) → ({p.x2}, {p.y2}) [conf: {p.confidence?.toFixed(2)}]
                                                        </div>
                                                    ))}
                                                    {(players.top?.length || 0) === 0 && <div className="empty-message">No players detected</div>}
                                                </div>
                                            </div>
                                            <div className="player-list">
                                                <h4>Bottom View ({players.bottom?.length || 0} players)</h4>
                                                <div className="player-items">
                                                    {(players.bottom || []).map((p, i) => (
                                                        <div key={i} className="player-item">
                                                            Player {i + 1}: ({p.x1}, {p.y1}) → ({p.x2}, {p.y2}) [conf: {p.confidence?.toFixed(2)}]
                                                        </div>
                                                    ))}
                                                    {(players.bottom?.length || 0) === 0 && <div className="empty-message">No players detected</div>}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <p>Similarity: {((players.similarity || 0) * 100).toFixed(0)}%</p>
                                    <button
                                        className="primary-button"
                                        onClick={handleSegmentPlayers}
                                        disabled={isLoading || ((players.top?.length || 0) === 0 && (players.bottom?.length || 0) === 0)}
                                    >
                                        {isLoading ? 'Segmenting...' : 'Segment First Frame →'}
                                    </button>
                                    {((players.top?.length || 0) === 0 && (players.bottom?.length || 0) === 0) && (
                                        <p className="hint">Segmentation requires at least one player detection</p>
                                    )}

                                    {/* Show progress/status */}
                                    {loadingMessage && currentStep === 2 && (
                                        <div className="status-message" style={{ marginTop: '1rem', padding: '1rem', background: isLoading ? '#1a1a2a' : '#2a1515', border: `2px solid ${isLoading ? '#646cff' : '#ff4444'}`, borderRadius: '4px' }}>
                                            <p style={{ color: isLoading ? '#8888ff' : '#ff6666', margin: 0 }}>{loadingMessage}</p>
                                        </div>
                                    )}

                                    {/* Show input data summary */}
                                    {!isLoading && !segmentResult && ((players.top?.length || 0) > 0 || (players.bottom?.length || 0) > 0) ? (
                                        <div className="input-summary" style={{ marginTop: '1rem', padding: '0.75rem', background: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', fontSize: '0.85rem' }}>
                                            <p style={{ margin: '0.25rem 0', color: '#888' }}>Ready to segment:</p>
                                            <p style={{ margin: '0.25rem 0', color: '#ccc' }}>• Top view: {(players.top || []).length} players</p>
                                            <p style={{ margin: '0.25rem 0', color: '#ccc' }}>• Bottom view: {(players.bottom || []).length} players</p>
                                        </div>
                                    ) : null}

                                    {/* Show segmentation result inline */}
                                    {segmentResult && currentStep === 2 && (
                                        <div className="segmentation-result" style={{ marginTop: '2rem' }}>
                                            <h4>Segmentation Test Frame</h4>
                                            <p style={{ fontSize: '0.9rem', color: '#888' }}>First frame with colored player masks</p>
                                            <div className="result-image">
                                                <img src={segmentResult.result_url} alt="Segmented test frame" style={{ maxWidth: '100%', borderRadius: '8px', border: '2px solid #333' }} />
                                            </div>
                                            <p>Top: {segmentResult.top_player_count} players | Bottom: {segmentResult.bottom_player_count} players</p>
                                            <button
                                                className="primary-button"
                                                style={{ marginTop: '1rem' }}
                                                onClick={handleSegmentFullVideo}
                                                disabled={fullVideoProgress?.status === 'processing' || fullVideoProgress?.status === 'starting'}
                                            >
                                                {fullVideoProgress?.status === 'processing' || fullVideoProgress?.status === 'starting' ? 'Processing Full Video...' : 'Segment Full Video →'}
                                            </button>

                                            {/* Full Video Progress & Results Section */}
                                            {fullVideoProgress && (
                                                <div className="full-video-progress" style={{ marginTop: '1.5rem', padding: '1rem', background: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', textAlign: 'left' }}>
                                                    <h4 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>Full Video Segmentation Status</h4>

                                                    {/* Progress Bar */}
                                                    <div style={{ width: '100%', height: '10px', background: '#333', borderRadius: '5px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                                                        <div style={{
                                                            width: `${fullVideoProgress.percent}%`,
                                                            height: '100%',
                                                            background: fullVideoProgress.status === 'error' ? '#ff4444' : '#646cff',
                                                            transition: 'width 0.3s ease'
                                                        }} />
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#ccc', marginBottom: '0.5rem' }}>
                                                        <span>{fullVideoProgress.message}</span>
                                                        <span>{fullVideoProgress.percent}%</span>
                                                    </div>

                                                    {/* Frame Counter */}
                                                    {fullVideoProgress.total_frames > 0 && (
                                                        <p style={{ fontSize: '0.8rem', color: '#888', margin: '0.2rem 0' }}>
                                                            Frame: {fullVideoProgress.current_frame} / {fullVideoProgress.total_frames}
                                                        </p>
                                                    )}

                                                    {/* Result Video */}
                                                    {fullVideoResult && (
                                                        <div style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                                                            <p style={{ color: '#4caf50', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>✅ Processing Complete!</p>
                                                            <video
                                                                src={fullVideoResult}
                                                                controls
                                                                style={{ width: '100%', borderRadius: '4px', border: '1px solid #444' }}
                                                            />
                                                            <div style={{ marginTop: '0.5rem' }}>
                                                                <a href={fullVideoResult} download className="secondary-button" style={{ display: 'inline-block', textDecoration: 'none', fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                                                                    Download Segmented Video
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Error Display */}
                                                    {fullVideoProgress.status === 'error' && (
                                                        <div style={{ marginTop: '0.5rem', color: '#ff4444', padding: '0.5rem', background: 'rgba(255, 68, 68, 0.1)', borderRadius: '4px' }}>
                                                            <p style={{ margin: 0 }}>❌ Processing Failed: {fullVideoProgress.error || 'Unknown error'}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        }

                        {
                            currentStep === 3 && segmentResult && (
                                <div className="step-content">
                                    <h3>Step 3: Segmentation Result</h3>
                                    <div className="result-image">
                                        <img src={segmentResult.result_url} alt="Segmented frame" />
                                    </div>
                                    <p>Top: {segmentResult.top_player_count} players | Bottom: {segmentResult.bottom_player_count} players</p>
                                    <button
                                        className="secondary-button"
                                        onClick={() => {
                                            setCurrentStep(0)
                                            setVideoUrl(null)
                                            setCorners({ top: [], bottom: [] })
                                            setPlayers({ top: [], bottom: [], similarity: 0 })
                                            setSegmentResult(null)
                                        }}
                                    >
                                        Start Over
                                    </button>
                                </div>
                            )
                        }

                        {
                            results.length > 0 && (
                                <div className="results-history">
                                    <h3>Results History</h3>
                                    {results.map((result, idx) => (
                                        <div key={idx} className="result-item">
                                            <span className="result-time">{result.timestamp}</span>
                                            {result.type === 'detection' && (
                                                <div>
                                                    <p><strong>Detection Attempt:</strong></p>
                                                    <p>Left (Top): {result.data.top_count} players | Right (Bottom): {result.data.bottom_count} players</p>
                                                    <p>Similarity: {(result.data.similarity * 100).toFixed(0)}%</p>
                                                    {result.data.metadata && (
                                                        <div className="metadata">
                                                            <p>Model: {result.data.metadata.model || 'N/A'}</p>
                                                            <p>Confidence: {result.data.metadata.confidence_threshold || 'N/A'}</p>
                                                            <p>Frame: {result.data.metadata.frame_size || 'N/A'}</p>
                                                            {result.data.metadata.top_view && (
                                                                <p>Left crop: {result.data.metadata.top_view.crop_size} ({result.data.metadata.top_view.detections} found)</p>
                                                            )}
                                                            {result.data.metadata.bottom_view && (
                                                                <p>Right crop: {result.data.metadata.bottom_view.crop_size} ({result.data.metadata.bottom_view.detections} found)</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {result.type === 'segmentation' && (
                                                <div>
                                                    <p><strong>Segmentation Result:</strong></p>
                                                    <p>Top: {result.data.top_player_count} | Bottom: {result.data.bottom_player_count}</p>
                                                    <img src={result.data.result_url} alt="Result" className="result-thumb" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )
                        }

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
