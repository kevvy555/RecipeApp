export function renderHomeView() {
  return `
    <section class="home-screen" aria-label="Recipe App home">
      <button class="home-tile home-tile--foods" type="button" data-route="foods">
        <span class="home-tile__icon" aria-hidden="true">🥕</span>
        <span class="home-tile__title">Foods</span>
        <span class="home-tile__caption">Calories by weight</span>
      </button>
      <button class="home-tile home-tile--recipes" type="button" data-route="recipes">
        <span class="home-tile__icon" aria-hidden="true">🍳</span>
        <span class="home-tile__title">Recipes</span>
        <span class="home-tile__caption">Build & cook</span>
      </button>
      <button class="home-tile home-tile--planner" type="button" data-route="planner">
        <span class="home-tile__icon" aria-hidden="true">📅</span>
        <span class="home-tile__title">Planner</span>
        <span class="home-tile__caption">Plan the week</span>
      </button>
    </section>`;
}
