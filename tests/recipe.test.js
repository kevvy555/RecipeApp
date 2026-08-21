import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecipe, validateRecipe } from '../js/domain/recipeService.js';

test('createRecipe normalizes recipe input', () => {
  const recipe = createRecipe({
    name: '  Pasta  ',
    servings: 2,
    ingredients: [{ foodId: 'pasta', grams: 180 }],
    steps: [{ text: '  Boil pasta.  ' }, { text: '   ' }]
  });
  assert.equal(recipe.name, 'Pasta');
  assert.equal(recipe.servings, 2);
  assert.equal(recipe.ingredients[0].grams, 180);
  assert.deepEqual(recipe.steps.map(step => step.text), ['Boil pasta.']);
});

test('validateRecipe rejects missing foods and invalid weights', () => {
  const recipe = createRecipe({
    name: 'Test',
    servings: 1,
    ingredients: [{ foodId: 'missing', grams: 0 }]
  });
  const errors = validateRecipe(recipe, new Set(['known']));
  assert.ok(errors.some(error => error.includes('no valid food')));
  assert.ok(errors.some(error => error.includes('weight above 0g')));
});
