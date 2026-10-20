import { test, expect } from '@playwright/test';
import { pair } from './helpers.mjs';
for (const route of [
  '/',
  '/pages/research.html',
  '/pages/experience.html',
  '/pages/projects.html',
  '/pages/misc.html',
  '/ai-coding-setup/',
]) {
  test(`content and links ${route}`, async ({ browser, browserName }) => {
    await pair(browser, browserName, 'light', 1440, route, async (pages) => {
      const contracts = await Promise.all(
        pages.map((page) =>
          page.evaluate(() => ({
            title: document.title,
            links: [...document.querySelectorAll('body a')].map((a) => ({
              href: a.getAttribute('href'),
              text: a.textContent.trim(),
              target: a.getAttribute('target'),
              rel: a.getAttribute('rel'),
              label: a.getAttribute('aria-label'),
            })),
            images: [...document.images].map((image) => ({
              src: image.getAttribute('src'),
              alt: image.alt,
              width: image.getAttribute('width'),
              height: image.getAttribute('height'),
            })),
            headings: [...document.querySelectorAll('h1,h2,h3')].map((h) =>
              h.textContent.trim(),
            ),
            analytics: (window.dataLayer || [])
              .filter((item) => item[0] === 'config')
              .map((item) => Array.from(item)),
          })),
        ),
      );
      expect(contracts[0]).toEqual(contracts[1]);
      expect(contracts[1].analytics).toEqual([['config', 'G-SRQFEQD9S4']]);
    });
  });
}
