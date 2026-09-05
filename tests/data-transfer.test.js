import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExportPayload, validateImportPayload } from '../js/persistence/dataTransfer.js';

test('export payload round-trips through import validation', () => {
  const state = { foods: [{ id: 'f1' }], recipes: [{ id: 'r1' }], planner: { weeks: {} } };
  const payload = buildExportPayload(state);
  assert.deepEqual(validateImportPayload(payload), state);
});

test('shopping data round-trips when present', () => {
  const state = { foods: [], recipes: [], planner: { weeks: {} }, shopping: { shops: [{ id: 'shop' }] } };
  const payload = buildExportPayload(state);
  assert.deepEqual(validateImportPayload(payload), state);
});

test('import rejects non RecipeApp files', () => {
  assert.throws(() => validateImportPayload({ app: 'OtherApp' }), /not a RecipeApp export/);
});
