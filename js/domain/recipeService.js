import { uid } from '../core/utils.js';

export function createRecipe(input) {
  const now = new Date().toISOString();
  return {
    id: input.id || uid('recipe'),
    name: String(input.name || '').trim(),
    description: String(input.description || '').trim(),
    servings: Math.max(1, Number(input.servings) || 1),
    ingredients: (input.ingredients || []).map(item => ({
      id: item.id || uid('ingredient'),
      foodId: item.foodId,
      grams: Number(item.grams) || 0
    })),
    steps: (input.steps || []).map(step => ({
      id: step.id || uid('step'),
      text: String(step.text || '').trim()
    })).filter(step => step.text),
    createdAt: input.createdAt || now,
    updatedAt: now
  };
}

export function validateRecipe(recipe, foodIds = new Set()) {
  const errors = [];
  if (!recipe.name) errors.push('Recipe name is required.');
  if (!Number.isFinite(recipe.servings) || recipe.servings < 1) errors.push('Servings must be at least 1.');
  if (!recipe.ingredients.length) errors.push('Add at least one ingredient.');

  recipe.ingredients.forEach((ingredient, index) => {
    if (!foodIds.has(ingredient.foodId)) errors.push(`Ingredient ${index + 1} has no valid food selected.`);
    if (!Number.isFinite(ingredient.grams) || ingredient.grams <= 0) errors.push(`Ingredient ${index + 1} must have a weight above 0g.`);
  });

  return errors;
}
