import { STORAGE_KEYS } from '../core/constants.js';
import { normalizeShoppingState } from '../domain/shoppingService.js';

export async function ensureSeedShopping(store) {
  const response = await fetch('./data/shopping.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load shopping seed data (${response.status})`);

  const seedData = await response.json();
  if (!seedData || !Array.isArray(seedData.shops)) {
    throw new Error('Shopping seed data is not a valid shop list.');
  }

  const existing = store.has(STORAGE_KEYS.shopping) ? store.getShopping() : null;
  const normalized = normalizeShoppingState(seedData, existing);
  store.setShopping(normalized);
  return !existing;
}
