import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { baseline } from './reference.mjs';
import { benchmarkOrigin } from './lib/benchmark-origin.mjs';
const variants = process.env.VARIANTS
  ? JSON.parse(process.env.VARIANTS)
  : { reference: '.build/reference', candidate: '_site' };
const startedAt = new Date().toISOString();
const rounds = Number(process.env.ROUNDS || 7),
  results = [];
if (!Number.isInteger(rounds) || rounds < 1)
  throw new Error('ROUNDS must be a positive integer');
if (!Object.keys(variants).length)
  throw new Error('VARIANTS must not be empty');
const origin = await benchmarkOrigin(),
  browser = await chromium.launch();
try {
  for (let round = 0; round < rounds; round++) {
    const names = Object.keys(variants);
    if (round % 2) names.reverse();
    for (const variant of names) {
      origin.select(variants[variant]);
      const context = await browser.newContext({
        viewport: { width: 1440, height: 890 },
        deviceScaleFactor: 1,
        colorScheme: 'light',
        serviceWorkers: 'block',
      });
      try {
        const page = await context.newPage(),
          cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 150,
          downloadThroughput: 200000,
          uploadThroughput: 93750,
        });
        await cdp.send('Performance.enable');
        const requests = new Map(),
          errors = [];
        let transferred = 0,
          runtimeDataRequests = 0,
          jsBytes = 0;
        cdp.on('Network.requestWillBeSent', (event) => {
          const url = new URL(event.request.url);
          if (url.pathname === '/__analytics') return;
          requests.set(event.requestId, { url, type: event.type });
          if (
            /^\/components\/|^\/assets\/data\/publications\.bib$/.test(
              url.pathname,
            )
          )
            runtimeDataRequests++;
        });
        cdp.on('Network.loadingFinished', (event) => {
          if (requests.has(event.requestId))
            transferred += event.encodedDataLength;
        });
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        const responseTasks = [];
        page.on('response', (response) => {
          if (new URL(response.url()).pathname.startsWith('/assets/js/'))
            responseTasks.push(
              response.body().then((body) => {
                jsBytes += body.length;
              }),
            );
        });
        await context.route('https://**/*', (route) => {
          errors.push(`Unexpected external request: ${route.request().url()}`);
          return route.abort();
        });
        await context.addInitScript(() => {
          localStorage.clear();
          window.__metrics = { fcp: null, lcp: null, cls: 0 };
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              if (entry.name === 'first-contentful-paint')
                window.__metrics.fcp = entry.startTime;
          }).observe({ type: 'paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              window.__metrics.lcp = entry.startTime;
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries())
              if (!entry.hadRecentInput) window.__metrics.cls += entry.value;
          }).observe({ type: 'layout-shift', buffered: true });
        });
        await page.goto(origin.url + '/', { waitUntil: 'networkidle' });
        await page.waitForFunction(
          () =>
            document.querySelectorAll('.t-pub').length === 12 &&
            document.fonts.status === 'loaded',
        );
        await page.waitForTimeout(750);
        await Promise.all(responseTasks);
        if (errors.length) throw new Error(errors.join('\n'));
        const metrics = await page.evaluate(() => window.__metrics),
          cpu = await cdp.send('Performance.getMetrics');
        const scriptMs =
          cpu.metrics.find((metric) => metric.name === 'ScriptDuration').value *
          1000;
        const inlineScripts = await page.evaluate(() =>
          [...document.scripts]
            .filter(
              (script) =>
                !script.src &&
                (!script.type ||
                  /^(?:text|application)\/javascript$/.test(script.type)),
            )
            .map((script) => script.textContent),
        );
        const inlineJsBytes = inlineScripts.reduce(
          (sum, text) => sum + Buffer.byteLength(text),
          0,
        );
        const totalJsBytes = jsBytes + inlineJsBytes;
        const sample = {
          round: round + 1,
          variant,
          requests: requests.size,
          transferred,
          jsBytes,
          inlineJsBytes,
          totalJsBytes,
          runtimeDataRequests,
          ...metrics,
          scriptMs,
        };
        if (sample.fcp === null || sample.lcp === null)
          throw new Error('Missing paint metrics');
        results.push(sample);
        console.log(JSON.stringify(sample));
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await origin.close();
}
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const summary = Object.fromEntries(
  Object.keys(variants).map((name) => [
    name,
    Object.fromEntries(
      [
        'requests',
        'transferred',
        'jsBytes',
        'inlineJsBytes',
        'totalJsBytes',
        'runtimeDataRequests',
        'fcp',
        'lcp',
        'cls',
        'scriptMs',
      ].map((key) => {
        const values = results
            .filter((result) => result.variant === name)
            .map((result) => result[key]),
          middle = median(values);
        return [
          key,
          {
            median: middle,
            min: Math.min(...values),
            max: Math.max(...values),
            mad: median(values.map((value) => Math.abs(value - middle))),
          },
        ];
      }),
    ),
  ]),
);
const regressions = [];
if (summary.reference && summary.candidate)
  for (const key of ['fcp', 'lcp', 'cls', 'scriptMs']) {
    const old = summary.reference[key],
      next = summary.candidate[key];
    const paired = Array.from(
      { length: rounds },
      (_, round) =>
        results.find((r) => r.round === round + 1 && r.variant === 'candidate')[
          key
        ] -
        results.find((r) => r.round === round + 1 && r.variant === 'reference')[
          key
        ],
    );
    if (
      rounds >= 3 &&
      paired.filter((delta) => delta > 0).length >= rounds - 1 &&
      median(paired) > 2 * (old.mad + next.mad)
    )
      regressions.push(key);
  }
await mkdir('output', { recursive: true });
const report = {
  baseline,
  startedAt,
  finishedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    browser: browser.version(),
    platform: process.platform,
    arch: process.arch,
    cpuThrottle: 4,
    latencyMs: 150,
    downloadBytesPerSecond: 200000,
    uploadBytesPerSecond: 93750,
    rounds,
    cache: 'new context, cache disabled, no-store responses per run',
    analytics: 'local empty response excluded from counts',
    delivery:
      'real HTTP/gzip mirror with CDP throttling; exact font bytes; external font URLs mirrored to the same controlled origin; excludes live CDN, DNS and TLS variability',
    transferMetric:
      'Network.loadingFinished.encodedDataLength including response headers',
    jsMetric:
      'jsBytes = decoded first-party external scripts; inlineJsBytes = executed inline script source; totalJsBytes = both, excluding test/third-party scripts',
  },
  summary,
  regressions,
  samples: results,
};
await writeFile(
  process.env.PERF_REPORT || 'output/performance.json',
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(summary, null, 2));
if (
  summary.reference &&
  summary.candidate &&
  summary.candidate.totalJsBytes.median >
    summary.reference.totalJsBytes.median * 0.5
)
  throw new Error('First-party runtime JS reduction below 50%');
if (summary.candidate?.runtimeDataRequests.median)
  throw new Error('Runtime data/component requests remain');
if (regressions.length)
  throw new Error(
    `Repeatable regressions beyond measured noise: ${regressions.join(', ')}`,
  );
