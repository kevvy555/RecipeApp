# RecipeApp

A lightweight, local-first food, recipe, weekly meal planning and shopping-list web app. It uses plain HTML/CSS/JavaScript, ES modules, separate domain/persistence/UI concerns and JSON seed data, with no framework or build dependency.

## Version 2 features

- **Home** — four full-screen navigation tiles: Foods, Recipes, Planner and Shopping.
- **Shared item catalogue** — Foods, Recipes and Shopping now reference the same canonical items.
- **Foods** — optional kcal per 100g, quick weight calorie calculator, categories and a required preferred shop.
- **Recipes** — ingredients reference shared food items, use weights, calculate known calories, and support step-by-step instructions.
- **Recipe → Shopping** — add a recipe's unique ingredients to their preferred shops with one action.
- **Planner** — Monday–Sunday Breakfast/Lunch/Dinner planner using saved recipes or custom meals.
- **Shopping** — shop-specific two-column selection, quantity taps, Lock Items, in-shop collected state, Done/reset and purchase-frequency ranking.
- **Shopping catalogue management** — add food or non-food items and mark an item unavailable/restored independently for each shop.
- **Preferred shops** — every item has a preferred shop; items may also be available from multiple shops.
- **Local-first persistence** — all data is stored in browser localStorage.
- **Import/export** — complete JSON backup/restore.
- **Automatic v1 → v2 migration** — existing Foods, Recipes, Planner and Shopping data are migrated to the shared catalogue on first v2 load. The old v1 localStorage keys are left untouched as a safety fallback.

## Shared item model

Items are the common data source for Foods, Recipes and Shopping:

```js
{
  id: "item-chicken",
  name: "Chicken",
  category: "Meat",
  isFood: true,
  caloriesPer100g: 165, // null when unknown/not applicable
  preferredShopId: "butchers",
  shops: [
    { shopId: "butchers", available: true }
  ]
}
```

Non-food shopping items use the same model with `isFood: false` and `caloriesPer100g: null`.

Shopping keeps behavioural state separately (frequency, current quantities, lock/collected state) and keys that state by shared item ID.

## Seed data

- `data/foods.json` provides generic nutrition seed data.
- `data/shopping.json` provides the initial shop/item associations.
- `js/data/catalogSeedLoader.js` combines both into the v2 shared catalogue.

Seed calorie values are generic estimates. Brand, variety and cooking method can change the real value, so user-entered or edited values should match the product/data source actually used.

## Project structure

```text
RecipeApp/
├── index.html
├── css/
│   ├── app.css
│   ├── shopping.css
│   └── catalog.css
├── data/
│   ├── foods.json
│   └── shopping.json
├── js/
│   ├── app.js
│   ├── core/
│   ├── data/
│   │   └── catalogSeedLoader.js
│   ├── domain/
│   │   ├── catalogService.js
│   │   ├── nutritionService.js
│   │   ├── plannerService.js
│   │   ├── recipeService.js
│   │   └── shoppingService.js
│   ├── persistence/
│   └── ui/
├── tests/
└── package.json
```

## Run locally

The seed files are loaded using `fetch()`, so serve the repository rather than opening `index.html` directly:

```bash
npm run serve
```

Then open `http://localhost:8080`.

## Tests

```bash
npm test
```

## GitHub Pages

The project is static and can be published directly from the repository root using GitHub Pages. No build step is required.
