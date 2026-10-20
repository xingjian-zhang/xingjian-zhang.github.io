import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  publicationEntries,
  publicationHtml,
  formatAuthors,
  escapeHtml,
  parseBibtex,
} from '../scripts/lib/publications.mjs';
test('actual bibliography keeps the established stable ordering and all links', async () => {
  const pubs = publicationEntries(
    await readFile('assets/data/publications.bib', 'utf8'),
  );
  assert.equal(pubs.length, 12);
  assert.deepEqual(
    pubs.slice(0, 3).map((p) => p.citationKey),
    ['zhang2026thru', 'zhang2025flyaoc', 'wang2025reasoning'],
  );
  assert.equal(
    (publicationHtml(pubs, true).match(/data-paper=/g) || []).length,
    12,
  );
  assert.ok(!publicationHtml(pubs, true).includes('Research topics'));
  assert.ok(publicationHtml(pubs, false).includes('Research topics'));
});
test('escaping keeps author identity, equal contribution, and unsafe markup separate', () => {
  assert.equal(
    escapeHtml('<a title="x">&'),
    '&lt;a title=&quot;x&quot;&gt;&amp;',
  );
  assert.equal(
    formatAuthors('Xingjian Zhang* and <Other>'),
    '<span class="me">Xingjian Zhang*</span>, &lt;Other&gt;',
  );
});
test('parser preserves nested braces, quoted strings, escaped quotes, and numeric years', () => {
  const [entry] = parseBibtex(
    String.raw`% ignored
@article{example, title={An {LLM} result}, author="A \\"quoted\\" author", year=2026}`.replaceAll(
      '\\\\',
      '\\',
    ),
  );
  assert.equal(entry.title, 'An {LLM} result');
  assert.equal(entry.author, String.raw`A \"quoted\" author`);
  assert.equal(entry.year, '2026');
});
test('bad input stops a build instead of silently publishing incomplete data', () => {
  assert.throws(() => parseBibtex('@article{x,title={broken}'), /Unterminated/);
  assert.throws(
    () => parseBibtex('@article{x,title={a},title={b}}'),
    /Duplicate/,
  );
  assert.throws(() => publicationEntries(''), /empty/);
});
