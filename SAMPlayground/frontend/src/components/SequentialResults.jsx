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

    const renderEntry = (entry, index, timeline) => {
        const duration = index < timeline.length - 1 ? formatDuration(entry.timestamp, timeline[index + 1].timestamp) : null

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
                            <p className="video-name">{entry.data.video_name}</p>
                            {entry.data.video_type === 'test' && <span className="badge">Test Clip</span>}
                        </div>
                    </div>
                )

            case 'bounds_adjusted':
                return (
                    <div key={entry.id || index} className="result-entry bounds-entry">
                        <div className="entry-header">
                            <span className="entry-icon">📐</span>
                            <span className="entry-title">Field Bounds Set</span>
                            {duration && <span className="entry-duration">{duration}</span>}
                        </div>
                        <div className="entry-content">
                            <div className="bounds-coords">
                                <div>{entry.data.top_corners?.length || 0} left bounds</div>
                                <div>{entry.data.bottom_corners?.length || 0} right bounds</div>
                            </div>
                        </div>
                    </div>
                )

            case 'players_detected':
                return (
                    <div key={entry.id || index} className="result-entry players-entry">
                        <div className="entry-header">
                            <span className="entry-icon">👥</span>
                            <span className="entry-title">Players Detected</span>
                            {duration && <span className="entry-duration">{duration}</span>}
                        </div>
                        <div className="entry-content">
                            <div className="player-counts">
                                <div className="count-badge">
                                    <span className="label">Left</span>
                                    <span className="count">{entry.data.top_count || 0}</span>
                                </div>
                                <div className="count-badge">
                                    <span className="label">Right</span>
                                    <span className="count">{entry.data.bottom_count || 0}</span>
                                </div>
                                <div className="similarity">
                                    Similarity: {((entry.data.similarity || 0) * 100).toFixed(0)}%
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
