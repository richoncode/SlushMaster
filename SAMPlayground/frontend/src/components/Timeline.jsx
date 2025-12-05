import React from 'react'
import './Timeline.css'

function Timeline({ entries = [] }) {
    const formatTimestamp = (isoString) => {
        const date = new Date(isoString)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }

    const renderTimelineEntry = (entry) => {
        const { step_type, timestamp, data } = entry

        switch (step_type) {
            case 'video_loaded':
                return (
                    <div className="timeline-entry" key={entry.id}>
                        <div className="timeline-marker video"></div>
                        <div className="timeline-content">
                            <div className="timeline-header">
                                <span className="timeline-title">Video Loaded</span>
                                <span className="timeline-time">{formatTimestamp(timestamp)}</span>
                            </div>
                            <div className="timeline-details">
                                <p>📹 {data?.video_name || data?.video_url?.split('/').pop()}</p>
                                {data?.video_type && <p className="meta">Type: {data.video_type}</p>}
                            </div>
                        </div>
                    </div>
                )

            case 'bounds_adjusted':
                return (
                    <div className="timeline-entry" key={entry.id}>
                        <div className="timeline-marker bounds"></div>
                        <div className="timeline-content">
                            <div className="timeline-header">
                                <span className="timeline-title">Axis Aligned Field Bounds Adjusted</span>
                                <span className="timeline-time">{formatTimestamp(timestamp)}</span>
                            </div>
                            <div className="timeline-details">
                                {data?.top_corners && (
                                    <p>🔵 Left (Top): {data.top_corners.length} corners</p>
                                )}
                                {data?.bottom_corners && (
                                    <p>🔴 Right (Bottom): {data.bottom_corners.length} corners</p>
                                )}
                            </div>
                        </div>
                    </div>
                )

            case 'players_detected':
                return (
                    <div className="timeline-entry" key={entry.id}>
                        <div className="timeline-marker players"></div>
                        <div className="timeline-content">
                            <div className="timeline-header">
                                <span className="timeline-title">Players Detected</span>
                                <span className="timeline-time">{formatTimestamp(timestamp)}</span>
                            </div>
                            <div className="timeline-details">
                                <div className="player-counts">
                                    <span className="count-badge">Left: {data?.top_count || 0}</span>
                                    <span className="count-badge">Right: {data?.bottom_count || 0}</span>
                                    {data?.similarity !== undefined && (
                                        <span className="count-badge">Similarity: {(data.similarity * 100).toFixed(0)}%</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )

            case 'segmentation_completed':
                return (
                    <div className="timeline-entry" key={entry.id}>
                        <div className="timeline-marker segmentation"></div>
                        <div className="timeline-content">
                            <div className="timeline-header">
                                <span className="timeline-title">Segmentation Completed</span>
                                <span className="timeline-time">{formatTimestamp(timestamp)}</span>
                            </div>
                            <div className="timeline-details">
                                {data?.result_url && (
                                    <img
                                        src={data.result_url}
                                        alt="Segmentation result"
                                        className="result-thumbnail"
                                    />
                                )}
                                <p>Segmented {(data?.top_player_count || 0) + (data?.bottom_player_count || 0)} players total</p>
                            </div>
                        </div>
                    </div>
                )

            case 'error':
                return (
                    <div className="timeline-entry error" key={entry.id}>
                        <div className="timeline-marker error"></div>
                        <div className="timeline-content">
                            <div className="timeline-header">
                                <span className="timeline-title">Error</span>
                                <span className="timeline-time">{formatTimestamp(timestamp)}</span>
                            </div>
                            <div className="timeline-details error">
                                <p>❌ {data?.message || 'Unknown error'}</p>
                                {data?.stack && (
                                    <pre className="error-stack">{data.stack}</pre>
                                )}
                            </div>
                        </div>
                    </div>
                )

            default:
                return (
                    <div className="timeline-entry" key={entry.id}>
                        <div className="timeline-marker default"></div>
                        <div className="timeline-content">
                            <div className="timeline-header">
                                <span className="timeline-title">{step_type}</span>
                                <span className="timeline-time">{formatTimestamp(timestamp)}</span>
                            </div>
                            {data && Object.keys(data).length > 0 && (
                                <div className="timeline-details">
                                    <pre>{JSON.stringify(data, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    </div>
                )
        }
    }

    if (!entries || entries.length === 0) {
        return (
            <div className="timeline-empty">
                <p>No timeline entries yet</p>
                <p className="hint">Actions will appear here as you work through the experiment</p>
            </div>
        )
    }

    return (
        <div className="timeline">
            <h3>Experiment Timeline</h3>
            <div className="timeline-entries">
                {entries.map(renderTimelineEntry)}
            </div>
        </div>
    )
}

export default Timeline
