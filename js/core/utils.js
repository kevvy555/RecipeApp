export function uid(prefix = 'id') {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function toFiniteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function round(value, places = 0) {
  const multiplier = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * multiplier) / multiplier;
}

export function caloriesForWeight(caloriesPer100g, grams) {
  return round((toFiniteNumber(caloriesPer100g) * toFiniteNumber(grams)) / 100, 1);
}

export function sortByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export function startOfWeekMonday(input = new Date()) {
  const date = new Date(input);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

export function addDays(input, days) {
  const date = new Date(input);
  date.setDate(date.getDate() + days);
  return date;
}

export function toIsoDate(input) {
  const date = new Date(input);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatShortDate(input) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(input));
}

export function formatWeekRange(weekStartIso) {
  const start = new Date(`${weekStartIso}T00:00:00`);
  const end = addDays(start, 6);
  const startText = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(start);
  const endText = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(end);
  return `${startText} – ${endText}`;
}
