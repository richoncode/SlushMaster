// Mock community star data for recipes
// In production, this would come from a database like Firestore
export const communityStars = {
    1: 0,   // Classic Cola Slush
    2: 0,   // Blue Raspberry
    3: 0,   // Frozen Lemonade
    4: 0,   // Cherry Limeade Slush
    5: 0,   // Tropical Fruit Punch
    6: 0,   // Frozen Margarita
    7: 0,   // Piña Colada
    8: 0,   // Strawberry Daiquiri
    9: 0,   // Frosé
    10: 0,  // Frozen Mojito
    11: 0,  // Dark 'n Stormy Slush
    12: 0,  // Fuzzy Navel Slush
    13: 0,  // Whiskey Slush
    14: 0,  // Frozen Sangria
    15: 0,  // Espresso Martini Slush
    16: 0,  // Frozen Coffee Frappé
    17: 0,  // Caramel Frappuccino
    18: 0,  // Frozen Hot Chocolate
    19: 0,  // Vanilla Milkshake Slush
    20: 0,  // Matcha Latte Frappé
    21: 0,  // Peanut Butter Cup Shake
    22: 0,  // White Russian Slush
    23: 0,  // Watermelon Mint Slush
    24: 0,  // Strawberry Kiwi Slush
    25: 0,  // Pineapple Ginger Slush
    26: 0,  // Mango Passion Fruit
    27: 0,  // Green Smoothie Slush
    28: 0,  // Blueberry Açai Slush
    29: 0,  // Cucumber Lime Refresher
    30: 0,  // Orange Carrot Ginger
    31: 0,  // Butterbeer Slush
    32: 0,  // Lavender Lemonade
    33: 0,  // Dragon Fruit Lychee
    34: 0,  // Thai Tea Slush
    35: 0,  // Horchata Slush
    36: 0,  // Hibiscus Berry
    37: 0,  // Dulce de Leche
    38: 0,  // Coconut Lime Mojito
    39: 0,  // Pumpkin Spice Latte Slush
    40: 0,  // Frosted Lemonade
    41: 0,  // Peach Bellini Slush
    42: 0   // Tamarind Chili
};

// Helper function to get star count for a recipe
export const getStarCount = (recipeId) => {
    return communityStars[recipeId] || 0;
};
