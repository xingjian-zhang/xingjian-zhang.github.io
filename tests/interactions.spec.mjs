import { test, expect } from '@playwright/test';
import {
  prepare,
  ready,
  capture,
  identical,
  frames,
  scrollIdle,
  settleAnimations,
  motionDefinitions,
} from './helpers.mjs';

// Complete each trajectory in one foreground page. Switching tabs midway would
// inject blur/resize events and WebKit background-rAF throttling into the test.
async function compareRuns(
  browser,
  engine,
  theme,
  width,
  route,
  exercise,
  info,
) {
  const outcomes = [];
  for (let index = 0; index < 2; index++) {
    const context = await browser.newContext({
      viewport: { width, height: 890 },
      deviceScaleFactor: 1,
      colorScheme: theme,
      locale: 'en-US',
      timezoneId: 'America/Detroit',
    });
    try {
      await prepare(context, engine, theme);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      const port =
        Number(process.env.TEST_PORT || 4400) +
        (index && !process.env.AA ? 1 : 0);
      await page.goto(`http://127.0.0.1:${port}${route}`, {
        waitUntil: 'networkidle',
      });
      await ready(page);
      await settleAnimations(page);
      const shots = {},
        contracts = [];
      const snap = async (name, motion = false) => {
        shots[name] = await capture(page, {
          fullPage: route.includes('misc'),
          ...(motion ? { animations: 'allow' } : {}),
        });
      };
      await snap('initial');
      await exercise(page, snap, contracts);
      expect(errors).toEqual([]);
      outcomes.push({ shots, contracts });
    } finally {
      await context.close();
    }
  }
  expect(outcomes[0].contracts).toEqual(outcomes[1].contracts);
  expect(Object.keys(outcomes[0].shots)).toEqual(
    Object.keys(outcomes[1].shots),
  );
  for (const name of Object.keys(outcomes[0].shots))
    await identical(
      outcomes[0].shots[name],
      outcomes[1].shots[name],
      name,
      info,
    );
}
for (const theme of ['light', 'dark']) {
  test(`home states ${theme}`, async ({ browser, browserName }, info) => {
    await compareRuns(
      browser,
      browserName,
      theme,
      1440,
      '/',
      async (page, snap) => {
        await page.locator('.intro-copy').hover({ position: { x: 30, y: 40 } });
        await snap('bio-hover');
        await page.mouse.move(-1, -1);
        await page.locator('.avatar-frame').focus();
        await snap('portrait-keyboard-focus');
        await page.evaluate(() => document.activeElement.blur());
        await page.locator('.news-archive > summary').click();
        await snap('news-expanded');
        await page.locator('.publications-archive > summary').click();
        await snap('publications-expanded');
        for (const hash of ['contact', 'internships', 'publications']) {
          await page.locator(`.t-nav a[href="/#${hash}"]`).click();
          await page.mouse.move(-1, -1);
          await scrollIdle(page);
          await snap(`anchor-${hash}`);
        }
        await page.locator('.theme-toggle').click();
        await snap('theme-toggle');
        await page.reload({ waitUntil: 'networkidle' });
        await ready(page);
        await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
        await scrollIdle(page);
        expect(await page.locator('html').getAttribute('data-theme')).toBe(
          theme === 'light' ? 'dark' : 'light',
        );
        await snap('theme-persisted');
      },
      info,
    );
  });
  test(`research filters ${theme}`, async ({ browser, browserName }, info) => {
    await compareRuns(
      browser,
      browserName,
      theme,
      607,
      '/pages/research.html',
      async (page, snap, contracts) => {
        for (const kind of [
          'journal',
          'conference',
          'workshop',
          'preprint',
          'all',
        ]) {
          await page.locator(`[data-filter="${kind}"]`).click();
          await snap(`filter-${kind}`);
          contracts.push(
            await page.locator('#publications-list').evaluate((el) =>
              [...el.querySelectorAll('.t-pub')].map((row) => ({
                id: row.dataset.paper,
                kind: row.dataset.kind,
                links: [...row.querySelectorAll('a')].map((a) =>
                  a.getAttribute('href'),
                ),
              })),
            ),
          );
        }
      },
      info,
    );
  });
  test(`misc gate ${theme}`, async ({ browser, browserName }, info) => {
    await compareRuns(
      browser,
      browserName,
      theme,
      390,
      '/pages/misc.html',
      async (page, snap) => {
        // Decode the hidden gallery before opening it, avoiding Chromium's
        // timing-dependent low-resolution JPEG decode cache at rounded edges.
        await page.evaluate(async () => {
          await Promise.all(
            [...document.querySelectorAll('[style*="background-image"]')].map(
              async (el) => {
                const source = el.style.backgroundImage.match(
                  /url\(["']?(.*?)["']?\)/,
                )?.[1];
                if (source) {
                  const image = new Image();
                  image.src = source;
                  await image.decode();
                }
              },
            ),
          );
        });
        for (const answer of ['41', '42']) {
          await page.locator('#answer-input').fill(answer);
          await page.locator('#gate-submit').click();
          if (answer === '42') {
            await expect(page.locator('#main-content')).toBeVisible();
            await page.waitForLoadState('networkidle');
            await page.evaluate(async () => {
              await document.fonts.ready;
              await Promise.all(
                [
                  ...document.querySelectorAll('[style*="background-image"]'),
                ].map(async (el) => {
                  const source = getComputedStyle(el).backgroundImage.match(
                    /url\(["']?(.*?)["']?\)/,
                  )?.[1];
                  if (source) {
                    const image = new Image();
                    image.src = source;
                    await image.decode();
                  }
                }),
              );
            });
          } else await page.locator('#t-gate h2').click();
          await page.mouse.move(-1, -1);
          await snap(`gate-${answer}`);
        }
      },
      info,
    );
  });
}
test('reduced motion and default system theme', async ({
  browser,
  browserName,
}, info) => {
  await compareRuns(
    browser,
    browserName,
    'dark',
    1440,
    '/',
    async (page, snap) => {
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
      await page.evaluate(() => localStorage.removeItem('site-theme'));
      await page.reload({ waitUntil: 'networkidle' });
      await ready(page);
      expect(await page.locator('html').getAttribute('data-theme')).toBe(
        'dark',
      );
      await page.emulateMedia({ colorScheme: 'light' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.locator('.intro-copy').hover({ position: { x: 30, y: 40 } });
      await snap('reduced-motion');
    },
    info,
  );
});
for (const theme of ['light', 'dark'])
  for (const action of [
    'bio',
    'profile',
    'entity',
    'navigation',
    'news-open',
    'news-close',
    'publications-open',
    'publications-close',
    'theme',
  ]) {
    test(`motion ${action} ${theme}`, async ({
      browser,
      browserName,
    }, info) => {
      await compareRuns(
        browser,
        browserName,
        theme,
        1440,
        '/',
        async (page, snap, contracts) => {
          const disclosure = action.startsWith('publications-')
            ? '.publications-archive'
            : '.news-archive';
          const isDisclosure =
            action.startsWith('news-') || action.startsWith('publications-');
          if (action.startsWith('publications-')) {
            await page
              .locator(disclosure + ' > summary')
              .evaluate((el) =>
                el.scrollIntoView({ block: 'center', behavior: 'instant' }),
              );
            await scrollIdle(page);
          }
          if (isDisclosure && action.endsWith('-close')) {
            await page.locator(disclosure + ' > summary').click();
            await settleAnimations(page);
          }
          if (action === 'entity') {
            await page
              .locator('.entity-link')
              .filter({ hasText: 'Spark' })
              .scrollIntoViewIfNeeded();
            await scrollIdle(page);
          }
          await snap('before-action');
          if (action === 'bio')
            await page
              .locator('.intro-copy')
              .hover({ position: { x: 30, y: 40 } });
          if (action === 'profile')
            await page
              .locator('.profile-icon')
              .first()
              .hover({ position: { x: 14, y: 20 } });
          if (action === 'entity')
            await page
              .locator('.entity-link')
              .filter({ hasText: 'Spark' })
              .hover();
          if (action === 'navigation')
            await page.locator('.t-nav a[href="/#internships"]').hover();
          if (isDisclosure)
            await page.locator(disclosure + ' > summary').click();
          if (action === 'theme') {
            await page.locator('.theme-toggle').click();
            await page.waitForFunction(
              (theme) => document.documentElement.dataset.theme !== theme,
              theme,
            );
          }
          await frames(page, 2);
          await page.evaluate(async () => {
            window.__visualAnimations = [];
            for (let count = 0; count < 5; count++) {
              for (const animation of document.getAnimations())
                if (!window.__visualAnimations.includes(animation)) {
                  window.__visualAnimations.push(animation);
                  animation.pause();
                  animation.currentTime = 0;
                }
              await new Promise((resolve) => requestAnimationFrame(resolve));
            }
          });
          contracts.push(await motionDefinitions(page));
          expect(
            await page.evaluate(() => window.__visualAnimations.length),
          ).toBeGreaterThan(0);
          if (isDisclosure) {
            const timing = await page.evaluate((selector) => {
              const animation = window.__visualAnimations.find(
                (a) =>
                  a.effect.target?.matches?.(selector) &&
                  !a.transitionProperty &&
                  !a.animationName,
              );
              return animation?.effect.getTiming();
            }, disclosure);
            expect(timing).toBeDefined();
            contracts.push(timing);
          }
          for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
            await page.evaluate((progress) => {
              for (const a of window.__visualAnimations) {
                const t = a.effect.getComputedTiming();
                if (progress === 1) a.finish();
                else a.currentTime = t.delay + Number(t.duration) * progress;
              }
            }, progress);
            await frames(page, 2);
            await snap(`${action}-${progress}`, true);
          }
        },
        info,
      );
    });
  }
