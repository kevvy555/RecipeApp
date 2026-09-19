import { availableShopIds, itemAvailableAtShop } from './catalogService.js';

function clone(value) { return structuredClone(value); }
export function emptyCurrentList() { return { locked:false, quantities:{}, collected:{} }; }
function updateShop(state, shopId, updater) { return { ...state, shops:(state.shops||[]).map(shop => shop.id===shopId ? updater(clone(shop)) : shop) }; }
export function incrementShoppingItem(state, shopId, itemId) { return updateShop(state,shopId,shop=>{ if(shop.current.locked)return shop; shop.current.quantities[itemId]=Number(shop.current.quantities[itemId]||0)+1; delete shop.current.collected[itemId]; return shop; }); }
export function removeShoppingItem(state, shopId, itemId) { return updateShop(state,shopId,shop=>{ if(shop.current.locked)return shop; delete shop.current.quantities[itemId]; delete shop.current.collected[itemId]; return shop; }); }
export function clearShoppingSelection(state, shopId) { return updateShop(state,shopId,shop=>{ if(!shop.current.locked) shop.current=emptyCurrentList(); return shop; }); }
export function lockShoppingItems(state, shopId) { return updateShop(state,shopId,shop=>{ if(Object.values(shop.current.quantities||{}).some(q=>Number(q)>0)) shop.current.locked=true; return shop; }); }
export function unlockShoppingItems(state, shopId) { return updateShop(state,shopId,shop=>{ shop.current.locked=false; return shop; }); }
export function toggleCollectedItem(state, shopId, itemId) { return updateShop(state,shopId,shop=>{ if(shop.current.locked && Number(shop.current.quantities[itemId]||0)>0) shop.current.collected[itemId]=!shop.current.collected[itemId]; return shop; }); }
export function completeShoppingShop(state, shopId) { return updateShop(state,shopId,shop=>{ for(const [itemId,q] of Object.entries(shop.current.quantities||{})) if(Number(q)>0) shop.frequency[itemId]=Number(shop.frequency[itemId]||0)+1; shop.current=emptyCurrentList(); return shop; }); }
export function shopItems(items, shopId, {includeUnavailable=false}={}) { return (items||[]).filter(item => item.shops?.some(link => link.shopId===shopId && (includeUnavailable || link.available!==false))); }
export function rankedShopItems(shop, items) { const freq=shop?.frequency||{}; return shopItems(items,shop?.id).sort((a,b)=>Number(freq[b.id]||0)-Number(freq[a.id]||0) || a.name.localeCompare(b.name,undefined,{sensitivity:'base'})); }
export function selectedShopItems(shop, items) { return rankedShopItems(shop,items).filter(item=>Number(shop.current?.quantities?.[item.id]||0)>0); }
export function selectedItemCount(shop) { return Object.values(shop?.current?.quantities||{}).filter(q=>Number(q)>0).length; }
export function addRecipeToShopping(state, recipe, items) {
  let next=clone(state); const itemMap=new Map((items||[]).map(item=>[item.id,item])); const seen=new Set(); const added=[]; const lockedShops=new Set(); const unavailable=[];
  for(const ingredient of recipe?.ingredients||[]) {
    const itemId=ingredient.itemId || ingredient.foodId; if(!itemId || seen.has(itemId)) continue; seen.add(itemId);
    const item=itemMap.get(itemId); if(!item) { unavailable.push(itemId); continue; }
    const available=availableShopIds(item); let shopId=item.preferredShopId;
    if(!itemAvailableAtShop(item,shopId)) shopId=available[0];
    if(!shopId) { unavailable.push(item.name); continue; }
    const shop=next.shops?.find(entry=>entry.id===shopId); if(!shop) { unavailable.push(item.name); continue; }
    if(shop.current?.locked) { lockedShops.add(shop.name); continue; }
    next=incrementShoppingItem(next,shopId,item.id); added.push(item.name);
  }
  return { shopping:next, added, lockedShops:[...lockedShops], unavailable };
}
