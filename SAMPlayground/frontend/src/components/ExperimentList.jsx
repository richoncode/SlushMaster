import React, { useState, useEffect, useRef } from 'react'
import './ExperimentList.css'

function ExperimentList({ onSelectExperiment }) {
    const [experiments, setExperiments] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const deleteTimeoutRef = useRef(null)

    useEffect(() => {
        loadExperiments()
        return () => {
            if (deleteTimeoutRef.current) {
                clearTimeout(deleteTimeoutRef.current)
            }
        }
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

    const generateDefaultName = () => {
        const now = new Date()
        const month = now.toLocaleString('default', { month: 'short' }).toLowerCase()
        const day = now.getDate()
        const time = now.toLocaleString('default', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).toLowerCase().replace(' ', '')
        return `${month} ${day} ${time}`
    }

    const handleCreateExperiment = async () => {
        try {
            const defaultName = generateDefaultName()
            const response = await fetch('http://localhost:8000/experiments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: defaultName })
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
        setDeleteConfirm(null)

        try {
            const response = await fetch(`http://localhost:8000/experiments/${experimentId}`, {
                method: 'DELETE'
            })

            console.log('Delete response status:', response.status)
            if (!response.ok) {
                const text = await response.text()
                console.error('Delete failed:', text)
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
                                    className={`delete-button ${deleteConfirm === exp.id ? 'confirming' : ''}`}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (deleteConfirm === exp.id) {
                                            if (deleteTimeoutRef.current) {
                                                clearTimeout(deleteTimeoutRef.current)
                                                deleteTimeoutRef.current = null
                                            }
                                            handleDeleteExperiment(exp.id, e)
                                        } else {
                                            if (deleteTimeoutRef.current) {
                                                clearTimeout(deleteTimeoutRef.current)
                                            }
                                            setDeleteConfirm(exp.id)
                                            // Reset confirmation after 3 seconds
                                            deleteTimeoutRef.current = setTimeout(() => {
                                                setDeleteConfirm(null)
                                                deleteTimeoutRef.current = null
                                            }, 3000)
                                        }
                                    }}
                                    title={deleteConfirm === exp.id ? "Click again to confirm delete" : "Delete experiment"}
                                >
                                    {deleteConfirm === exp.id ? 'Confirm?' : '×'}
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
                            {
                                exp.latest_video && (
                                    <div className="video-indicator">
                                        📹 Has video
                                    </div>
                                )
                            }
                        </div>
                    ))}
                </div>
            )
            }
        </div >
    )
}

export default ExperimentList
