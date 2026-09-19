import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExportPayload, validateImportPayload } from '../js/persistence/dataTransfer.js';

test('v2 export payload round-trips through import validation', () => {
  const state = { items: [{ id: 'i1' }], recipes: [{ id: 'r1' }], planner: { weeks: {} }, shopping: { shops: [{ id: 'shop' }] } };
  const parsed = validateImportPayload(buildExportPayload(state));
  assert.equal(parsed.schemaVersion, 2);
  assert.deepEqual(parsed.data, state);
});

test('v1 backup remains accepted for migration', () => {
  const parsed = validateImportPayload({ app: 'RecipeApp', schemaVersion: 1, data: { foods: [], recipes: [], planner: { weeks: {} } } });
  assert.equal(parsed.schemaVersion, 1);
  assert.deepEqual(parsed.data.shopping, { shops: [] });
});

test('import rejects non RecipeApp files', () => {
  assert.throws(() => validateImportPayload({ app: 'OtherApp' }), /not a RecipeApp export/);
});
