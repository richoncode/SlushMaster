/**
 * Synonym mapping for ingredients.
 * Keys are the "canonical" ingredient names found in recipes.
 * Values are arrays of alternative terms users might search for.
 */
const SYNONYMS = {
    "cola": ["coke", "pepsi", "soda", "pop", "dr pepper", "rc cola"],
    "lemon": ["lemonade", "citrus", "sprite", "7up"],
    "lime": ["citrus", "margarita mix"],
    "rum": ["bacardi", "captain morgan", "malibu"],
    "tequila": ["patron", "jose cuervo", "don julio"],
    "whiskey": ["bourbon", "scotch", "jack daniels"],
    "coffee": ["espresso", "java", "joe", "caffeine"],
    "milk": ["cream", "dairy"],
};

/**
 * Expands a search term into a list of synonyms.
 * @param {string} term - The user's search term.
 * @returns {string[]} Array of related terms including the original.
 */
function expandSearchTerm(term) {
    const lowerTerm = term.toLowerCase();
    const expanded = [lowerTerm];

    // Check if the term IS a synonym for something else
    for (const [canonical, alts] of Object.entries(SYNONYMS)) {
        if (alts.includes(lowerTerm) || canonical === lowerTerm) {
            expanded.push(canonical);
            expanded.push(...alts);
        }
    }

    return [...new Set(expanded)]; // Unique values
}

/**
 * Checks if a recipe matches the search term, considering synonyms.
 * @param {object} recipe - The recipe object.
 * @param {string} searchTerm - The user's input.
 * @returns {boolean} True if match found.
 */
export function searchRecipes(recipe, searchTerm) {
    if (!searchTerm) return true;

    const terms = expandSearchTerm(searchTerm);
    const ingredients = recipe.ingredients.map(i => i.name.toLowerCase()).join(' ');

    // Check if ANY of the expanded terms exist in the recipe ingredients
    return terms.some(t => ingredients.includes(t));
}
