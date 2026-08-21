const VALID_ROUTES = new Set(['home', 'foods', 'recipes', 'planner']);

export function getRoute() {
  const route = location.hash.replace(/^#\/?/, '').split('?')[0] || 'home';
  return VALID_ROUTES.has(route) ? route : 'home';
}

export function navigate(route) {
  location.hash = `#/${VALID_ROUTES.has(route) ? route : 'home'}`;
}
