import { watch } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { serve } from './serve.mjs';

// A fresh child reloads parser and metadata modules on every rebuild.
function build() {
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], {
    stdio: 'inherit',
  });
  if (result.status !== 0)
    throw new Error(`Build failed: ${result.status}`, { cause: result.error });
}
build();
const port = Number(process.env.PORT || 4000);
await serve('_site', port);
console.log(`Preview: http://127.0.0.1:${port}`);
let timer;
function rebuild() {
  try {
    build();
    console.log('Rebuilt. Refresh the browser.');
  } catch (error) {
    console.error(error);
  }
}
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 120);
}
// Watch parent directories so atomic editor saves do not detach file watchers.
const rootInputs = new Set([
  'index.html',
  'ai-coding-setup.md',
  'apple-touch-icon.png',
  'CNAME',
  'robots.txt',
  'sitemap.xml',
  'Gemfile',
  'Gemfile.lock',
]);
watch('.', (event, name) => {
  if (rootInputs.has(String(name))) schedule();
});
watch('scripts', (event, name) => {
  if (String(name) === 'build.mjs') schedule();
});
for (const path of ['pages', 'assets', 'components', '_layouts', 'scripts/lib'])
  watch(path, { recursive: true }, schedule);
