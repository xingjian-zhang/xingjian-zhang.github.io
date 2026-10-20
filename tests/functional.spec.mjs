import { test, expect } from '@playwright/test';
import { prepare, ready, scrollIdle } from './helpers.mjs';

const origin = `http://127.0.0.1:${Number(process.env.TEST_PORT || 4400) + 1}`;

for (const width of [390, 1440]) {
  test(`home controls and layout at ${width}px`, async ({
    page,
    context,
    browserName,
  }) => {
    await page.setViewportSize({ width, height: 890 });
    await prepare(context, browserName, 'light');
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin + '/');
    await ready(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

    if (width > 820) {
      await page.locator('.intro-copy').hover({ position: { x: 30, y: 40 } });
      await expect(page.locator('.intro')).toHaveClass(/is-tilted/);
      await expect(page.locator('.avatar-photo')).toHaveCSS('opacity', '1');
      await expect(page.locator('#intro-title span')).toHaveCSS('opacity', '1');
      await expect(page.locator('.cat-annotation')).toHaveCSS('opacity', '1');
      const icon = page.locator('.profile-icon').first();
      await icon.hover({ position: { x: 5, y: 8 } });
      await expect
        .poll(() =>
          icon.evaluate(
            (el) => parseFloat(el.style.getPropertyValue('--mag-x')) || 0,
          ),
        )
        .toBeLessThan(-0.5);
      await page.mouse.move(-1, -1);
      await expect(page.locator('.intro')).not.toHaveClass(/is-tilted/);
      await expect
        .poll(() => icon.evaluate((el) => el.style.getPropertyValue('--mag-x')))
        .toBe('');
    }

    for (const selector of ['.news-archive', '.publications-archive']) {
      const details = page.locator(selector);
      await details.locator('summary').click();
      await expect(details).toHaveAttribute('open', '');
      await expect
        .poll(() => details.evaluate((el) => el.style.overflow))
        .toBe('');
      await details.locator('summary').click();
      await expect(details).not.toHaveAttribute('open');
    }
    await page.locator('.t-nav a[href="/#publications"]').click();
    await scrollIdle(page);
    await expect(page).toHaveURL(/#publications$/);
    expect(
      (await page.locator('.t-top').boundingBox()).y,
    ).toBeGreaterThanOrEqual(0);
    expect((await page.locator('.t-top').boundingBox()).y).toBeLessThan(2);

    await page.locator('.theme-toggle').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await ready(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.theme-toggle')).toHaveAttribute(
      'aria-label',
      'Switch to light mode',
    );
    expect(errors).toEqual([]);
  });
}

test('system theme and reduced-motion preference remain supported', async ({
  page,
  context,
  browserName,
}) => {
  await page.setViewportSize({ width: 1440, height: 890 });
  await prepare(context, browserName, 'light');
  await page.goto(origin + '/');
  await ready(page);
  await page.evaluate(() => localStorage.removeItem('site-theme'));
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.reload();
  await ready(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const icon = page.locator('.profile-icon').first();
  await icon.hover({ position: { x: 5, y: 8 } });
  expect(
    await icon.evaluate((el) => el.style.getPropertyValue('--mag-x')),
  ).toBe('');
  expect(
    await icon.locator('i').evaluate((el) => getComputedStyle(el).transform),
  ).toBe('none');
});

test('research filters keep counts, order, and archive contents', async ({
  page,
  context,
  browserName,
}) => {
  await prepare(context, browserName, 'light');
  await page.goto(origin + '/pages/research.html');
  await ready(page);
  const original = await page
    .locator('.t-pub')
    .evaluateAll((rows) =>
      rows.map((row) => ({ key: row.dataset.paper, kind: row.dataset.kind })),
    );
  for (const kind of ['journal', 'conference', 'workshop', 'preprint', 'all']) {
    const button = page.locator(`[data-filter="${kind}"]`);
    await button.click();
    const expected = original
      .filter((row) => kind === 'all' || row.kind === kind)
      .map((row) => row.key);
    expect(
      await page
        .locator('.t-pub')
        .evaluateAll((rows) => rows.map((row) => row.dataset.paper)),
    ).toEqual(expected);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toHaveText(`${kind} (${expected.length})`);
    if (expected.length > 6) {
      const archive = page.locator('.publications-archive');
      await expect(archive.locator('.t-pub')).toHaveCount(expected.length - 6);
      await archive.locator('summary').click();
      await expect(archive.locator('.t-pub').first()).toBeVisible();
    }
  }
});

test('misc gate rejects a wrong answer and reveals the gallery for 42', async ({
  page,
  context,
  browserName,
}) => {
  await prepare(context, browserName, 'light');
  await page.goto(origin + '/pages/misc.html');
  await ready(page);
  await page.locator('#answer-input').fill('41');
  await page.locator('#gate-submit').click();
  await expect(page.locator('#main-content')).toBeHidden();
  await page.locator('#answer-input').fill('42');
  await page.locator('#gate-submit').click();
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(page.locator('#t-gate')).toBeHidden();
  expect(await page.locator('.t-tile').count()).toBeGreaterThan(0);
});
