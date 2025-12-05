import React, { useState } from 'react';
import { FaTimes, FaPaperPlane, FaCommentDots } from 'react-icons/fa';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase-config';
import { useAuth } from '../context/AuthContext';

const FeedbackModal = ({ isOpen, onClose }) => {
    const [feedback, setFeedback] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const { currentUser } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!feedback.trim()) return;

        setIsSubmitting(true);
        setError('');

        try {
            await addDoc(collection(db, 'feedback'), {
                text: feedback,
                userId: currentUser ? currentUser.uid : 'anonymous',
                userEmail: currentUser ? currentUser.email : 'anonymous',
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent
            });

            setIsSuccess(true);
            setFeedback('');

            // Close modal after 2 seconds
            setTimeout(() => {
                onClose();
                setIsSuccess(false);
            }, 2000);

        } catch (err) {
            console.error('Error submitting feedback:', err);
            setError('Failed to send feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/50 hover:text-white transition"
                >
                    <FaTimes size={20} />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                        <FaCommentDots size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">We Value Your Feedback</h2>
                    <p className="text-white/60 text-sm">
                        Tell us what you love or how we can improve SlushMaster5000.
                    </p>
                </div>

                {/* Success Message */}
                {isSuccess ? (
                    <div className="text-center py-8 animate-fade-in">
                        <div className="text-green-400 text-5xl mb-4">🎉</div>
                        <h3 className="text-xl font-bold text-white mb-2">Thank You!</h3>
                        <p className="text-white/60">Your feedback has been received.</p>
                    </div>
                ) : (
                    /* Form */
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Type your feedback here..."
                                className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition resize-none"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/30 text-red-200 px-4 py-3 rounded-lg text-sm mb-4">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || !feedback.trim()}
                            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${isSubmitting || !feedback.trim()
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/20'
                                }`}
                        >
                            {isSubmitting ? (
                                <span className="animate-pulse">Sending...</span>
                            ) : (
                                <>
                                    <FaPaperPlane />
                                    Send Feedback
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;
