import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    handleReset = () => {
        localStorage.clear();
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 text-center">
                    <h1 className="text-4xl font-bold text-red-500 mb-4">Oops! Something went wrong.</h1>
                    <p className="text-xl text-gray-300 mb-8">
                        The SlushMaster5000 encountered an unexpected error.
                    </p>

                    <div className="bg-black/30 p-4 rounded-lg mb-8 max-w-lg text-left overflow-auto max-h-64 border border-white/10">
                        <p className="font-mono text-red-400 text-sm mb-2">
                            {this.state.error && this.state.error.toString()}
                        </p>
                        <pre className="font-mono text-gray-500 text-xs">
                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                        </pre>
                    </div>

                    <button
                        onClick={this.handleReset}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg transition shadow-lg shadow-blue-500/30"
                    >
                        Reset App & Clear Data 🔄
                    </button>
                    <p className="text-gray-500 text-sm mt-4">
                        This will clear your saved settings and reload the page.
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
