import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map(async (entry) =>
        entry.isDirectory()
          ? files(`${dir}/${entry.name}`)
          : `${dir}/${entry.name}`,
      ),
    )
  ).flat();
}
let checked = 0;
const iconCss = await readFile('_site/assets/css/icons.css', 'utf8');
for (const file of await files('_site')) {
  if (!/\.(html|css)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  if (file.endsWith('.html'))
    for (const match of text.matchAll(/class="([^"]*)"/g))
      for (const name of match[1].split(/\s+/)) {
        if (name.startsWith('bi-') && !iconCss.includes(`.${name}::before`))
          throw new Error(`Missing icon glyph rule ${name} in ${file}`);
      }
  const references = [
    ...text.matchAll(/(?:href|src)="([^"]+)"|url\(['"]?([^)'"\s]+)['"]?\)/g),
  ].map((m) => m[1] || m[2]);
  for (const reference of references) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(reference)) continue;
    const url = reference.split(/[?#]/)[0];
    if (!url) continue;
    let target = url.startsWith('/')
      ? resolve('_site', '.' + url)
      : resolve(dirname(file), url);
    if (target.endsWith('/ai-coding-setup')) target += '/index.html';
    try {
      await access(target);
      checked++;
    } catch {
      throw new Error(`Missing local reference: ${file} -> ${reference}`);
    }
  }
}
const home = await readFile('_site/index.html', 'utf8');
if (
  process.env.REQUIRE_STATIC !== '0' &&
  /loadComponents\.js|main\.js|fetch\(/.test(home)
)
  throw new Error('Homepage still loads runtime components or publications');
if (!home.includes('G-SRQFEQD9S4'))
  throw new Error('Analytics configuration missing');
console.log(`Checked ${checked} local resource and page references.`);

const vendor = JSON.parse(
  await readFile('tests/fixtures/vendor/manifest.json', 'utf8'),
).chromium;
for (const [url, fixture] of Object.entries(vendor)) {
  if (!url.includes('.woff2')) continue;
  const name = url.includes('bootstrap-icons')
    ? 'bootstrap-icons.woff2'
    : new URL(url).pathname.split('/').pop();
  const [original, local] = await Promise.all([
    readFile(`tests/fixtures/vendor/${fixture.file}`),
    readFile(`_site/assets/fonts/${name}`),
  ]);
  if (!original.equals(local)) throw new Error(`Font bytes changed: ${name}`);
}
for (const name of [
  'node_modules',
  'tests',
  'scripts',
  'reports',
  '.build',
  'package.json',
  'package-lock.json',
  'CLAUDE.md',
  'README.md',
]) {
  let exists = true;
  try {
    await access(`_site/${name}`);
  } catch (error) {
    if (error.code === 'ENOENT') exists = false;
    else throw error;
  }
  if (exists)
    throw new Error(
      `Private build/test input included in published artifact: ${name}`,
    );
}
console.log('Verified font byte identity and publish exclusions.');
