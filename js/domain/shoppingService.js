function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function emptyCurrentList() {
  return { locked: false, quantities: {}, collected: {} };
}

export function normalizeShoppingState(seedData, existingState = null) {
  const seedShops = Array.isArray(seedData?.shops) ? seedData.shops : [];
  const existingShops = Array.isArray(existingState?.shops) ? existingState.shops : [];
  const existingById = new Map(existingShops.map(shop => [shop.id, shop]));

  const shops = seedShops.map(seedShop => {
    const existing = existingById.get(seedShop.id);
    const seedItems = Array.isArray(seedShop.items) ? seedShop.items : [];
    const extraItems = Array.isArray(existing?.items)
      ? existing.items.filter(item => !seedItems.some(seedItem => seedItem.id === item.id))
      : [];

    return {
      id: seedShop.id,
      name: seedShop.name,
      items: [...seedItems, ...extraItems].map(item => ({
        id: item.id,
        name: item.name,
        category: item.category || 'Other'
      })),
      frequency: { ...(existing?.frequency || {}) },
      current: {
        locked: Boolean(existing?.current?.locked),
        quantities: { ...(existing?.current?.quantities || {}) },
        collected: { ...(existing?.current?.collected || {}) }
      }
    };
  });

  for (const existingShop of existingShops) {
    if (!shops.some(shop => shop.id === existingShop.id)) shops.push(clone(existingShop));
  }

  return { shops };
}

function updateShop(state, shopId, updater) {
  return {
    ...state,
    shops: (state.shops || []).map(shop => shop.id === shopId ? updater(clone(shop)) : shop)
  };
}

export function incrementShoppingItem(state, shopId, itemId) {
  return updateShop(state, shopId, shop => {
    if (shop.current.locked) return shop;
    const current = Number(shop.current.quantities[itemId] || 0);
    shop.current.quantities[itemId] = current + 1;
    return shop;
  });
}

export function clearShoppingSelection(state, shopId) {
  return updateShop(state, shopId, shop => {
    if (shop.current.locked) return shop;
    shop.current = emptyCurrentList();
    return shop;
  });
}

export function lockShoppingItems(state, shopId) {
  return updateShop(state, shopId, shop => {
    const hasSelected = Object.values(shop.current.quantities || {}).some(quantity => Number(quantity) > 0);
    if (hasSelected) shop.current.locked = true;
    return shop;
  });
}

export function toggleCollectedItem(state, shopId, itemId) {
  return updateShop(state, shopId, shop => {
    if (!shop.current.locked || Number(shop.current.quantities[itemId] || 0) <= 0) return shop;
    shop.current.collected[itemId] = !shop.current.collected[itemId];
    return shop;
  });
}

export function completeShoppingShop(state, shopId) {
  return updateShop(state, shopId, shop => {
    for (const [itemId, quantity] of Object.entries(shop.current.quantities || {})) {
      if (Number(quantity) > 0) {
        shop.frequency[itemId] = Number(shop.frequency[itemId] || 0) + 1;
      }
    }
    shop.current = emptyCurrentList();
    return shop;
  });
}

export function rankedShopItems(shop) {
  const frequency = shop?.frequency || {};
  return [...(shop?.items || [])].sort((a, b) => {
    const difference = Number(frequency[b.id] || 0) - Number(frequency[a.id] || 0);
    if (difference !== 0) return difference;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

export function selectedShopItems(shop) {
  return rankedShopItems(shop).filter(item => Number(shop.current?.quantities?.[item.id] || 0) > 0);
}

export function selectedItemCount(shop) {
  return Object.values(shop?.current?.quantities || {}).filter(quantity => Number(quantity) > 0).length;
}
