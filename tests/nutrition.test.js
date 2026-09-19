import test from 'node:test';
import assert from 'node:assert/strict';
import { caloriesForWeight } from '../js/core/utils.js';
import { calculateIngredientCalories, calculateRecipeNutrition } from '../js/domain/nutritionService.js';

test('calculates calories from grams', () => {
  assert.equal(caloriesForWeight(200, 50), 100);
  assert.equal(caloriesForWeight(165, 150), 247.5);
});

test('calculates total and per-serving recipe calories from shared item ids', () => {
  const items = [{ id: 'a', caloriesPer100g: 200 }, { id: 'b', caloriesPer100g: 100 }];
  const recipe = { servings: 2, ingredients: [{ itemId: 'a', grams: 100 }, { itemId: 'b', grams: 50 }] };
  assert.deepEqual(calculateRecipeNutrition(recipe, items), { totalCalories: 250, caloriesPerServing: 125, missingNutritionCount: 0 });
});

test('missing calorie data is reported rather than treated as known zero calories', () => {
  const items = [{ id: 'a', caloriesPer100g: 200 }, { id: 'b', caloriesPer100g: null }];
  const recipe = { servings: 2, ingredients: [{ itemId: 'a', grams: 100 }, { itemId: 'b', grams: 50 }] };
  assert.equal(calculateIngredientCalories(items[1], 50), null);
  assert.deepEqual(calculateRecipeNutrition(recipe, items), { totalCalories: 200, caloriesPerServing: 100, missingNutritionCount: 1 });
});
