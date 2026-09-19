import test from 'node:test';
import assert from 'node:assert/strict';
import { associateItemWithShop, buildSeedCatalog, migrateLegacyState, itemAvailableAtShop, normalizeItem, setItemShopAvailability } from '../js/domain/catalogService.js';

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
