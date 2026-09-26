import { escapeHtml } from '../core/utils.js';
import { itemAvailableAtShop } from '../domain/catalogService.js';
import { groupItemsByCategory, rankedShopItems, selectedItemCount, selectedShopItems, shopItems } from '../domain/shoppingService.js';
import { sectionLayout } from './layout.js';
import { openDialog } from './dialog.js';
import { openItemPicker } from './itemPicker.js';

function shopStatus(shop, items) {
  const selected = selectedItemCount(shop);
  if (shop.current?.locked) return `${selected} item${selected === 1 ? '' : 's'} locked`;
  if (selected > 0) return `${selected} item${selected === 1 ? '' : 's'} selected`;
  return `${shopItems(items, shop.id).length} available items`;
}

function categoryOptions(items) {
  const categories = [...new Set(items.map(item => item.category).filter(Boolean))].sort();
  return `<option value="">All categories</option>${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}`;
}

export class ShoppingView {
  constructor(root, context) { this.root = root; this.context = context; }
  render() { const shopId = this.context.shoppingShopId; if (shopId) this.renderShop(shopId); else this.renderShopTypes(); }

  renderShopTypes() {
    const shops = this.context.state.shopping?.shops || [];
    const items = this.context.state.items || [];
    const cards = shops.map(shop => `<button class="shopping-shop-card" type="button" data-open-shopping-shop="${escapeHtml(shop.id)}"><span class="shopping-shop-card__icon">🛒</span><span class="shopping-shop-card__name">${escapeHtml(shop.name)}</span><span class="shopping-shop-card__status ${shop.current?.locked ? 'shopping-shop-card__status--locked' : ''}">${escapeHtml(shopStatus(shop, items))}</span></button>`).join('');
    this.root.innerHTML = sectionLayout('Shopping', `<div class="stack stack--lg"><section><p class="eyebrow">Shopping lists</p><h2 class="shopping-heading">Where are you shopping?</h2><p class="muted">Choose a shop to build or continue its list.</p></section><div class="shopping-shop-grid">${cards}</div></div>`, { subtitle: `${shops.length} shop types` });
    this.root.querySelectorAll('[data-open-shopping-shop]').forEach(button => button.addEventListener('click', () => this.context.actions.openShoppingShop(button.dataset.openShoppingShop)));
  }

  renderShop(shopId) {
    const shop = this.context.state.shopping?.shops?.find(entry => entry.id === shopId);
    if (!shop) { this.context.actions.closeShoppingShop(); return; }
    const locked = Boolean(shop.current?.locked);
    const items = locked ? selectedShopItems(shop, this.context.state.items) : rankedShopItems(shop, this.context.state.items);
    const selected = selectedItemCount(shop);

    const categoryGroups = groupItemsByCategory(items);
    const categorySections = categoryGroups.map(group => {
      const itemCards = group.items.map(item => {
        const quantity = Number(shop.current?.quantities?.[item.id] || 0);
        const collected = locked && Boolean(shop.current?.collected?.[item.id]);
        const removable = !locked && quantity > 0;
        const classes = ['shopping-item', quantity > 0 ? 'shopping-item--selected' : '', locked ? 'shopping-item--locked' : '', collected ? 'shopping-item--collected' : '', removable ? 'shopping-item--removable' : ''].filter(Boolean).join(' ');
        const action = locked ? 'data-toggle-collected-shopping-item' : 'data-increment-shopping-item';
        const searchText = `${item.name} ${item.category || ''} ${item.notes || ''}`.toLowerCase();
        const main = `<button class="${classes}" type="button" ${action}="${escapeHtml(item.id)}"><span class="shopping-item__name">${escapeHtml(item.name)}</span>${quantity > 0 ? `<span class="shopping-item__quantity">${quantity}×</span>` : ''}${collected ? '<span class="shopping-item__check">✓</span>' : ''}</button>`;
        const remove = removable ? `<button class="shopping-item__remove" type="button" data-remove-shopping-item="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.name)} from shopping list">✕</button>` : '';
        return `<div class="shopping-item-wrap" data-shop-item-row data-search="${escapeHtml(searchText)}" data-category="${escapeHtml(group.category)}" data-selection="${quantity > 0 ? 'selected' : 'unselected'}">${main}${remove}</div>`;
      }).join('');
      return `<section class="shopping-category-group" data-shop-category-group data-category="${escapeHtml(group.category)}"><header class="shopping-category-heading"><span>${escapeHtml(group.category)}</span><span data-category-visible-count>${group.items.length}</span></header><div class="shopping-item-grid">${itemCards}</div></section>`;
    }).join('');

    const actions = locked
      ? '<div class="shopping-actions"><button class="button button--ghost" type="button" data-edit-shopping-list>Edit List</button><button class="button button--primary shopping-action" type="button" data-complete-shopping-shop>Done</button></div>'
      : `<div class="shopping-actions shopping-actions--wrap"><button class="button button--ghost" type="button" data-add-shopping-item>+ Groceries</button><button class="button button--ghost" type="button" data-manage-shopping-items>Manage</button><button class="button button--ghost" type="button" data-clear-shopping-selection ${selected === 0 ? 'disabled' : ''}>Clear</button><button class="button button--primary shopping-action" type="button" data-lock-shopping-items ${selected === 0 ? 'disabled' : ''}>Lock</button></div>`;

    const help = locked
      ? 'Tap an item as you collect it. Use Edit List if you need to add, remove or change items, then lock it again.'
      : 'Tap an item once for 1×. Each extra tap increases the quantity. Search and filters update the list immediately.';

    const filters = items.length ? `<section class="card list-filter-bar">
      <input data-shop-list-search type="search" placeholder="Search this shop…" aria-label="Search shop items">
      <select data-shop-list-category aria-label="Filter shop items by category">${categoryOptions(items)}</select>
      ${locked ? '' : '<select data-shop-list-selection aria-label="Filter selected items"><option value="">All items</option><option value="selected">Selected</option><option value="unselected">Not selected</option></select>'}
      <span class="muted small" data-shop-filter-count></span>
    </section>` : '';

    this.root.innerHTML = `<section class="screen screen--section screen--shopping"><header class="app-bar"><button class="icon-button" type="button" data-shopping-back>←</button><div class="app-bar__titles"><h1>${escapeHtml(shop.name)}</h1><p class="app-bar__subtitle">${locked ? `${selected} locked item${selected === 1 ? '' : 's'}` : `${shopItems(this.context.state.items, shop.id).length} available items`}</p></div><div class="app-bar__actions"><button class="button button--ghost" type="button" data-global-action="import">Import</button><button class="button button--ghost" type="button" data-global-action="export">Export</button></div></header><div class="screen__content"><div class="stack stack--lg"><section class="card shopping-list-header"><div><p class="eyebrow">${locked ? 'Locked shopping list' : 'Build shopping list'}</p><h2>${locked ? 'Collect your items' : 'Tap what you need'}</h2><p class="muted">${escapeHtml(help)}</p></div>${actions}</section>${filters}<div class="shopping-category-list">${categorySections || '<div class="empty-state"><h3>No available items</h3><p>Add an existing item from Groceries or restore one in Manage Items.</p></div>'}</div><p class="muted" data-shop-filter-empty hidden>No items match those filters.</p></div></div></section>`;
    this.bindShop(shopId, locked);
  }

  bindShop(shopId, locked) {
    this.root.querySelector('[data-shopping-back]')?.addEventListener('click', () => this.context.actions.closeShoppingShop());
    this.root.querySelector('[data-clear-shopping-selection]')?.addEventListener('click', () => this.context.actions.clearShoppingSelection(shopId));
    this.root.querySelector('[data-lock-shopping-items]')?.addEventListener('click', () => this.context.actions.lockShoppingItems(shopId));
    this.root.querySelector('[data-edit-shopping-list]')?.addEventListener('click', () => this.context.actions.unlockShoppingItems(shopId));
    this.root.querySelector('[data-complete-shopping-shop]')?.addEventListener('click', () => this.context.actions.completeShoppingShop(shopId));
    this.root.querySelector('[data-add-shopping-item]')?.addEventListener('click', () => this.openAddItem(shopId));
    this.root.querySelector('[data-manage-shopping-items]')?.addEventListener('click', () => this.openManageItems(shopId));
    this.root.querySelectorAll('[data-remove-shopping-item]').forEach(button => button.addEventListener('click', () => this.context.actions.removeShoppingItem(shopId, button.dataset.removeShoppingItem)));

    const applyFilters = () => {
      const query = this.root.querySelector('[data-shop-list-search]')?.value.trim().toLowerCase() || '';
      const category = this.root.querySelector('[data-shop-list-category]')?.value || '';
      const selection = this.root.querySelector('[data-shop-list-selection]')?.value || '';
      let visible = 0;
      this.root.querySelectorAll('[data-shop-item-row]').forEach(row => {
        const matches = row.dataset.search.includes(query)
          && (!category || row.dataset.category === category)
          && (!selection || row.dataset.selection === selection);
        row.hidden = !matches;
        if (matches) visible += 1;
      });
      this.root.querySelectorAll('[data-shop-category-group]').forEach(group => {
        const rows = [...group.querySelectorAll('[data-shop-item-row]')];
        const categoryVisible = rows.filter(row => !row.hidden).length;
        group.hidden = categoryVisible === 0;
        const categoryCount = group.querySelector('[data-category-visible-count]');
        if (categoryCount) categoryCount.textContent = categoryVisible;
      });
      const count = this.root.querySelector('[data-shop-filter-count]');
      if (count) count.textContent = `${visible} shown`;
      const empty = this.root.querySelector('[data-shop-filter-empty]');
      const totalRows = this.root.querySelectorAll('[data-shop-item-row]').length;
      if (empty) empty.hidden = visible > 0 || totalRows === 0;
    };
    this.root.querySelector('[data-shop-list-search]')?.addEventListener('input', applyFilters);
    this.root.querySelector('[data-shop-list-category]')?.addEventListener('change', applyFilters);
    this.root.querySelector('[data-shop-list-selection]')?.addEventListener('change', applyFilters);
    applyFilters();

    const attribute = locked ? '[data-toggle-collected-shopping-item]' : '[data-increment-shopping-item]';
    this.root.querySelectorAll(attribute).forEach(button => button.addEventListener('click', () => {
      const itemId = locked ? button.dataset.toggleCollectedShoppingItem : button.dataset.incrementShoppingItem;
      if (locked) this.context.actions.toggleCollectedShoppingItem(shopId, itemId);
      else this.context.actions.incrementShoppingItem(shopId, itemId);
    }));
  }

  openAddItem(shopId) {
    const shop = this.context.state.shopping.shops.find(entry => entry.id === shopId);
    const candidates = this.context.state.items.filter(item => !itemAvailableAtShop(item, shopId));
    openItemPicker({
      items: candidates,
      shops: this.context.state.shopping.shops,
      title: 'Add from Groceries',
      eyebrow: shop.name,
      help: `Choose an existing Grocery item. Adding it to ${shop.name} also makes this its preferred shop.`,
      onSelect: item => this.context.actions.addCatalogItemToShop(shopId, item.id)
    });
  }

  openManageItems(shopId) {
    const shop = this.context.state.shopping.shops.find(entry => entry.id === shopId);
    const items = shopItems(this.context.state.items, shopId, { includeUnavailable: true }).sort((a, b) => a.name.localeCompare(b.name));
    const rows = items.map(item => {
      const available = itemAvailableAtShop(item, shopId);
      const searchText = `${item.name} ${item.category || ''} ${item.notes || ''}`.toLowerCase();
      return `<div class="manage-item-row" data-manage-item-row data-search="${escapeHtml(searchText)}" data-category="${escapeHtml(item.category || '')}" data-availability="${available ? 'available' : 'unavailable'}"><div><strong>${escapeHtml(item.name)}</strong><div class="muted small">${escapeHtml(item.category)}${item.preferredShopId === shopId ? ' · Preferred shop' : ''}</div></div><span class="badge ${available ? 'badge--accent' : 'badge--quiet'}">${available ? 'Available' : 'Unavailable'}</span><button class="button button--small ${available ? 'button--danger-ghost' : 'button--ghost'}" type="button" data-set-shop-availability="${escapeHtml(item.id)}" data-available="${available ? 'false' : 'true'}">${available ? 'Not available' : 'Restore'}</button></div>`;
    }).join('');
    const { dialog } = openDialog(`<div class="dialog__panel"><header class="dialog__header"><div><p class="eyebrow">${escapeHtml(shop.name)}</p><h2>Manage Items</h2></div><button type="button" class="icon-button" data-dialog-close>✕</button></header><div class="manage-item-controls"><input data-manage-search type="search" placeholder="Search items…"><select data-manage-category>${categoryOptions(items)}</select><select data-manage-availability><option value="">All availability</option><option value="available">Available</option><option value="unavailable">Unavailable</option></select></div><div class="manage-item-list">${rows || '<div class="empty-state"><h3>No items yet</h3></div>'}</div><p class="manage-item-empty muted" data-manage-empty hidden>No items match those filters.</p><footer class="dialog__footer"><button type="button" class="button button--primary" data-dialog-close>Done</button></footer></div>`);

    const filter = () => {
      const query = dialog.querySelector('[data-manage-search]').value.trim().toLowerCase();
      const category = dialog.querySelector('[data-manage-category]').value;
      const availability = dialog.querySelector('[data-manage-availability]').value;
      let visible = 0;
      dialog.querySelectorAll('[data-manage-item-row]').forEach(row => {
        const matches = row.dataset.search.includes(query)
          && (!category || row.dataset.category === category)
          && (!availability || row.dataset.availability === availability);
        row.hidden = !matches;
        if (matches) visible += 1;
      });
      const totalRows = dialog.querySelectorAll('[data-manage-item-row]').length;
      dialog.querySelector('[data-manage-empty]').hidden = visible > 0 || totalRows === 0;
    };
    dialog.querySelector('[data-manage-search]').addEventListener('input', filter);
    dialog.querySelector('[data-manage-category]').addEventListener('change', filter);
    dialog.querySelector('[data-manage-availability]').addEventListener('change', filter);
    dialog.querySelectorAll('[data-set-shop-availability]').forEach(button => button.addEventListener('click', () => this.context.actions.setItemShopAvailability(button.dataset.setShopAvailability, shopId, button.dataset.available === 'true')));
    dialog.querySelector('[data-manage-search]').focus();
  }
}
