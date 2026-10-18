(() => {
  const intro = document.querySelector('.intro');
  if (!intro) return;
  const introStage = intro.closest('.intro-stage');

  const pointerMotion = matchMedia('(min-width: 821px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  const iconSelector = '.profile-icon, .paper-button';
  intro.classList.add('has-tilt');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const disclosures = new Map();
  function finishDisclosure(details, state) {
    state.animation?.cancel();
    details.open = state.open;
    details.style.removeProperty('height');
    details.style.removeProperty('overflow');
    disclosures.delete(details);
  }
  // Delegation also covers publication archives rebuilt by a filter change.
  document.addEventListener('click', (event) => {
    const summary = event.target.closest('.news-archive > summary, .publications-archive > summary');
    if (!summary) return;
    const details = summary.parentElement;
    const previous = disclosures.get(details);
    if (reducedMotion.matches || !details.animate) return;
    event.preventDefault();
    const open = previous ? !previous.open : !details.open;
    const from = details.getBoundingClientRect().height;
    previous?.animation.cancel();
    details.style.removeProperty('height');
    details.open = true;
    const to = open ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
    details.style.overflow = 'hidden';
    const animation = details.animate(
      [{ height: `${from}px` }, { height: `${to}px` }],
      { duration: 220, easing: 'cubic-bezier(.22, 1, .36, 1)' }
    );
    const state = { animation, open };
    disclosures.set(details, state);
    animation.onfinish = () => finishDisclosure(details, state);
  });
  const finishDisclosures = () => {
    disclosures.forEach((state, details) => finishDisclosure(details, state));
  };
  window.addEventListener('resize', finishDisclosures);
  window.addEventListener('beforeprint', finishDisclosures);
  reducedMotion.addEventListener('change', finishDisclosures);

  // A stationary link target with a gently attracted glyph inside it.
  document.addEventListener('pointermove', (event) => {
    if (!pointerMotion.matches || event.pointerType === 'touch') return;
    const link = event.target.closest(iconSelector);
    if (!link) return;
    const rect = link.getBoundingClientRect();
    link.style.setProperty('--mag-x', `${(event.clientX - rect.left - rect.width / 2) * .25}px`);
    link.style.setProperty('--mag-y', `${(event.clientY - rect.top - rect.height / 2) * .25}px`);
  });
  document.addEventListener('pointerout', (event) => {
    const link = event.target.closest(iconSelector);
    if (!link || link.contains(event.relatedTarget)) return;
    link.style.removeProperty('--mag-x');
    link.style.removeProperty('--mag-y');
  });

  let tiltFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  introStage.addEventListener('pointermove', (event) => {
    if (!pointerMotion.matches || event.pointerType === 'touch') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (tiltFrame) return;
    tiltFrame = requestAnimationFrame(() => {
      tiltFrame = 0;
      // Measure the stationary wrapper so the tilt cannot feed back into itself.
      const rect = introStage.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (pointerX - rect.left) / rect.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (pointerY - rect.top) / rect.height * 2 - 1));
      intro.style.setProperty('--tilt-x', `${-y * 2.2}deg`);
      intro.style.setProperty('--tilt-y', `${x * 1.8}deg`);
      intro.style.setProperty('--shadow-x', `${-x * 8}px`);
      intro.classList.add('is-tilted');
    });
  });

  function resetTilt() {
    cancelAnimationFrame(tiltFrame);
    tiltFrame = 0;
    intro.classList.remove('is-tilted');
  }
  introStage.addEventListener('pointerleave', resetTilt);
  introStage.addEventListener('pointercancel', resetTilt);
  window.addEventListener('scroll', resetTilt, { passive: true });
  window.addEventListener('resize', resetTilt);
  window.addEventListener('blur', resetTilt);
  pointerMotion.addEventListener('change', () => {
    resetTilt();
    document.querySelectorAll(iconSelector).forEach((link) => {
      link.style.removeProperty('--mag-x');
      link.style.removeProperty('--mag-y');
    });
  });

  function initNavigation() {
    const nav = document.querySelector('.t-nav');
    if (!nav || nav.classList.contains('motion-nav')) return;
    const links = [...nav.querySelectorAll('a')];
    const sections = links.map((link) => document.querySelector(new URL(link.href).hash));
    const header = nav.closest('.t-top');
    let hovered = null;
    let frame = 0;
    nav.classList.add('motion-nav');

    function update() {
      frame = 0;
      const readingEdge = header.getBoundingClientRect().bottom + 80;
      let current = null;
      sections.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top <= readingEdge) current = links[index];
      });
      links.forEach((link) => {
        link.classList.toggle('active', link === current);
        if (link === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });

      const focused = links.includes(document.activeElement) ? document.activeElement : null;
      const target = hovered || focused || current;
      nav.style.setProperty('--nav-visible', target ? '1' : '0');
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const bounds = nav.getBoundingClientRect();
      nav.style.setProperty('--nav-x', `${rect.left - bounds.left}px`);
      nav.style.setProperty('--nav-y', `${rect.bottom - bounds.top + 3}px`);
      nav.style.setProperty('--nav-width', `${rect.width}px`);
    }
    function scheduleUpdate() {
      if (!frame) frame = requestAnimationFrame(update);
    }

    links.forEach((link) => {
      link.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'touch') return;
        hovered = link;
        scheduleUpdate();
      });
      link.addEventListener('pointerleave', () => {
        hovered = null;
        scheduleUpdate();
      });
    });
    nav.addEventListener('focusin', scheduleUpdate);
    nav.addEventListener('focusout', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    // Fonts and archive disclosures can change the geometry without a scroll.
    new ResizeObserver(scheduleUpdate).observe(document.querySelector('.site-shell'));
    document.fonts.ready.then(scheduleUpdate);
    update();
  }

  document.addEventListener('components:loaded', initNavigation, { once: true });
  initNavigation();
})();
