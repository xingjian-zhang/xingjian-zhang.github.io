/*
 * Homepage pixel layer: the theme toggle's sun and moon sprites, the dithered
 * portrait that resolves to the real photo, and the kittens' scroll glance.
 * The six profile icons are static inline SVG in index.html; the card, frame
 * and reveal styles are in assets/css/home-pixel.css.
 */
(() => {
  const root = document.documentElement;
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

  // ---- Portrait: quantise the photo to the cats' palette with ordered dither.
  const CELL = 2; // CSS px per portrait pixel, same as the cats
  const PALETTE = [
    0x241a18, 0x33241f, 0x5d5f65, 0x6e7076, 0x8f9197, 0xa9acb4, 0x7f97a6,
    0x8a9a84, 0x8a6f74, 0x915a32, 0xb28364, 0xc4884e, 0xe3b282, 0xf0c79c,
    0xf8dfc0, 0xfffaf2, 0xeb9a98,
  ].map((c) => [c >> 16, (c >> 8) & 255, c & 255]);
  const NIGHT = [.82, .83, .9];
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const SPREAD = 30;
  const LIFT = .82; // gamma < 1 opens up a face that sits in shade
  const MIN_CELLS = 56; // below this a face stops reading; keep the photo in the pixel frame

  const lift = (v) => 255 * Math.pow(v / 255, LIFT);

  function nearest(r, g, b) {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < PALETTE.length; i++) {
      const p = PALETTE[i];
      const mean = (r + p[0]) / 2;
      const dr = r - p[0];
      const dg = g - p[1];
      const db = b - p[2];
      const d = (2 + mean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - mean) / 256) * db * db;
      if (d < bestD) { bestD = d; best = i; }
    }
    return PALETTE[best];
  }

  function shrink(img, n) {
    // Halve repeatedly so the downscale averages instead of skipping pixels.
    let source = img;
    let size = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - size) / 2;
    const sy = (img.naturalHeight - size) / 2;
    let first = true;
    while (true) {
      const next = Math.max(n, Math.ceil(size / 2));
      const step = document.createElement('canvas');
      step.width = step.height = next;
      const ctx = step.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      if (first) ctx.drawImage(source, sx, sy, size, size, 0, 0, next, next);
      else ctx.drawImage(source, 0, 0, size, size, 0, 0, next, next);
      first = false;
      source = step;
      size = next;
      if (next === n) return step;
    }
  }

  function drawPortrait(img, canvas) {
    const slot = canvas.parentElement.clientWidth;
    if (!slot || !img.naturalWidth) return;
    const n = Math.ceil(slot / CELL);
    canvas.hidden = n < MIN_CELLS;
    if (canvas.hidden) return;
    const night = root.dataset.theme === 'dark';
    const key = `${n}:${night}`;
    if (canvas.dataset.key === key) return;
    canvas.dataset.key = key;
    canvas.width = canvas.height = n;
    canvas.style.width = canvas.style.height = `${n * CELL}px`;
    const small = shrink(img, n).getContext('2d').getImageData(0, 0, n, n);
    const px = small.data;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 4;
        const t = ((BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16 - .5) * SPREAD;
        const c = nearest(lift(px[i]) + t, lift(px[i + 1]) + t, lift(px[i + 2]) + t);
        px[i] = night ? c[0] * NIGHT[0] : c[0];
        px[i + 1] = night ? c[1] * NIGHT[1] : c[1];
        px[i + 2] = night ? c[2] * NIGHT[2] : c[2];
        px[i + 3] = 255;
      }
    }
    canvas.getContext('2d').putImageData(small, 0, 0);
  }

  function pixelPortrait() {
    const img = document.querySelector('.avatar-visual .avatar');
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'avatar-pixels';
    canvas.setAttribute('aria-hidden', 'true');
    img.after(canvas);
    const draw = () => drawPortrait(img, canvas);
    (img.decode ? img.decode().catch(() => {}) : Promise.resolve()).then(draw);
    img.addEventListener('load', draw);
    new ResizeObserver(draw).observe(canvas.parentElement);
    new MutationObserver(draw).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
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
    pixelPortrait();
    scrollGlance();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
