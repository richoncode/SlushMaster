import React, { useState, useRef } from 'react'
import './OverlayLayer.css'

function OverlayLayer({ lines, onUpdateLine, width, height }) {
    const [dragging, setDragging] = useState(null) // { lineId, point: 'start' | 'end' }
    const [hoveredLineId, setHoveredLineId] = useState(null)
    const svgRef = useRef(null)

    const handleMouseDown = (e, lineId, point) => {
        e.stopPropagation() // Prevent bubbling to video controls if any
        setDragging({ lineId, point })
    }

    const handleMouseMove = (e) => {
        if (!dragging) return

        const svgRect = svgRef.current.getBoundingClientRect()
        const x = ((e.clientX - svgRect.left) / svgRect.width) * 100
        const y = ((e.clientY - svgRect.top) / svgRect.height) * 100

        // Clamp values to 0-100
        const clampedX = Math.max(0, Math.min(100, x))
        const clampedY = Math.max(0, Math.min(100, y))

        const line = lines.find(l => l.id === dragging.lineId)
        if (line) {
            const updatedLine = { ...line }
            if (dragging.point === 'start') {
                updatedLine.x1 = clampedX
                updatedLine.y1 = clampedY
            } else {
                updatedLine.x2 = clampedX
                updatedLine.y2 = clampedY
            }
            onUpdateLine(updatedLine)
        }
    }

    const handleMouseUp = () => {
        setDragging(null)
    }

    return (
        <svg
            ref={svgRef}
            className="overlay-layer"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {lines.map((line) => {
                const isHovered = line.id === hoveredLineId
                const isDragging = dragging && dragging.lineId === line.id
                const showHandles = isHovered || isDragging

                return (
                    <g
                        key={line.id}
                        onMouseEnter={() => setHoveredLineId(line.id)}
                        onMouseLeave={() => setHoveredLineId(null)}
                        style={{ pointerEvents: 'all' }} // Ensure group captures mouse events
                    >
                        {/* The Line - Invisible thicker stroke for easier hovering */}
                        <line
                            x1={`${line.x1}%`}
                            y1={`${line.y1}%`}
                            x2={`${line.x2}%`}
                            y2={`${line.y2}%`}
                            stroke="transparent"
                            strokeWidth="10"
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                        />

                        {/* The Visible Line */}
                        <line
                            x1={`${line.x1}%`}
                            y1={`${line.y1}%`}
                            x2={`${line.x2}%`}
                            y2={`${line.y2}%`}
                            stroke={line.color || "black"}
                            strokeWidth="2" // Requested 2px thickness
                            vectorEffect="non-scaling-stroke"
                            strokeLinecap="round"
                            style={{ pointerEvents: 'none' }}
                        />

                        {/* Start Handle */}
                        {showHandles && (
                            <circle
                                cx={`${line.x1}%`}
                                cy={`${line.y1}%`}
                                r="4"
                                fill="white"
                                stroke={line.color || "black"}
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                                className="line-handle"
                                onMouseDown={(e) => handleMouseDown(e, line.id, 'start')}
                                style={{ cursor: 'grab' }}
                            />
                        )}

                        {/* End Handle */}
                        {showHandles && (
                            <circle
                                cx={`${line.x2}%`}
                                cy={`${line.y2}%`}
                                r="4"
                                fill="white"
                                stroke={line.color || "black"}
                                strokeWidth="2"
                                vectorEffect="non-scaling-stroke"
                                className="line-handle"
                                onMouseDown={(e) => handleMouseDown(e, line.id, 'end')}
                                style={{ cursor: 'grab' }}
                            />
                        )}
                    </g>
                )
            })}
        </svg>
    )
}

export default OverlayLayer
