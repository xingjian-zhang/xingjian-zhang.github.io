import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { publicationEntries, publicationHtml } from './lib/publications.mjs';

export async function build({ source = '.', destination = '_site', stage = '.build/source', components = true, publications = true, fonts = true } = {}) {
  await rm(stage, { recursive: true, force: true });
  await mkdir(stage, { recursive: true });
  for (const path of ['index.html', 'pages', 'assets', 'components', '_layouts', 'ai-coding-setup.md', 'apple-touch-icon.png', 'CNAME', 'robots.txt', 'sitemap.xml']) {
    await cp(`${source}/${path}`, `${stage}/${path}`, { recursive: true });
  }
  const partials = Object.fromEntries(await Promise.all(['header', 'topnav', 'footer'].map(async name => [name, await readFile(`${source}/components/${name}.html`, 'utf8')])));
  const pubs = publicationEntries(await readFile(`${source}/assets/data/publications.bib`, 'utf8'));
  for (const path of ['index.html', 'pages/research.html', 'pages/experience.html', 'pages/projects.html', 'pages/misc.html', '_layouts/default.html']) {
    let html = await readFile(`${stage}/${path}`, 'utf8');
    if (components) {
      for (const [name, partial] of Object.entries(partials)) html = html.replace(`<div id="${name}-placeholder"></div>`, partial);
      html = html.replace(/^.*<script defer src="[^"]*loadComponents\.js"><\/script>\n/gm, '');
    }
    if (publications) {
      html = html.replace('<div id="publications-list"></div>', `<div id="publications-list">${publicationHtml(pubs, path === 'index.html')}</div>`);
      html = path === 'pages/research.html'
        ? html.replace('assets/js/main.js', 'assets/js/publications.js')
        : html.replace(/^.*<script src="[^"]*main\.js"><\/script>\n/gm, '');
    }
    if (components && /id="(?:header|topnav|footer)-placeholder"/.test(html)) throw new Error(`Unresolved component in ${path}`);
    if (fonts) html = html.replace('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css', '/assets/css/icons.css');
    await writeFile(`${stage}/${path}`, html);
  }
  if (components) {
    const theme = await readFile(`${stage}/assets/js/theme.js`, 'utf8');
    await writeFile(`${stage}/assets/js/theme.js`, theme.replace("document.addEventListener('components:loaded', apply);", "document.addEventListener('DOMContentLoaded', apply, { once: true });"));
  }
  if (publications) await cp('assets/js/publications.js', `${stage}/assets/js/publications.js`);
  if (fonts) {
    await cp('assets/fonts', `${stage}/assets/fonts`, { recursive: true });
    await cp('assets/css/icons.css', `${stage}/assets/css/icons.css`);
    const styles = await readFile(`${source}/assets/css/styles.css`, 'utf8');
    const fontCss = await readFile('assets/css/source-sans.css', 'utf8');
    const combined = styles.replace(/@import url\([^)]*\);/, () => fontCss);
    if (!combined.includes('\n:root {') || combined.includes('@import') || combined.includes("600&display=swap');")) throw new Error('Invalid font CSS composition');
    await writeFile(`${stage}/assets/css/styles.css`, combined);
  }
  const result = spawnSync('bundle', ['exec', 'jekyll', 'build', '--source', resolve(stage), '--destination', resolve(destination)], { stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`Jekyll build failed: ${result.status}`, { cause: result.error });
}

if (process.argv[1] === new URL(import.meta.url).pathname) await build();
