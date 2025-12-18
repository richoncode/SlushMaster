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
    const [error, setError] = useState(null) // Global error state
    const [errorLog, setErrorLog] = useState([]) // Track all errors
    const [draggingBound, setDraggingBound] = useState(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [hoveredBound, setHoveredBound] = useState(null)
    const [losPosition, setLosPosition] = useState(0.33) // 0 to 1, default 1/3 way down field
    const [playerViewMode, setPlayerViewMode] = useState('bounds') // 'bounds' or 'occlude'
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
    const shouldShowPlayerDetection = () => {
        const vl = hasCompletedStep('video_loaded')
        const ba = hasCompletedStep('bounds_adjusted')
        console.log('shouldShowPlayerDetection check:', { vl, ba, timeline: experiment?.timeline })
        return vl || ba
    }
    const shouldShowSegmentation = () => hasCompletedStep('players_detected')

    // Load experiment data
    useEffect(() => {
        if (experimentId) {
            loadExperiment(true) // Restore state on initial load
        }
    }, [experimentId])

    const loadExperiment = async (restoreState = false) => {
        try {
            const response = await fetch(`http://localhost:8000/experiments/${experimentId}`)
            if (!response.ok) throw new Error('Failed to load experiment')
            const data = await response.json()
            setExperiment(data)
            setExperimentName(data.name)

            // Restore UI state from timeline ONLY if requested (initial load)
            // This prevents race conditions where saveTimelineEntry triggers restoration that conflicts with ongoing actions
            if (restoreState && data.timeline && data.timeline.length > 0) {
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
                            // Use slice() to create a copy before reversing to avoid mutating state
                            const boundsEntry = data.timeline.slice().reverse().find(entry => entry.step_type === 'bounds_adjusted')
                            if (boundsEntry && boundsEntry.data) {
                                setBounds({
                                    top: boundsEntry.data.top_corners || boundsData.top_corners,
                                    bottom: boundsEntry.data.bottom_corners || boundsData.bottom_corners
                                })
                            } else {
                                setBounds({ top: boundsData.top_corners, bottom: boundsData.bottom_corners })
                            }

                            // Check for player detection
                            const playersEntry = data.timeline.slice().reverse().find(entry => entry.step_type === 'players_detected')
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

    const saveTimelineEntry = async (step_type, data, options = {}) => {
        try {
            await fetch(`http://localhost:8000/experiments/${experimentId}/timeline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ step_type, data, ...options })
            })
            await loadExperiment() // Reload to get updated timeline (await to ensure sync)
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

    // Helpers
    const getAABB = (points) => {
        if (!points || points.length === 0) return null
        const xs = points.map(p => p.x)
        const ys = points.map(p => p.y)
        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys)
        }
    }

    const calculateLOSPolygon = (p1, p2, p3, p4, t) => {
        const lerp = (a, b, t) => ({
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t
        })

        const farDist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
        const nearDist = Math.sqrt((p3.x - p4.x) ** 2 + (p3.y - p4.y) ** 2)

        const ratio = farDist / nearDist
        const wNear = 11
        const wFar = 11 * ratio

        const lFar = lerp(p1, p2, t)
        const lNear = lerp(p4, p3, t)

        const dx = lNear.x - lFar.x
        const dy = lNear.y - lFar.y
        const len = Math.sqrt(dx * dx + dy * dy)
        const ux = dx / len
        const uy = dy / len

        const nx = -uy
        const ny = ux

        return [
            { x: lFar.x + nx * wFar / 2, y: lFar.y + ny * wFar / 2 }, // Top-Left
            { x: lFar.x - nx * wFar / 2, y: lFar.y - ny * wFar / 2 }, // Top-Right
            { x: lNear.x - nx * wNear / 2, y: lNear.y - ny * wNear / 2 }, // Bottom-Right
            { x: lNear.x + nx * wNear / 2, y: lNear.y + ny * wNear / 2 }  // Bottom-Left
        ]
    }

    // Step 1: Load video and detect axis-aligned field bounds
    const handleVideoLoaded = async (url, videoType = 'uploaded') => {
        console.log('handleVideoLoaded called with url:', url)
        setVideoUrl(url)
        setError(null)
        const filename = url.split('/').pop()

        try {
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

            const response = await fetch(`http://localhost:8000/detect-field-corners?filename=${filename}`, {
                method: 'POST'
            })

            console.log('Response status:', response.status, response.ok)

            if (!response.ok) {
                const errorText = await response.text()
                const errorMsg = `Axis Aligned Field Bounds detection failed: ${response.status} - ${errorText}`
                console.error(errorMsg)
                setError(errorMsg)
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
                bottom_corners: data.bottom_corners,
                top_aabb: getAABB(data.top_corners),
                bottom_aabb: getAABB(data.bottom_corners)
            })
            // UI state now determined by timeline, not currentStep
        } catch (error) {
            const errorMsg = `Error loading video: ${error.message}`
            console.error(errorMsg, error)
            setError(errorMsg)
            await saveTimelineEntry('error', { message: errorMsg, stack: error.stack })
        } finally {
            setIsLoading(false)
            console.log('handleVideoLoaded complete, isLoading set to false')
        }
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

            // Draw rings for bound points
            const drawBound = (bound, color, label, isHovered) => {
                const innerRadius = 13.5 // 27px interior diameter => 13.5px radius
                const strokeWidth = 11   // 11px exterior ring thickness
                const outerRadius = innerRadius + (strokeWidth / 2) // Stroke is centered, so we need to adjust or use arc with proper line width

                // We want a clear inner circle of 27px diameter
                // And a colored ring of 11px thickness OUTSIDE that? 
                // "11 pixel exteroro" usually means the ring width.
                // To achieve "clear interior":

                ctx.beginPath()
                ctx.arc(bound.x, bound.y, innerRadius + (strokeWidth / 2), 0, 2 * Math.PI)
                ctx.strokeStyle = color
                ctx.lineWidth = strokeWidth
                ctx.stroke()

                // If hovered, maybe highlight the ring or add a white outline?
                if (isHovered) {
                    ctx.strokeStyle = 'white'
                    ctx.lineWidth = 1
                    ctx.beginPath()
                    ctx.arc(bound.x, bound.y, innerRadius, 0, 2 * Math.PI) // Inner border
                    ctx.stroke()
                    ctx.beginPath()
                    ctx.arc(bound.x, bound.y, innerRadius + strokeWidth, 0, 2 * Math.PI) // Outer border
                    ctx.stroke()
                }

                // Label
                ctx.fillStyle = 'white'
                ctx.font = '14px Arial'
                ctx.fillText(label, bound.x + 30, bound.y + 10)
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

            // Draw Line of Scrimmage with Tapering
            // Draw Line of Scrimmage with Tapering
            if (bounds.top.length === 4 && bounds.bottom.length === 4) {
                const drawPolygon = (points) => {
                    ctx.beginPath()
                    ctx.moveTo(points[0].x, points[0].y)
                    for (let i = 1; i < points.length; i++) {
                        ctx.lineTo(points[i].x, points[i].y)
                    }
                    ctx.closePath()
                    ctx.fillStyle = 'black'
                    ctx.fill()
                }

                // Top View (Left Eye)
                const topLOS = calculateLOSPolygon(bounds.top[0], bounds.top[1], bounds.top[2], bounds.top[3], losPosition)
                drawPolygon(topLOS)

                // Bottom View (Right Eye)
                const bottomLOS = calculateLOSPolygon(bounds.bottom[0], bounds.bottom[1], bounds.bottom[2], bounds.bottom[3], losPosition)
                drawPolygon(bottomLOS)
            }

            // Draw player bboxes if present (merged loop)
            if (players.top.length > 0) {
                if (playerViewMode === 'bounds') {
                    ctx.strokeStyle = 'yellow'
                    ctx.lineWidth = 3

                    players.top.forEach(p => {
                        ctx.strokeRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1)
                    })

                    players.bottom.forEach(p => {
                        ctx.strokeRect(p.x1, p.y1, p.x2 - p.x1, p.y2 - p.y1)
                    })
                } else if (playerViewMode === 'occlude') {
                    // Erase LOS behind players
                    ctx.save()
                    ctx.globalCompositeOperation = 'destination-out'
                    ctx.fillStyle = 'black' // Color doesn't matter for destination-out

                    const drawOcclusion = (p) => {
                        const width = p.x2 - p.x1
                        const height = p.y2 - p.y1
                        const cx = p.x1 + width / 2
                        const cy = p.y1 + height / 2

                        ctx.beginPath()
                        ctx.ellipse(cx, cy, width / 2, height / 2, 0, 0, 2 * Math.PI)
                        ctx.fill()
                    }

                    players.top.forEach(drawOcclusion)
                    players.bottom.forEach(drawOcclusion)

                    ctx.restore()
                }
                // If 'hide', do nothing
            }
        }
    }, [bounds, frameData, hoveredBound, videoUrl, losPosition, players, playerViewMode])



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

        // 100px touch area => 50px radius check
        for (const corner of allCorners) {
            const dist = Math.sqrt((x - corner.x) ** 2 + (y - corner.y) ** 2)
            if (dist < 50) {
                setDraggingBound(corner)
                // NEW: Store offset relative to the corner center
                // If I click at (105, 105) and corner is at (100, 100), offset is (5, 5).
                // During drag, if mouse moves to (115, 115), corner position = mouse (115, 115) - offset (5, 5) = (110, 110).
                setDragOffset({
                    x: x - corner.x,
                    y: y - corner.y
                })
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
            // Use stored offset so marker stays relative to mouse where clicked (no jumping)
            const newX = x - dragOffset.x
            const newY = y - dragOffset.y

            const newBounds = { ...bounds }
            if (draggingBound.type === 'top') {
                newBounds.top[draggingBound.index] = { x: Math.round(newX), y: Math.round(newY) }
            } else {
                newBounds.bottom[draggingBound.index] = { x: Math.round(newX), y: Math.round(newY) }
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
                if (dist < 50) { // Increased hover radius to match hit area
                    nearestCorner = corner
                    break
                }
            }
            setHoveredBound(nearestCorner)
        }
    }

    const handleMouseLeave = () => {
        setDraggingBound(null)
        setHoveredBound(null)
    }

    const handleMouseUp = async () => {
        if (draggingBound) {
            // Save final bound positions to timeline with AABB
            // NEW: Use replace: true to overwrite previous adjustment
            await saveTimelineEntry('bounds_adjusted', {
                top_corners: bounds.top,
                bottom_corners: bounds.bottom,
                top_aabb: getAABB(bounds.top),
                bottom_aabb: getAABB(bounds.bottom)
            }, { replace: true })
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
    const handleDetectPlayers = async (mode = 'fop') => {
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
                    bottom_corners: bounds.bottom,
                    detection_mode: mode,
                    los_position: losPosition
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                const errorMsg = `Player detection failed: ${response.status} - ${errorText}`
                console.error(errorMsg)
                setError(errorMsg)
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

            // Map mode to readable label
            const methodLabels = {
                'full': 'Full Frame',
                'fop': 'Within FOP',
                'los': 'Within LOS'
            }

            // Save timeline entry with full player bbox data AND execution time
            await saveTimelineEntry('players_detected', {
                top_count: data.top_players?.length || 0,
                bottom_count: data.bottom_players?.length || 0,
                similarity: data.similarity || 0,
                top_players: data.top_players || [],
                bottom_players: data.bottom_players || [],
                metadata: data.metadata || {},
                execution_time: executionTime,
                method: methodLabels[mode] || mode
            })

            setLoadingMessage('')
            // setCurrentStep(3) // Removed unused call
        } catch (error) {
            const errorMsg = `Error detecting players: ${error.message}`
            console.error(errorMsg, error)
            setError(errorMsg)
            setErrorLog(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: errorMsg, stack: error.stack }])
            setLoadingMessage(errorMsg)
            // DON'T reset currentStep - stay on current step and show error
        } finally {
            setIsLoading(false)
        }
    }

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

    console.log('SAM2Experiment Render:', { videoUrl, isLoading, showDetect: shouldShowPlayerDetection() })

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

            {error && (
                <div className="error-banner">
                    {error}
                    <button className="close-btn" onClick={() => setError(null)}>×</button>
                </div>
            )}

            <div className="workspace">
                {videoUrl && (
                    <div className="action-panel" style={{ marginBottom: '1rem' }}>
                        {/* Step 2: Detect Players */}
                        {shouldShowPlayerDetection() && (
                            <div className="control-section">
                                <div className="control-label">
                                    Detect Players:
                                    {isLoading && <span className="loading-spinner"></span>}
                                </div>
                                <div className="button-group">
                                    <button
                                        className="action-btn"
                                        onClick={() => handleDetectPlayers('full')}
                                        disabled={isLoading}
                                    >
                                        Full Frame
                                    </button>
                                    <button
                                        className="action-btn"
                                        onClick={() => handleDetectPlayers('fop')}
                                        disabled={isLoading}
                                    >
                                        Within FOP
                                    </button>
                                    <button
                                        className="action-btn"
                                        onClick={() => handleDetectPlayers('los')}
                                        disabled={isLoading}
                                    >
                                        Within LOS
                                    </button>
                                </div>
                            </div>
                        )}

                        {shouldShowSegmentation() && (
                            <div className="control-section">
                                <div className="control-label">
                                    Segmentation:
                                    {isLoading && <span className="loading-spinner"></span>}
                                </div>
                                <div className="button-group">
                                    <button
                                        className="action-btn primary"
                                        onClick={handleSegmentPlayers}
                                        disabled={isLoading}
                                    >
                                        Segment First Frame
                                    </button>
                                    <button
                                        className="action-btn"
                                        onClick={handleSegmentFullVideo}
                                        disabled={isLoading}
                                    >
                                        Segment Full Video
                                    </button>
                                </div>
                            </div>
                        )}

                        {shouldShowBoundsAdjustment() && (
                            <div className="los-control" style={{ marginTop: '1rem', padding: '0.5rem', background: '#333', borderRadius: '4px' }}>
                                {/* View Mode Toggles */}
                                {players.top.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                        <span style={{ color: '#ccc', fontSize: '0.9rem', minWidth: '50px' }}>Players:</span>
                                        <button
                                            onClick={() => setPlayerViewMode('bounds')}
                                            style={{
                                                flex: 1,
                                                padding: '4px',
                                                backgroundColor: playerViewMode === 'bounds' ? '#646cff' : '#444',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Bounds
                                        </button>
                                        <button
                                            onClick={() => setPlayerViewMode('occlude')}
                                            style={{
                                                flex: 1,
                                                padding: '4px',
                                                backgroundColor: playerViewMode === 'occlude' ? '#646cff' : '#444',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Occlude
                                        </button>
                                        <button
                                            onClick={() => setPlayerViewMode('hide')}
                                            style={{
                                                flex: 1,
                                                padding: '4px',
                                                backgroundColor: playerViewMode === 'hide' ? '#646cff' : '#444',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Hide
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

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

                        <SequentialResults
                            experiment={experiment}
                            bounds={bounds}
                            players={players}
                            segmentResult={segmentResult}
                        />

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

                        {/* LOS Slider */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', marginTop: '1rem' }}>
                            <span style={{ color: '#ccc' }}>Line of Scrimmage: {(losPosition * 100).toFixed(1)}%</span>
                            {bounds.top.length === 4 && bounds.bottom.length === 4 && (
                                <span style={{ color: '#666', fontSize: '0.8rem' }}>
                                    {(() => {
                                        const topLOS = calculateLOSPolygon(bounds.top[0], bounds.top[1], bounds.top[2], bounds.top[3], losPosition)
                                        const bottomLOS = calculateLOSPolygon(bounds.bottom[0], bounds.bottom[1], bounds.bottom[2], bounds.bottom[3], losPosition)
                                        const topBox = getAABB(topLOS)
                                        const bottomBox = getAABB(bottomLOS)

                                        const fmt = (b) => `[${Math.round(b.minX)},${Math.round(b.minY)} - ${Math.round(b.maxX)},${Math.round(b.maxY)}]`
                                        return `L-LOS: ${fmt(topBox)}  R-LOS: ${fmt(bottomBox)}`
                                    })()}
                                </span>
                            )}
                        </div>
                        <input
                            id="los-slider"
                            type="range"
                            min="0"
                            max="1"
                            step="0.001"
                            value={losPosition}
                            onChange={(e) => setLosPosition(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                )}

                {/* Error Log */}
                {errorLog.length > 0 && (
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
                )}
            </div>
        </div>
    )
}

export default SAM2Experiment
