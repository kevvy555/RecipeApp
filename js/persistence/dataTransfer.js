import { APP_VERSION, DATA_SCHEMA_VERSION } from '../core/constants.js';
export function buildExportPayload(state) { return { app:'RecipeApp', appVersion:APP_VERSION, schemaVersion:DATA_SCHEMA_VERSION, exportedAt:new Date().toISOString(), data:{ items:state.items, recipes:state.recipes, planner:state.planner, shopping:state.shopping } }; }
export function validateImportPayload(payload) {
  if(!payload || payload.app!=='RecipeApp') throw new Error('This is not a RecipeApp export file.');
  if(payload.schemaVersion===1) { if(!Array.isArray(payload.data?.foods)||!Array.isArray(payload.data?.recipes)||!payload.data?.planner) throw new Error('Legacy RecipeApp backup is incomplete.'); return { schemaVersion:1, data:{ foods:payload.data.foods, recipes:payload.data.recipes, planner:payload.data.planner, shopping:payload.data.shopping||{shops:[]} } }; }
  if(payload.schemaVersion!==DATA_SCHEMA_VERSION) throw new Error(`Unsupported data schema version: ${payload.schemaVersion}`);
  if(!Array.isArray(payload.data?.items)) throw new Error('Import is missing a valid items array.');
  if(!Array.isArray(payload.data?.recipes)) throw new Error('Import is missing a valid recipes array.');
  if(!payload.data?.planner || typeof payload.data.planner!=='object') throw new Error('Import is missing valid planner data.');
  if(!Array.isArray(payload.data?.shopping?.shops)) throw new Error('Import is missing valid shopping data.');
  return { schemaVersion:2, data:{items:payload.data.items,recipes:payload.data.recipes,planner:payload.data.planner,shopping:payload.data.shopping} };
}

export async function readImportFile(file) { return validateImportPayload(JSON.parse(await file.text())); }
export function downloadExport(state) {
  const payload = buildExportPayload(state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href=url; anchor.download=`recipeapp-backup-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
