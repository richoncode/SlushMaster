import React from 'react'
import './ExperimentMenu.css'

const experiments = [
    {
        id: 'sam2-video',
        title: 'SAM 2 Video Segmentation',
        description: 'Segment objects in video using Segment Anything Model 2.',
        icon: '⚽',
        status: 'active'
    },
    {
        id: 'coming-soon',
        title: 'More Experiments',
        description: 'New computer vision experiments coming soon.',
        icon: '🧪',
        status: 'disabled'
    }
]

function ExperimentMenu({ onSelect }) {
    return (
        <div className="experiment-menu">
            {experiments.map((exp) => (
                <div
                    key={exp.id}
                    className={`experiment-card ${exp.status}`}
                    onClick={() => exp.status === 'active' && onSelect(exp.id)}
                >
                    <div className="experiment-icon">{exp.icon}</div>
                    <h3>{exp.title}</h3>
                    <p>{exp.description}</p>
                </div>
            ))}
        </div>
    )
}

export default ExperimentMenu
