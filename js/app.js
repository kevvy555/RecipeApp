import { LocalDataStore } from './persistence/storage.js';
import { ensureCatalogData } from './data/catalogSeedLoader.js';
import { downloadExport, readImportFile } from './persistence/dataTransfer.js';
import { addDays, startOfWeekMonday, toIsoDate } from './core/utils.js';
import { associateItemWithShop, migrateLegacyState, normalizeItem, setItemShopAvailability } from './domain/catalogService.js';
import { removeRecipeFromPlanner, setMeal } from './domain/plannerService.js';
import { addRecipeToShopping, clearShoppingSelection, completeShoppingShop, incrementShoppingItem, lockShoppingItems, removeShoppingItem, toggleCollectedItem, unlockShoppingItems } from './domain/shoppingService.js';
import { getRoute, navigate } from './ui/router.js';
import { renderHomeView } from './ui/homeView.js';
import { FoodsView } from './ui/foodsView.js';
import { RecipesView } from './ui/recipesView.js';
import { PlannerView } from './ui/plannerView.js';
import { ShoppingView } from './ui/shoppingView.js';

class RecipeApp {
  constructor(root) {
    this.root = root;
    this.store = new LocalDataStore();
    this.state = { items: [], recipes: [], planner: { weeks: {} }, shopping: { shops: [] } };
    this.seedCatalog = null;
    this.plannerWeekStart = toIsoDate(startOfWeekMonday());
    this.shoppingShopId = null;
  }

  async start() {
    try {
      this.seedCatalog = await ensureCatalogData(this.store);
      this.state = this.store.loadState();
      window.addEventListener('hashchange', () => {
        if (getRoute() !== 'shopping') this.shoppingShopId = null;
        this.render();
      });
      this.root.addEventListener('click', event => {
        const routeButton = event.target.closest('[data-route]');
        if (routeButton) navigate(routeButton.dataset.route);
        const globalAction = event.target.closest('[data-global-action]')?.dataset.globalAction;
        if (globalAction === 'export') downloadExport(this.state);
        if (globalAction === 'import') this.importData();
      });
      this.render();
    } catch (error) {
      console.error(error);
      this.root.innerHTML = `<section class="fatal-error"><h1>Recipe App could not start</h1><p>${error.message}</p><p>Run the app through a local web server or GitHub Pages so the seed JSON files can load.</p></section>`;
    }
  }

  get context() {
    return {
      state: this.state,
      plannerWeekStart: this.plannerWeekStart,
      shoppingShopId: this.shoppingShopId,
      actions: {
        saveItem: item => this.saveItem(item),
        deleteItem: id => this.deleteItem(id),
        saveRecipe: recipe => this.saveRecipe(recipe),
        deleteRecipe: id => this.deleteRecipe(id),
        addRecipeToShopping: id => this.addRecipeToShopping(id),
        changePlannerWeek: days => this.changePlannerWeek(days),
        resetPlannerWeek: () => this.resetPlannerWeek(),
        savePlannerMeal: (dayIndex, mealKey, meal) => this.savePlannerMeal(dayIndex, mealKey, meal),
        openShoppingShop: shopId => this.openShoppingShop(shopId),
        closeShoppingShop: () => this.closeShoppingShop(),
        incrementShoppingItem: (shopId, itemId) => this.incrementShoppingItem(shopId, itemId),
        removeShoppingItem: (shopId, itemId) => this.removeShoppingItem(shopId, itemId),
        clearShoppingSelection: shopId => this.clearShoppingSelection(shopId),
        lockShoppingItems: shopId => this.lockShoppingItems(shopId),
        unlockShoppingItems: shopId => this.unlockShoppingItems(shopId),
        toggleCollectedShoppingItem: (shopId, itemId) => this.toggleCollectedShoppingItem(shopId, itemId),
        completeShoppingShop: shopId => this.completeShoppingShop(shopId),
        addCatalogItemToShop: (shopId, itemId) => this.addCatalogItemToShop(shopId, itemId),
        setItemShopAvailability: (itemId, shopId, available) => this.changeItemShopAvailability(itemId, shopId, available)
      }
    };
  }

  render() {
    const route = getRoute();
    if (route === 'home') { this.root.innerHTML = renderHomeView(); return; }
    if (route === 'foods') new FoodsView(this.root, this.context).render();
    if (route === 'recipes') new RecipesView(this.root, this.context).render();
    if (route === 'planner') new PlannerView(this.root, this.context).render();
    if (route === 'shopping') new ShoppingView(this.root, this.context).render();
  }

  saveItem(input) {
    const existing = this.state.items.find(item => item.id === input.id);
    const item = normalizeItem({ ...existing, ...input, createdAt: existing?.createdAt || input.createdAt, source: existing?.source || input.source || 'user' }, input.preferredShopId);
    const index = this.state.items.findIndex(entry => entry.id === item.id);
    if (index >= 0) this.state.items[index] = item; else this.state.items.push(item);
    this.store.setItems(this.state.items);
    this.render();
  }

  deleteItem(id) {
    this.state.items = this.state.items.filter(item => item.id !== id);
    for (const shop of this.state.shopping.shops || []) {
      delete shop.frequency?.[id];
      delete shop.current?.quantities?.[id];
      delete shop.current?.collected?.[id];
    }
    this.store.setItems(this.state.items);
    this.store.setShopping(this.state.shopping);
    this.render();
  }

  saveRecipe(recipe) {
    const index = this.state.recipes.findIndex(item => item.id === recipe.id);
    if (index >= 0) this.state.recipes[index] = recipe; else this.state.recipes.push(recipe);
    this.store.setRecipes(this.state.recipes); this.render();
  }

  deleteRecipe(id) {
    this.state.recipes = this.state.recipes.filter(recipe => recipe.id !== id);
    this.state.planner = removeRecipeFromPlanner(this.state.planner, id);
    this.store.setRecipes(this.state.recipes); this.store.setPlanner(this.state.planner); this.render();
  }

  addRecipeToShopping(recipeId) {
    const recipe = this.state.recipes.find(item => item.id === recipeId); if (!recipe) return;
    const result = addRecipeToShopping(this.state.shopping, recipe, this.state.items);
    this.state.shopping = result.shopping; this.store.setShopping(this.state.shopping);
    const messages = [];
    if (result.added.length) messages.push(`Added ${result.added.length} ingredient${result.added.length === 1 ? '' : 's'} to Shopping.`);
    if (result.lockedShops.length) messages.push(`Skipped locked shop${result.lockedShops.length === 1 ? '' : 's'}: ${result.lockedShops.join(', ')}.`);
    if (result.unavailable.length) messages.push(`No available shop for: ${result.unavailable.join(', ')}.`);
    alert(messages.join('\n') || 'No ingredients were added.');
    this.render();
  }

  changePlannerWeek(days) { this.plannerWeekStart = toIsoDate(addDays(new Date(`${this.plannerWeekStart}T00:00:00`), days)); this.render(); }
  resetPlannerWeek() { this.plannerWeekStart = toIsoDate(startOfWeekMonday()); this.render(); }
  savePlannerMeal(dayIndex, mealKey, meal) { this.state.planner = setMeal(this.state.planner, this.plannerWeekStart, dayIndex, mealKey, meal); this.store.setPlanner(this.state.planner); this.render(); }
  saveShoppingState(nextState) { this.state.shopping = nextState; this.store.setShopping(this.state.shopping); this.render(); }
  openShoppingShop(shopId) { this.shoppingShopId = shopId; this.render(); }
  closeShoppingShop() { this.shoppingShopId = null; this.render(); }
  incrementShoppingItem(shopId, itemId) { this.saveShoppingState(incrementShoppingItem(this.state.shopping, shopId, itemId)); }
  removeShoppingItem(shopId, itemId) { this.saveShoppingState(removeShoppingItem(this.state.shopping, shopId, itemId)); }
  clearShoppingSelection(shopId) { this.saveShoppingState(clearShoppingSelection(this.state.shopping, shopId)); }
  lockShoppingItems(shopId) { this.saveShoppingState(lockShoppingItems(this.state.shopping, shopId)); }
  unlockShoppingItems(shopId) { this.saveShoppingState(unlockShoppingItems(this.state.shopping, shopId)); }
  toggleCollectedShoppingItem(shopId, itemId) { this.saveShoppingState(toggleCollectedItem(this.state.shopping, shopId, itemId)); }
  completeShoppingShop(shopId) { this.state.shopping = completeShoppingShop(this.state.shopping, shopId); this.store.setShopping(this.state.shopping); this.shoppingShopId = null; this.render(); }

  addCatalogItemToShop(shopId, itemId) {
    const index = this.state.items.findIndex(item => item.id === itemId);
    if (index < 0) return;
    this.state.items[index] = associateItemWithShop(this.state.items[index], shopId, { available: true, makePreferred: true });
    this.store.setItems(this.state.items);
    this.render();
  }

  changeItemShopAvailability(itemId, shopId, available) {
    const index = this.state.items.findIndex(item => item.id === itemId); if (index < 0) return;
    this.state.items[index] = setItemShopAvailability(this.state.items[index], shopId, available);
    if (!available) {
      const shop = this.state.shopping.shops?.find(entry => entry.id === shopId);
      if (shop) { delete shop.current?.quantities?.[itemId]; delete shop.current?.collected?.[itemId]; }
    }
    this.store.setItems(this.state.items); this.store.setShopping(this.state.shopping); this.render();
  }

  importData() {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json,.json';
    input.addEventListener('change', async () => {
      if (!input.files?.[0]) return;
      try {
        const imported = await readImportFile(input.files[0]);
        if (!confirm('Importing will replace all item, recipe, planner and shopping data stored on this device. Continue?')) return;
        const importedState = imported.schemaVersion === 1 ? migrateLegacyState(imported.data, this.seedCatalog) : imported.data;
        this.store.replaceState(importedState); this.state = this.store.loadState(); this.shoppingShopId = null; this.render(); alert('RecipeApp data imported successfully.');
      } catch (error) { alert(`Import failed: ${error.message}`); }
    });
    input.click();
  }
}
new RecipeApp(document.querySelector('#app')).start();
