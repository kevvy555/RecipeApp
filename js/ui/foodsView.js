import { GROCERY_CATEGORIES } from '../core/constants.js';
import { caloriesForWeight, escapeHtml, sortByName, uid } from '../core/utils.js';
import { associateItemWithShop } from '../domain/catalogService.js';
import { sectionLayout } from './layout.js';
import { openDialog } from './dialog.js';
import { openItemPicker } from './itemPicker.js';

function categoryOptions(categories) {
  return categories.map(category => `<option value="${escapeHtml(category)}">`).join('');
}

export class FoodsView {
  constructor(root, context) { this.root = root; this.context = context; }

  render() {
    const items = sortByName(this.context.state.items);
    const shops = this.context.state.shopping?.shops || [];
    const shopMap = new Map(shops.map(shop => [shop.id, shop.name]));
    const categories = [...new Set([...GROCERY_CATEGORIES, ...items.map(item => item.category).filter(Boolean)])].sort();
    const rows = items.map(item => {
      const preferredShop = shopMap.get(item.preferredShopId) || 'Unknown';
      const searchText = `${item.name} ${item.category || ''} ${item.notes || ''} ${preferredShop}`.toLowerCase();
      return `<tr data-grocery-row data-search="${escapeHtml(searchText)}" data-category="${escapeHtml(item.category)}" data-type="${item.isFood ? 'food' : 'non-food'}" data-shop="${escapeHtml(item.preferredShopId || '')}">
        <td><strong>${escapeHtml(item.name)}</strong>${item.notes ? `<div class="muted small">${escapeHtml(item.notes)}</div>` : ''}</td>
        <td><span class="badge ${item.isFood ? 'badge--accent' : 'badge--quiet'}">${item.isFood ? 'Food' : 'Non-food'}</span></td>
        <td><span class="badge">${escapeHtml(item.category)}</span></td>
        <td class="number">${item.isFood && item.caloriesPer100g != null ? item.caloriesPer100g : '—'}</td>
        <td>${escapeHtml(preferredShop)}</td>
        <td><span class="badge ${item.source === 'seed' ? 'badge--quiet' : 'badge--accent'}">${item.source === 'seed' ? 'Seed' : 'Added'}</span></td>
        <td class="table-actions"><button class="button button--small button--ghost" type="button" data-edit-grocery="${item.id}">Edit</button><button class="button button--small button--danger-ghost" type="button" data-delete-grocery="${item.id}">Delete</button></td>
      </tr>`;
    }).join('');

    const calculatorFoods = items.filter(item => item.isFood && item.caloriesPer100g != null);
    const firstCalculatorFood = calculatorFoods[0];
    const content = `<div class="stack stack--lg">
      <section class="card calorie-calculator">
        <div><p class="eyebrow">Food calculator</p><h2>Calories for a weight</h2></div>
        <label>Food<button id="calculator-food-picker" class="button button--ghost item-picker-trigger" type="button" data-item-id="${escapeHtml(firstCalculatorFood?.id || '')}" ${firstCalculatorFood ? '' : 'disabled'}><span data-calculator-food-name>${escapeHtml(firstCalculatorFood?.name || 'No foods with calorie data')}</span><span aria-hidden="true">⌄</span></button></label>
        <label>Weight (g)<input id="calculator-weight" type="number" min="0" step="1" value="100" inputmode="decimal" ${firstCalculatorFood ? '' : 'disabled'}></label>
        <div class="metric"><span id="calculator-result">${firstCalculatorFood ? '0' : '—'}</span><small>kcal</small></div>
      </section>
      <section class="card">
        <div class="toolbar">
          <div class="toolbar__group toolbar__group--grow grocery-filter-group">
            <input id="grocery-search" type="search" placeholder="Search groceries…" aria-label="Search groceries">
            <select id="grocery-category-filter" aria-label="Filter by category"><option value="">All categories</option>${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}</select>
            <select id="grocery-type-filter" aria-label="Filter by item type"><option value="">All types</option><option value="food">Food</option><option value="non-food">Non-food</option></select>
            <select id="grocery-shop-filter" aria-label="Filter by preferred shop"><option value="">All shops</option>${shops.map(shop => `<option value="${escapeHtml(shop.id)}">${escapeHtml(shop.name)}</option>`).join('')}</select>
          </div>
          <button id="add-grocery" class="button button--primary" type="button">+ Add item</button>
        </div>
        <p class="muted small" data-grocery-filter-count></p>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Item</th><th>Type</th><th>Category</th><th class="number">kcal / 100g</th><th>Preferred shop</th><th>Source</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="muted" data-grocery-filter-empty hidden>No groceries match those filters.</p>
        <p class="help-text">Search uses a live partial match, so the list shortens as you type. New items are created here only.</p>
      </section>
    </div>`;

    this.root.innerHTML = sectionLayout('Groceries', content, { subtitle: `${items.length} items in the shared catalogue` });
    this.bind(calculatorFoods);
  }

  bind(calculatorFoods) {
    const search = this.root.querySelector('#grocery-search');
    const category = this.root.querySelector('#grocery-category-filter');
    const type = this.root.querySelector('#grocery-type-filter');
    const shop = this.root.querySelector('#grocery-shop-filter');
    const filter = () => {
      const query = search.value.trim().toLowerCase();
      const selectedCategory = category.value;
      const selectedType = type.value;
      const selectedShop = shop.value;
      let visible = 0;
      this.root.querySelectorAll('[data-grocery-row]').forEach(row => {
        const matches = row.dataset.search.includes(query)
          && (!selectedCategory || row.dataset.category === selectedCategory)
          && (!selectedType || row.dataset.type === selectedType)
          && (!selectedShop || row.dataset.shop === selectedShop);
        row.hidden = !matches;
        if (matches) visible += 1;
      });
      this.root.querySelector('[data-grocery-filter-count]').textContent = `${visible} of ${this.context.state.items.length} shown`;
      this.root.querySelector('[data-grocery-filter-empty]').hidden = visible > 0;
    };
    search.addEventListener('input', filter);
    category.addEventListener('change', filter);
    type.addEventListener('change', filter);
    shop.addEventListener('change', filter);
    filter();

    const picker = this.root.querySelector('#calculator-food-picker');
    const weight = this.root.querySelector('#calculator-weight');
    const result = this.root.querySelector('#calculator-result');
    const updateCalculator = () => {
      const item = this.context.state.items.find(entry => entry.id === picker.dataset.itemId);
      result.textContent = item ? Math.round(caloriesForWeight(item.caloriesPer100g, weight.value)) : '—';
    };
    picker?.addEventListener('click', () => openItemPicker({
      items: calculatorFoods,
      shops: this.context.state.shopping.shops,
      title: 'Choose calculator food',
      eyebrow: 'Calories by weight',
      selectedId: picker.dataset.itemId,
      showType: false,
      onSelect: item => {
        picker.dataset.itemId = item.id;
        picker.querySelector('[data-calculator-food-name]').textContent = item.name;
        updateCalculator();
      }
    }));
    weight?.addEventListener('input', updateCalculator);
    if (calculatorFoods.length) updateCalculator();

    this.root.querySelector('#add-grocery').addEventListener('click', () => this.openItemEditor());
    this.root.querySelectorAll('[data-edit-grocery]').forEach(button => button.addEventListener('click', () => this.openItemEditor(this.context.state.items.find(item => item.id === button.dataset.editGrocery))));
    this.root.querySelectorAll('[data-delete-grocery]').forEach(button => button.addEventListener('click', () => this.deleteItem(button.dataset.deleteGrocery)));
  }

  openItemEditor(existing = null) {
    const items = this.context.state.items;
    const categories = [...new Set([...GROCERY_CATEGORIES, ...items.map(item => item.category).filter(Boolean)])].sort();
    const shops = this.context.state.shopping?.shops || [];
    const isFood = existing?.isFood !== false;
    const { dialog, close } = openDialog(`<form id="grocery-form" class="dialog__panel">
      <header class="dialog__header"><div><p class="eyebrow">Master grocery catalogue</p><h2>${existing ? 'Edit item' : 'Add item'}</h2></div><button type="button" class="icon-button" data-dialog-close>✕</button></header>
      <div class="form-grid">
        <label class="form-grid__wide">Item name<input name="name" required maxlength="100" value="${escapeHtml(existing?.name || '')}"></label>
        <label>Item type<select name="isFood"><option value="true" ${isFood ? 'selected' : ''}>Food</option><option value="false" ${!isFood ? 'selected' : ''}>Non-food</option></select></label>
        <label>Category<input name="category" list="grocery-category-list" required maxlength="80" value="${escapeHtml(existing?.category || 'Other')}"><datalist id="grocery-category-list">${categoryOptions(categories)}</datalist></label>
        <label>Preferred shop<select name="preferredShopId" required>${shops.map(shop => `<option value="${escapeHtml(shop.id)}" ${shop.id === (existing?.preferredShopId || shops[0]?.id) ? 'selected' : ''}>${escapeHtml(shop.name)}</option>`).join('')}</select></label>
        <label data-calorie-field ${isFood ? '' : 'hidden'}>Calories per 100g <span class="muted small">(optional)</span><input name="caloriesPer100g" type="number" min="0" step="0.1" inputmode="decimal" value="${existing?.caloriesPer100g ?? ''}" ${isFood ? '' : 'disabled'}></label>
        <label class="form-grid__wide">Notes<input name="notes" maxlength="180" value="${escapeHtml(existing?.notes || '')}" placeholder="Optional brand, size or other note"></label>
      </div>
      <footer class="dialog__footer"><button type="button" class="button button--ghost" data-dialog-close>Cancel</button><button class="button button--primary" type="submit">Save item</button></footer>
    </form>`);

    const formElement = dialog.querySelector('#grocery-form');
    const typeSelect = formElement.elements.isFood;
    const calorieField = dialog.querySelector('[data-calorie-field]');
    const calorieInput = formElement.elements.caloriesPer100g;
    const syncType = () => {
      const food = typeSelect.value === 'true';
      calorieField.hidden = !food;
      calorieInput.disabled = !food;
      if (!food) calorieInput.value = '';
    };
    typeSelect.addEventListener('change', syncType);

    formElement.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const preferredShopId = String(form.get('preferredShopId'));
      const itemIsFood = String(form.get('isFood')) === 'true';
      const caloriesText = String(form.get('caloriesPer100g') || '').trim();
      let item = {
        id: existing?.id || uid('item'),
        name: String(form.get('name')).trim(),
        category: String(form.get('category')).trim() || 'Other',
        isFood: itemIsFood,
        caloriesPer100g: itemIsFood && caloriesText !== '' ? Number(caloriesText) : null,
        notes: String(form.get('notes')).trim(),
        preferredShopId,
        shops: existing?.shops || [],
        source: existing?.source || 'user',
        createdAt: existing?.createdAt
      };
      if (!item.name || (item.caloriesPer100g != null && (!Number.isFinite(item.caloriesPer100g) || item.caloriesPer100g < 0))) return;
      item = associateItemWithShop(item, preferredShopId, { available: true, makePreferred: true });
      this.context.actions.saveItem(item);
      close();
    });
  }

  deleteItem(id) {
    const item = this.context.state.items.find(entry => entry.id === id);
    if (!item) return;
    const usedBy = this.context.state.recipes.filter(recipe => recipe.ingredients.some(ingredient => (ingredient.itemId || ingredient.foodId) === id));
    if (usedBy.length) {
      alert(`“${item.name}” is used by ${usedBy.length} recipe${usedBy.length === 1 ? '' : 's'}. Remove it from those recipes first.`);
      return;
    }
    if (confirm(`Delete “${item.name}” from Groceries? This also removes it from all shop lists.`)) this.context.actions.deleteItem(id);
  }
}
