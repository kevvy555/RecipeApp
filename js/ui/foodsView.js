import { FOOD_CATEGORIES } from '../core/constants.js';
import { caloriesForWeight, escapeHtml, sortByName, uid } from '../core/utils.js';
import { sectionLayout } from './layout.js';
import { openDialog } from './dialog.js';

function categoryOptions(categories, selected = '') {
  return categories.map(category => `<option value="${escapeHtml(category)}" ${category === selected ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('');
}

export class FoodsView {
  constructor(root, context) {
    this.root = root;
    this.context = context;
  }

  render() {
    const foods = sortByName(this.context.state.foods);
    const categories = [...new Set([...FOOD_CATEGORIES, ...foods.map(food => food.category)])].sort();
    const rows = foods.map(food => `
      <tr data-food-row data-name="${escapeHtml(food.name.toLowerCase())}" data-category="${escapeHtml(food.category)}">
        <td><strong>${escapeHtml(food.name)}</strong>${food.notes ? `<div class="muted small">${escapeHtml(food.notes)}</div>` : ''}</td>
        <td><span class="badge">${escapeHtml(food.category)}</span></td>
        <td class="number">${food.caloriesPer100g}</td>
        <td><span class="badge ${food.source === 'seed' ? 'badge--quiet' : 'badge--accent'}">${food.source === 'seed' ? 'Seed' : 'Added'}</span></td>
        <td class="table-actions">
          <button class="button button--small button--ghost" type="button" data-edit-food="${food.id}">Edit</button>
          <button class="button button--small button--danger-ghost" type="button" data-delete-food="${food.id}">Delete</button>
        </td>
      </tr>`).join('');

    const content = `
      <div class="stack stack--lg">
        <section class="card calorie-calculator">
          <div>
            <p class="eyebrow">Quick calculator</p>
            <h2>Calories for a weight</h2>
          </div>
          <label>Food
            <select id="calculator-food">${foods.map(food => `<option value="${food.id}">${escapeHtml(food.name)} · ${food.caloriesPer100g} kcal/100g</option>`).join('')}</select>
          </label>
          <label>Weight (g)
            <input id="calculator-weight" type="number" min="0" step="1" value="100" inputmode="decimal">
          </label>
          <div class="metric"><span id="calculator-result">0</span><small>kcal</small></div>
        </section>

        <section class="card">
          <div class="toolbar">
            <div class="toolbar__group toolbar__group--grow">
              <input id="food-search" type="search" placeholder="Search foods…" aria-label="Search foods">
              <select id="food-category-filter" aria-label="Filter by category">
                <option value="">All categories</option>
                ${categoryOptions(categories)}
              </select>
            </div>
            <button id="add-food" class="button button--primary" type="button">+ Add food</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Food</th><th>Category</th><th class="number">kcal / 100g</th><th>Source</th><th></th></tr></thead>
              <tbody id="food-table-body">${rows}</tbody>
            </table>
          </div>
          <p class="help-text">Seed calories are generic estimates per 100g. Brand, variety and cooking method can change the real value, so edit foods to match the label you use.</p>
        </section>
      </div>`;

    this.root.innerHTML = sectionLayout('Foods', content, { subtitle: `${foods.length} foods stored on this device` });
    this.bind();
  }

  bind() {
    const search = this.root.querySelector('#food-search');
    const category = this.root.querySelector('#food-category-filter');
    const filter = () => {
      const query = search.value.trim().toLowerCase();
      const selectedCategory = category.value;
      this.root.querySelectorAll('[data-food-row]').forEach(row => {
        row.hidden = !row.dataset.name.includes(query) || (selectedCategory && row.dataset.category !== selectedCategory);
      });
    };
    search.addEventListener('input', filter);
    category.addEventListener('change', filter);

    const calculatorFood = this.root.querySelector('#calculator-food');
    const calculatorWeight = this.root.querySelector('#calculator-weight');
    const calculatorResult = this.root.querySelector('#calculator-result');
    const updateCalculator = () => {
      const food = this.context.state.foods.find(item => item.id === calculatorFood.value);
      calculatorResult.textContent = food ? Math.round(caloriesForWeight(food.caloriesPer100g, calculatorWeight.value)) : '0';
    };
    calculatorFood.addEventListener('change', updateCalculator);
    calculatorWeight.addEventListener('input', updateCalculator);
    updateCalculator();

    this.root.querySelector('#add-food').addEventListener('click', () => this.openFoodEditor());
    this.root.querySelectorAll('[data-edit-food]').forEach(button => button.addEventListener('click', () => {
      this.openFoodEditor(this.context.state.foods.find(food => food.id === button.dataset.editFood));
    }));
    this.root.querySelectorAll('[data-delete-food]').forEach(button => button.addEventListener('click', () => this.deleteFood(button.dataset.deleteFood)));
  }

  openFoodEditor(existing = null) {
    const categories = [...new Set([...FOOD_CATEGORIES, ...this.context.state.foods.map(food => food.category)])].sort();
    const { dialog, close } = openDialog(`
      <form id="food-form" class="dialog__panel">
        <header class="dialog__header"><div><p class="eyebrow">Food database</p><h2>${existing ? 'Edit food' : 'Add food'}</h2></div><button type="button" class="icon-button" data-dialog-close>✕</button></header>
        <div class="form-grid">
          <label class="form-grid__wide">Food name<input name="name" required maxlength="100" value="${escapeHtml(existing?.name || '')}"></label>
          <label>Category<select name="category">${categoryOptions(categories, existing?.category || 'Other')}</select></label>
          <label>Calories per 100g<input name="caloriesPer100g" required type="number" min="0" step="0.1" inputmode="decimal" value="${existing?.caloriesPer100g ?? ''}"></label>
          <label class="form-grid__wide">Notes<input name="notes" maxlength="180" value="${escapeHtml(existing?.notes || '')}" placeholder="Optional brand, cooked/raw note, etc."></label>
        </div>
        <footer class="dialog__footer"><button type="button" class="button button--ghost" data-dialog-close>Cancel</button><button class="button button--primary" type="submit">Save food</button></footer>
      </form>`);

    dialog.querySelector('#food-form').addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const now = new Date().toISOString();
      const food = {
        id: existing?.id || uid('food'),
        name: String(form.get('name')).trim(),
        category: String(form.get('category')),
        caloriesPer100g: Number(form.get('caloriesPer100g')),
        notes: String(form.get('notes')).trim(),
        source: existing?.source || 'user',
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };
      if (!food.name || !Number.isFinite(food.caloriesPer100g) || food.caloriesPer100g < 0) return;
      this.context.actions.saveFood(food);
      close();
    });
  }

  deleteFood(id) {
    const food = this.context.state.foods.find(item => item.id === id);
    if (!food) return;
    const usedBy = this.context.state.recipes.filter(recipe => recipe.ingredients.some(ingredient => ingredient.foodId === id));
    if (usedBy.length) {
      alert(`“${food.name}” is used by ${usedBy.length} recipe${usedBy.length === 1 ? '' : 's'}. Remove it from those recipes first.`);
      return;
    }
    if (confirm(`Delete “${food.name}” from your food database?`)) this.context.actions.deleteFood(id);
  }
}
