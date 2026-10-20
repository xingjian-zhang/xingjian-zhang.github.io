import { reference } from './reference.mjs';
import { build } from './build.mjs';
await reference();
for (const [name, publications, fonts] of [
  ['components', false, false],
  ['publications', true, false],
  ['fonts', true, true],
]) {
  await build({
    source: '.build/reference-source',
    destination: `.build/${name}`,
    stage: `.build/${name}-source`,
    components: true,
    publications,
    fonts,
  });
}
