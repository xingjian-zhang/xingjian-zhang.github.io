import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import assert from 'node:assert/strict';
const fixtures = JSON.parse(await readFile(new URL('./fixtures/vendor/manifest.json', import.meta.url), 'utf8'));
export async function prepare(context, engine, theme) {
  await context.addInitScript(theme => {
    if (!sessionStorage.getItem('visual-theme-seeded')) {
      localStorage.setItem('site-theme', theme);
      sessionStorage.setItem('visual-theme-seeded', 'true');
    }
  }, theme);
  await context.route('https://**/*', async route => {
    const url = route.request().url();
    if (url.includes('googletagmanager.com') || url.includes('google-analytics.com')) return route.fulfill({ body: '', contentType: 'text/javascript' });
    const fixture = fixtures[engine][url];
    if (!fixture) throw new Error(`Unrecorded external resource: ${url}`);
    await route.fulfill({ body: await readFile(new URL(`./fixtures/vendor/${fixture.file}`, import.meta.url)), contentType: fixture.contentType });
  });
}

export async function ready(page) {
  await page.waitForFunction(() => document.querySelector('.theme-toggle')?.title.startsWith('Switch to'));
  if (await page.locator('#publications-list').count()) await page.waitForFunction(() => document.querySelectorAll('.t-pub').length === 12);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
  });
  await page.mouse.move(-1, -1);
  if (await page.locator('#t-gate').count()) await page.locator('#t-gate h2').click();
  await frames(page);
}

export async function frames(page, count = 3) {
  await page.evaluate(count => new Promise(resolve => {
    const tick = () => count-- ? requestAnimationFrame(tick) : resolve(); tick();
  }), count);
}

export async function scrollIdle(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    let last = '', stable = 0, limit = 300;
    const tick = () => {
      const current = `${scrollX}:${scrollY}`;
      stable = current === last ? stable + 1 : 0;
      last = current;
      if (stable >= 12) resolve();
      else if (!limit--) reject(new Error('Scroll did not settle'));
      else requestAnimationFrame(tick);
    }; tick();
  }));
}

export function pixelDifference(a, b) {
  const before = PNG.sync.read(a), after = PNG.sync.read(b);
  if (before.width !== after.width || before.height !== after.height) return { pixels: Infinity, before: [before.width, before.height], after: [after.width, after.height] };
  if (before.data.equals(after.data)) return { pixels: 0 };
  const diff = new PNG({ width: before.width, height: before.height });
  let pixels = 0;
  for (let i = 0; i < before.data.length; i += 4) {
    const differs = before.data[i] !== after.data[i] || before.data[i + 1] !== after.data[i + 1] || before.data[i + 2] !== after.data[i + 2] || before.data[i + 3] !== after.data[i + 3];
    if (differs) pixels++;
    diff.data.set(differs ? [255, 0, 90, 255] : [after.data[i], after.data[i + 1], after.data[i + 2], 50], i);
  }
  return { pixels, diff: PNG.sync.write(diff) };
}

export async function identical(a, b, name, testInfo) {
  const result = pixelDifference(a, b);
  if (result.pixels) {
    for (const [label, body] of [['reference', a], ['candidate', b], ['diff', result.diff]]) {
      if (body) await testInfo.attach(`${name}-${label}`, { body, contentType: 'image/png' });
    }
  }
  assert.equal(result.pixels, 0, `${name}: ${JSON.stringify({ pixels: result.pixels, before: result.before, after: result.after })}`);
}

export async function capture(page, options = {}) {
  if (options.animations !== 'allow') {
    // Finish through the browser's animation API so lifecycle callbacks run too.
    // Rewriting transition CSS during a WebKit view transition can deadlock capture.
    for (let round = 0; round < 3; round++) {
      await page.evaluate(() => document.getAnimations().forEach(animation => {
        if (animation.playState === 'running' && Number.isFinite(animation.effect.getComputedTiming().endTime)) animation.finish();
      }));
      await frames(page, 2);
    }
  }
  await frames(page);
  return page.screenshot({ fullPage: true, animations: 'allow', caret: 'initial', scale: 'device', timeout: 15_000, ...options });
}

export async function pair(browser, engine, theme, width, route, run) {
  const isolated = await browser.browserType().launch();
  const contexts = await Promise.all([browser, isolated].map(instance => instance.newContext({ viewport: { width, height: 890 }, deviceScaleFactor: 1, colorScheme: theme, locale: 'en-US', timezoneId: 'America/Detroit' })));
  try {
    await Promise.all(contexts.map(context => prepare(context, engine, theme)));
    const pages = await Promise.all(contexts.map(context => context.newPage()));
    await Promise.all(pages.map(async (page, index) => {
      await page.goto(`http://127.0.0.1:${index && !process.env.AA ? 4401 : 4400}${route}`, { waitUntil: 'networkidle' });
      await ready(page);
    }));
    return await run(pages);
  } finally { await Promise.all(contexts.map(context => context.close())); await isolated.close(); }
}
