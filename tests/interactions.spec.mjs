import { test, expect } from '@playwright/test';
import { pair, capture, identical, frames, scrollIdle, ready } from './helpers.mjs';

for (const theme of ['light', 'dark']) {
  test(`home states ${theme}`, async ({ browser, browserName }, info) => {
    test.setTimeout(45_000);
    await pair(browser, browserName, theme, 1440, '/', async pages => {
      const compare = async name => {
        const shots = await Promise.all(pages.map(page => capture(page, { fullPage: false })));
        await identical(...shots, name, info);
      };
      await Promise.all(pages.map(page => page.locator('.intro-copy').hover({ position: { x: 30, y: 40 } })));
      await compare('bio-hover');
      await Promise.all(pages.map(page => page.mouse.move(-1, -1)));
      await Promise.all(pages.map(page => page.locator('.avatar-frame').focus()));
      await compare('portrait-keyboard-focus');
      await Promise.all(pages.map(page => page.evaluate(() => document.activeElement.blur())));
      await Promise.all(pages.map(page => page.locator('.news-archive > summary').click()));
      await compare('news-expanded');
      await Promise.all(pages.map(page => page.locator('.publications-archive > summary').click()));
      await compare('publications-expanded');
      for (const hash of ['contact', 'internships', 'publications']) {
        await Promise.all(pages.map(page => page.locator(`.t-nav a[href="/#${hash}"]`).click()));
        await Promise.all(pages.map(async page => { await page.mouse.move(-1, -1); await scrollIdle(page); }));
        await compare(`anchor-${hash}`);
      }
      await Promise.all(pages.map(page => page.locator('.theme-toggle').click()));
      await compare('theme-toggle');
      await Promise.all(pages.map(page => page.reload({ waitUntil: 'networkidle' })));
      for (const page of pages) expect(await page.locator('html').getAttribute('data-theme')).toBe(theme === 'light' ? 'dark' : 'light');
      await Promise.all(pages.map(async page => { await ready(page); await scrollIdle(page); }));
      await compare('theme-persisted');
    });
  });

  test(`research filters ${theme}`, async ({ browser, browserName }, info) => {
    await pair(browser, browserName, theme, 607, '/pages/research.html', async pages => {
      for (const kind of ['journal', 'conference', 'workshop', 'preprint', 'all']) {
        await Promise.all(pages.map(page => page.locator(`[data-filter="${kind}"]`).click()));
        const shots = await Promise.all(pages.map(page => capture(page)));
        await identical(...shots, `filter-${kind}`, info);
        const contracts = await Promise.all(pages.map(page => page.locator('#publications-list').evaluate(el => [...el.querySelectorAll('.t-pub')].map(row => ({ id: row.dataset.paper, kind: row.dataset.kind, links: [...row.querySelectorAll('a')].map(a => a.getAttribute('href')) })))));
        expect(contracts[0]).toEqual(contracts[1]);
      }
    });
  });

  test(`misc gate ${theme}`, async ({ browser, browserName }, info) => {
    await pair(browser, browserName, theme, 390, '/pages/misc.html', async pages => {
      for (const answer of ['41', '42']) {
        await Promise.all(pages.map(async page => {
          await page.locator('#answer-input').fill(answer);
          await page.locator('#gate-submit').click();
          if (answer === '42') {
            await expect(page.locator('#main-content')).toBeVisible();
            await page.waitForLoadState('networkidle');
            await page.evaluate(async () => {
              await document.fonts.ready;
              await Promise.all([...document.querySelectorAll('[style*="background-image"]')].map(async el => {
                const source = getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
                if (source) { const image = new Image(); image.src = source; await image.decode(); }
              }));
            });
          }
          else await page.locator('#t-gate h2').click();
          await page.mouse.move(-1, -1);
        }));
        const shots = await Promise.all(pages.map(page => capture(page)));
        await identical(...shots, `gate-${answer}`, info);
      }
    });
  });
}

test('reduced motion and default system theme', async ({ browser, browserName }, info) => {
  await pair(browser, browserName, 'dark', 1440, '/', async pages => {
    await Promise.all(pages.map(async page => {
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
      await page.evaluate(() => { localStorage.removeItem('site-theme'); });
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('.intro-copy').hover({ position: { x: 30, y: 40 } });
    }));
    await identical(...await Promise.all(pages.map(page => capture(page))), 'reduced-motion', info);
  });
});

for (const theme of ['light', 'dark']) for (const action of ['bio', 'profile', 'entity', 'navigation', 'news-open', 'news-close', 'theme']) {
  test(`motion ${action} ${theme}`, async ({ browser, browserName }, info) => {
    await pair(browser, browserName, theme, 1440, '/', async pages => {
      for (const page of pages) {
        // Allow initial perspective and layout transitions to settle before isolating motion.
        await page.waitForTimeout(700);
        await page.waitForTimeout(700);
        if (action === 'news-close') { await page.locator('.news-archive > summary').click(); await page.waitForTimeout(700); }
        if (action === 'entity') { await page.locator('.entity-link').filter({ hasText: 'Spark' }).scrollIntoViewIfNeeded(); await page.waitForTimeout(700); }
      }
      await Promise.all(pages.map(async page => {
        if (action === 'bio') await page.locator('.intro-copy').hover({ position: { x: 30, y: 40 } });
        if (action === 'profile') await page.locator('.profile-icon').first().hover({ position: { x: 14, y: 20 } });
        if (action === 'entity') await page.locator('.entity-link').filter({ hasText: 'Spark' }).hover();
        if (action === 'navigation') await page.locator('.t-nav a[href="/#internships"]').hover();
        if (action.startsWith('news-')) await page.locator('.news-archive > summary').click();
        if (action === 'theme') {
          await page.locator('.theme-toggle').click();
          await page.waitForFunction(theme => document.documentElement.dataset.theme !== theme, theme);
        }
        await frames(page, 2);
        await page.evaluate(async () => {
          window.__visualAnimations = document.getAnimations();
          for (const animation of window.__visualAnimations) { animation.pause(); animation.currentTime = 0; }
          // Include transitions created by deferred rAF handlers and view transitions.
          for (let count = 0; count < 4; count++) {
            await new Promise(resolve => requestAnimationFrame(resolve));
            for (const animation of document.getAnimations()) if (!window.__visualAnimations.includes(animation)) {
              window.__visualAnimations.push(animation); animation.pause(); animation.currentTime = 0;
            }
          }
        });
      }));
      for (const progress of [0, .25, .5, .75, 1]) {
        await Promise.all(pages.map(page => page.evaluate(progress => {
          for (const animation of window.__visualAnimations) {
            const timing = animation.effect.getComputedTiming();
            animation.currentTime = timing.delay + Number(timing.duration) * progress;
          }
        }, progress)));
        await Promise.all(pages.map(page => frames(page, 2)));
        const shots = await Promise.all(pages.map(page => capture(page, { animations: 'allow', fullPage: false })));
        if (process.env.DEBUG_MOTION) {
          const states = await Promise.all(pages.map(page => page.evaluate(() => window.__visualAnimations.map(a => ({ target: a.effect.target.className?.baseVal || a.effect.target.className, property: a.transitionProperty, name: a.animationName, time: a.currentTime, transform: getComputedStyle(a.effect.target).transform, timing: a.effect.getComputedTiming() })))));
          await info.attach(`${action}-${progress}-timings`, { body: JSON.stringify(states, null, 2), contentType: 'application/json' });
        }
        await identical(...shots, `${action}-${progress}`, info);
      }
    });
  });
}
