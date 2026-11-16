/*
 * Homepage pixel layer: the theme toggle's sun and moon sprites and the
 * kittens' scroll glance. The card and portrait frame styles are in
 * assets/css/home-pixel.css.
 */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SVG = 'http://www.w3.org/2000/svg';

  // ---- 12x12 sprites, drawn in the same row-string style as the cats' font.
  const SPRITES = {
    sun: [
      '.....XX.....',
      '.X...XX...X.',
      '..X......X..',
      '....XXXX....',
      '...XXXXXX...',
      'XX.XXXXXX.XX',
      'XX.XXXXXX.XX',
      '...XXXXXX...',
      '....XXXX....',
      '..X......X..',
      '.X...XX...X.',
      '.....XX.....',
    ],
    moon: [
      '....XXXX....',
      '..XXXX......',
      '.XXXX.......',
      '.XXX........',
      'XXXX........',
      'XXXX........',
      'XXXX.......X',
      'XXXXX.....XX',
      '.XXXXX...XXX',
      '.XXXXXXXXXX.',
      '..XXXXXXXX..',
      '....XXXX....',
    ],
  };

  function sprite(rows, className) {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('viewBox', '0 0 12 12');
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', `px-glyph ${className || ''}`.trim());
    let d = '';
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== 'X') continue;
        let run = 1;
        while (row[x + run] === 'X') run++;
        d += `M${x} ${y}h${run}v1h${-run}z`;
        x += run - 1;
      }
    });
    const path = document.createElementNS(SVG, 'path');
    path.setAttribute('d', d);
    svg.append(path);
    return svg;
  }

  // The shared nav ships a vector sun/moon; the homepage swaps in pixel ones.
  // CSS hides the vector icon only once these exist, so the toggle is never empty.
  function pixelToggle() {
    const toggle = document.querySelector('.theme-toggle');
    if (!toggle || toggle.querySelector('.px-glyph')) return;
    // Same convention as the vector toggle: sun in light mode, moon in dark.
    toggle.append(sprite(SPRITES.sun, 'px-light'), sprite(SPRITES.moon, 'px-dark'));
  }

  // ---- Cats glance the way the page is scrolling. homeCats.js is the only
  // listener for pointermove on window, so this reaches the cats and nothing else.
  function scrollGlance() {
    const cats = document.getElementById('cats');
    if (!cats) return;
    let lastY = window.scrollY;
    let queued = false;
    window.addEventListener('scroll', () => {
      if (queued || reducedMotion.matches) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const y = window.scrollY;
        const down = y > lastY;
        if (y === lastY) return;
        lastY = y;
        const rect = cats.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        window.dispatchEvent(new PointerEvent('pointermove', {
          clientX: rect.left + rect.width / 2,
          clientY: down ? rect.bottom + 400 : rect.top - 400,
          pointerType: 'mouse',
        }));
      });
    }, { passive: true });
  }

  function start() {
    pixelToggle();
    scrollGlance();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
