import test from 'node:test';
import assert from 'node:assert/strict';
import { applyShoppingCatalogRevision, associateItemWithShop, buildSeedCatalog, findEquivalentCatalogItem, isItemShoppingEligible, migrateLegacyState, itemAvailableAtShop, normalizeItem, setItemShopAvailability } from '../js/domain/catalogService.js';

const foodSeed = {
  Protein: [['Chicken breast, cooked', 165, '']],
  Dairy: [['Butter', 717, '']],
  Fruit: [['Apple', 52, '']]
};
const shoppingSeed = {
  shops: [
    { id: 'butchers', name: 'Butchers', items: [{ id: 'chicken', name: 'Chicken', category: 'Meat' }] },
    { id: 'farm-shop', name: 'Farm Shop', items: [{ id: 'apples', name: 'Apples', category: 'Fruit' }] },
    { id: 'supermarket', name: 'Supermarket', items: [{ id: 'butter', name: 'Butter', category: 'Dairy' }] }
  ]
};

test('seed catalog shares shopping and nutrition items with preferred shops', () => {
  const catalog = buildSeedCatalog(foodSeed, shoppingSeed);
  const chicken = catalog.items.find(item => item.name === 'Chicken');
  assert.equal(chicken.caloriesPer100g, 165);
  assert.equal(chicken.preferredShopId, 'butchers');
  assert.equal(itemAvailableAtShop(chicken, 'butchers'), true);
});

test('legacy recipe food ids migrate to shared item ids', () => {
  const catalog = buildSeedCatalog(foodSeed, shoppingSeed);
  const state = migrateLegacyState({
    foods: [{ id: 'seed-food-1', name: 'Chicken breast, cooked', category: 'Protein', caloriesPer100g: 165, source: 'seed' }],
    recipes: [{ id: 'r', ingredients: [{ id: 'i', foodId: 'seed-food-1', grams: 200 }] }],
    planner: { weeks: {} },
    shopping: { shops: [] }
  }, catalog);
  const chicken = state.items.find(item => item.name === 'Chicken');
  assert.equal(state.recipes[0].ingredients[0].itemId, chicken.id);
  assert.equal('foodId' in state.recipes[0].ingredients[0], false);
});

test('availability is per shop and does not remove the preferred-shop relationship', () => {
  const catalog = buildSeedCatalog(foodSeed, shoppingSeed);
  const chicken = catalog.items.find(item => item.name === 'Chicken');
  const next = setItemShopAvailability(chicken, 'butchers', false);
  assert.equal(itemAvailableAtShop(next, 'butchers'), false);
  assert.equal(next.preferredShopId, 'butchers');
});

test('non-food items never retain calorie data', () => {
  const item = normalizeItem({ name: 'Kitchen Roll', category: 'Household', isFood: false, caloriesPer100g: 123, preferredShopId: 'supermarket' });
  assert.equal(item.caloriesPer100g, null);
});

test('adding an existing Grocery item to a shop makes that shop preferred without duplicating the item', () => {
  const item = normalizeItem({
    id: 'item-kitchen-roll',
    name: 'Kitchen Roll',
    category: 'Paper Goods',
    isFood: false,
    preferredShopId: 'supermarket',
    shops: [{ shopId: 'supermarket', available: true }]
  });
  const next = associateItemWithShop(item, 'farm-shop', { available: true, makePreferred: true });
  assert.equal(next.id, item.id);
  assert.equal(next.preferredShopId, 'farm-shop');
  assert.equal(itemAvailableAtShop(next, 'supermarket'), true);
  assert.equal(itemAvailableAtShop(next, 'farm-shop'), true);
});

test('nutrition preparation variants are kept in Groceries but hidden from Shopping by default', () => {
  const catalog = buildSeedCatalog({
    Protein: [['Chicken thigh, cooked', 209, ''], ['Turkey mince 5% fat', 149, '']]
  }, { shops: [{ id: 'butchers', name: 'Butchers', items: [] }] });
  const cooked = catalog.items.find(item => item.name === 'Chicken thigh, cooked');
  const mince = catalog.items.find(item => item.name === 'Turkey mince 5% fat');
  assert.equal(itemAvailableAtShop(cooked, 'butchers'), false);
  assert.equal(itemAvailableAtShop(mince, 'butchers'), true);
});

test('shopping seed can preserve preferred shop and explicit unavailable state', () => {
  const catalog = buildSeedCatalog({ Dairy: [['Skimmed milk', 34, '']] }, {
    shops: [
      { id: 'farm-shop', name: 'Farm Shop', items: [{ id: 'milk', name: 'Skimmed milk', preferredShopId: 'supermarket', available: false }] },
      { id: 'supermarket', name: 'Supermarket', items: [] }
    ]
  });
  const milk = catalog.items.find(item => item.name === 'Skimmed milk');
  assert.equal(milk.preferredShopId, 'supermarket');
  assert.equal(itemAvailableAtShop(milk, 'farm-shop'), false);
});

test('catalog revision hides preparation variants and clears current selection without deleting frequency', () => {
  const state = {
    items: [
      { id: 'cooked', name: 'Carrot, cooked', shops: [{ shopId: 'farm-shop', available: true }] },
      { id: 'raw', name: 'Carrot, raw', shops: [{ shopId: 'farm-shop', available: true }] }
    ],
    recipes: [],
    planner: { weeks: {} },
    shopping: {
      shops: [{
        id: 'farm-shop',
        frequency: { cooked: 4 },
        current: { locked: false, quantities: { cooked: 2, raw: 1 }, collected: { cooked: true } }
      }]
    }
  };
  const next = applyShoppingCatalogRevision(state);
  assert.equal(itemAvailableAtShop(next.items[0], 'farm-shop'), false);
  assert.equal(itemAvailableAtShop(next.items[1], 'farm-shop'), true);
  assert.equal(next.shopping.shops[0].current.quantities.cooked, undefined);
  assert.equal(next.shopping.shops[0].current.quantities.raw, 1);
  assert.equal(next.shopping.shops[0].frequency.cooked, 4);
});

test('shopping eligibility excludes preparation variants without excluding normal products', () => {
  assert.equal(isItemShoppingEligible({ name: 'Chicken thigh, cooked' }), false);
  assert.equal(isItemShoppingEligible({ name: 'Egg, whole boiled' }), false);
  assert.equal(isItemShoppingEligible({ name: 'Sweet potato, baked' }), false);
  assert.equal(isItemShoppingEligible({ name: 'Stock, prepared' }), false);
  assert.equal(isItemShoppingEligible({ name: 'Baked beans in tomato sauce' }), true);
  assert.equal(itemAvailableAtShop({ name: 'Chicken thigh, cooked', shops: [{ shopId: 'butchers', available: true }] }, 'butchers'), false);
});

test('catalog name matching ignores punctuation, hyphens and word order', () => {
  const items = [{ id: 'gf', name: 'Gluten-Free Pasta' }, { id: 'jacobs', name: "Jacob's Crackers" }];
  assert.equal(findEquivalentCatalogItem(items, 'Pasta gluten free')?.id, 'gf');
  assert.equal(findEquivalentCatalogItem(items, 'Jacobs crackers')?.id, 'jacobs');
});

test('catalog revision adds newly introduced seed items once without duplicating equivalent local names', () => {
  const state = {
    items: [{ id: 'local-gf', name: 'Spaghetti Gluten-Free', shops: [{ shopId: 'supermarket', available: true }] }],
    recipes: [],
    planner: { weeks: {} },
    shopping: { shops: [{ id: 'supermarket', frequency: {}, current: { locked: false, quantities: {}, collected: {} } }] }
  };
  const seedCatalog = {
    items: [
      { id: 'item-spaghetti-gluten-free', name: 'Spaghetti Gluten Free', introducedInRevision: 3, shops: [{ shopId: 'supermarket', available: true }] },
      { id: 'item-jacobs-crackers', name: 'Jacobs Crackers', introducedInRevision: 3, shops: [{ shopId: 'supermarket', available: true }] }
    ]
  };
  const next = applyShoppingCatalogRevision(state, seedCatalog);
  assert.equal(next.items.filter(item => /spaghetti/i.test(item.name)).length, 1);
  assert.equal(next.items.some(item => item.id === 'item-jacobs-crackers'), true);
});
