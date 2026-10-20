// Rows are generated from BibTeX at build time; filters only regroup existing rows.
(() => {
  const bar = document.querySelector('.t-filter');
  const container = document.getElementById('publications-list');
  if (!bar || !container) return;
  const rows = [...container.querySelectorAll('.t-pub')];
  const buttons = [...bar.querySelectorAll('button[data-filter]')];
  buttons.forEach(button => button.setAttribute('aria-pressed', button.classList.contains('active')));
  bar.addEventListener('click', event => {
    const button = event.target.closest('button[data-filter]');
    if (!button || button.classList.contains('active')) return;
    const kind = button.dataset.filter;
    const filtered = rows.filter(row => kind === 'all' || row.dataset.kind === kind);
    buttons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', active);
      item.textContent = item.dataset.filter + (active ? ` (${filtered.length})` : '');
    });
    container.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement('div');
      empty.className = 'publication-message';
      empty.textContent = '// no entries match this filter';
      container.append(empty);
      return;
    }
    container.append(...filtered.slice(0, 6));
    if (filtered.length > 6) {
      const archive = document.createElement('details');
      archive.className = 'publications-archive';
      const summary = document.createElement('summary');
      summary.textContent = 'Show older publications';
      archive.append(summary, ...filtered.slice(6));
      container.append(archive);
    }
  });
})();
