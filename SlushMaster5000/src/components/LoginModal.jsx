import React, { useState } from 'react';
import { FaGoogle, FaGithub, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const LoginModal = ({ isOpen, onClose, message }) => {
    const { signInWithGoogle, signInWithGithub } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithGoogle();
            onClose();
        } catch (err) {
            setError('Failed to sign in with Google. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleGithubSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            await signInWithGithub();
            onClose();
        } catch (err) {
            setError('Failed to sign in with GitHub. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-pink-900/95 rounded-2xl shadow-2xl border border-white/20 p-8">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/60 hover:text-white transition"
                    aria-label="Close"
                >
                    <FaTimes size={24} />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-5xl mb-4">⭐</div>
                    <h2 className="text-3xl font-bold text-white mb-2">Sign In Required</h2>
                    <p className="text-white/70 text-sm">
                        {message || "To remember your favorite recipes, please sign in with one of the options below."}
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                        {error}
                    </div>
                )}

                {/* Sign In Buttons */}
                <div className="space-y-3">
                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                        <FaGoogle className="text-red-500" size={20} />
                        <span>Continue with Google</span>
                    </button>

                    {/* GitHub Sign In */}
                    <button
                        onClick={handleGithubSignIn}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border border-gray-700"
                    >
                        <FaGithub size={20} />
                        <span>Continue with GitHub</span>
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="mt-4 text-center text-white/60 text-sm">
                        Signing in...
                    </div>
                )}

                {/* Footer */}
                <div className="mt-6 text-center text-xs text-white/40">
                    Your favorites will be saved locally on this device
                </div>
            </div>
        </div>
    );
};

export default LoginModal;
