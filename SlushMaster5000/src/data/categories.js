export const CATEGORY_EMOJIS = {
    'Spiked': '🍸',
    'Savory': '🍅',
    'Creamy': '🍦',
    'Healthyish': '🥗',
    'Unique': '✨',
    'Classic': '🥤',
    'Fruity': '🍓',
    'Citrus': '🍋',
    'Mocktail': '🧃',
    'Low Sugar': '📉',
    'Non-Alcoholic': '🧃'
};

export const getCategoryEmoji = (category) => CATEGORY_EMOJIS[category] || '🥤';
