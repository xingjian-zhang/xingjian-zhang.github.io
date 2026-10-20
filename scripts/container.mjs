import { spawnSync } from 'node:child_process';
const image =
  'mcr.microsoft.com/playwright:v1.57.0-noble@sha256:3bed4b1a12f2338642f3d8cba28e291deef3c66bd4a964bbeb3e57bbff511dbd';
const environment = {
  CI: '1',
  REPORT: 'output/linux/candidate.json',
  OUTPUT_DIR: 'output/linux/playwright',
  ...Object.fromEntries(
    [
      'AA',
      'REPORT',
      'OUTPUT_DIR',
      'PERF_REPORT',
      'VARIANTS',
      'CANDIDATE_ROOT',
      'TEST_PORT',
      'ROUNDS',
    ]
      .filter((key) => process.env[key])
      .map((key) => [key, process.env[key]]),
  ),
};
const args = [
  'run',
  '--rm',
  '--init',
  '--ipc=host',
  '--network=none',
  '--volume',
  `${process.cwd()}:/work`,
  '--workdir',
  '/work',
];
for (const [key, value] of Object.entries(environment))
  args.push('--env', `${key}=${value}`);
const command = process.argv.slice(2);
const result = spawnSync(
  'docker',
  [
    ...args,
    image,
    ...(command.length ? command : ['npx', 'playwright', 'test']),
  ],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
