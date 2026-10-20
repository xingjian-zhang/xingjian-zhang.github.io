import { test } from '@playwright/test';
import { pair, capture, identical } from './helpers.mjs';
const routes = ['/', '/pages/research.html', '/pages/experience.html', '/pages/projects.html', '/pages/misc.html', '/ai-coding-setup/'];
for (const route of routes) for (const width of [390, 607, 1440]) for (const theme of ['light', 'dark']) {
  test(`${route} ${width} ${theme}`, async ({ browser, browserName }, info) => {
    await pair(browser, browserName, theme, width, route, async pages => {
      const shots = await Promise.all(pages.map(page => capture(page)));
      await identical(shots[0], shots[1], 'page', info);
      // A/A must also be stable across repeated captures; never update the reference.
      if (process.env.AA) await identical(shots[0], await capture(pages[0]), 'repeat', info);
    });
  });
}
for (const width of [375, 460, 461, 820, 821]) for (const theme of ['light', 'dark']) {
  test(`home breakpoint ${width} ${theme}`, async ({ browser, browserName }, info) => {
    await pair(browser, browserName, theme, width, '/', async pages => {
      const shots = await Promise.all(pages.map(page => capture(page)));
      await identical(shots[0], shots[1], 'breakpoint', info);
    });
  });
}
