export const APP_VERSION = '1.0.0';
export const DATA_SCHEMA_VERSION = 1;

export const STORAGE_KEYS = Object.freeze({
  foods: 'recipeApp.foods.v1',
  recipes: 'recipeApp.recipes.v1',
  planner: 'recipeApp.planner.v1'
});

export const FOOD_CATEGORIES = Object.freeze([
  'Protein',
  'Fish & Seafood',
  'Carbohydrate',
  'Bread & Bakery',
  'Breakfast',
  'Vegetable',
  'Fruit',
  'Dairy',
  'Fat & Oil',
  'Nuts & Seeds',
  'Beans & Pulses',
  'Sauce & Condiment',
  'Pantry',
  'Snack & Sweet',
  'Drink',
  'Other'
]);

export const DAYS = Object.freeze([
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
]);

export const MEAL_TYPES = Object.freeze([
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' }
]);
