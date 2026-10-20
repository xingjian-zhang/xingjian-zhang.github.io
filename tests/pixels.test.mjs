import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { pixelDifference } from './helpers.mjs';
const image = (rgba, width = 1) =>
  PNG.sync.write({ width, height: 1, data: Buffer.from(rgba) });
test('RGBA comparison accepts identical decoded pixels', () => {
  assert.equal(
    pixelDifference(image([1, 2, 3, 255]), image([1, 2, 3, 255])).pixels,
    0,
  );
});
test('one-channel and alpha differences are never treated as antialiasing tolerance', () => {
  assert.equal(
    pixelDifference(image([1, 2, 3, 255]), image([1, 2, 4, 255])).pixels,
    1,
  );
  assert.equal(
    pixelDifference(image([1, 2, 3, 255]), image([1, 2, 3, 254])).pixels,
    1,
  );
  assert.equal(
    pixelDifference(
      image([1, 2, 3, 255]),
      image([1, 2, 3, 255, 1, 2, 3, 255], 2),
    ).pixels,
    Infinity,
  );
});
