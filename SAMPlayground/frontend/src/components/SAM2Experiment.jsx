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
    const [videoDuration, setVideoDuration] = useState(0)
    const [activeFilename, setActiveFilename] = useState(null)
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
    const [fullClipDetectionProgress, setFullClipDetectionProgress] = useState(null) // {percent, message, status}
    const [fullClipDetectionResult, setFullClipDetectionResult] = useState(null) // Download JSON info
    const [error, setError] = useState(null) // Global error state
    const [errorLog, setErrorLog] = useState([]) // Track all errors
    const [draggingBound, setDraggingBound] = useState(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [hoveredBound, setHoveredBound] = useState(null)
    const [losPosition, setLosPosition] = useState(0.281) // 0 to 1, default 28.1% way down field
    const [activeDetectionMethod, setActiveDetectionMethod] = useState(null) // Track active detection method locally
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
            setFullClipDetectionProgress(null)
            setFullClipDetectionResult(null)

            // Restore UI state from timeline ONLY if requested (initial load)
            // This prevents race conditions where saveTimelineEntry triggers restoration that conflicts with ongoing actions
            if (restoreState && data.timeline && data.timeline.length > 0) {
                // Find the latest video_loaded entry
                const videoEntry = data.timeline.find(entry => entry.step_type === 'video_loaded')
                if (videoEntry && videoEntry.data) {
                    const originalUrl = videoEntry.data.video_url
                    const filename = originalUrl.split('/').pop()
                    setActiveFilename(filename)

                    // Fetch video as blob to bypass tainted canvas issues
                    try {
                        const blobResponse = await fetch(originalUrl)
                        const blob = await blobResponse.blob()
                        const objectUrl = URL.createObjectURL(blob)
                        setVideoUrl(objectUrl)
                        // Capture duration
                        const tempVideo = document.createElement('video');
                        tempVideo.src = objectUrl;
                        tempVideo.onloadedmetadata = () => {
                            setVideoDuration(tempVideo.duration);
                        };
                    } catch (blobError) {
                        console.error('Error fetching video blob:', blobError)
                        setVideoUrl(originalUrl) // Fallback
                    }

                    // Re-trigger video loading to get bounds
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

                            let topCorners = boundsData.top_corners
                            let bottomCorners = boundsData.bottom_corners
                            let finalLOS = 0.281 // Default

                            // Special defaults for Football Test Clips
                            if (filename === 'cfb-pre-snap.mp4') {
                                topCorners = [
                                    { x: 951, y: 898 },   // p1
                                    { x: 2985, y: 900 },  // p2
                                    { x: 3555, y: 1364 }, // p3
                                    { x: 408, y: 1367 }   // p4
                                ]
                                bottomCorners = [
                                    { x: 863, y: 3056 },  // p1
                                    { x: 2888, y: 3059 }, // p2
                                    { x: 3423, y: 3524 }, // p3
                                    { x: 288, y: 3517 }   // p4
                                ]
                                finalLOS = 0.715
                            } else if (filename === 'cfb-20251219-NCS-MEM-15sec.mp4') {
                                topCorners = [
                                    { x: 949, y: 900 },   // p1
                                    { x: 2979, y: 900 },  // p2
                                    { x: 3545, y: 1354 }, // p3
                                    { x: 417, y: 1364 }   // p4
                                ]
                                bottomCorners = [
                                    { x: 873, y: 3056 },  // p1
                                    { x: 2894, y: 3059 }, // p2
                                    { x: 3426, y: 3521 }, // p3
                                    { x: 297, y: 3520 }   // p4
                                ]
                                finalLOS = 0.5
                            }

                            if (boundsEntry && boundsEntry.data) {
                                setBounds({
                                    top: boundsEntry.data.top_corners || topCorners,
                                    bottom: boundsEntry.data.bottom_corners || bottomCorners
                                })
                                // Restore LOS position if available in timeline
                                if (boundsEntry.data.los_position !== undefined) {
                                    setLosPosition(boundsEntry.data.los_position)
                                } else if (filename === 'cfb-pre-snap.mp4') {
                                    setLosPosition(0.715)
                                } else if (filename === 'cfb-20251219-NCS-MEM-15sec.mp4') {
                                    setLosPosition(0.5)
                                }
                            } else {
                                setBounds({ top: topCorners, bottom: bottomCorners })
                                setLosPosition(finalLOS)
                            }

                            // Check for player detection
                            const playersEntry = data.timeline.slice().reverse().find(entry => entry.step_type === 'players_detected')
                            if (playersEntry && playersEntry.data) {
                                // Set active method from timeline
                                const method = playersEntry.data.method // 'Full Frame', 'Within FOP', or 'Within LOS' (mapped values)
                                // We need to map back to ID or just store the label. 
                                // The state uses ID ('full', 'fop', 'los') for logic but our timeline stores mapped labels.
                                // Let's try to normalize.
                                let methodId = null
                                if (method === 'Full Frame' || method === 'Full') methodId = 'full'
                                else if (method === 'Within FOP' || method === 'FOP') methodId = 'fop'
                                else if (method === 'Within LOS' || method === 'LOS') methodId = 'los'

                                setActiveDetectionMethod(methodId)

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

    // Cleanup object URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            if (videoUrl && videoUrl.startsWith('blob:')) {
                URL.revokeObjectURL(videoUrl)
            }
        }
    }, [videoUrl])

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

        setError(null)
        const filename = url.split('/').pop()
        setActiveFilename(filename)
        setFullClipDetectionProgress(null)
        setFullClipDetectionResult(null)

        // Fetch video as blob to bypass tainted canvas issues
        setIsLoading(true)
        setLoadingMessage('Loading video stream...')
        try {
            const blobResponse = await fetch(url)
            const blob = await blobResponse.blob()
            const objectUrl = URL.createObjectURL(blob)
            setVideoUrl(objectUrl)

            // Get duration once blob is loaded
            const tempVideo = document.createElement('video');
            tempVideo.src = objectUrl;
            tempVideo.onloadedmetadata = () => {
                setVideoDuration(tempVideo.duration);
            };
        } catch (blobError) {
            console.error('Error fetching video blob:', blobError)
            setVideoUrl(url) // Fallback
        }

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

            let topCorners = data.top_corners
            let bottomCorners = data.bottom_corners
            let finalLOS = 0.281 // Default

            // Special defaults for Football Test Clips
            if (filename === 'cfb-pre-snap.mp4') {
                console.log('Applying football defaults for cfb-pre-snap.mp4')
                topCorners = [
                    { x: 951, y: 898 },   // p1
                    { x: 2985, y: 900 },  // p2
                    { x: 3555, y: 1364 }, // p3
                    { x: 408, y: 1367 }   // p4
                ]
                bottomCorners = [
                    { x: 863, y: 3056 },  // p1
                    { x: 2888, y: 3059 }, // p2
                    { x: 3423, y: 3524 }, // p3
                    { x: 288, y: 3517 }   // p4
                ]
                finalLOS = 0.715
            } else if (filename === 'cfb-20251219-NCS-MEM-15sec.mp4') {
                console.log('Applying football defaults for cfb-20251219-NCS-MEM-15sec.mp4')
                topCorners = [
                    { x: 949, y: 900 },   // p1
                    { x: 2979, y: 900 },  // p2
                    { x: 3545, y: 1354 }, // p3
                    { x: 417, y: 1364 }   // p4
                ]
                bottomCorners = [
                    { x: 873, y: 3056 },  // p1
                    { x: 2894, y: 3059 }, // p2
                    { x: 3426, y: 3521 }, // p3
                    { x: 297, y: 3520 }   // p4
                ]
                finalLOS = 0.5
            }

            setFrameData({ ...data, top_corners: topCorners, bottom_corners: bottomCorners })
            setBounds({ top: topCorners, bottom: bottomCorners })
            setLosPosition(finalLOS)
            console.log('Set bounds and LOS:', { top: topCorners, bottom: bottomCorners, los: finalLOS })

            // Save initial bounds to timeline so they persist
            await saveTimelineEntry('bounds_adjusted', {
                top_corners: topCorners,
                bottom_corners: bottomCorners,
                top_aabb: getAABB(topCorners),
                bottom_aabb: getAABB(bottomCorners),
                los_position: finalLOS
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
            if (players.top.length > 0 || players.bottom.length > 0) {
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
        // Immediate UI feedback
        setActiveDetectionMethod(mode)

        const filename = activeFilename

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
                'los': 'Within LOS',
                'grid': 'FOP using Grid'
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
                method: methodLabels[mode] || mode,
                frame_number: data.metadata?.frame_number ?? 0,
                video_timestamp: data.metadata?.video_timestamp ?? 0.0
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

    const handleDetectPlayersFullVideo = async (mode = 'fop') => {
        const filename = activeFilename
        if (!filename) return

        setFullClipDetectionProgress({ percent: 0, message: 'Initializing...', status: 'starting' })
        setFullClipDetectionResult(null)

        try {
            const response = await fetch('http://localhost:8000/detect-players-full-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename,
                    experiment_id: experimentId,
                    top_corners: bounds.top,
                    bottom_corners: bounds.bottom,
                    detection_mode: mode,
                    los_position: losPosition
                })
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(`Failed to start full video detection: ${errorText}`)
            }

            // Start polling for progress
            const pollInterval = setInterval(async () => {
                try {
                    const progressResponse = await fetch(`http://localhost:8000/detection-progress/${filename}`)
                    const progressData = await progressResponse.json()

                    setFullClipDetectionProgress({
                        percent: progressData.percent || 0,
                        message: progressData.message || 'Processing...',
                        status: progressData.status,
                        current_frame: progressData.current_frame,
                        total_frames: progressData.total_frames
                    })

                    if (progressData.status === 'completed') {
                        clearInterval(pollInterval)
                        setFullClipDetectionResult(progressData)

                        // Map mode to readable label
                        const methodLabels = {
                            'full': 'Full Frame',
                            'fop': 'Within FOP',
                            'los': 'Within LOS',
                            'grid': 'FOP using Grid'
                        }

                        // Save to timeline
                        await saveTimelineEntry('full_clip_detection_completed', {
                            method: methodLabels[mode] || mode,
                            total_frames: progressData.total_frames,
                            file_size: progressData.file_size,
                            execution_time: progressData.execution_time,
                            result_url: progressData.result_url,
                            filename: progressData.filename
                        })
                    } else if (progressData.status === 'error') {
                        clearInterval(pollInterval)
                        setError(`❌ Detection error: ${progressData.message}`)
                    }
                } catch (error) {
                    console.error('Error polling detection progress:', error)
                }
            }, 1000)

        } catch (error) {
            console.error('Error starting full video detection:', error)
            setFullClipDetectionProgress({ percent: 0, message: `Error: ${error.message}`, status: 'error' })
            setError(error.message)
        }
    }

    // Step 3: Segment players
    const handleSegmentPlayers = async () => {
        const filename = activeFilename

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
        const filename = activeFilename

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

    const handleDownloadBitmap = () => {
        console.log('handleDownloadBitmap triggered');
        if (!videoRef.current || !canvasRef.current) {
            console.error('Missing refs:', { video: !!videoRef.current, canvas: !!canvasRef.current });
            return;
        }

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            console.log('Video dimensions:', video.videoWidth, 'x', video.videoHeight);
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                console.warn('Video not ready or has 0 dimensions');
                return;
            }

            // Create a temporary canvas at full video resolution
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = video.videoWidth;
            tempCanvas.height = video.videoHeight;
            const ctx = tempCanvas.getContext('2d');

            // 1. Draw the current video frame
            ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

            // 2. Draw the overlay canvas on top
            ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

            // 3. Trigger download
            const timestamp = new Date().getTime();
            const link = document.createElement('a');
            const downloadName = activeFilename ? `${activeFilename.split('.')[0]}_overlay_${timestamp}.png` : `frame_overlay_${timestamp}.png`;
            link.download = downloadName;
            try {
                link.href = tempCanvas.toDataURL('image/png');
                console.log('Download link created');
                link.click();
            } catch (securityError) {
                console.error('Security Error (likely CORS):', securityError);
                setError('Could not download image due to a security restriction (CORS). Please ensure the video server permits cross-origin requests.');
            }
        } catch (err) {
            console.error('Error during bitmap download:', err);
            setError(`Error downloading bitmap: ${err.message}`);
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
                                onClick={() => handleVideoLoaded('http://localhost:8000/video/cfb-20251219-NCS-MEM-15sec.mp4', 'test')}
                            >
                                🏈 ESPN-LOS Test
                            </button>
                            <button
                                className="secondary-button"
                                onClick={() => handleVideoLoaded('http://localhost:8000/video/usmnt-1min-2.mp4', 'test')}
                            >
                                🎬 USMNT Clip
                            </button>
                            <button
                                className="secondary-button"
                                onClick={() => handleVideoLoaded('http://localhost:8000/video/soccer_test_5s.mp4', 'test')}
                            >
                                ⚽ 5-sec Soccer
                            </button>
                            <button
                                className="secondary-button"
                                onClick={() => handleVideoLoaded('http://localhost:8000/video/cfb-pre-snap.mp4', 'test')}
                            >
                                🏈 5-sec Football
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

                        <div className="video-controls-group" style={{
                            marginTop: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            padding: '12px',
                            background: '#1a1a1a',
                            borderRadius: '8px',
                            border: '1px solid #333',
                            width: '100%',
                            boxSizing: 'border-box'
                        }}>
                            {/* Row 1: Player Mode and Download */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 500 }}>Display as:</span>
                                    <div className="button-group" style={{ display: 'flex' }}>
                                        {['bounds', 'occlude', 'hide'].map((mode) => (
                                            <button
                                                key={mode}
                                                onClick={() => setPlayerViewMode(mode)}
                                                style={{
                                                    padding: '4px 12px',
                                                    fontSize: '0.8rem',
                                                    backgroundColor: playerViewMode === mode ? '#646cff' : '#444',
                                                    border: '1px solid #555',
                                                    borderRight: mode === 'hide' ? '1px solid #555' : 'none',
                                                    borderRadius: mode === 'bounds' ? '4px 0 0 4px' : mode === 'hide' ? '0 4px 4px 0' : '0',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontWeight: playerViewMode === mode ? '600' : 'normal',
                                                    opacity: playerViewMode === mode ? 1 : 0.8
                                                }}
                                                onMouseOver={(e) => { if (playerViewMode !== mode) e.currentTarget.style.backgroundColor = '#555'; e.currentTarget.style.opacity = '1'; }}
                                                onMouseOut={(e) => { if (playerViewMode !== mode) e.currentTarget.style.backgroundColor = '#444'; if (playerViewMode !== mode) e.currentTarget.style.opacity = '0.8'; }}
                                            >
                                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    className="secondary-button"
                                    onClick={handleDownloadBitmap}
                                    style={{
                                        padding: '6px 16px',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        margin: 0,
                                        background: '#333',
                                        border: '1px solid #444'
                                    }}
                                >
                                    🖼️ Download Bitmap
                                </button>
                            </div>

                            {/* Row 2: LOS Slider */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <span style={{ color: '#ccc', fontSize: '0.85rem' }}>
                                        Line of Scrimmage: <strong style={{ color: '#646cff' }}>{(losPosition * 100).toFixed(1)} yards</strong>
                                    </span>
                                    {bounds.top.length === 4 && bounds.bottom.length === 4 && (
                                        <div style={{ color: '#888', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                            {(() => {
                                                const topLOS = calculateLOSPolygon(bounds.top[0], bounds.top[1], bounds.top[2], bounds.top[3], losPosition)
                                                const bottomLOS = calculateLOSPolygon(bounds.bottom[0], bounds.bottom[1], bounds.bottom[2], bounds.bottom[3], losPosition)
                                                const fmt = (b) => {
                                                    const aabb = getAABB(b);
                                                    return `[${Math.round(aabb.minX)},${Math.round(aabb.minY)} - ${Math.round(aabb.maxX)},${Math.round(aabb.maxY)}]`
                                                }
                                                return `L-LOS: ${fmt(topLOS)} | R-LOS: ${fmt(bottomLOS)}`
                                            })()}
                                        </div>
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
                                    style={{ width: '100%', height: '6px', cursor: 'pointer', accentColor: '#646cff' }}
                                />
                            </div>
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

                        {/* View Mode Toggles - Moved here */}
                        {/* Detection Buttons - Moved here just above Players UI */}
                        {shouldShowPlayerDetection() && (
                            <div className="control-section" style={{ marginTop: '1rem', borderTop: '1px solid #333', paddingTop: '1rem' }}>
                                <div className="button-group" style={{ display: 'flex', gap: '10px' }}>
                                    <span style={{ color: '#ccc', fontSize: '0.9rem', minWidth: '100px', alignSelf: 'center' }}>Detect Players:</span>
                                    <div style={{ display: 'flex', flex: 1 }}>
                                        {['Full', 'FOP', 'LOS', 'Grid'].map((mode, idx) => {
                                            const modeId = mode.toLowerCase()
                                            const label = mode === 'Full'
                                                ? 'Full Frame'
                                                : mode === 'Grid'
                                                    ? 'FOP using Grid'
                                                    : `Within ${mode}`

                                            // Find latest result for this specific mode
                                            const lastRun = experiment?.timeline?.slice().reverse().find(e =>
                                                e.step_type === 'players_detected' &&
                                                (e.data?.method === label || e.data?.method === mode)
                                            )

                                            const isActive = activeDetectionMethod === modeId

                                            // Calc estimate using state duration OR video ref duration as fallback
                                            const activeDuration = videoDuration || videoRef.current?.duration || 0;

                                            const estTimeSec = (lastRun && activeDuration)
                                                ? (lastRun.data.execution_time * (activeDuration * 30)).toFixed(0)
                                                : 0;

                                            const estHours = Math.floor(estTimeSec / 3600);
                                            const estMins = Math.floor((estTimeSec % 3600) / 60);
                                            const estSecs = estTimeSec % 60;
                                            const estStr = estHours > 0
                                                ? `${estHours}h ${estMins}m`
                                                : estMins > 0
                                                    ? `${estMins}m ${estSecs}s`
                                                    : `${estSecs}s`;

                                            return (
                                                <button
                                                    key={mode}
                                                    onClick={() => handleDetectPlayers(modeId)}
                                                    disabled={isLoading}
                                                    style={{
                                                        flex: 1,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '10px 12px',
                                                        backgroundColor: isActive ? '#646cff' : '#444',
                                                        border: '1px solid #555',
                                                        borderRight: idx < 3 ? 'none' : '1px solid #555',
                                                        borderLeft: idx > 0 ? 'none' : '1px solid #555',
                                                        borderRadius: idx === 0 ? '4px 0 0 4px' : idx === 3 ? '0 4px 4px 0' : '0',
                                                        color: 'white',
                                                        cursor: 'pointer',
                                                        minHeight: '80px',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{label}</span>
                                                    {lastRun ? (
                                                        <div style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            marginTop: '6px',
                                                            gap: '2px'
                                                        }}>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                opacity: 0.9,
                                                                padding: '1px 6px',
                                                                background: 'rgba(0,0,0,0.2)',
                                                                borderRadius: '3px',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {lastRun.data.execution_time?.toFixed(1)}s | L:{lastRun.data.top_count} R:{lastRun.data.bottom_count}
                                                            </span>
                                                            <span style={{ fontSize: '0.65rem', opacity: 0.7, whiteSpace: 'nowrap' }}>
                                                                Clip: {activeDuration > 0 ? activeDuration.toFixed(1) : '?.?'}s | Est: {activeDuration > 0 ? estStr : '...'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '6px' }}>
                                                            Not run
                                                        </span>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Entire Clip Detection Row */}
                                <div className="button-group" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                    <span style={{ color: '#ccc', fontSize: '0.9rem', minWidth: '100px', alignSelf: 'center' }}>Entire Clip:</span>
                                    <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
                                        {['Full', 'FOP', 'LOS', 'Grid'].map((mode, idx) => {
                                            const modeId = mode.toLowerCase()
                                            const label = mode === 'Full' ? 'Full Frame' : mode === 'Grid' ? 'FOP using Grid' : `Within ${mode}`
                                            const isRunning = fullClipDetectionProgress?.status === 'processing' || fullClipDetectionProgress?.status === 'starting';

                                            // Find latest full-clip run for this specific mode
                                            const lastFullRun = experiment?.timeline?.slice().reverse().find(e =>
                                                e.step_type === 'full_clip_detection_completed' &&
                                                (e.data?.method === label || e.data?.method === mode)
                                            )

                                            return (
                                                <button
                                                    key={`clip-${mode}`}
                                                    onClick={() => handleDetectPlayersFullVideo(modeId)}
                                                    disabled={isLoading || isRunning}
                                                    style={{
                                                        flex: 1,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '10px 12px',
                                                        backgroundColor: '#222',
                                                        border: '1px solid #555',
                                                        borderRight: idx < 3 ? 'none' : '1px solid #555',
                                                        borderLeft: idx > 0 ? 'none' : '1px solid #555',
                                                        borderRadius: idx === 0 ? '4px 0 0 4px' : idx === 3 ? '0 4px 4px 0' : '0',
                                                        color: 'white',
                                                        cursor: (isLoading || isRunning) ? 'not-allowed' : 'pointer',
                                                        minHeight: '80px',
                                                        transition: 'background-color 0.2s',
                                                        opacity: (isLoading || isRunning) ? 0.6 : 1
                                                    }}
                                                >
                                                    <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{label}</span>
                                                    {lastFullRun && (
                                                        <div style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            marginTop: '6px',
                                                            gap: '2px'
                                                        }}>
                                                            <span style={{
                                                                fontSize: '0.65rem',
                                                                opacity: 0.9,
                                                                whiteSpace: 'nowrap',
                                                                padding: '1px 5px',
                                                                background: 'rgba(40,167,69,0.3)',
                                                                borderRadius: '3px'
                                                            }}>
                                                                {lastFullRun.data.execution_time?.toFixed(1)}s | {(lastFullRun.data.file_size / 1024 / 1024).toFixed(2)}MB
                                                            </span>
                                                            <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>
                                                                {new Date(lastFullRun.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    )}
                                                </button>
                                            )
                                        })}
                                        {fullClipDetectionProgress && fullClipDetectionProgress.status !== 'completed' && (
                                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', zIndex: 10 }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: '0.8rem', color: '#646cff', fontWeight: 'bold' }}>{fullClipDetectionProgress.percent}%</div>
                                                    <div style={{ fontSize: '0.6rem', color: '#ccc', whiteSpace: 'nowrap' }}>{fullClipDetectionProgress.message}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
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
