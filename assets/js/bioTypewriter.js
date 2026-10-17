(function () {
  const bio = document.querySelector('.intro-copy');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phone = window.matchMedia('(max-width: 820px)');
  if (!bio || reducedMotion.matches || phone.matches) return;

  let started = false;
  let timer;
  let observer;
  const characters = [];
  const emphasisGroups = [];

  function renderEmphasis(group) {
    group.strong.classList.remove('is-pending');
    group.markers.forEach((element) => element.remove());
  }

  function finish() {
    clearTimeout(timer);
    observer?.disconnect();
    characters.forEach(({ element }) => {
      element.classList.add('is-visible');
      element.classList.remove('is-cursor');
    });
    emphasisGroups.forEach(renderEmphasis);
  }

  function start() {
    if (started || reducedMotion.matches || phone.matches) return;
    started = true;
    observer?.disconnect();
    const firstSentence = bio.querySelector('p')?.textContent.match(/^.*?[.!?](?:\s+|$)/)?.[0] || '';
    const staticCount = Array.from(firstSentence).length;

    bio.querySelectorAll('p').forEach((paragraph) => {
      const source = document.createElement('span');
      source.className = 'bio-type-source';
      source.innerHTML = paragraph.innerHTML;

      const visual = document.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      visual.innerHTML = paragraph.innerHTML;
      const groups = new Map();
      visual.querySelectorAll('strong[data-typed-markdown]').forEach((strong) => {
        strong.classList.add('is-pending');
        strong.prepend('**');
        strong.append('**');
        groups.set(strong, []);
      });
      const walker = document.createTreeWalker(visual, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      textNodes.forEach((node) => {
        const group = groups.get(node.parentElement.closest('strong[data-typed-markdown]'));
        const fragment = document.createDocumentFragment();
        Array.from(node.textContent).forEach((character) => {
          const element = document.createElement('span');
          element.className = 'typing-char';
          element.textContent = character;
          const entry = { element, character, paragraphEnd: false };
          characters.push(entry);
          group?.push(entry);
          fragment.append(element);
        });
        node.replaceWith(fragment);
      });
      groups.forEach((entries, strong) => {
        const group = {
          strong,
          markers: [...entries.slice(0, 2), ...entries.slice(-2)].map((entry) => entry.element),
          lastText: entries[entries.length - 3].element,
        };
        entries[entries.length - 1].emphasis = group;
        emphasisGroups.push(group);
      });
      if (characters.length) characters[characters.length - 1].paragraphEnd = true;
      paragraph.replaceChildren(source, visual);
      paragraph.style.minHeight = `${paragraph.getBoundingClientRect().height}px`;
    });

    let index = staticCount;
    characters.slice(0, staticCount).forEach(({ element }) => {
      element.classList.add('is-visible');
    });
    let cursor;
    function typeNext() {
      if (reducedMotion.matches || phone.matches) return finish();
      cursor?.classList.remove('is-cursor');
      if (index === characters.length) return;

      const { element, character, paragraphEnd, emphasis } = characters[index++];
      element.classList.add('is-visible');
      if (emphasis) renderEmphasis(emphasis);
      cursor = emphasis ? emphasis.lastText : element;
      cursor.classList.add('is-cursor');
      // Vary the cadence slightly, pausing at punctuation and paragraph breaks.
      let delay = 18 + Math.random() * 24;
      if (/[,;:]/.test(character)) delay += 90;
      if (/[.!?]/.test(character)) delay += 180;
      if (paragraphEnd) delay += 320;
      const animatedCount = characters.length - staticCount;
      const progress = animatedCount > 1 ? (index - staticCount - 1) / (animatedCount - 1) : 1;
      const speed = 1 + 2 * progress;
      timer = setTimeout(typeNext, delay / speed);
    }
    timer = setTimeout(typeNext, 200);
  }

  reducedMotion.addEventListener('change', (event) => {
    if (event.matches) finish();
  });
  phone.addEventListener('change', (event) => {
    if (event.matches) finish();
  });

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) start();
    }, { threshold: 0.25 });
    observer.observe(bio);
  } else {
    start();
  }
})();
