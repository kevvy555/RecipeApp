import { uid } from '../core/utils.js';

const SHOPPING_FOOD_ALIASES = Object.freeze({
  'Bacon': 'Bacon, back grilled',
  'Sausages': 'Sausage, pork cooked',
  'Chicken': 'Chicken breast, cooked',
  'Ham': 'Ham, sliced',
  'Eggs': 'Egg, whole boiled',
  'Double Cream': 'Double cream',
  'Apples': 'Apple',
  'Lemons': 'Lemon',
  'Fresh Orange': 'Orange',
  'Cabbage': 'Cabbage, cooked',
  'Cauliflower': 'Cauliflower, cooked',
  'Carrots': 'Carrot, raw',
  'Celery': 'Celery, raw',
  'Cucumber': 'Cucumber, raw',
  'Tomatoes': 'Tomato, raw',
  'Mushrooms': 'Mushrooms, cooked',
  'Peppers': 'Bell pepper, raw',
  'Broccoli': 'Broccoli, cooked',
  'Lettuce': 'Lettuce',
  'Potatoes': 'Potato, boiled',
  'Oats': 'Porridge oats, dry',
  'Basmati Rice': 'Basmati rice, cooked',
  'Rice': 'White rice, cooked',
  'Pasta': 'Pasta, cooked',
  'Bagels': 'Bagel, plain',
  'Tortilla Wraps': 'Tortilla wrap, flour',
  'Bread': 'White bread',
  'Butter': 'Butter',
  'Mozzarella': 'Mozzarella',
  'Natural Yoghurt': 'Natural yogurt',
  'Cream Cheese': 'Cream cheese',
  'Oat Milk': 'Oat drink, unsweetened',
  'Tuna': 'Tuna, canned in spring water drained',
  'Sardines': 'Sardines, canned in oil drained',
  'Mackerel': 'Mackerel, cooked',
  'Salmon': 'Salmon, cooked',
  'Chickpeas': 'Chickpeas, cooked',
  'Tinned Tomatoes': 'Chopped tomatoes, canned',
  'Fish Fingers': 'Fish fingers, cooked',
  'Crisps': 'Crisps, ready salted',
  'Chocolate': 'Milk chocolate',
  'Tea': 'Tea, brewed no milk',
  'Coffee': 'Coffee, black'
});

export function slugifyItemName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function flattenFoodSeed(foodSeed) {
  let index = 0;
  return Object.entries(foodSeed || {}).flatMap(([category, rows]) => Array.isArray(rows) ? rows.map(([name, caloriesPer100g, notes='']) => {
    index += 1;
    return { legacySeedId:`seed-food-${index}`, name:String(name).trim(), category:String(category || 'Other'), caloriesPer100g:Number(caloriesPer100g), notes:String(notes || '') };
  }) : []);
}

function defaultShopForFood(food) {
  const name = food.name.toLowerCase();
  if (['fruit','vegetable'].includes(food.category.toLowerCase())) return 'farm-shop';
  if (food.category === 'Nuts & Seeds') return 'health-food-shop';
  if (food.category === 'Protein' && !/(tofu|quorn|tempeh)/.test(name)) return 'butchers';
  return 'supermarket';
}

function uniqueId(base, used) {
  let id = `item-${slugifyItemName(base)}`;
  let suffix = 2;
  while (used.has(id)) id = `item-${slugifyItemName(base)}-${suffix++}`;
  used.add(id);
  return id;
}

function shopLink(shopId, available=true) { return { shopId, available }; }

export function buildSeedCatalog(foodSeed, shoppingSeed) {
  const foods = flattenFoodSeed(foodSeed);
  const foodByName = new Map(foods.map(food => [food.name.toLowerCase(), food]));
  const usedIds = new Set();
  const usedFoodNames = new Set();
  const items = [];
  const itemByShoppingName = new Map();
  const legacySeedIdToItemId = {};
  const legacyShoppingItemToItemId = {};
  const shops = (shoppingSeed?.shops || []).map(shop => ({ id:shop.id, name:shop.name, frequency:{}, current:{locked:false,quantities:{},collected:{}} }));

  for (const shop of shoppingSeed?.shops || []) {
    for (const sourceItem of shop.items || []) {
      const key = sourceItem.name.trim().toLowerCase();
      let item = itemByShoppingName.get(key);
      if (!item) {
        const foodName = SHOPPING_FOOD_ALIASES[sourceItem.name] || sourceItem.name;
        const food = foodByName.get(foodName.toLowerCase()) || null;
        const id = uniqueId(sourceItem.name, usedIds);
        item = {
          id,
          name: sourceItem.name,
          category: sourceItem.category || food?.category || 'Other',
          isFood: true,
          caloriesPer100g: Number.isFinite(food?.caloriesPer100g) ? food.caloriesPer100g : null,
          notes: food?.notes || '',
          preferredShopId: shop.id,
          shops: [shopLink(shop.id)],
          source: 'seed'
        };
        items.push(item);
        itemByShoppingName.set(key, item);
        if (food) {
          usedFoodNames.add(food.name.toLowerCase());
          legacySeedIdToItemId[food.legacySeedId] = id;
        }
      } else if (!item.shops.some(link => link.shopId === shop.id)) {
        item.shops.push(shopLink(shop.id));
      }
      legacyShoppingItemToItemId[`${shop.id}:${sourceItem.id}`] = item.id;
    }
  }

  for (const food of foods) {
    if (usedFoodNames.has(food.name.toLowerCase())) continue;
    const id = uniqueId(food.name, usedIds);
    const preferredShopId = defaultShopForFood(food);
    items.push({
      id,
      name: food.name,
      category: food.category,
      isFood: true,
      caloriesPer100g: Number.isFinite(food.caloriesPer100g) ? food.caloriesPer100g : null,
      notes: food.notes,
      preferredShopId,
      shops: [shopLink(preferredShopId)],
      source: 'seed'
    });
    legacySeedIdToItemId[food.legacySeedId] = id;
  }

  return { items, shops, legacySeedIdToItemId, legacyShoppingItemToItemId };
}

export function normalizeItem(input, fallbackShopId='supermarket') {
  const shops = Array.isArray(input.shops) && input.shops.length
    ? input.shops.map(link => ({ shopId:String(link.shopId), available:link.available !== false }))
    : [shopLink(input.preferredShopId || fallbackShopId)];
  const preferredShopId = input.preferredShopId || shops[0]?.shopId || fallbackShopId;
  if (!shops.some(link => link.shopId === preferredShopId)) shops.push(shopLink(preferredShopId));
  const isFood = input.isFood !== false;
  return {
    id: input.id || uid('item'),
    name: String(input.name || '').trim(),
    category: String(input.category || 'Other'),
    isFood,
    caloriesPer100g: !isFood || input.caloriesPer100g === '' || input.caloriesPer100g == null ? null : Number(input.caloriesPer100g),
    notes: String(input.notes || ''),
    preferredShopId,
    shops,
    source: input.source || 'user',
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function itemAvailableAtShop(item, shopId) {
  return item?.shops?.some(link => link.shopId === shopId && link.available !== false) || false;
}

export function availableShopIds(item) {
  return (item?.shops || []).filter(link => link.available !== false).map(link => link.shopId);
}

export function associateItemWithShop(item, shopId, { available=true, makePreferred=false }={}) {
  const next = structuredClone(item);
  const existing = next.shops?.find(link => link.shopId === shopId);
  if (existing) existing.available = available;
  else (next.shops ||= []).push(shopLink(shopId, available));
  if (makePreferred || !next.preferredShopId) next.preferredShopId = shopId;
  next.updatedAt = new Date().toISOString();
  return next;
}

export function setItemShopAvailability(item, shopId, available) {
  return associateItemWithShop(item, shopId, { available, makePreferred:false });
}

export function migrateLegacyState(legacyState, seedCatalog) {
  const items = structuredClone(seedCatalog.items);
  const itemById = new Map(items.map(item => [item.id, item]));
  const itemByName = new Map(items.map(item => [item.name.toLowerCase(), item]));
  const legacyFoodIdToItemId = { ...seedCatalog.legacySeedIdToItemId };

  for (const legacyFood of legacyState?.foods || []) {
    let itemId = legacyFoodIdToItemId[legacyFood.id];
    let item = itemId ? itemById.get(itemId) : itemByName.get(String(legacyFood.name || '').toLowerCase());
    if (!item) {
      item = normalizeItem({
        ...legacyFood,
        id: legacyFood.id || uid('item'),
        isFood: true,
        preferredShopId: 'supermarket',
        shops: [shopLink('supermarket')],
        source: legacyFood.source || 'user'
      });
      items.push(item);
      itemById.set(item.id, item);
      itemByName.set(item.name.toLowerCase(), item);
    } else {
      item.caloriesPer100g = legacyFood.caloriesPer100g == null ? item.caloriesPer100g : Number(legacyFood.caloriesPer100g);
      item.notes = legacyFood.notes ?? item.notes;
      item.category = legacyFood.category || item.category;
    }
    legacyFoodIdToItemId[legacyFood.id] = item.id;
  }

  const shopping = { shops: structuredClone(seedCatalog.shops) };
  const shopById = new Map(shopping.shops.map(shop => [shop.id, shop]));

  for (const legacyShop of legacyState?.shopping?.shops || []) {
    let shop = shopById.get(legacyShop.id);
    if (!shop) {
      shop = { id:legacyShop.id, name:legacyShop.name || legacyShop.id, frequency:{}, current:{locked:false,quantities:{},collected:{}} };
      shopping.shops.push(shop);
      shopById.set(shop.id, shop);
    }
    const itemIdMap = {};
    for (const legacyItem of legacyShop.items || []) {
      const seedMapped = seedCatalog.legacyShoppingItemToItemId[`${legacyShop.id}:${legacyItem.id}`];
      let item = seedMapped ? itemById.get(seedMapped) : itemByName.get(String(legacyItem.name || '').toLowerCase());
      if (!item) {
        item = normalizeItem({ id:legacyItem.id || uid('item'), name:legacyItem.name, category:legacyItem.category, isFood:true, preferredShopId:legacyShop.id, shops:[shopLink(legacyShop.id)], source:'user' });
        items.push(item); itemById.set(item.id,item); itemByName.set(item.name.toLowerCase(),item);
      } else if (!item.shops.some(link => link.shopId === legacyShop.id)) {
        item.shops.push(shopLink(legacyShop.id));
      }
      itemIdMap[legacyItem.id] = item.id;
    }
    const mapKeys = source => Object.fromEntries(Object.entries(source || {}).map(([legacyId,value]) => [itemIdMap[legacyId] || seedCatalog.legacyShoppingItemToItemId[`${legacyShop.id}:${legacyId}`] || legacyId, value]));
    shop.frequency = mapKeys(legacyShop.frequency);
    shop.current = {
      locked:Boolean(legacyShop.current?.locked),
      quantities:mapKeys(legacyShop.current?.quantities),
      collected:mapKeys(legacyShop.current?.collected)
    };
  }

  const recipes = (legacyState?.recipes || []).map(recipe => ({
    ...recipe,
    ingredients:(recipe.ingredients || []).map(ingredient => ({
      id: ingredient.id,
      itemId: ingredient.itemId || legacyFoodIdToItemId[ingredient.foodId] || ingredient.foodId,
      grams:Number(ingredient.grams) || 0
    }))
  }));

  return { items, recipes, planner: legacyState?.planner || {weeks:{}}, shopping };
}
