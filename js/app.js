import { LocalDataStore } from './persistence/storage.js';
import { ensureSeedFoods } from './data/seedLoader.js';
import { downloadExport, readImportFile } from './persistence/dataTransfer.js';
import { addDays, startOfWeekMonday, toIsoDate } from './core/utils.js';
import { removeRecipeFromPlanner, setMeal } from './domain/plannerService.js';
import { getRoute, navigate } from './ui/router.js';
import { renderHomeView } from './ui/homeView.js';
import { FoodsView } from './ui/foodsView.js';
import { RecipesView } from './ui/recipesView.js';
import { PlannerView } from './ui/plannerView.js';

class RecipeApp {
  constructor(root) {
    this.root = root;
    this.store = new LocalDataStore();
    this.state = { foods: [], recipes: [], planner: { weeks: {} } };
    this.plannerWeekStart = toIsoDate(startOfWeekMonday());
  }

  async start() {
    try {
      await ensureSeedFoods(this.store);
      this.state = this.store.loadState();
      window.addEventListener('hashchange', () => this.render());
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
      this.root.innerHTML = `<section class="fatal-error"><h1>Recipe App could not start</h1><p>${error.message}</p><p>Run the app through a local web server or GitHub Pages so the seed JSON file can load.</p></section>`;
    }
  }

  get context() {
    return {
      state: this.state,
      plannerWeekStart: this.plannerWeekStart,
      actions: {
        saveFood: food => this.saveFood(food),
        deleteFood: id => this.deleteFood(id),
        saveRecipe: recipe => this.saveRecipe(recipe),
        deleteRecipe: id => this.deleteRecipe(id),
        changePlannerWeek: days => this.changePlannerWeek(days),
        resetPlannerWeek: () => this.resetPlannerWeek(),
        savePlannerMeal: (dayIndex, mealKey, meal) => this.savePlannerMeal(dayIndex, mealKey, meal)
      }
    };
  }

  render() {
    const route = getRoute();
    if (route === 'home') {
      this.root.innerHTML = renderHomeView();
      return;
    }
    if (route === 'foods') new FoodsView(this.root, this.context).render();
    if (route === 'recipes') new RecipesView(this.root, this.context).render();
    if (route === 'planner') new PlannerView(this.root, this.context).render();
  }

  saveFood(food) {
    const index = this.state.foods.findIndex(item => item.id === food.id);
    if (index >= 0) this.state.foods[index] = food;
    else this.state.foods.push(food);
    this.store.setFoods(this.state.foods);
    this.render();
  }

  deleteFood(id) {
    this.state.foods = this.state.foods.filter(food => food.id !== id);
    this.store.setFoods(this.state.foods);
    this.render();
  }

  saveRecipe(recipe) {
    const index = this.state.recipes.findIndex(item => item.id === recipe.id);
    if (index >= 0) this.state.recipes[index] = recipe;
    else this.state.recipes.push(recipe);
    this.store.setRecipes(this.state.recipes);
    this.render();
  }

  deleteRecipe(id) {
    this.state.recipes = this.state.recipes.filter(recipe => recipe.id !== id);
    this.state.planner = removeRecipeFromPlanner(this.state.planner, id);
    this.store.setRecipes(this.state.recipes);
    this.store.setPlanner(this.state.planner);
    this.render();
  }

  changePlannerWeek(days) {
    this.plannerWeekStart = toIsoDate(addDays(new Date(`${this.plannerWeekStart}T00:00:00`), days));
    this.render();
  }

  resetPlannerWeek() {
    this.plannerWeekStart = toIsoDate(startOfWeekMonday());
    this.render();
  }

  savePlannerMeal(dayIndex, mealKey, meal) {
    this.state.planner = setMeal(this.state.planner, this.plannerWeekStart, dayIndex, mealKey, meal);
    this.store.setPlanner(this.state.planner);
    this.render();
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', async () => {
      if (!input.files?.[0]) return;
      try {
        const importedState = await readImportFile(input.files[0]);
        if (!confirm('Importing will replace all foods, recipes and planner data currently stored on this device. Continue?')) return;
        this.store.replaceState(importedState);
        this.state = this.store.loadState();
        this.render();
        alert('RecipeApp data imported successfully.');
      } catch (error) {
        alert(`Import failed: ${error.message}`);
      }
    });
    input.click();
  }
}

new RecipeApp(document.querySelector('#app')).start();
