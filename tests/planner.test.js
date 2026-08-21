import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlannerCalories, createEmptyWeek, removeRecipeFromPlanner } from '../js/domain/plannerService.js';

test('planner totals saved recipes by per-serving calories', () => {
  const week = createEmptyWeek();
  week['0'].breakfast = { type: 'recipe', recipeId: 'r1' };
  week['0'].dinner = { type: 'recipe', recipeId: 'r1' };
  const recipes = [{ id: 'r1', servings: 2, ingredients: [{ foodId: 'food', grams: 200 }] }];
  const foods = [{ id: 'food', caloriesPer100g: 100 }];
  const result = calculatePlannerCalories(week, recipes, foods);
  assert.equal(result.daily[0], 200);
  assert.equal(result.weekly, 200);
});

test('removing a recipe clears its planner references only', () => {
  const planner = { weeks: { w: createEmptyWeek() } };
  planner.weeks.w['0'].lunch = { type: 'recipe', recipeId: 'delete-me' };
  planner.weeks.w['1'].lunch = { type: 'custom', name: 'Sandwich' };
  const next = removeRecipeFromPlanner(planner, 'delete-me');
  assert.equal(next.weeks.w['0'].lunch, null);
  assert.equal(next.weeks.w['1'].lunch.name, 'Sandwich');
  assert.notEqual(next, planner);
});
