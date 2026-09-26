import { CATALOG_REVISION, STORAGE_KEYS } from '../core/constants.js';
import { applyShoppingCatalogRevision, buildSeedCatalog, migrateLegacyState } from '../domain/catalogService.js';

async function fetchJson(path, label) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load ${label} seed data (${response.status})`);
  return response.json();
}

export async function loadSeedCatalog() {
  const [foodSeed, shoppingSeed] = await Promise.all([
    fetchJson('./data/foods.json', 'food'),
    fetchJson('./data/shopping.json', 'shopping')
  ]);
  if (!foodSeed || typeof foodSeed !== 'object' || Array.isArray(foodSeed)) throw new Error('Food seed data is invalid.');
  if (!shoppingSeed || !Array.isArray(shoppingSeed.shops)) throw new Error('Shopping seed data is invalid.');
  return buildSeedCatalog(foodSeed, shoppingSeed);
}

export async function ensureCatalogData(store) {
  const seedCatalog = await loadSeedCatalog();
  if (!store.has(STORAGE_KEYS.items)) {
    const migrated = migrateLegacyState(store.loadLegacyState(), seedCatalog);
    store.replaceState(applyShoppingCatalogRevision(migrated));
    store.setCatalogRevision(CATALOG_REVISION);
  } else if (store.getCatalogRevision() < CATALOG_REVISION) {
    store.replaceState(applyShoppingCatalogRevision(store.loadState()));
    store.setCatalogRevision(CATALOG_REVISION);
  }
  return seedCatalog;
}
