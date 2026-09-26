export const APP_VERSION = '2.2.2';
export const DATA_SCHEMA_VERSION = 2;

export const STORAGE_KEYS = Object.freeze({
  items: 'recipeApp.items.v2',
  recipes: 'recipeApp.recipes.v2',
  planner: 'recipeApp.planner.v2',
  shopping: 'recipeApp.shopping.v2'
});

export const LEGACY_STORAGE_KEYS = Object.freeze({
  foods: 'recipeApp.foods.v1',
  recipes: 'recipeApp.recipes.v1',
  planner: 'recipeApp.planner.v1',
  shopping: 'recipeApp.shopping.v1'
});

export const GROCERY_CATEGORIES = Object.freeze([
  'Protein', 'Fish & Seafood', 'Carbohydrate', 'Bread & Bakery', 'Breakfast', 'Vegetable', 'Fruit', 'Dairy',
  'Fat & Oil', 'Nuts & Seeds', 'Beans & Pulses', 'Sauce & Condiment', 'Pantry', 'Snack & Sweet', 'Drink',
  'Household', 'Cleaning', 'Toiletries', 'Paper Goods', 'Pet Supplies', 'Other'
]);

export const DAYS = Object.freeze(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
export const MEAL_TYPES = Object.freeze([
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' }
]);
