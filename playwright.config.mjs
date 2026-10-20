import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  timeout: 180_000,
  workers: 2,
  fullyParallel: true,
  retries: 0,
  outputDir: 'output/playwright',
  reporter: [['list'], ['json', { outputFile: process.env.REPORT || 'output/results.json' }]],
  use: { deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'America/Detroit', colorScheme: 'light', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: [
    { command: 'node scripts/serve.mjs .build/reference 4400', port: 4400, reuseExistingServer: false },
    { command: 'node scripts/serve.mjs _site 4401', port: 4401, reuseExistingServer: false },
  ],
});
