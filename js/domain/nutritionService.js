import { caloriesForWeight, round } from '../core/utils.js';

export function calculateIngredientCalories(food, grams) {
  if (!food) return 0;
  return caloriesForWeight(food.caloriesPer100g, grams);
}

export function calculateRecipeNutrition(recipe, foods) {
  const foodMap = foods instanceof Map ? foods : new Map(foods.map(food => [food.id, food]));
  const totalCalories = (recipe.ingredients || []).reduce((total, ingredient) => {
    return total + calculateIngredientCalories(foodMap.get(ingredient.foodId), ingredient.grams);
  }, 0);

  const servings = Math.max(1, Number(recipe.servings) || 1);
  return {
    totalCalories: round(totalCalories, 1),
    caloriesPerServing: round(totalCalories / servings, 1)
  };
}
