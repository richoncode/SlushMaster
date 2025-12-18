import React from 'react'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null, errorInfo: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true }
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
        this.setState({
            error: error,
            errorInfo: errorInfo
        })

        // Call parent callback to append to error log
        if (this.props.onError) {
            this.props.onError({
                timestamp: new Date().toLocaleTimeString(),
                message: `React Error: ${error.toString()}`,
                stack: errorInfo.componentStack
            })
        }
    }

    render() {
        // Don't replace the UI - let the parent handle error display
        // Just reset the error state and continue rendering children
        if (this.state.hasError) {
            // Render fallback UI
            return (
                <div className="error-boundary-fallback" style={{ padding: '2rem', color: 'red', border: '1px solid red' }}>
                    <h3>Something went wrong.</h3>
                    <details style={{ whiteSpace: 'pre-wrap' }}>
                        {this.state.error && this.state.error.toString()}
                        <br />
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                    <button onClick={() => this.setState({ hasError: false })} style={{ marginTop: '1rem' }}>
                        Try Again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
