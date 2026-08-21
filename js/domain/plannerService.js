import { DAYS, MEAL_TYPES } from '../core/constants.js';
import { calculateRecipeNutrition } from './nutritionService.js';

export function createEmptyWeek() {
  return Object.fromEntries(DAYS.map((_, index) => [String(index),
    Object.fromEntries(MEAL_TYPES.map(meal => [meal.key, null]))
  ]));
}

export function getWeekPlan(planner, weekStartIso) {
  return planner.weeks?.[weekStartIso] || createEmptyWeek();
}

export function setMeal(planner, weekStartIso, dayIndex, mealKey, meal) {
  const next = structuredClone(planner || { weeks: {} });
  next.weeks ||= {};
  next.weeks[weekStartIso] ||= createEmptyWeek();
  next.weeks[weekStartIso][String(dayIndex)] ||= {};
  next.weeks[weekStartIso][String(dayIndex)][mealKey] = meal;
  return next;
}

export function removeRecipeFromPlanner(planner, recipeId) {
  const next = structuredClone(planner || { weeks: {} });
  for (const week of Object.values(next.weeks || {})) {
    for (const day of Object.values(week || {})) {
      for (const mealKey of Object.keys(day || {})) {
        const meal = day[mealKey];
        if (meal?.type === 'recipe' && meal.recipeId === recipeId) day[mealKey] = null;
      }
    }
  }
  return next;
}

export function calculatePlannerCalories(weekPlan, recipes, foods) {
  const recipeMap = new Map(recipes.map(recipe => [recipe.id, recipe]));
  const daily = [];

  for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
    const day = weekPlan[String(dayIndex)] || {};
    let calories = 0;
    for (const meal of Object.values(day)) {
      if (meal?.type !== 'recipe') continue;
      const recipe = recipeMap.get(meal.recipeId);
      if (!recipe) continue;
      calories += calculateRecipeNutrition(recipe, foods).caloriesPerServing;
    }
    daily.push(Math.round(calories));
  }

  return {
    daily,
    weekly: daily.reduce((sum, value) => sum + value, 0)
  };
}
