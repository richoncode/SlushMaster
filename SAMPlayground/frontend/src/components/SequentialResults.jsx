import React from 'react'
import './SequentialResults.css'
import DetectionResultCard from './DetectionResultCard'

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

            case 'full_clip_detection_completed':
                return (
                    <DetectionResultCard
                        key={entry.id || index}
                        entry={entry}
                        duration={duration}
                    />
                )

            case 'players_detected':
                const boundsEntryForDetection = timeline.slice(0, index).reverse().find(e => e.step_type === 'bounds_adjusted')
                return (
                    <DetectionResultCard
                        key={entry.id || index}
                        entry={entry}
                        boundsEntry={boundsEntryForDetection}
                        duration={duration}
                    />
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
