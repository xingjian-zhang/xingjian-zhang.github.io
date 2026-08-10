// Short venue label + kind for each bib entry.
// Kind drives the filter colors on the research page.
const VENUE_MAP = {
  ma2022fast:           { venue: 'WSDM',            kind: 'conference' },
  ma2022graph:          { venue: 'LoG',             kind: 'conference' },
  huang2023can:         { venue: 'TMLR',            kind: 'journal'    },
  zhangconditional:     { venue: 'ICLR',            kind: 'workshop'   },
  huang2024dca:         { venue: 'KDD',             kind: 'conference' },
  zhang2024massw:       { venue: 'NAACL',           kind: 'conference' },
  deng2024texttt:       { venue: 'NeurIPS',         kind: 'conference' },
  zhang2024map2text:    { venue: 'KDD',             kind: 'conference' },
  zhang2024leveraging:  { venue: 'NeurIPS',         kind: 'workshop'   },
  zhang2026thru:        { venue: 'TMLR',            kind: 'journal'    },
  zhang2025flyaoc:      { venue: 'arXiv',           kind: 'preprint'   },
  wang2025reasoning:    { venue: 'ACL',             kind: 'conference' },
};

const PUB_TAGS = {
  ma2022fast:          ['Ranking', 'Network Modeling'],
  ma2022graph:         ['Graph', 'Benchmark'],
  huang2023can:        ['Graph', 'Reasoning'],
  zhangconditional:    ['Post-Training', 'Efficient Training'],
  huang2024dca:        ['Agentic', 'Benchmark'],
  zhang2024massw:      ['AI4Science', 'Benchmark'],
  deng2024texttt:      ['Data Attribution', 'ML Systems'],
  zhang2024map2text:   ['AI4Science', 'Visualization'],
  zhang2024leveraging: ['Causal Inference', 'LLM'],
  zhang2026thru:       ['LLM-as-a-Judge', 'Reasoning'],
  zhang2025flyaoc:     ['Agentic', 'AI4Science', 'Benchmark'],
  wang2025reasoning:   ['Reasoning', 'Benchmark'],
};

// Direct file previews cannot fetch the BibTeX file because of browser CORS rules.
// Keep the render-critical fields here as a local fallback; HTTP previews still use BibTeX.
const LOCAL_PUBLICATIONS = [
  {
    citationKey: 'ma2022fast',
    title: 'Fast learning of MNL model from general partial rankings with application to network formation modeling',
    author: 'Jiaqi Ma* and Xingjian Zhang* and Qiaozhu Mei',
    year: '2022',
    url: 'https://dl.acm.org/doi/abs/10.1145/3488560.3498506',
    code: 'https://github.com/xingjian-zhang/Fast-Partial-Ranking-MNL',
  },
  {
    citationKey: 'ma2022graph',
    title: 'Graph learning indexer: A contributor-friendly and metadata-rich platform for graph learning benchmarks',
    author: 'Jiaqi Ma* and Xingjian Zhang* and Hezheng Fan and Jin Huang and Tianyue Li and Ting Wei Li and Yiwen Tu and Chenshu Zhu and Qiaozhu Mei',
    year: '2022',
    url: 'https://arxiv.org/pdf/2112.15575.pdf',
    code: 'https://github.com/Graph-Learning-Benchmarks/gli',
  },
  {
    citationKey: 'huang2023can',
    title: 'Can LLMs effectively leverage graph structural information: when and why',
    author: 'Jin Huang and Xingjian Zhang and Qiaozhu Mei and Jiaqi Ma',
    year: '2024',
    url: 'https://arxiv.org/pdf/2309.16595.pdf',
    code: 'https://github.com/TRAIS-Lab/LLM-Structured-Data',
  },
  {
    citationKey: 'zhangconditional',
    title: 'Conditional Transformer Fine-Tuning by Adaptive Layer Skipping',
    author: 'Xingjian Zhang and Jiaxi Tang and Yang Liu and Xinyang Yi and Li Wei and Lichan Hong and Qiaozhu Mei and Ed H Chi',
    year: '2024',
    url: 'https://openreview.net/forum?id=Rd0lJC3c9a',
  },
  {
    citationKey: 'huang2024dca',
    title: 'DCA-Bench: A Benchmark for Dataset Curation Agents',
    author: 'Benhao Huang and Yingzhuo Yu and Jin Huang and Xingjian Zhang and Jiaqi Ma',
    year: '2025',
    url: 'https://arxiv.org/abs/2406.07275',
    code: 'https://github.com/TRAIS-Lab/dca-bench',
  },
  {
    citationKey: 'zhang2024massw',
    title: 'MASSW: A New Dataset and Benchmark Tasks for AI-Assisted Scientific Workflows',
    author: 'Xingjian Zhang* and Yutong Xie* and Jin Huang and Jinge Ma and Zhaoying Pan and Qijia Liu and Ziyang Xiong and Tolga Ergen and Dongsub Shim and Honglak Lee and others',
    year: '2025',
    url: 'https://arxiv.org/abs/2406.06357',
    code: 'https://github.com/xingjian-zhang/massw',
  },
  {
    citationKey: 'deng2024texttt',
    title: 'dattri: A Library for Efficient Data Attribution',
    author: 'Junwei Deng and Ting-Wei Li and Shiyuan Zhang and Shixuan Liu and Yijun Pan and Hao Huang and Xinhe Wang and Pingbang Hu and Xingjian Zhang and Jiaqi W Ma',
    year: '2024',
    url: 'https://neurips.cc/virtual/2024/poster/97763',
    code: 'https://github.com/TRAIS-Lab/dattri',
  },
  {
    citationKey: 'zhang2024map2text',
    title: 'MapExplorer: New Content Generation from Low-Dimensional Visualizations',
    author: 'Xingjian Zhang and Ziyang Xiong and Shixuan Liu and Yutong Xie and Tolga Ergen and Dongsub Shim and Hua Xu and Honglak Lee and Qiaozhu Mei',
    year: '2025',
    url: 'https://arxiv.org/abs/2412.18673',
    code: 'https://github.com/xingjian-zhang/map2text',
  },
  {
    citationKey: 'zhang2024leveraging',
    title: 'Leveraging LLM-Generated Structural Prior for Causal Inference with Concurrent Causes',
    author: 'Xingjian Zhang and Shixuan Liu and Yixin Wang and Qiaozhu Mei',
    year: '2024',
    url: 'https://openreview.net/forum?id=AqRQvOINf8',
  },
  {
    citationKey: 'zhang2026thru',
    title: "Through the Judge's Eyes: Inferred Thinking Traces Improve Reliability of LLM Raters",
    author: 'Xingjian Zhang and Tianhong Gao and Suliang Jin and Tianhao Wang and Teng Ye and Eytan Adar and Qiaozhu Mei',
    year: '2026',
    url: 'https://openreview.net/forum?id=1jLQ629Yps',
    code: 'https://github.com/xingjian-zhang/thru_judge_eye',
  },
  {
    citationKey: 'zhang2025flyaoc',
    title: 'FlyAOC: Evaluating Agentic Ontology Curation of Drosophila Scientific Knowledge Bases',
    author: 'Xingjian Zhang and Sophia Moylan and Ziyang Xiong and Qiaozhu Mei and Yichen Luo and Jiaqi W. Ma',
    year: '2026',
    url: 'https://arxiv.org/abs/2602.09163',
    code: 'https://github.com/xingjian-zhang/FlyAOC',
  },
  {
    citationKey: 'wang2025reasoning',
    title: 'Your Reasoning Benchmark May Not Test Reasoning: Revealing Perception Bottleneck in Abstract Reasoning Benchmarks',
    author: 'Xinhe Wang and Jin Huang and Xingjian Zhang and Tianhao Wang and Jiaqi W. Ma',
    year: '2026',
    url: 'https://arxiv.org/abs/2512.21329',
  },
];

async function loadPublications() {
  const container = document.getElementById('publications-list');
  if (!container) return;
  try {
    const rawPubs = await getPublicationEntries();
    const pubs = rawPubs.map(decoratePub);
    pubs.sort((a, b) => {
      if (b.year !== a.year) return Number(b.year) - Number(a.year);
      const ka = a.kindOrder, kb = b.kindOrder;
      return ka - kb;
    });
    window.__PUBS__ = pubs;
    renderPublications(pubs);
    wireFilterBar();
    restoreHashPosition();
  } catch (err) {
    console.error('Error loading publications:', err);
    container.innerHTML =
      '<p style="color: var(--t-auburn); font-size: 12px;">// failed to load publications</p>';
  }
}

async function getPublicationEntries() {
  if (window.location.protocol === 'file:') return LOCAL_PUBLICATIONS;
  const response = await fetch('/assets/data/publications.bib');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return parseBibtex(await response.text());
}

function restoreHashPosition() {
  if (!window.location.hash) return;
  const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (!target) return;
  requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
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
  return {
    ...pub,
    kind,
    venue,
    tags: PUB_TAGS[pub.citationKey] || [],
    kindOrder: KIND_ORDER[kind] ?? 99,
  };
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
        ${renderTags(pub.tags)}
        ${links.length ? `<div class="t-pub-links">${links.join('')}</div>` : ''}
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
