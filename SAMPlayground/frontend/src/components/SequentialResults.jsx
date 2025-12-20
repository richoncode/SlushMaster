import React from 'react'
import './SequentialResults.css'

function SequentialResults({ experiment, bounds, players, segmentResult }) {
    if (!experiment || !experiment.timeline || experiment.timeline.length === 0) {
        return null
    }

    const formatDuration = (timestamp, nextTimestamp) => {
        if (!nextTimestamp) return null
        const start = new Date(timestamp)
        const end = new Date(nextTimestamp)
        const diff = (end - start) / 1000 // seconds
        return diff < 60 ? `${diff.toFixed(1)}s` : `${(diff / 60).toFixed(1)}m`
    }

    const handleDownloadJSON = (entry) => {
        const transformPlayer = (p) => ({
            centerX: Math.round((p.x1 + p.x2) / 2),
            centerY: Math.round((p.y1 + p.y2) / 2),
            radiusX: Math.round((p.x2 - p.x1) / 2),
            radiusY: Math.round((p.y2 - p.y1) / 2),
            confidence: parseFloat((p.confidence || 0).toFixed(4))
        })

        // Find the most recent bounds entry before or at this detection
        const entryIndex = experiment.timeline.indexOf(entry)
        const boundsEntry = experiment.timeline
            .slice(0, entryIndex + 1)
            .reverse()
            .find(e => e.step_type === 'bounds_adjusted')

        const data = {
            timestamp: entry.timestamp,
            method: entry.data.method,
            fop_corners: {
                left: boundsEntry?.data?.top_corners || [],
                right: boundsEntry?.data?.bottom_corners || []
            },
            frame: {
                videoTimestamp: entry.data.video_timestamp ?? 0.0,
                frameNumber: entry.data.frame_number ?? 0,
                left_view: (entry.data.top_players || []).map(transformPlayer),
                right_view: (entry.data.bottom_players || []).map(transformPlayer)
            }
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `detection_${new Date(entry.timestamp).getTime()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const renderEntry = (entry, index, timeline) => {
        const duration = index < timeline.length - 1 ? formatDuration(entry.timestamp, timeline[index + 1].timestamp) : null

        // Defensive check for data
        if (!entry.data) return null

        switch (entry.step_type) {
            case 'video_loaded':
                return (
                    <div key={entry.id || index} className="result-entry video-entry">
                        <div className="entry-header">
                            <span className="entry-icon">🎬</span>
                            <span className="entry-title">Video Loaded</span>
                            {duration && <span className="entry-duration">{duration}</span>}
                        </div>
                        <div className="entry-content">
                            <p className="video-name">{entry.data.video_name || 'Unknown Video'}</p>
                            {entry.data.video_type === 'test' && <span className="badge">Test Clip</span>}
                        </div>
                    </div>
                )

            case 'bounds_adjusted':
                const disparities = (entry.data.top_corners && entry.data.bottom_corners)
                    ? entry.data.top_corners.map((p, i) => {
                        const bottomP = entry.data.bottom_corners[i]
                        return bottomP ? p.x - bottomP.x : null
                    })
                    : []

                return (
                    <div key={entry.id || index} className="result-entry bounds-entry">
                        <div className="entry-header" style={{ alignItems: 'flex-start' }}>
                            <span className="entry-icon">📐</span>
                            <span className="entry-title">Field Bounds Set</span>
                            {disparities.length === 4 && (
                                <div style={{ marginLeft: '1rem', fontSize: '0.8rem', color: '#aaa', display: 'grid', gridTemplateColumns: 'min-content auto auto', columnGap: '1rem', rowGap: '0.2rem' }}>
                                    {/* Row 1 */}
                                    <span>Disparity:</span>
                                    <span>p1:{disparities[0]}</span>
                                    <span>p2:{disparities[1]}</span>

                                    {/* Row 2 */}
                                    <span></span>
                                    <span>p4:{disparities[3]}</span>
                                    <span>p3:{disparities[2]}</span>

                                    {/* Row 3 */}
                                    <span>Range:</span>
                                    <span>L:{disparities[3] - disparities[0]}</span>
                                    <span>R:{disparities[2] - disparities[1]}</span>
                                </div>
                            )}
                            {duration && <span className="entry-duration" style={{ alignSelf: 'center' }}>{duration}</span>}
                        </div>
                        <div className="entry-content">
                            <div className="bounds-group">
                                <h5>Left Stereo View (Top)</h5>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                    <div className="coord-list">
                                        {(entry.data.top_corners || []).map((p, i) => (
                                            <span key={i} className="coord-tag">p{i + 1}:({p.x}, {p.y})</span>
                                        ))}
                                    </div>
                                    {entry.data.top_aabb && (
                                        <div className="aabb-info" style={{ marginLeft: 'auto' }}>
                                            <strong>AABB:</strong>
                                            Min({entry.data.top_aabb.minX}, {entry.data.top_aabb.minY}) -
                                            Max({entry.data.top_aabb.maxX}, {entry.data.top_aabb.maxY})
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="bounds-group" style={{ marginTop: '0.5rem' }}>
                                <h5>Right Stereo View (Bottom)</h5>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div className="coord-list">
                                        {(entry.data.bottom_corners || []).map((p, i) => (
                                            <span key={i} className="coord-tag">p{i + 1}:({p.x}, {p.y})</span>
                                        ))}
                                    </div>
                                    {entry.data.bottom_aabb && (
                                        <div className="aabb-info" style={{ marginLeft: 'auto' }}>
                                            <strong>AABB:</strong>
                                            Min({entry.data.bottom_aabb.minX}, {entry.data.bottom_aabb.minY}) -
                                            Max({entry.data.bottom_aabb.maxX}, {entry.data.bottom_aabb.maxY})
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )

            case 'players_detected':
                const boundsEntry = timeline.slice(0, index).reverse().find(e => e.step_type === 'bounds_adjusted')
                const method = entry.data.method || 'Unknown'
                const isFOP = method.toLowerCase().includes('fop')
                const isFull = method.toLowerCase().includes('full')

                const getBoundsText = (aabb) => {
                    if (!aabb) return 'N/A'
                    return `[${Math.round(aabb.minX)}, ${Math.round(aabb.minY)} - ${Math.round(aabb.maxX)}, ${Math.round(aabb.maxY)}]`
                }

                return (
                    <div key={entry.id || index} className="result-entry players-entry">
                        <div className="entry-header" style={{ flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                <span className="entry-icon">👥</span>
                                <span className="entry-title" style={{ flex: 'none' }}>Players Detected</span>
                                <span className="detection-method-badge" style={{
                                    marginLeft: '0.5rem',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: '#333',
                                    color: '#fff',
                                    fontSize: '0.8rem',
                                    border: '1px solid #555',
                                    alignSelf: 'center'
                                }}>
                                    {method} Mode
                                </span>
                                {entry.data.execution_time !== undefined ? (
                                    <span className="entry-duration" style={{ marginLeft: '0.5rem' }} title="Execution time">
                                        ⏱️ {entry.data.execution_time.toFixed(2)}s
                                    </span>
                                ) : (
                                    duration && <span className="entry-duration" style={{ marginLeft: '0.5rem' }}>{duration}</span>
                                )}
                                <button
                                    className="download-json-btn"
                                    onClick={() => handleDownloadJSON(entry)}
                                    title="Download detection data as JSON"
                                    style={{
                                        marginLeft: 'auto',
                                        background: '#444',
                                        border: '1px solid #555',
                                        borderRadius: '4px',
                                        color: '#fff',
                                        padding: '4px 8px',
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    📥 JSON
                                </button>
                            </div>
                            <div className="similarity" style={{ fontSize: '0.9rem', color: '#aaa' }}>
                                Stereo Similarity: {((entry.data.similarity || 0) * 100).toFixed(0)}%
                            </div>
                        </div>
                        <div className="entry-content">
                            {/* Detailed Player Lists with Counts merged in */}
                            <div className="player-lists-detail" style={{ marginTop: '0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

                                {/* Left View Column */}
                                <div className="player-list-group">
                                    <div className="column-header" style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #444' }}>
                                        <h5 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>
                                            Left (Top View) <span style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.5rem' }}>{entry.data.top_count || 0}</span>
                                        </h5>
                                        {!isFull && boundsEntry?.data?.top_aabb && (
                                            <div className="badge-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#888' }}>
                                                Bounds: {getBoundsText(boundsEntry.data.top_aabb)}
                                            </div>
                                        )}
                                        {isFull && <div className="badge-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#888' }}>Full Frame</div>}
                                    </div>

                                    <div className="player-items-scroll" style={{ maxHeight: '200px', overflowY: 'auto', background: '#222', padding: '0.5rem', borderRadius: '4px' }}>
                                        {(entry.data.top_players || []).map((p, i) => (
                                            <div key={i} style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.25rem' }}>
                                                #{i + 1}: ({p.x1}, {p.y1}) → ({p.x2}, {p.y2}) <span style={{ color: '#666' }}>[{p.confidence?.toFixed(2)}]</span>
                                            </div>
                                        ))}
                                        {(!entry.data.top_players || entry.data.top_players.length === 0) && <div style={{ fontSize: '0.8rem', color: '#666' }}>No players</div>}
                                    </div>
                                </div>

                                {/* Right View Column */}
                                <div className="player-list-group">
                                    <div className="column-header" style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #444' }}>
                                        <h5 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>
                                            Right (Bottom View) <span style={{ background: '#333', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.5rem' }}>{entry.data.bottom_count || 0}</span>
                                        </h5>
                                        {!isFull && boundsEntry?.data?.bottom_aabb && (
                                            <div className="badge-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#888' }}>
                                                Bounds: {getBoundsText(boundsEntry.data.bottom_aabb)}
                                            </div>
                                        )}
                                        {isFull && <div className="badge-text" style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: '#888' }}>Full Frame</div>}
                                    </div>

                                    <div className="player-items-scroll" style={{ maxHeight: '200px', overflowY: 'auto', background: '#222', padding: '0.5rem', borderRadius: '4px' }}>
                                        {(entry.data.bottom_players || []).map((p, i) => (
                                            <div key={i} style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.25rem' }}>
                                                #{i + 1}: ({p.x1}, {p.y1}) → ({p.x2}, {p.y2}) <span style={{ color: '#666' }}>[{p.confidence?.toFixed(2)}]</span>
                                            </div>
                                        ))}
                                        {(!entry.data.bottom_players || entry.data.bottom_players.length === 0) && <div style={{ fontSize: '0.8rem', color: '#666' }}>No players</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )

            case 'segmentation_completed':
                return (
                    <div key={entry.id || index} className="result-entry segmentation-entry">
                        <div className="entry-header">
                            <span className="entry-icon">✨</span>
                            <span className="entry-title">Segmentation Complete</span>
                            {duration && <span className="entry-duration">{duration}</span>}
                        </div>
                        <div className="entry-content">
                            {entry.data.result_url && (
                                <div className="result-preview">
                                    <img src={entry.data.result_url} alt="Segmentation result" />
                                </div>
                            )}
                            <div className="player-counts">
                                <span>Left: {entry.data.top_player_count}</span>
                                <span>Right: {entry.data.bottom_player_count}</span>
                            </div>
                        </div>
                    </div>
                )

            case 'error':
                return (
                    <div key={entry.id || index} className="result-entry error-entry">
                        <div className="entry-header">
                            <span className="entry-icon">⚠️</span>
                            <span className="entry-title">Error</span>
                        </div>
                        <div className="entry-content">
                            <p className="error-message">{entry.data.message}</p>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <div className="sequential-results">
            {experiment.timeline.map((entry, index) => renderEntry(entry, index, experiment.timeline))}
        </div>
    )
}

export default SequentialResults
