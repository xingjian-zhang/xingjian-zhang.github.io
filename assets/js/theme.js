// Apply before styles load so a saved dark theme never flashes a light page.
(() => {
  const key = 'site-theme';
  const root = document.documentElement;
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let transition;
  const valid = (value) => ['light', 'dark'].includes(value) ? value : 'system';
  let preference = 'system';
  try { preference = valid(localStorage.getItem(key)); } catch (_) { /* Storage may be disabled. */ }

  function apply() {
    const theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    root.dataset.theme = theme;
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }
  }

  function changeTheme() {
    transition?.skipTransition();
    if (!document.startViewTransition || reducedMotion.matches) {
      apply();
      return;
    }
    const current = document.startViewTransition(apply);
    transition = current;
    current.finished.finally(() => {
      if (transition === current) transition = null;
    });
  }

  apply();
  system.addEventListener('change', () => {
    if (preference === 'system') changeTheme();
  });
  document.addEventListener('DOMContentLoaded', apply, { once: true });
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = valid(event.newValue);
    changeTheme();
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.theme-toggle')) return;
    const current = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    preference = current === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(key, preference); } catch (_) { /* Storage may be disabled. */ }
    changeTheme();
  });
})();
