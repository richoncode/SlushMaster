import React, { useState, useMemo, useEffect } from 'react';
import { FaUser, FaSignOutAlt } from 'react-icons/fa';
import Slushometer from './components/Slushometer';
import RecipeCard from './components/RecipeCard';
import LoginModal from './components/LoginModal';
import FeedbackModal from './components/FeedbackModal';
import UnitSelector from './components/UnitSelector';
import { recipes } from './data/recipes';
import { getStarCount } from './data/communityStars';
import { searchRecipes } from './utils/search';
import { useAuth } from './context/AuthContext';
import { UnitProvider } from './context/UnitContext';
import { getCategoryEmoji } from './data/categories';
import { useFavorites } from './hooks/useFavorites';

function App() {
  const [view, setView] = useState('home'); // home, calculator, recipes
  const [searchTerm, setSearchTerm] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { currentUser, logout } = useAuth();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  // Handle star toggle
  const handleToggleFavorite = (recipeId) => {
    const success = toggleFavorite(recipeId);
    if (!success) {
      // User is not logged in, show login modal
      setShowLoginModal(true);
    }
  };

  // Get unique categories from all recipes
  const allCategories = useMemo(() => {
    const categories = new Set();
    recipes.forEach(recipe => {
      // Defensive check: ensure categories exists and is an array
      const cats = recipe.categories || (recipe.category ? [recipe.category] : []);
      cats.forEach(cat => categories.add(cat));
    });
    return [...categories].sort();
  }, []);

  // Initialize selected categories from local storage or default to all
  const [selectedCategories, setSelectedCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('slushmaster_selected_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure it's an array
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Error parsing saved categories:', error);
      // Clear corrupted data
      localStorage.removeItem('slushmaster_selected_categories');
    }
    return allCategories;
  });

  // Update local storage when selected categories change
  useEffect(() => {
    localStorage.setItem('slushmaster_selected_categories', JSON.stringify(selectedCategories));
  }, [selectedCategories]);

  // Also save/load per user if logged in
  useEffect(() => {
    if (currentUser) {
      const userKey = `slushmaster_categories_${currentUser.uid}`;
      try {
        const savedUserCats = localStorage.getItem(userKey);
        if (savedUserCats) {
          const parsed = JSON.parse(savedUserCats);
          if (Array.isArray(parsed)) {
            setSelectedCategories(parsed);
          }
        }
      } catch (error) {
        console.error('Error parsing user categories:', error);
        localStorage.removeItem(userKey);
      }
    }
  }, [currentUser]);

  // Save to user-specific storage when changed (if logged in)
  useEffect(() => {
    if (currentUser) {
      const userKey = `slushmaster_categories_${currentUser.uid}`;
      localStorage.setItem(userKey, JSON.stringify(selectedCategories));
    }
  }, [selectedCategories, currentUser]);

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Sort recipes: user favorites first, then by community stars, then original order
  const sortedRecipes = useMemo(() => {
    return [...recipes].sort((a, b) => {
      const aIsFavorite = isFavorite(a.id);
      const bIsFavorite = isFavorite(b.id);

      // User favorites first
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // Then by community stars
      const aStars = getStarCount(a.id);
      const bStars = getStarCount(b.id);
      if (aStars !== bStars) return bStars - aStars;

      // Finally by original order (id)
      return a.id - b.id;
    });
  }, [favorites, isFavorite]);

  // Filter recipes based on search term AND selected categories
  // Show recipe if ANY of its categories are selected
  const filteredRecipes = sortedRecipes.filter(recipe => {
    const cats = recipe.categories || (recipe.category ? [recipe.category] : []);
    return searchRecipes(recipe, searchTerm) &&
      cats.some(cat => selectedCategories.includes(cat));
  });

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <UnitProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 text-white font-sans selection:bg-pink-500 selection:text-white">

        {/* Header */}
        <header className="p-6 flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setView('home')}>
            <span className="text-4xl">🍧</span>
            <h1 className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-pink-400">
              SlushMaster<span className="font-light text-white/50">5000</span>
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <nav className="space-x-6 hidden md:block">
              <button onClick={() => setView('calculator')} className={`hover:text-pink-400 transition ${view === 'calculator' ? 'text-pink-400 font-bold' : 'text-white/70'}`}>Slushometer</button>
              <button onClick={() => setView('recipes')} className={`hover:text-pink-400 transition ${view === 'recipes' ? 'text-pink-400 font-bold' : 'text-white/70'}`}>Recipes</button>
              <button onClick={() => setShowFeedbackModal(true)} className="text-white/70 hover:text-pink-400 transition">Feedback</button>
            </nav>

            <UnitSelector />

            {/* User Menu */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition border border-white/20"
                >
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="User" className="w-6 h-6 rounded-full" />
                  ) : (
                    <FaUser className="text-white/70" />
                  )}
                  <span className="text-sm hidden sm:inline">{currentUser.displayName || 'User'}</span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-lg shadow-xl border border-white/20 py-2 z-50">
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-xs text-white/50">Signed in as</p>
                      <p className="text-sm font-semibold truncate">{currentUser.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition flex items-center gap-2"
                    >
                      <FaSignOutAlt />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-400 rounded-full font-semibold text-sm transition shadow-lg"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto p-6">

          {view === 'home' && (
            <div className="text-center py-20">
              <h2 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                Master the <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Perfect Slush</span>
              </h2>
              <p className="text-xl text-blue-100/80 mb-10 max-w-2xl mx-auto">
                Stop guessing. Start slushing. Calculate the perfect sugar ratios and discover recipes that won't break your machine.
              </p>
              <div className="flex flex-col md:flex-row justify-center gap-4">
                <button
                  onClick={() => setView('calculator')}
                  className="px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white rounded-full font-bold text-lg transition shadow-lg shadow-blue-500/30"
                >
                  Launch Slushometer 🚀
                </button>
                <button
                  onClick={() => setView('recipes')}
                  className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold text-lg transition backdrop-blur-sm border border-white/10"
                >
                  Browse Recipes 📜
                </button>
              </div>
            </div>
          )}

          {view === 'calculator' && (
            <div className="animate-fade-in">
              <Slushometer />
            </div>
          )}

          {view === 'recipes' && (
            <div className="animate-fade-in">
              {/* Category Toggles */}
              <div className="flex flex-wrap gap-2 mb-6 justify-center md:justify-start">
                {allCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 ${selectedCategories.includes(category)
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <span>{getCategoryEmoji(category)}</span>
                    {category}
                  </button>
                ))}
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-center md:text-left">
                    Community Recipes
                  </h2>
                  {currentUser && favorites.length > 0 && (
                    <p className="text-sm text-white/60 mt-1">
                      ⭐ Your {favorites.length} favorite{favorites.length !== 1 ? 's' : ''} shown first
                    </p>
                  )}
                </div>

                {/* Ingredient Filter Input */}
                <div className="relative w-full md:w-96">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-white/50">🔍</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Filter by ingredients (e.g. cola, rum)..."
                    className="w-full bg-white/10 border border-white/20 rounded-full py-2 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/20 transition"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecipes.map(recipe => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isFavorite={isFavorite(recipe.id)}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>

              {filteredRecipes.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-white/60 text-lg">No recipes found matching your filters</p>
                </div>
              )}
            </div>
          )}

        </main>

        {/* Login Modal */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          message="To remember your favorite recipes, please sign in with one of the options below."
        />

        {/* Feedback Modal */}
        <FeedbackModal
          isOpen={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
        />
      </div>
    </UnitProvider>
  );
}

export default App;
