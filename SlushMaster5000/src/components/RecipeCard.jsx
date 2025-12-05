import React from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { getStarCount } from '../data/communityStars';
import { getCategoryEmoji } from '../data/categories';
import { useUnit } from '../context/UnitContext';
import { convertUnit } from '../utils/converters';

const RecipeCard = ({ recipe, isFavorite, onToggleFavorite }) => {
    const baseStarCount = getStarCount(recipe.id);
    // Optimistically add 1 if the user has starred it
    const communityStarCount = baseStarCount + (isFavorite ? 1 : 0);
    const { unit } = useUnit();

    const handleStarClick = () => {
        onToggleFavorite(recipe.id);
    };

    const displayCategories = recipe.categories || (recipe.category ? [recipe.category] : []);

    return (
        <div className="recipe-card bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition group">
            {/* Header with category and emoji */}
            <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 max-w-[60%] truncate">
                    {displayCategories.join(' • ')}
                </span>
                <div className="flex gap-1 group-hover:scale-110 transition duration-300">
                    {displayCategories.map(cat => (
                        <span key={cat} className="text-2xl" title={cat}>
                            {getCategoryEmoji(cat)}
                        </span>
                    ))}
                </div>
            </div>

            {/* Recipe Name */}
            <h3 className="text-xl font-bold mb-2">{recipe.name}</h3>

            {/* Description */}
            <p className="text-sm text-white/60 mb-4">{recipe.description}</p>

            {/* Ingredients */}
            <div className="space-y-2 mb-4">
                {recipe.ingredients.map((ing, i) => {
                    const displayAmount = ing.baseMl
                        ? convertUnit(ing.baseMl, unit)
                        : ing.amount;

                    return (
                        <div key={i} className="flex justify-between text-sm border-b border-white/5 pb-1">
                            <span className="text-white/80">{ing.name}</span>
                            <span className="text-white/50">{displayAmount}</span>
                        </div>
                    );
                })}
            </div>

            {/* Machine Setting */}
            <div className="text-xs text-center bg-black/20 rounded py-2 text-white/50 mb-3">
                Setting: <span className="text-white font-mono">{recipe.machineSetting}</span>
            </div>

            {/* Star Section */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                {/* User Star Button */}
                <button
                    onClick={handleStarClick}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition group/star"
                    title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                    {isFavorite ? (
                        <FaStar className="text-yellow-400 group-hover/star:scale-110 transition" size={18} />
                    ) : (
                        <FaRegStar className="text-white/50 group-hover/star:text-yellow-400 group-hover/star:scale-110 transition" size={18} />
                    )}
                    <span className="text-xs text-white/70">
                        {isFavorite ? 'Starred' : 'Star it'}
                    </span>
                </button>

                {/* Community Stars */}
                <div className="flex items-center gap-1 text-xs text-white/50">
                    <FaStar className="text-yellow-500/70" size={12} />
                    <span>{communityStarCount.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default RecipeCard;
