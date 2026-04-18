// Short venue label + kind for each bib entry.
// Kind drives the filter colors on the research page.
const VENUE_MAP = {
  ma2022fast:           { venue: 'WSDM',            kind: 'conference' },
  ma2022graph:          { venue: 'LoG',             kind: 'conference' },
  huang2023can:         { venue: 'TMLR',            kind: 'journal'    },
  zhangconditional:     { venue: 'ML4LR Workshop',  kind: 'workshop'   },
  huang2024dca:         { venue: 'KDD D&B',         kind: 'conference' },
  zhang2024massw:       { venue: 'NAACL',           kind: 'conference' },
  deng2024texttt:       { venue: 'NeurIPS D&B',     kind: 'conference' },
  zhang2024map2text:    { venue: 'KDD',             kind: 'conference' },
  zhang2024leveraging:  { venue: 'NeurIPS Workshop',kind: 'workshop'   },
  zhang2026thru:        { venue: 'TMLR',            kind: 'journal'    },
  zhang2025flyaoc:      { venue: 'arXiv',           kind: 'preprint'   },
  wang2025reasoning:    { venue: 'ACL',             kind: 'conference' },
};

async function loadPublications() {
  const container = document.getElementById('publications-list');
  if (!container) return;
  try {
    const response = await fetch('../assets/data/publications.bib');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bibText = await response.text();
    const pubs = parseBibtex(bibText).map(decoratePub);
    pubs.sort((a, b) => {
      if (b.year !== a.year) return Number(b.year) - Number(a.year);
      const ka = a.kindOrder, kb = b.kindOrder;
      return ka - kb;
    });
    window.__PUBS__ = pubs;
    renderPublications(pubs);
    wireFilterBar();
  } catch (err) {
    console.error('Error loading publications:', err);
    container.innerHTML =
      '<p style="color: var(--t-auburn); font-size: 12px;">// failed to load publications</p>';
  }
}

function parseBibtex(bibText) {
  const entries = [];
  const entryRegex = /@(\w+)\s*{\s*([^,]*),([^@]*)/g;
  const fieldRegex = /(\w+)\s*=\s*{([^}]*)}/g;
  let match;
  while ((match = entryRegex.exec(bibText)) !== null) {
    const [, type, citationKey, fieldsText] = match;
    const entry = { type, citationKey };
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(fieldsText)) !== null) {
      const [, field, value] = fieldMatch;
      entry[field.toLowerCase()] = value;
    }
    entries.push(entry);
  }
  return entries;
}

const KIND_ORDER = { journal: 0, conference: 1, workshop: 2, preprint: 3 };

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
  return { ...pub, kind, venue, kindOrder: KIND_ORDER[kind] ?? 99 };
}

function renderPublications(pubs) {
  const container = document.getElementById('publications-list');
  if (!container) return;
  if (pubs.length === 0) {
    container.innerHTML =
      '<div style="font-size:12px;color:var(--t-muted);padding:20px 0;">// no entries match this filter</div>';
    return;
  }
  container.innerHTML = pubs.map(renderRow).join('');
}

function renderRow(pub) {
  const links = [];
  if (pub.url) links.push(`<a href="${pub.url}" target="_blank" rel="noopener">paper</a>`);
  if (pub.code) links.push(`<a href="${pub.code}" target="_blank" rel="noopener">code</a>`);
  return `
    <div class="t-pub" data-kind="${pub.kind}">
      <div class="t-pub-year">${pub.year || ''}</div>
      <div class="t-pub-venue" data-kind="${pub.kind}">${escapeHtml(pub.venue)}</div>
      <div>
        <div class="t-pub-title">${escapeHtml(pub.title || '')}</div>
        <div class="t-pub-authors">${formatAuthors(pub.author || '')}</div>
        ${links.length ? `<div class="t-pub-links">${links.join('')}</div>` : ''}
      </div>
    </div>`;
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
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

function wireFilterBar() {
  const bar = document.querySelector('.t-filter');
  if (!bar || !window.__PUBS__) return;
  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (!btn) return;
    const kind = btn.dataset.filter;
    bar.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
    const filtered = kind === 'all' ? window.__PUBS__ : window.__PUBS__.filter((p) => p.kind === kind);
    renderPublications(filtered);
    updateFilterCounts(kind, filtered.length);
  });
}

function updateFilterCounts(activeKind, count) {
  const bar = document.querySelector('.t-filter');
  if (!bar) return;
  bar.querySelectorAll('button').forEach((b) => {
    const label = b.dataset.filter;
    b.textContent = label + (label === activeKind ? ` (${count})` : '');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadPublications();
});
