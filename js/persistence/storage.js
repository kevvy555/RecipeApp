import { STORAGE_KEYS } from '../core/constants.js';

function parseOrFallback(raw, fallback) {
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export class LocalDataStore {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
  }

  has(key) {
    return this.storage.getItem(key) !== null;
  }

  read(key, fallback) {
    return parseOrFallback(this.storage.getItem(key), fallback);
  }

  write(key, value) {
    this.storage.setItem(key, JSON.stringify(value));
  }

  getFoods() {
    return this.read(STORAGE_KEYS.foods, []);
  }

  setFoods(foods) {
    this.write(STORAGE_KEYS.foods, foods);
  }

  getRecipes() {
    return this.read(STORAGE_KEYS.recipes, []);
  }

  setRecipes(recipes) {
    this.write(STORAGE_KEYS.recipes, recipes);
  }

  getPlanner() {
    return this.read(STORAGE_KEYS.planner, { weeks: {} });
  }

  setPlanner(planner) {
    this.write(STORAGE_KEYS.planner, planner);
  }

  getShopping() {
    return this.read(STORAGE_KEYS.shopping, { shops: [] });
  }

  setShopping(shopping) {
    this.write(STORAGE_KEYS.shopping, shopping);
  }

  loadState() {
    return {
      foods: this.getFoods(),
      recipes: this.getRecipes(),
      planner: this.getPlanner(),
      shopping: this.getShopping()
    };
  }

  replaceState(state) {
    this.setFoods(state.foods);
    this.setRecipes(state.recipes);
    this.setPlanner(state.planner);
    if (state.shopping) this.setShopping(state.shopping);
  }
}
