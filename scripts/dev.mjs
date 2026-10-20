import { watch } from 'node:fs';
import { build } from './build.mjs';
import { serve } from './serve.mjs';
await build();
await serve('_site', Number(process.env.PORT || 4000));
let timer, building = false, again = false;
async function rebuild() {
  if (building) { again = true; return; }
  building = true;
  try { await build(); console.log('Rebuilt. Refresh the browser.'); }
  catch (error) { console.error(error); }
  finally { building = false; if (again) { again = false; rebuild(); } }
}
for (const path of ['index.html', 'pages', 'assets', 'components', '_layouts', 'ai-coding-setup.md', 'scripts/lib']) {
  watch(path, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 120); });
}
