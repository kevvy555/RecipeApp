import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addLockedShoppingItem,
  addRecipeToShopping,
  clearShoppingSelection,
  completeShoppingShop,
  groupItemsByCategory,
  incrementShoppingItem,
  lockShoppingItems,
  rankedShopItems,
  removeShoppingItem,
  selectedShopItems,
  setShoppingItemSize,
  toggleCollectedItem,
  unlockShoppingItems
} from '../js/domain/shoppingService.js';

const items = [
  { id: 'bread', name: 'Bread', category: 'Bakery', preferredShopId: 'shop', shops: [{ shopId: 'shop', available: true }] },
  { id: 'milk', name: 'Milk', category: 'Dairy', preferredShopId: 'shop', shops: [{ shopId: 'shop', available: true }] },
  { id: 'eggs', name: 'Eggs', category: 'Eggs', preferredShopId: 'shop', shops: [{ shopId: 'shop', available: true }] }
];
const blank = () => ({ shops: [{ id: 'shop', name: 'Shop', frequency: {}, current: { locked: false, quantities: {}, collected: {}, sizes: {} } }] });

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
  assert.deepEqual(state.shops[0].current, { locked: false, quantities: {}, collected: {}, sizes: {} });
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
  assert.deepEqual(state.shops[0].current, { locked: false, quantities: {}, collected: {}, sizes: {} });
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

test('shop item queries omit cooked nutrition references even if linked as available', () => {
  const state = blank();
  const items = [
    { id: 'chicken', name: 'Chicken', category: 'Protein', shops: [{ shopId: 'shop', available: true }] },
    { id: 'cooked', name: 'Chicken thigh, cooked', category: 'Protein', shops: [{ shopId: 'shop', available: true }] }
  ];
  assert.deepEqual(rankedShopItems(state.shops[0], items).map(item => item.id), ['chicken']);
});

test('locked list quick add adds a missing item without unlocking the list', () => {
  let state = blank();
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = lockShoppingItems(state, 'shop');
  state = addLockedShoppingItem(state, 'shop', 'bread');
  assert.equal(state.shops[0].current.locked, true);
  assert.equal(state.shops[0].current.quantities.bread, 1);
  assert.equal(state.shops[0].current.quantities.milk, 1);
});

test('locked shopping item can store, change and clear a size without changing count', () => {
  let state = blank();
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = lockShoppingItems(state, 'shop');
  state = setShoppingItemSize(state, 'shop', 'milk', '2L');
  assert.equal(state.shops[0].current.sizes.milk, '2L');
  assert.equal(state.shops[0].current.quantities.milk, 1);
  state = setShoppingItemSize(state, 'shop', 'milk', '6 pack');
  assert.equal(state.shops[0].current.sizes.milk, '6 pack');
  state = setShoppingItemSize(state, 'shop', 'milk', '');
  assert.equal(state.shops[0].current.sizes.milk, undefined);
});

test('item size cannot be set until the item is selected and list is locked', () => {
  let state = blank();
  state = setShoppingItemSize(state, 'shop', 'milk', '1L');
  assert.equal(state.shops[0].current.sizes.milk, undefined);
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = setShoppingItemSize(state, 'shop', 'milk', '1L');
  assert.equal(state.shops[0].current.sizes.milk, undefined);
});

test('removing an unlocked item removes its saved size', () => {
  let state = blank();
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = lockShoppingItems(state, 'shop');
  state = setShoppingItemSize(state, 'shop', 'milk', '500ml');
  state = unlockShoppingItems(state, 'shop');
  state = removeShoppingItem(state, 'shop', 'milk');
  assert.equal(state.shops[0].current.sizes.milk, undefined);
});

test('remembered default size is restored when an item is added to a new unlocked list', () => {
  let state = blank();
  state = incrementShoppingItem(state, 'shop', 'milk', '2L');
  assert.equal(state.shops[0].current.sizes.milk, '2L');
  assert.equal(state.shops[0].current.quantities.milk, 1);
});

test('remembered default size is restored when quick-adding to a locked list', () => {
  let state = blank();
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = lockShoppingItems(state, 'shop');
  state = addLockedShoppingItem(state, 'shop', 'bread', '500g');
  assert.equal(state.shops[0].current.sizes.bread, '500g');
  assert.equal(state.shops[0].current.locked, true);
});

test('existing current size is not overwritten by a remembered default', () => {
  let state = blank();
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = lockShoppingItems(state, 'shop');
  state = setShoppingItemSize(state, 'shop', 'milk', '1L');
  state = unlockShoppingItems(state, 'shop');
  state = incrementShoppingItem(state, 'shop', 'milk', '2L');
  assert.equal(state.shops[0].current.sizes.milk, '1L');
});
