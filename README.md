# RecipeApp

A lightweight, local-first food, recipe and weekly meal planning web app. It follows the same simple static-project shape as MineIT: plain HTML/CSS/JavaScript, ES modules, separate domain/persistence/UI concerns, JSON seed data and no framework/build dependency.

## Version 1 features

- **Home** — three full-screen navigation tiles: Foods, Recipes and Planner.
- **Foods** — seeded common-food database, kcal per 100g, quick weight calorie calculator, search/filter, add/edit/delete foods.
- **Recipes** — ingredients selected from the food database and entered by grams, automatic total/per-serving calories, servings, description and reorderable step-by-step cooking instructions.
- **Planner** — Monday–Sunday planner with Breakfast, Lunch and Dinner. Each slot can use a saved recipe or a custom meal name. Saved recipes contribute their per-serving calories to daily/weekly planned totals.
- **Local-first persistence** — foods, recipes and planner data are stored in `localStorage`.
- **Import/export** — complete JSON backups replace/restore all app data.
- **Seed data** — `data/foods.json` is loaded into local storage on first run only.

> Seed food calories are generic approximate values per 100g. Real calories vary by brand, recipe, variety and cooking method. Edit entries to match packaging/data you trust.

## Project structure

```text
RecipeApp/
├── index.html
├── css/
│   └── app.css
├── data/
│   └── foods.json
├── js/
│   ├── app.js
│   ├── core/
│   │   ├── constants.js
│   │   └── utils.js
│   ├── data/
│   │   └── seedLoader.js
│   ├── domain/
│   │   ├── nutritionService.js
│   │   ├── plannerService.js
│   │   └── recipeService.js
│   ├── persistence/
│   │   ├── dataTransfer.js
│   │   └── storage.js
│   └── ui/
│       ├── dialog.js
│       ├── foodsView.js
│       ├── homeView.js
│       ├── layout.js
│       ├── plannerView.js
│       ├── recipesView.js
│       └── router.js
├── tests/
│   └── nutrition.test.js
└── package.json
```

## Run locally

Because the seed food database is loaded with `fetch()`, serve the folder rather than opening `index.html` directly from the filesystem.

```bash
npm run serve
```

Then open `http://localhost:8080`.

## Tests

```bash
npm test
```

## GitHub Pages

The project is intentionally static and can be published directly with GitHub Pages from the repository root. No build action is required.
