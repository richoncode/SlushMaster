import React, { useState, useEffect } from 'react'
import './ExperimentList.css'

function ExperimentList({ onSelectExperiment }) {
    const [experiments, setExperiments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadExperiments()
    }, [])

    const loadExperiments = async () => {
        try {
            setLoading(true)
            const response = await fetch('http://localhost:8000/experiments')
            if (!response.ok) {
                throw new Error('Failed to load experiments')
            }
            const data = await response.json()
            setExperiments(data.experiments || [])
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateExperiment = async () => {
        try {
            const response = await fetch('http://localhost:8000/experiments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'unnamed experiment' })
            })

            if (!response.ok) {
                throw new Error('Failed to create experiment')
            }

            const experiment = await response.json()
            onSelectExperiment(experiment.id)
        } catch (err) {
            setError(err.message)
        }
    }

    const handleDeleteExperiment = async (experimentId, e) => {
        e.stopPropagation()

        if (!confirm('Are you sure you want to delete this experiment?')) {
            return
        }

        try {
            const response = await fetch(`http://localhost:8000/experiments/${experimentId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('Failed to delete experiment')
            }

            loadExperiments()
        } catch (err) {
            setError(err.message)
        }
    }

    const formatDate = (isoString) => {
        const date = new Date(isoString)
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    if (loading) {
        return (
            <div className="experiment-list">
                <div className="loading">Loading experiments...</div>
            </div>
        )
    }

    return (
        <div className="experiment-list">
            <div className="experiment-list-header">
                <h2>Experiments</h2>
                <button onClick={handleCreateExperiment} className="create-button">
                    + Create New Experiment
                </button>
            </div>

            {error && (
                <div className="error-message">
                    Error: {error}
                </div>
            )}

            {experiments.length === 0 ? (
                <div className="empty-state">
                    <p>No experiments yet</p>
                    <p className="hint">Create your first experiment to get started</p>
                </div>
            ) : (
                <div className="experiment-grid">
                    {experiments.map((exp) => (
                        <div
                            key={exp.id}
                            className="experiment-card"
                            onClick={() => onSelectExperiment(exp.id)}
                        >
                            <div className="experiment-card-header">
                                <h3>{exp.name}</h3>
                                <button
                                    className="delete-button"
                                    onClick={(e) => handleDeleteExperiment(exp.id, e)}
                                    title="Delete experiment"
                                >
                                    ×
                                </button>
                            </div>
                            <div className="experiment-meta">
                                <div className="meta-item">
                                    <span className="meta-label">Last updated:</span>
                                    <span className="meta-value">{formatDate(exp.updated_at)}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Steps:</span>
                                    <span className="meta-value">{exp.timeline_count || 0}</span>
                                </div>
                            </div>
                            {exp.latest_video && (
                                <div className="video-indicator">
                                    📹 Has video
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ExperimentList
