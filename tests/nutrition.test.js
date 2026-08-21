import test from 'node:test';
import assert from 'node:assert/strict';
import { caloriesForWeight, startOfWeekMonday, toIsoDate } from '../js/core/utils.js';
import { calculateRecipeNutrition } from '../js/domain/nutritionService.js';
import { createEmptyWeek, setMeal } from '../js/domain/plannerService.js';

test('calculates calories from grams', () => {
  assert.equal(caloriesForWeight(200, 50), 100);
  assert.equal(caloriesForWeight(165, 150), 247.5);
});

test('calculates total and per-serving recipe calories', () => {
  const foods = [
    { id: 'a', caloriesPer100g: 200 },
    { id: 'b', caloriesPer100g: 100 }
  ];
  const recipe = {
    servings: 2,
    ingredients: [
      { foodId: 'a', grams: 100 },
      { foodId: 'b', grams: 50 }
    ]
  };
  assert.deepEqual(calculateRecipeNutrition(recipe, foods), { totalCalories: 250, caloriesPerServing: 125 });
});

test('week starts on Monday including Sunday inputs', () => {
  assert.equal(toIsoDate(startOfWeekMonday(new Date('2026-08-23T12:00:00'))), '2026-08-17');
});

test('planner writes meal without mutating original', () => {
  const planner = { weeks: { '2026-08-17': createEmptyWeek() } };
  const next = setMeal(planner, '2026-08-17', 0, 'dinner', { type: 'custom', name: 'Soup' });
  assert.equal(planner.weeks['2026-08-17']['0'].dinner, null);
  assert.equal(next.weeks['2026-08-17']['0'].dinner.name, 'Soup');
});
