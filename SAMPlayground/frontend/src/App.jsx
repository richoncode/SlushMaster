import { useState } from 'react'
import './App.css'
import ExperimentMenu from './components/ExperimentMenu'
import SAM2Experiment from './components/SAM2Experiment'
import ErrorBoundary from './components/ErrorBoundary'

function App() {
  const [selectedExperiment, setSelectedExperiment] = useState(null)

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>SAMPlayground</h1>
        <p className="subtitle">Computer Vision Experiments</p>
      </header>

      <main className="app-content">
        {!selectedExperiment ? (
          <ExperimentMenu onSelect={setSelectedExperiment} />
        ) : (
          <div className="experiment-container">
            <button
              className="back-button"
              onClick={() => setSelectedExperiment(null)}
            >
              ← Back to Menu
            </button>
            <div className="experiment-view">
              {selectedExperiment === 'sam2-video' && (
                <ErrorBoundary>
                  <SAM2Experiment />
                </ErrorBoundary>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
