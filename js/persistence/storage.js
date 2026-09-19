import { LEGACY_STORAGE_KEYS, STORAGE_KEYS } from '../core/constants.js';

function parseOrFallback(raw, fallback) {
  if (raw == null) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export class LocalDataStore {
  constructor(storage = globalThis.localStorage) { this.storage = storage; }
  has(key) { return this.storage.getItem(key) !== null; }
  read(key, fallback) { return parseOrFallback(this.storage.getItem(key), fallback); }
  write(key, value) { this.storage.setItem(key, JSON.stringify(value)); }
  getItems() { return this.read(STORAGE_KEYS.items, []); }
  setItems(items) { this.write(STORAGE_KEYS.items, items); }
  getRecipes() { return this.read(STORAGE_KEYS.recipes, []); }
  setRecipes(recipes) { this.write(STORAGE_KEYS.recipes, recipes); }
  getPlanner() { return this.read(STORAGE_KEYS.planner, { weeks: {} }); }
  setPlanner(planner) { this.write(STORAGE_KEYS.planner, planner); }
  getShopping() { return this.read(STORAGE_KEYS.shopping, { shops: [] }); }
  setShopping(shopping) { this.write(STORAGE_KEYS.shopping, shopping); }
  loadState() { return { items:this.getItems(), recipes:this.getRecipes(), planner:this.getPlanner(), shopping:this.getShopping() }; }
  loadLegacyState() {
    return {
      foods: this.read(LEGACY_STORAGE_KEYS.foods, []),
      recipes: this.read(LEGACY_STORAGE_KEYS.recipes, []),
      planner: this.read(LEGACY_STORAGE_KEYS.planner, { weeks: {} }),
      shopping: this.read(LEGACY_STORAGE_KEYS.shopping, { shops: [] })
    };
  }
  replaceState(state) {
    this.setItems(state.items || []);
    this.setRecipes(state.recipes || []);
    this.setPlanner(state.planner || { weeks: {} });
    this.setShopping(state.shopping || { shops: [] });
  }
}
