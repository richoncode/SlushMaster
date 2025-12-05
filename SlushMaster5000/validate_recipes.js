import { recipes } from './src/data/recipes.js';

console.log('Validating recipes...');
let errors = 0;

recipes.forEach((recipe, index) => {
    if (!recipe.categories) {
        console.error(`Recipe ID ${recipe.id} (Index ${index}) is missing 'categories'`);
        errors++;
    } else if (!Array.isArray(recipe.categories)) {
        console.error(`Recipe ID ${recipe.id} (Index ${index}) 'categories' is not an array`);
        errors++;
    }
});

if (errors === 0) {
    console.log('All recipes match schema!');
} else {
    console.error(`Found ${errors} errors.`);
    process.exit(1);
}
