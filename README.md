# RecipeApp

A lightweight, local-first groceries, recipe, weekly meal planning and shopping-list web app. It uses plain HTML/CSS/JavaScript, ES modules, separate domain/persistence/UI concerns and JSON seed data, with no framework or build dependency.

## Version 2.1 features

- **Home** — Groceries, Recipes, Planner and Shopping.
- **Groceries** — the single master catalogue for everything you buy, including food and non-food items.
- **Food vs non-food** — food items may have kcal per 100g and can be used by Recipes; non-food items have no calorie data.
- **Preferred shops** — every Grocery item has a preferred shop and may also be available from other shops.
- **Shopping uses Groceries** — Shopping never creates catalogue records. **Add from Groceries** associates an existing item with the selected shop and makes that shop its preferred shop.
- **Recipes** — ingredients reference shared food items, use weights, calculate known calories, and support step-by-step instructions.
- **Recipe → Shopping** — add a recipe's unique ingredients to their preferred shops with one action.
- **Planner** — Monday–Sunday Breakfast/Lunch/Dinner planner using saved recipes or custom meals.
- **Shopping** — two-column shop selection, quantity taps, red remove control before locking, Lock Items, collected state, Done/reset and purchase-frequency ranking.
- **Availability** — an item can be marked unavailable/restored independently for each shop without losing frequency history.
- **Local-first persistence** — all data is stored in browser localStorage.
- **Import/export** — complete JSON backup/restore.
- **Automatic v1 → v2 migration** — existing Foods, Recipes, Planner and Shopping data are migrated into the shared catalogue. Old v1 localStorage keys are retained as a safety fallback.

## Shared item model

```js
{
  id: "item-chicken",
  name: "Chicken",
  category: "Meat",
  isFood: true,
  caloriesPer100g: 165,
  preferredShopId: "butchers",
  shops: [
    { shopId: "butchers", available: true }
  ]
}
```

A non-food item uses the same model with `isFood: false` and `caloriesPer100g: null`.

Shopping stores behavioural state separately — frequency, current quantities, lock and collected state — keyed by these shared item IDs.

## Catalogue rules

1. New items are created only in **Groceries**.
2. Every item must have a preferred shop.
3. Shopping's **Add from Groceries** chooses an existing item; it never creates one.
4. Adding an existing item to a shop makes that shop preferred while retaining its other shop associations.
5. Recipes can only select Grocery items marked as Food.

## Seed data

- `data/foods.json` supplies generic nutrition seed data.
- `data/shopping.json` supplies the initial shop/item associations.
- `js/data/catalogSeedLoader.js` combines both into the shared catalogue.

Seed calorie values are generic estimates and can be edited to match the products actually used.

## Run locally

```bash
npm run serve
```

Then open `http://localhost:8080`.

## Tests

```bash
npm test
```

## GitHub Pages

The project is static and can be published directly from the repository root using GitHub Pages.
