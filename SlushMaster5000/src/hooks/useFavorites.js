import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const useFavorites = () => {
    const { currentUser } = useAuth();
    const [favorites, setFavorites] = useState([]);

    // Load favorites from localStorage on mount and when user changes
    useEffect(() => {
        if (currentUser) {
            const userId = currentUser.uid;
            const storedFavorites = localStorage.getItem(`favorites_${userId}`);
            if (storedFavorites) {
                try {
                    setFavorites(JSON.parse(storedFavorites));
                } catch (error) {
                    console.error('Error parsing favorites:', error);
                    setFavorites([]);
                }
            } else {
                setFavorites([]);
            }
        } else {
            // User logged out, clear favorites from state
            setFavorites([]);
        }
    }, [currentUser]);

    // Save favorites to localStorage whenever they change
    useEffect(() => {
        if (currentUser && favorites.length >= 0) {
            const userId = currentUser.uid;
            localStorage.setItem(`favorites_${userId}`, JSON.stringify(favorites));
        }
    }, [favorites, currentUser]);

    // Toggle favorite status
    const toggleFavorite = (recipeId) => {
        if (!currentUser) {
            return false; // Return false to indicate login is required
        }

        setFavorites((prevFavorites) => {
            if (prevFavorites.includes(recipeId)) {
                // Remove from favorites
                return prevFavorites.filter((id) => id !== recipeId);
            } else {
                // Add to favorites
                return [...prevFavorites, recipeId];
            }
        });

        return true; // Successfully toggled
    };

    // Check if a recipe is favorited
    const isFavorite = (recipeId) => {
        return favorites.includes(recipeId);
    };

    return {
        favorites,
        toggleFavorite,
        isFavorite
    };
};
