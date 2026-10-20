import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
export const baseline = '78a774c0b354d0f9039057db1f04e0b366d69e3f';
export async function reference() {
  await rm('.build/reference-source', { recursive: true, force: true });
  await mkdir('.build/reference-source', { recursive: true });
  const archive = spawnSync('git', ['archive', baseline], {
    maxBuffer: 32 * 1024 * 1024,
  });
  if (archive.status !== 0) throw new Error(archive.stderr.toString());
  const extract = spawnSync('tar', ['-x', '-C', '.build/reference-source'], {
    input: archive.stdout,
  });
  if (extract.status !== 0) throw new Error(extract.stderr.toString());
  const result = spawnSync(
    'bundle',
    [
      'exec',
      'jekyll',
      'build',
      '--source',
      '.build/reference-source',
      '--destination',
      '.build/reference',
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) throw new Error('Reference build failed');
}
if (process.argv[1] === new URL(import.meta.url).pathname) await reference();
