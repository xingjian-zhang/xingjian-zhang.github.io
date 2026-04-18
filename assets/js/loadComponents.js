(function () {
  const COMPONENTS = [
    { id: 'header-placeholder', url: '/components/header.html' },
    { id: 'topnav-placeholder', url: '/components/topnav.html' },
    { id: 'footer-placeholder', url: '/components/footer.html' },
  ];

  const PAGE_LABELS = {
    home: 'home',
    research: 'research',
    experience: 'experience',
    projects: 'projects',
    misc: 'misc',
  };

  async function injectComponent({ id, url }) {
    const host = document.getElementById(id);
    if (!host) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      const html = await res.text();
      const tpl = document.createElement('template');
      tpl.innerHTML = html;
      // innerHTML-assigned <script> tags don't execute; clone them so they do.
      tpl.content.querySelectorAll('script').forEach((oldScript) => {
        const newScript = document.createElement('script');
        [...oldScript.attributes].forEach((a) => newScript.setAttribute(a.name, a.value));
        newScript.textContent = oldScript.textContent;
        oldScript.replaceWith(newScript);
      });
      host.replaceWith(...tpl.content.childNodes);
    } catch (err) {
      console.error('loadComponents:', err);
    }
  }

  function applyActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;
    document.querySelectorAll('[data-nav]').forEach((el) => {
      el.classList.toggle('active', el.dataset.nav === page);
    });
    document.querySelectorAll('[data-page-label]').forEach((el) => {
      el.textContent = PAGE_LABELS[page] || page;
    });
  }

  async function init() {
    await Promise.all(COMPONENTS.map(injectComponent));
    applyActiveNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
