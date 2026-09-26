import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addRecipeToShopping,
  clearShoppingSelection,
  completeShoppingShop,
  groupItemsByCategory,
  incrementShoppingItem,
  lockShoppingItems,
  rankedShopItems,
  removeShoppingItem,
  selectedShopItems,
  toggleCollectedItem,
  unlockShoppingItems
} from '../js/domain/shoppingService.js';

const items = [
  { id: 'bread', name: 'Bread', category: 'Bakery', preferredShopId: 'shop', shops: [{ shopId: 'shop', available: true }] },
  { id: 'milk', name: 'Milk', category: 'Dairy', preferredShopId: 'shop', shops: [{ shopId: 'shop', available: true }] },
  { id: 'eggs', name: 'Eggs', category: 'Eggs', preferredShopId: 'shop', shops: [{ shopId: 'shop', available: true }] }
];
const blank = () => ({ shops: [{ id: 'shop', name: 'Shop', frequency: {}, current: { locked: false, quantities: {}, collected: {} } }] });

test('shopping item taps count quantities and lock freezes selection', () => {
  let state = blank();
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = incrementShoppingItem(state, 'shop', 'bread');
  assert.equal(state.shops[0].current.quantities.milk, 2);
  assert.equal(state.shops[0].current.quantities.bread, 1);
  state = lockShoppingItems(state, 'shop');
  state = incrementShoppingItem(state, 'shop', 'milk');
  assert.equal(state.shops[0].current.quantities.milk, 2);
  assert.deepEqual(selectedShopItems(state.shops[0], items).map(item => item.id), ['bread', 'milk']);
});

test('locked items can be collected and Done records frequency once per item', () => {
  let state = blank();
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = lockShoppingItems(state, 'shop');
  state = toggleCollectedItem(state, 'shop', 'milk');
  assert.equal(state.shops[0].current.collected.milk, true);
  state = completeShoppingShop(state, 'shop');
  assert.equal(state.shops[0].frequency.milk, 1);
  assert.deepEqual(state.shops[0].current, { locked: false, quantities: {}, collected: {} });
});

test('frequency ranking uses shared item catalogue then alphabetical order', () => {
  const state = blank();
  state.shops[0].frequency = { milk: 5, eggs: 2, bread: 2 };
  assert.deepEqual(rankedShopItems(state.shops[0], items).map(item => item.id), ['milk', 'bread', 'eggs']);
});

test('clear selection resets unlocked list without changing frequency', () => {
  let state = blank();
  state.shops[0].frequency = { milk: 3 };
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = clearShoppingSelection(state, 'shop');
  assert.deepEqual(state.shops[0].current, { locked: false, quantities: {}, collected: {} });
  assert.equal(state.shops[0].frequency.milk, 3);
});

test('recipe ingredients add once to preferred shops', () => {
  const result = addRecipeToShopping(blank(), { ingredients: [{ itemId: 'milk' }, { itemId: 'bread' }, { itemId: 'milk' }] }, items);
  assert.equal(result.shopping.shops[0].current.quantities.milk, 1);
  assert.equal(result.shopping.shops[0].current.quantities.bread, 1);
  assert.deepEqual(result.added.sort(), ['Bread', 'Milk']);
});

test('selected item can be removed before locking without changing frequency', () => {
  let state = blank();
  state.shops[0].frequency = { milk: 4 };
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = removeShoppingItem(state, 'shop', 'milk');
  assert.equal(state.shops[0].current.quantities.milk, undefined);
  assert.equal(state.shops[0].frequency.milk, 4);

  state = incrementShoppingItem(state, 'shop', 'bread');
  state = lockShoppingItems(state, 'shop');
  state = removeShoppingItem(state, 'shop', 'bread');
  assert.equal(state.shops[0].current.quantities.bread, 1, 'locked lists cannot remove items');
});

test('locked list can be unlocked for editing without losing its selections', () => {
  let state = blank();
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = lockShoppingItems(state, 'shop');
  state = toggleCollectedItem(state, 'shop', 'milk');
  state = unlockShoppingItems(state, 'shop');

  assert.equal(state.shops[0].current.locked, false);
  assert.equal(state.shops[0].current.quantities.milk, 1);
  assert.equal(state.shops[0].current.collected.milk, true);

  state = incrementShoppingItem(state, 'shop', 'milk');
  state = incrementShoppingItem(state, 'shop', 'bread');
  assert.equal(state.shops[0].current.quantities.milk, 2);
  assert.equal(state.shops[0].current.quantities.bread, 1);
  assert.equal(state.shops[0].current.collected.milk, undefined, 'editing a collected item makes it uncollected');

  state = lockShoppingItems(state, 'shop');
  assert.equal(state.shops[0].current.locked, true);
});

test('category grouping preserves ranked order and groups matching items', () => {
  const ranked = [
    { id: 'milk', name: 'Milk', category: 'Dairy' },
    { id: 'bread', name: 'Bread', category: 'Bakery' },
    { id: 'cheese', name: 'Cheese', category: 'Dairy' },
    { id: 'rolls', name: 'Rolls', category: 'Bakery' }
  ];
  const groups = groupItemsByCategory(ranked);
  assert.deepEqual(groups.map(group => group.category), ['Dairy', 'Bakery']);
  assert.deepEqual(groups[0].items.map(item => item.id), ['milk', 'cheese']);
  assert.deepEqual(groups[1].items.map(item => item.id), ['bread', 'rolls']);
});
