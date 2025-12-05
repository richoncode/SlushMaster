import { useState } from 'react'
import './App.css'
import ExperimentList from './components/ExperimentList'
import SAM2Experiment from './components/SAM2Experiment'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const [selectedExperimentId, setSelectedExperimentId] = useState(null)

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Richard's Playground</h1>
        <p className="subtitle">Computer Vision Experiments</p>
      </header>

      <main className="app-content">
        {!selectedExperimentId ? (
          <ExperimentList onSelectExperiment={setSelectedExperimentId} />
        ) : (
          <div className="experiment-container">
            <button
              className="back-button"
              onClick={() => setSelectedExperimentId(null)}
            >
              ← Back to Experiments
            </button>
            <div className="experiment-view">
              <ErrorBoundary>
                <SAM2Experiment experimentId={selectedExperimentId} />
              </ErrorBoundary>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
