import { readFileSync } from 'node:fs';
const metadata = JSON.parse(
  readFileSync(new URL('./publication-meta.json', import.meta.url), 'utf8'),
);
const VENUE_MAP = metadata;
const PUB_TAGS = Object.fromEntries(
  Object.entries(metadata).map(([key, value]) => [key, value.tags]),
);
const KIND_ORDER = { journal: 0, conference: 1, workshop: 2, preprint: 3 };

function parseBibtex(bibText) {
  const entries = [];
  let i = 0;
  const fail = (message) => {
    throw new SyntaxError(`${message} at BibTeX offset ${i}`);
  };
  const skip = () => {
    while (i < bibText.length) {
      if (/[\s,]/.test(bibText[i])) i++;
      else if (bibText[i] === '%') {
        while (i < bibText.length && bibText[i] !== '\n') i++;
      } else break;
    }
  };
  const take = (regex) => {
    const match = regex.exec(bibText.slice(i));
    if (!match) fail('Unexpected token');
    i += match[0].length;
    return match;
  };
  while (true) {
    skip();
    if (i === bibText.length) break;
    const type = take(/^@(\w+)\s*\{\s*/)[1];
    const citationKey = take(/^([^,\s{}]+)\s*,/)[1];
    const entry = { type, citationKey };
    while (true) {
      skip();
      if (bibText[i] === '}') {
        i++;
        break;
      }
      if (i >= bibText.length) fail('Unterminated entry');
      const key = take(/^(\w+)\s*=\s*/)[1].toLowerCase();
      const opening = bibText[i];
      let value = '';
      if (opening === '{' || opening === '"') {
        i++;
        let depth = 1,
          closed = false;
        while (i < bibText.length) {
          const char = bibText[i++];
          if (char === '\\') {
            if (i === bibText.length) fail('Unterminated escape');
            value += char + bibText[i++];
            continue;
          }
          if (opening === '{') {
            if (char === '{') depth++;
            if (char === '}' && --depth === 0) {
              closed = true;
              break;
            }
          } else if (char === '"') {
            closed = true;
            break;
          }
          value += char;
        }
        if (!closed) fail('Unterminated field');
      } else value = take(/^(\d+)\s*/)[1];
      if (Object.hasOwn(entry, key)) fail(`Duplicate field ${key}`);
      entry[key] = value;
      skip();
      if (i >= bibText.length) fail('Unterminated entry');
      if (bibText[i] !== '}' && !/^\w+\s*=/.test(bibText.slice(i)))
        fail('Unsupported field expression');
    }
    entries.push(entry);
  }
  return entries;
}

function decoratePub(pub) {
  const known = VENUE_MAP[pub.citationKey];
  let kind, venue;
  if (known) {
    kind = known.kind;
    venue = known.venue;
  } else {
    // Fallback heuristic.
    const raw = (pub.booktitle || pub.journal || '').toLowerCase();
    if (raw.includes('arxiv') || raw.includes('preprint')) kind = 'preprint';
    else if (raw.includes('workshop')) kind = 'workshop';
    else if (pub.journal) kind = 'journal';
    else kind = 'conference';
    venue = pub.booktitle || pub.journal || '';
  }
  return {
    ...pub,
    kind,
    venue,
    tags: PUB_TAGS[pub.citationKey] || [],
    kindOrder: KIND_ORDER[kind] ?? 99,
  };
}

function renderRow(pub, isHome) {
  const paperLink = pub.url
    ? `<a class="paper-button" href="${escapeHtml(pub.url)}" target="_blank" rel="noopener" aria-label="Read paper: ${escapeHtml(pub.title || '')}"><i class="bi bi-file-earmark-text-fill" aria-hidden="true"></i></a>`
    : '';
  const codeLink = pub.code
    ? `<a class="paper-button" href="${escapeHtml(pub.code)}" target="_blank" rel="noopener" aria-label="View code: ${escapeHtml(pub.title || '')}"><i class="bi bi-github" aria-hidden="true"></i></a>`
    : '';
  const titleLinks =
    paperLink || codeLink
      ? `&nbsp;<span class="publication-actions">${paperLink}${codeLink}</span>`
      : '';
  return `
    <div class="t-pub" data-kind="${pub.kind}" data-paper="${escapeHtml(pub.citationKey)}">
      <div>
        <div class="t-pub-title">${escapeHtml(pub.title || '')}${titleLinks}</div>
        <div class="t-pub-authors">${formatAuthors(pub.author || '')}</div>
        <div class="t-pub-details">
          <div class="t-pub-meta">
            <span class="t-pub-venue">${escapeHtml(pub.venue)}</span>
            <span class="t-pub-year">${pub.year || ''}</span>
          </div>
          ${isHome ? '' : renderTags(pub.tags)}
        </div>
      </div>
    </div>`;
}

function renderTags(tags) {
  if (!tags || tags.length === 0) return '';
  return `<div class="task-tags" aria-label="Research topics">${tags
    .map((tag) => `<span class="task-tag">${escapeHtml(tag)}</span>`)
    .join('')}</div>`;
}

function formatAuthors(authors) {
  return authors
    .split(' and ')
    .map((author) => {
      const clean = author.replace(/\*/g, '').trim();
      const hasAsterisk = author.includes('*');
      if (/xingjian\s+zhang/i.test(clean)) {
        return `<span class="me">${escapeHtml(clean)}${hasAsterisk ? '*' : ''}</span>`;
      }
      return escapeHtml(clean) + (hasAsterisk ? '*' : '');
    })
    .join(', ');
}

function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );
}

export function publicationEntries(raw) {
  const pubs = parseBibtex(raw).map(decoratePub);
  if (!pubs.length) throw new Error('The bibliography is empty');
  const keys = new Set();
  for (const pub of pubs) {
    if (
      keys.has(pub.citationKey) ||
      !pub.title ||
      !pub.author ||
      !/^\d{4}$/.test(pub.year)
    )
      throw new Error('Invalid publication: ' + pub.citationKey);
    keys.add(pub.citationKey);
  }
  return pubs.sort(
    (a, b) => Number(b.year) - Number(a.year) || a.kindOrder - b.kindOrder,
  );
}

export function publicationHtml(pubs, home) {
  const recent = pubs
    .slice(0, 6)
    .map((pub) => renderRow(pub, home))
    .join('');
  const older = pubs
    .slice(6)
    .map((pub) => renderRow(pub, home))
    .join('');
  return (
    recent +
    (older
      ? `
    <details class="publications-archive">
      <summary>Show older publications</summary>
      ${older}
    </details>`
      : '')
  );
}

export { parseBibtex, formatAuthors, escapeHtml };
