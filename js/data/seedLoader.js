import { STORAGE_KEYS } from '../core/constants.js';

export async function ensureSeedFoods(store) {
  if (store.has(STORAGE_KEYS.foods)) return false;

  const response = await fetch('./data/foods.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load food seed data (${response.status})`);

  const seedData = await response.json();
  if (!seedData || typeof seedData !== 'object' || Array.isArray(seedData)) {
    throw new Error('Food seed data is not a valid grouped object.');
  }

  const now = new Date().toISOString();
  let index = 0;
  const normalized = Object.entries(seedData).flatMap(([category, foods]) => {
    if (!Array.isArray(foods)) return [];
    return foods.map(([name, caloriesPer100g, notes = '']) => {
      index += 1;
      return {
        id: `seed-food-${index}`,
        name: String(name || '').trim(),
        category: String(category || 'Other'),
        caloriesPer100g: Number(caloriesPer100g) || 0,
        notes: String(notes || ''),
        source: 'seed',
        createdAt: now,
        updatedAt: now
      };
    });
  });

  store.setFoods(normalized);
  return true;
}
