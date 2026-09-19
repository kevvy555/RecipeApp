import { escapeHtml, sortByName } from '../core/utils.js';
import { openDialog } from './dialog.js';

function optionList(values, label) {
  return `<option value="">All ${label}</option>${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}`;
}

export function openItemPicker({
  items,
  shops = [],
  title = 'Choose item',
  eyebrow = 'Groceries',
  help = '',
  selectedId = '',
  showType = true,
  onSelect
}) {
  const sorted = sortByName(items || []);
  const categories = [...new Set(sorted.map(item => item.category).filter(Boolean))].sort();
  const shopMap = new Map(shops.map(shop => [shop.id, shop.name]));
  const shopNames = shops.map(shop => shop.name);

  const rows = sorted.map(item => {
    const preferredShop = shopMap.get(item.preferredShopId) || 'Unknown';
    const searchText = `${item.name} ${item.category || ''} ${item.notes || ''} ${preferredShop}`.toLowerCase();
    return `<button class="catalog-picker-row ${item.id === selectedId ? 'catalog-picker-row--selected' : ''}" type="button"
      data-picker-item="${escapeHtml(item.id)}"
      data-picker-search="${escapeHtml(searchText)}"
      data-picker-category="${escapeHtml(item.category || '')}"
      data-picker-type="${item.isFood ? 'food' : 'non-food'}"
      data-picker-shop="${escapeHtml(preferredShop)}">
      <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.category || 'Other')} · ${item.isFood ? 'Food' : 'Non-food'}${item.isFood && item.caloriesPer100g != null ? ` · ${item.caloriesPer100g} kcal/100g` : ''}</small></span>
      <span class="badge">Preferred: ${escapeHtml(preferredShop)}</span>
    </button>`;
  }).join('');

  const filters = sorted.length ? `
    <div class="catalog-picker-filters">
      <input data-picker-search-input type="search" placeholder="Search items…" aria-label="Search items">
      <select data-picker-category aria-label="Filter by category">${optionList(categories, 'categories')}</select>
      ${showType ? '<select data-picker-type aria-label="Filter by item type"><option value="">All types</option><option value="food">Food</option><option value="non-food">Non-food</option></select>' : ''}
      ${shops.length ? `<select data-picker-shop aria-label="Filter by preferred shop">${optionList(shopNames, 'shops')}</select>` : ''}
    </div>` : '';

  const { dialog, close } = openDialog(`
    <div class="dialog__panel">
      <header class="dialog__header"><div><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2></div><button type="button" class="icon-button" data-dialog-close>✕</button></header>
      <div class="catalog-picker">
        ${help ? `<p class="help-text">${escapeHtml(help)}</p>` : ''}
        ${filters}
        <div class="catalog-picker-list">${rows || '<div class="empty-state"><h3>No matching items</h3><p>There are no items available to choose.</p></div>'}</div>
        <p class="catalog-picker-empty muted" data-picker-empty hidden>No items match those filters.</p>
      </div>
      <footer class="dialog__footer"><button type="button" class="button button--ghost" data-dialog-close>Cancel</button></footer>
    </div>`);

  const applyFilters = () => {
    const query = dialog.querySelector('[data-picker-search-input]')?.value.trim().toLowerCase() || '';
    const category = dialog.querySelector('[data-picker-category]')?.value || '';
    const type = dialog.querySelector('[data-picker-type]')?.value || '';
    const shop = dialog.querySelector('[data-picker-shop]')?.value || '';
    let visible = 0;
    dialog.querySelectorAll('[data-picker-item]').forEach(row => {
      const matches = row.dataset.pickerSearch.includes(query)
        && (!category || row.dataset.pickerCategory === category)
        && (!type || row.dataset.pickerType === type)
        && (!shop || row.dataset.pickerShop === shop);
      row.hidden = !matches;
      if (matches) visible += 1;
    });
    const empty = dialog.querySelector('[data-picker-empty]');
    if (empty) empty.hidden = visible > 0 || sorted.length === 0;
  };

  dialog.querySelector('[data-picker-search-input]')?.addEventListener('input', applyFilters);
  dialog.querySelector('[data-picker-category]')?.addEventListener('change', applyFilters);
  dialog.querySelector('[data-picker-type]')?.addEventListener('change', applyFilters);
  dialog.querySelector('[data-picker-shop]')?.addEventListener('change', applyFilters);
  dialog.querySelectorAll('[data-picker-item]').forEach(button => button.addEventListener('click', () => {
    const item = sorted.find(entry => entry.id === button.dataset.pickerItem);
    if (!item) return;
    onSelect?.(item);
    close();
  }));

  dialog.querySelector('[data-picker-search-input]')?.focus();
  return { dialog, close, applyFilters };
}
