import { defineConfig } from '@playwright/test';
const port = Number(process.env.TEST_PORT || 4400);
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.mjs',
  timeout: 180_000,
  workers: 1,
  fullyParallel: true,
  retries: 0,
  outputDir: process.env.OUTPUT_DIR || 'output/playwright',
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.REPORT || 'output/results.json' }],
  ],
  use: {
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'America/Detroit',
    colorScheme: 'light',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: [
    {
      command: `node scripts/serve.mjs .build/reference ${port}`,
      port,
      reuseExistingServer: false,
    },
    {
      command: `node scripts/serve.mjs ${process.env.CANDIDATE_ROOT || '_site'} ${port + 1}`,
      port: port + 1,
      reuseExistingServer: false,
    },
  ],
});
