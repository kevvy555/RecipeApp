import { escapeHtml } from '../core/utils.js';
import { itemAvailableAtShop } from '../domain/catalogService.js';
import { rankedShopItems, selectedItemCount, selectedShopItems, shopItems } from '../domain/shoppingService.js';
import { sectionLayout } from './layout.js';
import { openDialog } from './dialog.js';

function shopStatus(shop, items) {
  const selected = selectedItemCount(shop);
  if (shop.current?.locked) return `${selected} item${selected === 1 ? '' : 's'} locked`;
  if (selected > 0) return `${selected} item${selected === 1 ? '' : 's'} selected`;
  return `${shopItems(items, shop.id).length} available items`;
}

export class ShoppingView {
  constructor(root, context) { this.root = root; this.context = context; }
  render() { const shopId=this.context.shoppingShopId; if(shopId)this.renderShop(shopId); else this.renderShopTypes(); }

  renderShopTypes() {
    const shops=this.context.state.shopping?.shops||[]; const items=this.context.state.items||[];
    const cards=shops.map(shop=>`<button class="shopping-shop-card" type="button" data-open-shopping-shop="${escapeHtml(shop.id)}"><span class="shopping-shop-card__icon">🛒</span><span class="shopping-shop-card__name">${escapeHtml(shop.name)}</span><span class="shopping-shop-card__status ${shop.current?.locked?'shopping-shop-card__status--locked':''}">${escapeHtml(shopStatus(shop,items))}</span></button>`).join('');
    this.root.innerHTML=sectionLayout('Shopping',`<div class="stack stack--lg"><section><p class="eyebrow">Shopping lists</p><h2 class="shopping-heading">Where are you shopping?</h2><p class="muted">Choose a shop to build or continue its list.</p></section><div class="shopping-shop-grid">${cards}</div></div>`,{subtitle:`${shops.length} shop types`});
    this.root.querySelectorAll('[data-open-shopping-shop]').forEach(button=>button.addEventListener('click',()=>this.context.actions.openShoppingShop(button.dataset.openShoppingShop)));
  }

  renderShop(shopId) {
    const shop=this.context.state.shopping?.shops?.find(entry=>entry.id===shopId); if(!shop){this.context.actions.closeShoppingShop();return;}
    const locked=Boolean(shop.current?.locked); const items=locked?selectedShopItems(shop,this.context.state.items):rankedShopItems(shop,this.context.state.items); const selected=selectedItemCount(shop);
    const itemCards=items.map(item=>{const quantity=Number(shop.current?.quantities?.[item.id]||0);const collected=Boolean(shop.current?.collected?.[item.id]);const removable=!locked&&quantity>0;const classes=['shopping-item',quantity>0?'shopping-item--selected':'',locked?'shopping-item--locked':'',collected?'shopping-item--collected':'',removable?'shopping-item--removable':''].filter(Boolean).join(' ');const action=locked?'data-toggle-collected-shopping-item':'data-increment-shopping-item';const main=`<button class="${classes}" type="button" ${action}="${escapeHtml(item.id)}"><span class="shopping-item__name">${escapeHtml(item.name)}</span><span class="shopping-item__category">${escapeHtml(item.category)}</span>${quantity>0?`<span class="shopping-item__quantity">${quantity}×</span>`:''}${collected?'<span class="shopping-item__check">✓</span>':''}</button>`;const remove=removable?`<button class="shopping-item__remove" type="button" data-remove-shopping-item="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)} from shopping list">✕</button>`:'';return `<div class="shopping-item-wrap">${main}${remove}</div>`;}).join('');
    const actions=locked?`<button class="button button--primary shopping-action" type="button" data-complete-shopping-shop>Done</button>`:`<div class="shopping-actions shopping-actions--wrap"><button class="button button--ghost" type="button" data-add-shopping-item>+ Add Item</button><button class="button button--ghost" type="button" data-manage-shopping-items>Manage Items</button><button class="button button--ghost" type="button" data-clear-shopping-selection ${selected===0?'disabled':''}>Clear selections</button><button class="button button--primary shopping-action" type="button" data-lock-shopping-items ${selected===0?'disabled':''}>Lock Items</button></div>`;
    const help=locked?'Tap an item as you collect it. Done records this shop for future frequency ranking and resets the list.':'Tap an item once for 1×. Each extra tap increases the quantity. Frequent purchases rise toward the top-left.';
    this.root.innerHTML=`<section class="screen screen--section"><header class="app-bar"><button class="icon-button" type="button" data-shopping-back>←</button><div class="app-bar__titles"><h1>${escapeHtml(shop.name)}</h1><p class="app-bar__subtitle">${locked?`${selected} locked item${selected===1?'':'s'}`:`${shopItems(this.context.state.items,shop.id).length} available items`}</p></div><div class="app-bar__actions"><button class="button button--ghost" type="button" data-global-action="import">Import</button><button class="button button--ghost" type="button" data-global-action="export">Export</button></div></header><div class="screen__content"><div class="stack stack--lg"><section class="card shopping-list-header"><div><p class="eyebrow">${locked?'Locked shopping list':'Build shopping list'}</p><h2>${locked?'Collect your items':'Tap what you need'}</h2><p class="muted">${escapeHtml(help)}</p></div>${actions}</section><div class="shopping-item-grid">${itemCards||'<div class="empty-state"><h3>No available items</h3><p>Add or restore items for this shop.</p></div>'}</div></div></div></section>`;
    this.bindShop(shopId,locked);
  }

  bindShop(shopId,locked){
    this.root.querySelector('[data-shopping-back]')?.addEventListener('click',()=>this.context.actions.closeShoppingShop());
    this.root.querySelector('[data-clear-shopping-selection]')?.addEventListener('click',()=>this.context.actions.clearShoppingSelection(shopId));
    this.root.querySelector('[data-lock-shopping-items]')?.addEventListener('click',()=>this.context.actions.lockShoppingItems(shopId));
    this.root.querySelector('[data-complete-shopping-shop]')?.addEventListener('click',()=>this.context.actions.completeShoppingShop(shopId));
    this.root.querySelector('[data-add-shopping-item]')?.addEventListener('click',()=>this.openAddItem(shopId));
    this.root.querySelector('[data-manage-shopping-items]')?.addEventListener('click',()=>this.openManageItems(shopId));
    this.root.querySelectorAll('[data-remove-shopping-item]').forEach(button=>button.addEventListener('click',()=>this.context.actions.removeShoppingItem(shopId,button.dataset.removeShoppingItem)));
    const attribute=locked?'[data-toggle-collected-shopping-item]':'[data-increment-shopping-item]';
    this.root.querySelectorAll(attribute).forEach(button=>button.addEventListener('click',()=>{const itemId=locked?button.dataset.toggleCollectedShoppingItem:button.dataset.incrementShoppingItem;if(locked)this.context.actions.toggleCollectedShoppingItem(shopId,itemId);else this.context.actions.incrementShoppingItem(shopId,itemId);}));
  }

  openAddItem(shopId){
    const shop=this.context.state.shopping.shops.find(entry=>entry.id===shopId); const categories=[...new Set(this.context.state.items.map(item=>item.category).filter(Boolean))].sort();
    const {dialog,close}=openDialog(`<form id="shopping-item-form" class="dialog__panel"><header class="dialog__header"><div><p class="eyebrow">${escapeHtml(shop.name)}</p><h2>Add item</h2></div><button type="button" class="icon-button" data-dialog-close>✕</button></header><div class="form-grid"><label class="form-grid__wide">Item name<input name="name" required maxlength="100"></label><label>Category<input name="category" list="shopping-category-list" required maxlength="80"><datalist id="shopping-category-list">${categories.map(category=>`<option value="${escapeHtml(category)}">`).join('')}</datalist></label><label>Item type<select name="isFood"><option value="true" selected>Food</option><option value="false">Non-food</option></select></label><label class="form-grid__wide">Calories per 100g <span class="muted small">(optional for food)</span><input name="caloriesPer100g" type="number" min="0" step="0.1" inputmode="decimal"></label></div><footer class="dialog__footer"><button type="button" class="button button--ghost" data-dialog-close>Cancel</button><button class="button button--primary" type="submit">Add item</button></footer></form>`);
    dialog.querySelector('#shopping-item-form').addEventListener('submit',event=>{event.preventDefault();const form=new FormData(event.currentTarget);const calories=String(form.get('caloriesPer100g')||'').trim();this.context.actions.addShoppingItem(shopId,{name:String(form.get('name')).trim(),category:String(form.get('category')).trim()||'Other',isFood:String(form.get('isFood'))==='true',caloriesPer100g:calories===''?null:Number(calories),notes:''});close();});
  }

  openManageItems(shopId){
    const shop=this.context.state.shopping.shops.find(entry=>entry.id===shopId); const items=shopItems(this.context.state.items,shopId,{includeUnavailable:true}).sort((a,b)=>a.name.localeCompare(b.name));
    const rows=items.map(item=>{const available=itemAvailableAtShop(item,shopId);return `<div class="manage-item-row"><div><strong>${escapeHtml(item.name)}</strong><div class="muted small">${escapeHtml(item.category)}${item.preferredShopId===shopId?' · Preferred shop':''}</div></div><span class="badge ${available?'badge--accent':'badge--quiet'}">${available?'Available':'Unavailable'}</span><button class="button button--small ${available?'button--danger-ghost':'button--ghost'}" type="button" data-set-shop-availability="${escapeHtml(item.id)}" data-available="${available?'false':'true'}">${available?'Not available':'Restore'}</button></div>`;}).join('');
    const {dialog}=openDialog(`<div class="dialog__panel"><header class="dialog__header"><div><p class="eyebrow">${escapeHtml(shop.name)}</p><h2>Manage Items</h2></div><button type="button" class="icon-button" data-dialog-close>✕</button></header><div class="manage-item-list">${rows||'<div class="empty-state"><h3>No items yet</h3></div>'}</div><footer class="dialog__footer"><button type="button" class="button button--primary" data-dialog-close>Done</button></footer></div>`);
    dialog.querySelectorAll('[data-set-shop-availability]').forEach(button=>button.addEventListener('click',()=>this.context.actions.setItemShopAvailability(button.dataset.setShopAvailability,shopId,button.dataset.available==='true')));
  }
}
