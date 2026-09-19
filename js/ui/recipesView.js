import { calculateIngredientCalories, calculateRecipeNutrition } from '../domain/nutritionService.js';
import { createRecipe, validateRecipe } from '../domain/recipeService.js';
import { escapeHtml, sortByName, uid } from '../core/utils.js';
import { sectionLayout, emptyState } from './layout.js';
import { openDialog } from './dialog.js';
import { openItemPicker } from './itemPicker.js';

export class RecipesView {
  constructor(root, context) { this.root = root; this.context = context; }

  render() {
    const recipes = sortByName(this.context.state.recipes);
    const items = this.context.state.items;
    const cards = recipes.map(recipe => {
      const nutrition = calculateRecipeNutrition(recipe, items);
      const unknown = nutrition.missingNutritionCount ? `<span class="muted">${nutrition.missingNutritionCount} ingredient${nutrition.missingNutritionCount === 1 ? '' : 's'} missing calorie data</span>` : '';
      return `<article class="recipe-card" data-recipe-card data-name="${escapeHtml(recipe.name.toLowerCase())}"><div class="recipe-card__body"><div class="recipe-card__title-row"><h3>${escapeHtml(recipe.name)}</h3><span class="badge">${recipe.servings} serving${recipe.servings === 1 ? '' : 's'}</span></div>${recipe.description ? `<p>${escapeHtml(recipe.description)}</p>` : ''}<div class="recipe-card__stats"><span><strong>${Math.round(nutrition.caloriesPerServing)}</strong> known kcal / serving</span><span><strong>${recipe.ingredients.length}</strong> ingredients</span><span><strong>${recipe.steps.length}</strong> steps</span>${unknown}</div></div><div class="recipe-card__actions"><button class="button button--ghost" type="button" data-recipe-shopping="${recipe.id}">🛒 Add to Shopping</button><button class="button button--ghost" type="button" data-edit-recipe="${recipe.id}">Edit</button><button class="button button--danger-ghost" type="button" data-delete-recipe="${recipe.id}">Delete</button></div></article>`;
    }).join('');
    const content = `<div class="stack stack--lg"><section class="card"><div class="toolbar"><input id="recipe-search" class="toolbar__search" type="search" placeholder="Search recipes…"><button id="add-recipe" class="button button--primary" type="button">+ New recipe</button></div></section><section class="recipe-grid">${cards || emptyState('No recipes yet', 'Create your first recipe and add foods by weight.')}</section></div>`;
    this.root.innerHTML = sectionLayout('Recipes', content, { subtitle: `${recipes.length} saved recipe${recipes.length === 1 ? '' : 's'}` });
    this.bind();
  }

  bind() {
    const search = this.root.querySelector('#recipe-search');
    search.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      this.root.querySelectorAll('[data-recipe-card]').forEach(card => card.hidden = !card.dataset.name.includes(query));
    });
    this.root.querySelector('#add-recipe').addEventListener('click', () => this.openRecipeEditor());
    this.root.querySelectorAll('[data-recipe-shopping]').forEach(button => button.addEventListener('click', () => this.context.actions.addRecipeToShopping(button.dataset.recipeShopping)));
    this.root.querySelectorAll('[data-edit-recipe]').forEach(button => button.addEventListener('click', () => this.openRecipeEditor(this.context.state.recipes.find(recipe => recipe.id === button.dataset.editRecipe))));
    this.root.querySelectorAll('[data-delete-recipe]').forEach(button => button.addEventListener('click', () => {
      const recipe = this.context.state.recipes.find(item => item.id === button.dataset.deleteRecipe);
      if (recipe && confirm(`Delete “${recipe.name}”? It will also be removed from planner slots.`)) this.context.actions.deleteRecipe(recipe.id);
    }));
  }

  openRecipeEditor(existing = null) {
    const foods = sortByName(this.context.state.items.filter(item => item.isFood));
    if (!foods.length) { alert('Add at least one food in Groceries before creating a recipe.'); return; }
    const foodMap = new Map(foods.map(item => [item.id, item]));
    const draftIngredients = existing?.ingredients?.length ? structuredClone(existing.ingredients) : [{ id: uid('ingredient'), itemId: foods[0].id, grams: 100 }];
    const draftSteps = existing?.steps?.length ? structuredClone(existing.steps) : [{ id: uid('step'), text: '' }];

    const ingredientRow = ingredient => {
      const selectedId = ingredient.itemId || ingredient.foodId || foods[0].id;
      const selected = foodMap.get(selectedId) || foods[0];
      return `<div class="ingredient-row" data-ingredient-row data-id="${ingredient.id}">
        <label>Food
          <input type="hidden" data-ingredient-item value="${escapeHtml(selected.id)}">
          <button class="button button--ghost item-picker-trigger ingredient-picker-trigger" type="button" data-choose-ingredient>
            <span data-ingredient-name>${escapeHtml(selected.name)}</span><span aria-hidden="true">⌄</span>
          </button>
        </label>
        <label>Weight (g)<input data-ingredient-grams type="number" min="0.1" step="0.1" inputmode="decimal" value="${ingredient.grams}"></label>
        <div class="ingredient-row__calories"><span data-ingredient-calories>0</span><small>kcal</small></div>
        <button class="icon-button icon-button--danger" type="button" data-remove-ingredient>✕</button>
      </div>`;
    };
    const stepRow = (step, index) => `<div class="step-row" data-step-row data-id="${step.id}"><div class="step-row__number">${index + 1}</div><textarea data-step-text rows="2" placeholder="Describe this cooking step…">${escapeHtml(step.text)}</textarea><div class="step-row__buttons"><button class="icon-button" type="button" data-step-up>↑</button><button class="icon-button" type="button" data-step-down>↓</button><button class="icon-button icon-button--danger" type="button" data-remove-step>✕</button></div></div>`;

    const { dialog, close } = openDialog(`<form id="recipe-form" class="dialog__panel dialog__panel--wide"><header class="dialog__header"><div><p class="eyebrow">Recipe builder</p><h2>${existing ? 'Edit recipe' : 'New recipe'}</h2></div><button type="button" class="icon-button" data-dialog-close>✕</button></header><div class="form-grid"><label class="form-grid__wide">Recipe name<input name="name" required maxlength="120" value="${escapeHtml(existing?.name || '')}"></label><label>Servings<input name="servings" required type="number" min="1" step="1" value="${existing?.servings || 1}"></label><label class="form-grid__wide">Description<textarea name="description" rows="2" maxlength="400">${escapeHtml(existing?.description || '')}</textarea></label></div><section class="builder-section"><div class="builder-section__header"><div><p class="eyebrow">Ingredients</p><h3>Add each ingredient by weight</h3><p class="help-text">Ingredient selection has live partial search plus category and preferred-shop filters.</p></div><button id="add-ingredient" class="button button--ghost" type="button">+ Ingredient</button></div><div id="ingredient-list" class="stack">${draftIngredients.map(ingredientRow).join('')}</div><div class="nutrition-summary"><div><span id="recipe-total-calories">0</span><small>Known total kcal</small></div><div><span id="recipe-serving-calories">0</span><small>known kcal / serving</small></div></div><p id="recipe-nutrition-note" class="help-text" hidden></p></section><section class="builder-section"><div class="builder-section__header"><div><p class="eyebrow">Method</p><h3>Step-by-step instructions</h3></div><button id="add-step" class="button button--ghost" type="button">+ Step</button></div><div id="step-list" class="stack">${draftSteps.map(stepRow).join('')}</div></section><div id="recipe-errors" class="form-errors" hidden></div><footer class="dialog__footer"><button type="button" class="button button--ghost" data-dialog-close>Cancel</button><button class="button button--primary" type="submit">Save recipe</button></footer></form>`);

    const form = dialog.querySelector('#recipe-form');
    const ingredientList = dialog.querySelector('#ingredient-list');
    const stepList = dialog.querySelector('#step-list');

    const refresh = () => {
      let total = 0;
      let missing = 0;
      ingredientList.querySelectorAll('[data-ingredient-row]').forEach(row => {
        const item = this.context.state.items.find(entry => entry.id === row.querySelector('[data-ingredient-item]').value);
        const grams = Number(row.querySelector('[data-ingredient-grams]').value) || 0;
        const calories = calculateIngredientCalories(item, grams);
        row.querySelector('[data-ingredient-calories]').textContent = calories == null ? '?' : Math.round(calories);
        if (calories == null) missing += 1; else total += calories;
      });
      const servings = Math.max(1, Number(form.elements.servings.value) || 1);
      dialog.querySelector('#recipe-total-calories').textContent = Math.round(total);
      dialog.querySelector('#recipe-serving-calories').textContent = Math.round(total / servings);
      const note = dialog.querySelector('#recipe-nutrition-note');
      note.hidden = missing === 0;
      note.textContent = missing ? `${missing} ingredient${missing === 1 ? ' has' : 's have'} no calorie data yet and ${missing === 1 ? 'is' : 'are'} excluded from the total.` : '';
    };
    const renumber = () => stepList.querySelectorAll('[data-step-row]').forEach((row, index) => row.querySelector('.step-row__number').textContent = index + 1);

    ingredientList.addEventListener('input', refresh);
    form.elements.servings.addEventListener('input', refresh);
    dialog.querySelector('#add-ingredient').addEventListener('click', () => {
      ingredientList.insertAdjacentHTML('beforeend', ingredientRow({ id: uid('ingredient'), itemId: foods[0].id, grams: 100 }));
      refresh();
    });
    ingredientList.addEventListener('click', event => {
      const row = event.target.closest('[data-ingredient-row]');
      if (!row) return;
      if (event.target.closest('[data-remove-ingredient]')) {
        row.remove();
        refresh();
        return;
      }
      if (event.target.closest('[data-choose-ingredient]')) {
        const hidden = row.querySelector('[data-ingredient-item]');
        openItemPicker({
          items: foods,
          shops: this.context.state.shopping.shops,
          title: 'Choose ingredient',
          eyebrow: 'Recipe food',
          selectedId: hidden.value,
          showType: false,
          onSelect: item => {
            hidden.value = item.id;
            row.querySelector('[data-ingredient-name]').textContent = item.name;
            refresh();
          }
        });
      }
    });

    dialog.querySelector('#add-step').addEventListener('click', () => {
      stepList.insertAdjacentHTML('beforeend', stepRow({ id: uid('step'), text: '' }, stepList.children.length));
      renumber();
    });
    stepList.addEventListener('click', event => {
      const row = event.target.closest('[data-step-row]');
      if (!row) return;
      if (event.target.closest('[data-remove-step]')) row.remove();
      if (event.target.closest('[data-step-up]') && row.previousElementSibling) row.parentElement.insertBefore(row, row.previousElementSibling);
      if (event.target.closest('[data-step-down]') && row.nextElementSibling) row.parentElement.insertBefore(row.nextElementSibling, row);
      renumber();
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const data = new FormData(form);
      const recipe = createRecipe({
        ...existing,
        name: data.get('name'),
        description: data.get('description'),
        servings: Number(data.get('servings')),
        ingredients: [...ingredientList.querySelectorAll('[data-ingredient-row]')].map(row => ({
          id: row.dataset.id,
          itemId: row.querySelector('[data-ingredient-item]').value,
          grams: Number(row.querySelector('[data-ingredient-grams]').value)
        })),
        steps: [...stepList.querySelectorAll('[data-step-row]')].map(row => ({ id: row.dataset.id, text: row.querySelector('[data-step-text]').value }))
      });
      const errors = validateRecipe(recipe, new Set(foods.map(item => item.id)));
      const box = dialog.querySelector('#recipe-errors');
      if (errors.length) {
        box.hidden = false;
        box.innerHTML = `<strong>Please fix:</strong><ul>${errors.map(error => `<li>${escapeHtml(error)}</li>`).join('')}</ul>`;
        return;
      }
      this.context.actions.saveRecipe(recipe);
      close();
    });
    refresh();
  }
}
