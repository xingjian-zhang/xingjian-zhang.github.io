import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import assert from 'node:assert/strict';
const fixtures = JSON.parse(
  await readFile(
    new URL('./fixtures/vendor/manifest.json', import.meta.url),
    'utf8',
  ),
);
export async function prepare(context, engine, theme) {
  await context.addInitScript((theme) => {
    if (!sessionStorage.getItem('visual-theme-seeded')) {
      localStorage.setItem('site-theme', theme);
      sessionStorage.setItem('visual-theme-seeded', 'true');
    }
  }, theme);
  await context.route('https://**/*', async (route) => {
    const url = route.request().url();
    if (
      url.includes('googletagmanager.com') ||
      url.includes('google-analytics.com')
    )
      return route.fulfill({ body: '', contentType: 'text/javascript' });
    const fixture = fixtures[engine][url];
    if (!fixture) throw new Error(`Unrecorded external resource: ${url}`);
    await route.fulfill({
      body: await readFile(
        new URL(`./fixtures/vendor/${fixture.file}`, import.meta.url),
      ),
      contentType: fixture.contentType,
    });
  });
}

export async function ready(page) {
  await page.waitForFunction(() =>
    document.querySelector('.theme-toggle')?.title.startsWith('Switch to'),
  );
  if (await page.locator('#publications-list').count())
    await page.waitForFunction(
      () => document.querySelectorAll('.t-pub').length === 12,
    );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((img) => img.decode().catch(() => {})),
    );
  });
  await page.mouse.move(-1, -1);
  if (await page.locator('#t-gate').count())
    await page.locator('#t-gate h2').click();
  await frames(page);
}

export async function frames(page, count = 3) {
  await page.evaluate(
    (count) =>
      new Promise((resolve) => {
        const tick = () => (count-- ? requestAnimationFrame(tick) : resolve());
        tick();
      }),
    count,
  );
}

export async function scrollIdle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        let last = '',
          stable = 0,
          limit = 300;
        const tick = () => {
          const current = `${scrollX}:${scrollY}`;
          stable = current === last ? stable + 1 : 0;
          last = current;
          if (stable >= 12) resolve();
          else if (!limit--) reject(new Error('Scroll did not settle'));
          else requestAnimationFrame(tick);
        };
        tick();
      }),
  );
}

export function pixelDifference(a, b) {
  const before = PNG.sync.read(a),
    after = PNG.sync.read(b);
  if (before.width !== after.width || before.height !== after.height)
    return {
      pixels: Infinity,
      before: [before.width, before.height],
      after: [after.width, after.height],
    };
  if (before.data.equals(after.data)) return { pixels: 0 };
  const diff = new PNG({ width: before.width, height: before.height });
  let pixels = 0;
  for (let i = 0; i < before.data.length; i += 4) {
    const differs =
      before.data[i] !== after.data[i] ||
      before.data[i + 1] !== after.data[i + 1] ||
      before.data[i + 2] !== after.data[i + 2] ||
      before.data[i + 3] !== after.data[i + 3];
    if (differs) pixels++;
    diff.data.set(
      differs
        ? [255, 0, 90, 255]
        : [after.data[i], after.data[i + 1], after.data[i + 2], 50],
      i,
    );
  }
  return { pixels, diff: PNG.sync.write(diff) };
}

export async function identical(a, b, name, testInfo) {
  const result = pixelDifference(a, b);
  if (result.pixels) {
    for (const [label, body] of [
      ['reference', a],
      ['candidate', b],
      ['diff', result.diff],
    ]) {
      if (body)
        await testInfo.attach(`${name}-${label}`, {
          body,
          contentType: 'image/png',
        });
    }
  }
  assert.equal(
    result.pixels,
    0,
    `${name}: ${JSON.stringify({ pixels: result.pixels, before: result.before, after: result.after })}`,
  );
}

export async function settleAnimations(page) {
  for (let round = 0; round < 4; round++) {
    await page.evaluate(() => {
      // Force style calculation before finishing pending CSS transitions.
      document.documentElement.getBoundingClientRect();
      for (const animation of document.getAnimations()) {
        if (Number.isFinite(animation.effect.getComputedTiming().endTime))
          animation.finish();
      }
    });
    await frames(page, 2);
  }
}

export async function capture(page, options = {}) {
  if (options.animations !== 'allow') await settleAnimations(page);
  await frames(page);
  const settings = {
    fullPage: true,
    animations: 'allow',
    caret: 'initial',
    scale: 'device',
    timeout: 15_000,
    ...options,
  };
  let previous = await page.screenshot(settings);
  for (let attempt = 0; attempt < 4; attempt++) {
    await frames(page, 2);
    const current = await page.screenshot(settings);
    if (pixelDifference(previous, current).pixels === 0) return current;
    previous = current;
  }
  throw new Error(
    'A single page did not produce two consecutive identical RGBA captures',
  );
}

export async function pair(browser, engine, theme, width, route, run) {
  const isolated = null;
  const contexts = await Promise.all(
    [browser, isolated || browser].map((instance) =>
      instance.newContext({
        viewport: { width, height: 890 },
        deviceScaleFactor: 1,
        colorScheme: theme,
        locale: 'en-US',
        timezoneId: 'America/Detroit',
      }),
    ),
  );
  try {
    await Promise.all(
      contexts.map((context) => prepare(context, engine, theme)),
    );
    const pages = await Promise.all(
      contexts.map((context) => context.newPage()),
    );
    const errors = [];
    pages.forEach((page) => {
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
    });
    await Promise.all(
      pages.map(async (page, index) => {
        await page.goto(
          `http://127.0.0.1:${Number(process.env.TEST_PORT || 4400) + (index && !process.env.AA ? 1 : 0)}${route}`,
          { waitUntil: 'networkidle' },
        );
        await ready(page);
      }),
    );
    const result = await run(pages);
    assert.deepEqual(errors, [], 'No console or runtime errors');
    return result;
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    await isolated?.close();
  }
}

// Timing is a definition contract. Transient animation-object counts depend on
// which short transitions have already ended and are not a user-facing state.
export async function motionDefinitions(page) {
  return page.evaluate(() => {
    const result = [];
    const visit = (rules, condition = '') => {
      for (const rule of rules) {
        if (/^@(?:-webkit-)?keyframes\b/.test(rule.cssText)) {
          result.push({ condition, keyframes: rule.cssText });
          continue;
        }
        if (rule.style) {
          const properties = {};
          for (const name of rule.style)
            if (/^(?:transition|animation)(?:-|$)/.test(name))
              properties[name] = rule.style.getPropertyValue(name);
          if (Object.keys(properties).length)
            result.push({ condition, selector: rule.selectorText, properties });
        }
        if (rule.cssRules)
          visit(rule.cssRules, condition + '/' + (rule.conditionText || ''));
      }
    };
    for (const sheet of document.styleSheets) {
      if (sheet.href && new URL(sheet.href).origin !== location.origin)
        continue;
      visit(sheet.cssRules);
    }
    return result;
  });
}
