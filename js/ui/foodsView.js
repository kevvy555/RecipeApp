import { FOOD_CATEGORIES } from '../core/constants.js';
import { caloriesForWeight, escapeHtml, sortByName, uid } from '../core/utils.js';
import { associateItemWithShop } from '../domain/catalogService.js';
import { sectionLayout } from './layout.js';
import { openDialog } from './dialog.js';

function categoryOptions(categories, selected = '') {
  return categories.map(category => `<option value="${escapeHtml(category)}" ${category === selected ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('');
}

export class FoodsView {
  constructor(root, context) { this.root = root; this.context = context; }

  render() {
    const foods = sortByName(this.context.state.items.filter(item => item.isFood));
    const shops = this.context.state.shopping?.shops || [];
    const shopMap = new Map(shops.map(shop => [shop.id, shop.name]));
    const categories = [...new Set([...FOOD_CATEGORIES, ...foods.map(food => food.category)])].sort();
    const rows = foods.map(food => `
      <tr data-food-row data-name="${escapeHtml(food.name.toLowerCase())}" data-category="${escapeHtml(food.category)}">
        <td><strong>${escapeHtml(food.name)}</strong>${food.notes ? `<div class="muted small">${escapeHtml(food.notes)}</div>` : ''}</td>
        <td><span class="badge">${escapeHtml(food.category)}</span></td>
        <td class="number">${food.caloriesPer100g == null ? '—' : food.caloriesPer100g}</td>
        <td>${escapeHtml(shopMap.get(food.preferredShopId) || 'Unknown')}</td>
        <td><span class="badge ${food.source === 'seed' ? 'badge--quiet' : 'badge--accent'}">${food.source === 'seed' ? 'Seed' : 'Added'}</span></td>
        <td class="table-actions"><button class="button button--small button--ghost" type="button" data-edit-food="${food.id}">Edit</button><button class="button button--small button--danger-ghost" type="button" data-delete-food="${food.id}">Delete</button></td>
      </tr>`).join('');

    const calculatorFoods = foods.filter(food => food.caloriesPer100g != null);
    const content = `<div class="stack stack--lg">
      <section class="card calorie-calculator">
        <div><p class="eyebrow">Quick calculator</p><h2>Calories for a weight</h2></div>
        <label>Food<select id="calculator-food" ${calculatorFoods.length ? '' : 'disabled'}>${calculatorFoods.map(food => `<option value="${food.id}">${escapeHtml(food.name)} · ${food.caloriesPer100g} kcal/100g</option>`).join('')}</select></label>
        <label>Weight (g)<input id="calculator-weight" type="number" min="0" step="1" value="100" inputmode="decimal" ${calculatorFoods.length ? '' : 'disabled'}></label>
        <div class="metric"><span id="calculator-result">${calculatorFoods.length ? '0' : '—'}</span><small>kcal</small></div>
      </section>
      <section class="card">
        <div class="toolbar"><div class="toolbar__group toolbar__group--grow"><input id="food-search" type="search" placeholder="Search foods…"><select id="food-category-filter"><option value="">All categories</option>${categoryOptions(categories)}</select></div><button id="add-food" class="button button--primary" type="button">+ Add food</button></div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>Food</th><th>Category</th><th class="number">kcal / 100g</th><th>Preferred shop</th><th>Source</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
        <p class="help-text">Foods and Shopping now share one item catalogue. Calories are optional; every item has a preferred shop for recipe-to-shopping actions.</p>
      </section>
    </div>`;

    this.root.innerHTML = sectionLayout('Foods', content, { subtitle: `${foods.length} food items in the shared catalogue` });
    this.bind(calculatorFoods);
  }

  bind(calculatorFoods) {
    const search = this.root.querySelector('#food-search'); const category = this.root.querySelector('#food-category-filter');
    const filter = () => { const query=search.value.trim().toLowerCase(); const selected=category.value; this.root.querySelectorAll('[data-food-row]').forEach(row => row.hidden=!row.dataset.name.includes(query)||(selected&&row.dataset.category!==selected)); };
    search.addEventListener('input', filter); category.addEventListener('change', filter);
    const calculatorFood=this.root.querySelector('#calculator-food'); const calculatorWeight=this.root.querySelector('#calculator-weight'); const calculatorResult=this.root.querySelector('#calculator-result');
    if (calculatorFoods.length) {
      const update=()=>{ const food=this.context.state.items.find(item=>item.id===calculatorFood.value); calculatorResult.textContent=food?Math.round(caloriesForWeight(food.caloriesPer100g,calculatorWeight.value)):'0'; };
      calculatorFood.addEventListener('change',update); calculatorWeight.addEventListener('input',update); update();
    }
    this.root.querySelector('#add-food').addEventListener('click',()=>this.openFoodEditor());
    this.root.querySelectorAll('[data-edit-food]').forEach(button=>button.addEventListener('click',()=>this.openFoodEditor(this.context.state.items.find(item=>item.id===button.dataset.editFood))));
    this.root.querySelectorAll('[data-delete-food]').forEach(button=>button.addEventListener('click',()=>this.deleteFood(button.dataset.deleteFood)));
  }

  openFoodEditor(existing=null) {
    const foods=this.context.state.items.filter(item=>item.isFood); const categories=[...new Set([...FOOD_CATEGORIES,...foods.map(item=>item.category)])].sort(); const shops=this.context.state.shopping?.shops||[];
    const {dialog,close}=openDialog(`<form id="food-form" class="dialog__panel">
      <header class="dialog__header"><div><p class="eyebrow">Shared item catalogue</p><h2>${existing?'Edit food':'Add food'}</h2></div><button type="button" class="icon-button" data-dialog-close>✕</button></header>
      <div class="form-grid">
        <label class="form-grid__wide">Food name<input name="name" required maxlength="100" value="${escapeHtml(existing?.name||'')}"></label>
        <label>Category<select name="category">${categoryOptions(categories,existing?.category||'Other')}</select></label>
        <label>Preferred shop<select name="preferredShopId">${shops.map(shop=>`<option value="${escapeHtml(shop.id)}" ${shop.id===(existing?.preferredShopId||shops[0]?.id)?'selected':''}>${escapeHtml(shop.name)}</option>`).join('')}</select></label>
        <label>Calories per 100g <span class="muted small">(optional)</span><input name="caloriesPer100g" type="number" min="0" step="0.1" inputmode="decimal" value="${existing?.caloriesPer100g??''}"></label>
        <label class="form-grid__wide">Notes<input name="notes" maxlength="180" value="${escapeHtml(existing?.notes||'')}" placeholder="Optional brand, cooked/raw note, etc."></label>
      </div>
      <footer class="dialog__footer"><button type="button" class="button button--ghost" data-dialog-close>Cancel</button><button class="button button--primary" type="submit">Save food</button></footer>
    </form>`);
    dialog.querySelector('#food-form').addEventListener('submit',event=>{
      event.preventDefault(); const form=new FormData(event.currentTarget); const preferredShopId=String(form.get('preferredShopId')); const caloriesText=String(form.get('caloriesPer100g')||'').trim();
      let item={ id:existing?.id||uid('item'), name:String(form.get('name')).trim(), category:String(form.get('category')), isFood:true, caloriesPer100g:caloriesText===''?null:Number(caloriesText), notes:String(form.get('notes')).trim(), preferredShopId, shops:existing?.shops||[], source:existing?.source||'user', createdAt:existing?.createdAt };
      if(!item.name || (item.caloriesPer100g!=null && (!Number.isFinite(item.caloriesPer100g)||item.caloriesPer100g<0))) return;
      item=associateItemWithShop(item,preferredShopId,{available:true,makePreferred:true}); this.context.actions.saveItem(item); close();
    });
  }

  deleteFood(id) {
    const food=this.context.state.items.find(item=>item.id===id); if(!food)return;
    const usedBy=this.context.state.recipes.filter(recipe=>recipe.ingredients.some(ingredient=>(ingredient.itemId||ingredient.foodId)===id));
    if(usedBy.length){alert(`“${food.name}” is used by ${usedBy.length} recipe${usedBy.length===1?'':'s'}. Remove it from those recipes first.`);return;}
    if(confirm(`Delete “${food.name}” from the shared item catalogue? This also removes it from shopping lists.`)) this.context.actions.deleteItem(id);
  }
}
