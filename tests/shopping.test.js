import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearShoppingSelection,
  completeShoppingShop,
  incrementShoppingItem,
  lockShoppingItems,
  normalizeShoppingState,
  rankedShopItems,
  selectedShopItems,
  toggleCollectedItem
} from '../js/domain/shoppingService.js';

const seed = {
  shops: [{
    id: 'shop',
    name: 'Shop',
    items: [
      { id: 'bread', name: 'Bread', category: 'Bakery' },
      { id: 'milk', name: 'Milk', category: 'Dairy' },
      { id: 'eggs', name: 'Eggs', category: 'Eggs' }
    ]
  }]
};

test('shopping item taps count quantities and lock freezes selection', () => {
  let state = normalizeShoppingState(seed);
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = incrementShoppingItem(state, 'shop', 'bread');
  assert.equal(state.shops[0].current.quantities.milk, 2);
  assert.equal(state.shops[0].current.quantities.bread, 1);

  state = lockShoppingItems(state, 'shop');
  state = incrementShoppingItem(state, 'shop', 'milk');
  assert.equal(state.shops[0].current.locked, true);
  assert.equal(state.shops[0].current.quantities.milk, 2);
  assert.deepEqual(selectedShopItems(state.shops[0]).map(item => item.id), ['bread', 'milk']);
});

test('locked items can be marked collected and Done records frequency once per item', () => {
  let state = normalizeShoppingState(seed);
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = incrementShoppingItem(state, 'shop', 'bread');
  state = lockShoppingItems(state, 'shop');
  state = toggleCollectedItem(state, 'shop', 'milk');
  assert.equal(state.shops[0].current.collected.milk, true);

  state = completeShoppingShop(state, 'shop');
  const shop = state.shops[0];
  assert.equal(shop.frequency.milk, 1, '2x milk still counts as one completed-shop purchase');
  assert.equal(shop.frequency.bread, 1);
  assert.deepEqual(shop.current, { locked: false, quantities: {}, collected: {} });
});

test('frequency ranking sorts most-bought items first then alphabetically', () => {
  const state = normalizeShoppingState(seed, {
    shops: [{
      id: 'shop',
      name: 'Shop',
      items: seed.shops[0].items,
      frequency: { milk: 5, eggs: 2, bread: 2 },
      current: { locked: false, quantities: {}, collected: {} }
    }]
  });
  assert.deepEqual(rankedShopItems(state.shops[0]).map(item => item.id), ['milk', 'bread', 'eggs']);
});

test('clear selection resets an unlocked list without changing frequency', () => {
  let state = normalizeShoppingState(seed, {
    shops: [{
      id: 'shop', name: 'Shop', items: seed.shops[0].items,
      frequency: { milk: 3 },
      current: { locked: false, quantities: {}, collected: {} }
    }]
  });
  state = incrementShoppingItem(state, 'shop', 'milk');
  state = clearShoppingSelection(state, 'shop');
  assert.deepEqual(state.shops[0].current, { locked: false, quantities: {}, collected: {} });
  assert.equal(state.shops[0].frequency.milk, 3);
});
