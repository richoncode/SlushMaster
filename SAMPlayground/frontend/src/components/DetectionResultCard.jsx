import React from 'react'
import './SequentialResults.css' // Reusing existing styles for now

function DetectionResultCard({ entry, boundsEntry, duration }) {
    const method = entry.data.method || 'Unknown'
    const isFOP = method.toLowerCase().includes('fop')
    const isFull = method.toLowerCase().includes('full')

    const getBoundsText = (aabb) => {
        if (!aabb) return 'N/A'
        return `[${Math.round(aabb.minX)}, ${Math.round(aabb.minY)} - ${Math.round(aabb.maxX)}, ${Math.round(aabb.maxY)}]`
    }

    const handleDownloadJSON = () => {
        const transformPlayer = (p) => ({
            centerX: Math.round((p.x1 + p.x2) / 2),
            centerY: Math.round((p.y1 + p.y2) / 2),
            radiusX: Math.round((p.x2 - p.x1) / 2),
            radiusY: Math.round((p.y2 - p.y1) / 2),
            confidence: parseFloat((p.confidence || 0).toFixed(4))
        })

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

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `detection_${new Date(entry.timestamp).getTime()}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="result-entry players-entry">
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
                        onClick={handleDownloadJSON}
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
                                    #{i + 1}: ({Math.round(p.x1)}, {Math.round(p.y1)}) → ({Math.round(p.x2)}, {Math.round(p.y2)}) <span style={{ color: '#666' }}>[{p.confidence?.toFixed(2)}]</span>
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
                                    #{i + 1}: ({Math.round(p.x1)}, {Math.round(p.y1)}) → ({Math.round(p.x2)}, {Math.round(p.y2)}) <span style={{ color: '#666' }}>[{p.confidence?.toFixed(2)}]</span>
                                </div>
                            ))}
                            {(!entry.data.bottom_players || entry.data.bottom_players.length === 0) && <div style={{ fontSize: '0.8rem', color: '#666' }}>No players</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DetectionResultCard
