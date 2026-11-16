// Nomi and Kiki peek over the bio card. A tiny software renderer: two kittens built from
// ellipsoids and cones, ray-cast straight onto a 126×39 pixel grid with three flat light
// bands and a depth outline, then scaled up without smoothing. No libraries, no WebGL.

(() => {
  'use strict';
  const canvas = document.querySelector('#cats');
  const context = canvas && canvas.getContext('2d');
  if (!context) return;

  // Layout in CSS pixels. EDGE is the card's top edge inside the canvas; PX is one art pixel.
  const W = 252, H = 78, EDGE = 62, ORIGIN_X = 82, UNIT = 26, PX = 2;
  const LW = W / PX, LH = H / PX, STEP = PX / UNIT;
  const LEFT = -ORIGIN_X / UNIT, TOP = EDGE / UNIT;
  canvas.width = LW;
  canvas.height = LH;

  const LOOKS = [
    { name: 'Nomi', ink: [0xc4884e, 0xf0c79c], x: 0, tailSide: -1, bold: 1,
      fur: 0xf0c79c, light: 0xf8dfc0, muzzle: 0xfffaf2, chest: 0xfffaf2, bib: [.55, .6, .5], nose: 0xeb9a98,
      ear: 0xf0c79c, earIn: 0xf2b0a8, eye: 0x7f97a6, paws: [0xfbe9d2, 0xfbe9d2],
      tail: (i) => (i % 4 < 2 ? 0xf0c79c : 0xe3b282),
      marks: [[0xe3b282, [0, .72, .6], [.05, .18, .1], -.75, 0], [0xe3b282, [-.22, .68, .58], [.05, .16, .1], -.75, .25],
              [0xe3b282, [.22, .68, .58], [.05, .16, .1], -.75, -.25], [0xfffaf2, [0, .12, .9], [.09, .2, .08], -.2, 0]] },
    { name: 'Kiki', ink: [0x6e7076, 0xa9acb4], x: 3.35, tailSide: 1, bold: 0,
      fur: 0x77797f, light: 0x8f9197, muzzle: 0xf3ece6, chest: 0xf3ece6, bib: [.3, .34, .45], nose: 0x8a6f74,
      ear: 0x606268, earIn: 0x9a7f88, eye: 0x8a9a84, paws: [0x818389, 0xf3d9bd],
      tail: (i) => (i === 3 || i === 4 || i === 7 ? 0xd9b99c : 0x6e7076),
      // Cream blaze down the forehead, a patch over one eye, a cheek patch, two darker smudges.
      marks: [[0xdcbfa2, [.06, .42, .84], [.1, .36, .1], -.35, 0], [0xdcbfa2, [-.5, .42, .66], [.24, .15, .12], -.4, .3],
              [0xdcbfa2, [.62, -.12, .62], [.22, .18, .14], 0, 0], [0x5d5f65, [.45, .55, .6], [.2, .14, .1], -.5, -.3],
              [0x5d5f65, [-.7, -.05, .5], [.16, .2, .12], 0, 0]] },
  ];
  // Hand-drawn six-row letters for the name tags. Add letters here for other names.
  const FONT = {
    N: ['X..X', 'XX.X', 'X.XX', 'X.XX', 'X..X', 'X..X'], K: ['X..X', 'X.X.', 'XX..', 'XX..', 'X.X.', 'X..X'],
    o: ['....', '....', '.XX.', 'X..X', 'X..X', '.XX.'], m: ['.....', '.....', 'XXXX.', 'X.X.X', 'X.X.X', 'X.X.X'],
    i: ['X', '.', 'X', 'X', 'X', 'X'], k: ['X..', 'X..', 'X.X', 'XX.', 'XX.', 'X.X'],
  };
  const GLYPH = { z: ['XXX', '.X.', 'XXX'], Z: ['XXXX', '..X.', '.X..', 'XXXX'], heart: ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'] };
  function word(text) {
    const rows = ['', '', '', '', '', ''];
    [...text].forEach((letter, n) => (FONT[letter] || []).forEach((row, j) => { rows[j] += (n ? '.' : '') + row; }));
    return rows;
  }

  // --- 3×3 matrices, row-major ---
  const mul = (a, b) => [
    a[0]*b[0]+a[1]*b[3]+a[2]*b[6], a[0]*b[1]+a[1]*b[4]+a[2]*b[7], a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
    a[3]*b[0]+a[4]*b[3]+a[5]*b[6], a[3]*b[1]+a[4]*b[4]+a[5]*b[7], a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
    a[6]*b[0]+a[7]*b[3]+a[8]*b[6], a[6]*b[1]+a[7]*b[4]+a[8]*b[7], a[6]*b[2]+a[7]*b[5]+a[8]*b[8]];
  const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
  const scale = (s) => (typeof s === 'number' ? [s, 0, 0, 0, s, 0, 0, 0, s] : [s[0], 0, 0, 0, s[1], 0, 0, 0, s[2]]);
  const apply = (m, v) => [m[0]*v[0]+m[1]*v[1]+m[2]*v[2], m[3]*v[0]+m[4]*v[1]+m[5]*v[2], m[6]*v[0]+m[7]*v[1]+m[8]*v[2]];
  const IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  // A frame is a linear part plus an origin; child() places a frame inside its parent.
  const child = (frame, position, linear = IDENTITY) => {
    const p = apply(frame.m, position);
    return { m: mul(frame.m, linear), o: [frame.o[0] + p[0], frame.o[1] + p[1], frame.o[2] + p[2]] };
  };
  function invert(m) {
    const a = m[4]*m[8]-m[5]*m[7], b = m[5]*m[6]-m[3]*m[8], c = m[3]*m[7]-m[4]*m[6];
    const d = 1 / (m[0]*a + m[1]*b + m[2]*c);
    return [a*d, (m[2]*m[7]-m[1]*m[8])*d, (m[1]*m[5]-m[2]*m[4])*d,
            b*d, (m[0]*m[8]-m[2]*m[6])*d, (m[2]*m[3]-m[0]*m[5])*d,
            c*d, (m[1]*m[6]-m[0]*m[7])*d, (m[0]*m[4]-m[1]*m[3])*d];
  }

  // --- frame buffers ---
  const SIZE = LW * LH;
  const depth = new Float32Array(SIZE), red = new Float32Array(SIZE), green = new Float32Array(SIZE), blue = new Float32Array(SIZE);
  const owner = new Int8Array(SIZE), flat = new Uint8Array(SIZE);
  const image = context.createImageData(LW, LH);
  const LIGHT = (() => { const l = [-.45, .65, .62], n = Math.hypot(...l); return l.map((v) => v / n); })();
  const SHADE = [.74, .66, .64], LINE = [51, 36, 33];
  let tint = [1, 1, 1];

  // Ray-cast one ellipsoid (cone = false) or cone along −z into the buffers.
  // The unit cone has its apex at y = .5 and a radius-1 base at y = −.5.
  function cast(frame, color, cone, clip, cat) {
    const m = frame.m, cx = frame.o[0], cy = frame.o[1], cz = frame.o[2];
    const ex = cone ? Math.abs(m[0]) + .5 * Math.abs(m[1]) + Math.abs(m[2]) : Math.hypot(m[0], m[1], m[2]);
    const ey = cone ? Math.abs(m[3]) + .5 * Math.abs(m[4]) + Math.abs(m[5]) : Math.hypot(m[3], m[4], m[5]);
    const i0 = Math.max(0, Math.floor((cx - ex - LEFT) / STEP)), i1 = Math.min(LW - 1, Math.ceil((cx + ex - LEFT) / STEP));
    const j0 = Math.max(0, Math.floor((TOP - cy - ey) / STEP)), j1 = Math.min(clip ? EDGE / PX - 1 : LH - 1, Math.ceil((TOP - cy + ey) / STEP));
    if (i0 > i1 || j0 > j1) return;
    const a = invert(m), dx = -a[2], dy = -a[5], dz = -a[8];
    const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
    for (let j = j0; j <= j1; j++) {
      const wy = TOP - (j + .5) * STEP - cy;
      for (let i = i0; i <= i1; i++) {
        const wx = LEFT + (i + .5) * STEP - cx;
        const ox = a[0]*wx + a[1]*wy - a[2]*cz, oy = a[3]*wx + a[4]*wy - a[5]*cz, oz = a[6]*wx + a[7]*wy - a[8]*cz;
        let t, nx, ny, nz;
        if (cone) {
          const k = .5 - oy, qa = dx*dx + dz*dz - dy*dy, qb = 2 * (ox*dx + oz*dz + k*dy), qc = ox*ox + oz*oz - k*k;
          const disc = qb*qb - 4*qa*qc;
          if (disc < 0 || Math.abs(qa) < 1e-9) continue;
          const root = Math.sqrt(disc), t0 = (-qb - root) / (2*qa), t1 = (-qb + root) / (2*qa);
          t = Math.min(t0, t1);
          let hy = oy + t*dy;
          if (hy < -.5 || hy > .5) { t = Math.max(t0, t1); hy = oy + t*dy; if (hy < -.5 || hy > .5) continue; }
          nx = ox + t*dx; ny = .5 - hy; nz = oz + t*dz;
        } else {
          const qa = dx*dx + dy*dy + dz*dz, qb = 2 * (ox*dx + oy*dy + oz*dz), disc = qb*qb - 4*qa*(ox*ox + oy*oy + oz*oz - 1);
          if (disc < 0) continue;
          t = (-qb - Math.sqrt(disc)) / (2*qa);
          nx = ox + t*dx; ny = oy + t*dy; nz = oz + t*dz;
        }
        const z = -t, index = j * LW + i;
        if (z <= depth[index]) continue;
        // Normals transform by the inverse transpose.
        const wxn = a[0]*nx + a[3]*ny + a[6]*nz, wyn = a[1]*nx + a[4]*ny + a[7]*nz, wzn = a[2]*nx + a[5]*ny + a[8]*nz;
        const lit = (wxn*LIGHT[0] + wyn*LIGHT[1] + wzn*LIGHT[2]) / Math.hypot(wxn, wyn, wzn);
        const band = lit > .3 ? 1 : lit > -.12 ? .5 : 0;
        depth[index] = z; owner[index] = cat; flat[index] = 0;
        red[index] = r * (SHADE[0] + (1 - SHADE[0]) * band) * tint[0];
        green[index] = g * (SHADE[1] + (1 - SHADE[1]) * band) * tint[1];
        blue[index] = b * (SHADE[2] + (1 - SHADE[2]) * band) * tint[2];
      }
    }
  }
  function stamp(rows, wx, wy, color) {
    const cx = Math.round((wx - LEFT) / STEP), cy = Math.round((TOP - wy) / STEP) - rows.length;
    rows.forEach((row, j) => [...row].forEach((mark, i) => {
      const x = cx + i, y = cy + j;
      if (mark !== 'X' || x < 0 || x >= LW || y < 0 || y >= LH) return;
      const index = y * LW + x;
      depth[index] = 99; owner[index] = -1; flat[index] = 1;
      red[index] = (color >> 16) & 255; green[index] = (color >> 8) & 255; blue[index] = color & 255;
    }));
  }
  function present() {
    const data = image.data;
    for (let j = 0; j < LH; j++) for (let i = 0; i < LW; i++) {
      const index = j * LW + i, z = depth[index], out = index * 4;
      if (z === -Infinity) { data[out + 3] = 0; continue; }
      let r = red[index], g = green[index], b = blue[index];
      if (!flat[index]) {
        // Outline where a neighbour is clearly further away; the row below is skipped so no line runs along the card.
        const far = Math.min(i ? depth[index - 1] : -Infinity, i < LW - 1 ? depth[index + 1] : -Infinity, j ? depth[index - LW] : -Infinity);
        if (z - far > .3) { r += (LINE[0] - r) * .7; g += (LINE[1] - g) * .7; b += (LINE[2] - b) * .7; }
      }
      data[out] = r; data[out + 1] = g; data[out + 2] = b; data[out + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }

  // --- behaviour ---
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const GRAVITY = 17, POP_PEAK = 3.2 * 3.2 / (2 * GRAVITY); // a click hops the head this high, about 8px
  const world = { night: false, lastMove: performance.now(), mx: null, my: null, rect: null, wantAwake: 1, track: false };
  const cats = LOOKS.map((look, index) => ({
    look, index, label: word(look.name), awake: 1, yaw: 0, pitch: 0, roll: 0, pop: 0, popV: 0, happy: 0, trust: look.bold,
    blink: 0, nextBlink: 1 + Math.random() * 3, over: false, tag: 0, heart: 0, petT: 0, twitch: [0, 0],
    nextTwitch: 2 + Math.random() * 4, phase: index * 2.4, wag: 0,
  }));

  function update(cat, dt, t) {
    const look = cat.look;
    const awake = cat.awake = lerp(cat.awake, world.wantAwake, Math.min(1, dt * (world.wantAwake ? (look.bold ? 6 : 3.5) : 1.5)));
    let yaw = Math.sin(t * .45 + cat.phase) * .45, pitch = Math.sin(t * .3 + cat.phase) * .08;
    if (world.track) {
      yaw = clamp((world.mx - (world.rect.left + ORIGIN_X + look.x * UNIT)) / 420, -.6, .6);
      pitch = clamp((world.my - (world.rect.top + EDGE - 22)) / 600, -.22, .26);
    }
    const follow = Math.min(1, dt * (look.bold ? 7 : 4.5)); // Kiki follows a beat later
    cat.yaw = lerp(cat.yaw, yaw * awake, follow);
    cat.pitch = lerp(cat.pitch, lerp(.3, pitch, awake), follow);
    cat.happy = lerp(cat.happy, cat.over && awake > .5 ? 1 : 0, Math.min(1, dt * 8));
    cat.petT = cat.over ? cat.petT + dt : 0;
    if (cat.petT > 1.6) { cat.heart = 1.4; cat.petT = 0; }
    cat.trust = clamp(cat.trust + (cat.over ? dt * 1.5 : -dt * .06), look.bold, 1); // petting brings Kiki all the way up
    cat.roll = lerp(cat.roll, lerp(look.tailSide * -.24, Math.sin(t * 9) * .07 * cat.happy, awake), Math.min(1, dt * 6));
    // The tail keeps its own clock, so slowing down for sleep eases the swing instead of jumping its phase.
    if (!reducedMotion.matches) cat.wag += dt * (1 + awake * 1.2);
    cat.pop += cat.popV * dt; cat.popV -= GRAVITY * dt;
    if (cat.pop < 0) { cat.pop = 0; cat.popV = 0; }
    cat.nextBlink -= dt;
    if (cat.nextBlink < 0) { cat.blink = .13; cat.nextBlink = 2 + Math.random() * 4; }
    cat.blink = Math.max(0, cat.blink - dt);
    cat.nextTwitch -= dt;
    if (cat.nextTwitch < 0) { cat.twitch[Math.random() < .5 ? 0 : 1] = .25; cat.nextTwitch = 2.5 + Math.random() * 5; }
    cat.twitch = cat.twitch.map((v) => Math.max(0, v - dt));
    cat.tag = lerp(cat.tag, cat.over || cat.heart > 0 ? 1 : 0, Math.min(1, dt * 10));
    if (cat.heart > 0) cat.heart -= dt;
  }

  function draw(cat, t) {
    const look = cat.look, awake = cat.awake, id = cat.index;
    const body = { m: IDENTITY, o: [look.x, 0, 0] };
    const headY = lerp(.47, lerp(.5, .8, cat.trust), awake) + cat.pop + Math.sin(t * 1.7 + cat.phase) * .018;
    const head = child(body, [0, headY, 0], mul(mul(rotY(cat.yaw), rotX(cat.pitch)), rotZ(cat.roll)));
    const ball = (frame, color, position, size, clip = true) => cast(child(frame, position, scale(size)), color, false, clip, id);

    const chest = child(body, [0, headY - 1, -.2], scale([.9, .9, .7])); // body in coat colour, with a white bib
    cast(chest, look.fur, false, true, id);
    ball(chest, look.chest, [0, .12, .72], look.bib);
    for (let i = 0; i < 11; i++) {
      const s = i / 10, swing = Math.sin(cat.wag + cat.phase - s * 2.2) * .42 * lerp(.5, 1, awake);
      ball(body, look.tail(i), [look.tailSide * (2.3 + Math.sin(s * 3.4) * .3 * s) + Math.sin(swing) * s * .9, -.4 + s * 1.6 - s * s * s * .28, -.6], .19 - i * .005);
    }
    ball(head, look.fur, [0, 0, 0], [1.06, .92, .95]);
    ball(head, look.light, [-.78, -.34, .18], [.4, .34, .4]);
    ball(head, look.light, [.78, -.34, .18], [.4, .34, .4]);
    ball(head, look.muzzle, [-.17, -.3, .8], [.24, .2, .2]);
    ball(head, look.muzzle, [.17, -.3, .8], [.24, .2, .2]);
    ball(head, look.muzzle, [0, -.47, .72], [.2, .14, .18]);
    ball(head, look.nose, [0, -.16, .96], [.1, .075, .07]);
    const open = awake < .5 ? .22 : cat.blink > 0 ? .2 : lerp(1, .28, cat.happy);
    [-1, 1].forEach((side, n) => {
      const eye = child(head, [side * .41, .08, .8], scale([1, open, 1]));
      ball(eye, look.eye, [0, 0, 0], [.2, .22, .1]);
      ball(eye, 0x241a18, [0, 0, .05], [.13, .17, .08]);
      const lean = -side * .34 * (1 + (1 - awake) * .5) + side * Math.sin(cat.twitch[n] * 40) * .18 * (cat.twitch[n] > 0 ? 1 : 0);
      const ear = child(head, [side * .62, .56, -.05], rotZ(lean));
      cast(child(ear, [0, .36, 0], scale([.46, .95, .46])), look.ear, true, true, id);
      cast(child(ear, [0, .3, .19], scale([.29, .62, .29])), look.earIn, true, true, id);
    });
    look.marks.forEach(([color, position, size, rx, rz]) => cast(child(head, position, mul(mul(rotX(rx), rotZ(rz)), scale(size))), color, false, true, id));
    [-1, 1].forEach((side, n) => ball(body, look.paws[n], [side * .56, .03, .78], [.3, .2, .26], false)); // paws hang over the edge
  }

  function overlays(cat, t) {
    const look = cat.look;
    if (cat.awake < .3) [['z', 0], ['Z', .5]].forEach(([glyph, offset]) => {
      const q = (t * .32 + offset + cat.phase) % 1;
      if (q < .85) stamp(GLYPH[glyph], look.x + look.tailSide * -.15 + .75 + q * .8 + Math.sin(q * 7) * .1, 1.1 + q * 1.1, world.night ? 0xb5ad9f : 0x8f887c);
    });
    if (cat.heart > 0) { const q = 1 - cat.heart / 1.4; stamp(GLYPH.heart, look.x - .2, 1.75 + cat.pop * .4 + q * .5, 0xe0655c); }
    if (cat.tag > .3) { // name tag in the cat's coat colour, rising three pixels into place
      const width = cat.label[0].length * STEP, rise = Math.round((1 - cat.tag) * 3) * STEP;
      stamp(cat.label, look.tailSide < 0 ? look.x - 1.35 - width : look.x + 1.35, 1.5 - rise, look.ink[world.night ? 1 : 0]);
    }
  }

  function frame(dt, t) {
    const idle = (performance.now() - world.lastMove) / 1000;
    world.rect = canvas.getBoundingClientRect();
    world.wantAwake = reducedMotion.matches || idle < (world.night ? 5 : 25) ? 1 : 0;
    world.track = world.mx !== null && idle < 4 && !reducedMotion.matches;
    depth.fill(-Infinity);
    cats.forEach((cat) => { update(cat, dt, t); draw(cat, t); });
    cats.forEach((cat) => overlays(cat, t));
    present();
  }

  // --- input ---
  function catAt(x, y) {
    const rect = canvas.getBoundingClientRect();
    const i = Math.floor((x - rect.left) / rect.width * LW), j = Math.floor((y - rect.top) / rect.height * LH);
    if (i < 0 || i >= LW || j < 0 || j >= LH) return null;
    const index = j * LW + i;
    return depth[index] > -Infinity && owner[index] >= 0 ? cats[owner[index]] : null;
  }
  let pointing = false;
  window.addEventListener('pointermove', (event) => {
    world.mx = event.clientX; world.my = event.clientY;
    const rect = canvas.getBoundingClientRect();
    if (!world.night || Math.hypot(event.clientX - (rect.left + rect.width / 2), event.clientY - (rect.top + EDGE - 20)) < 280) world.lastMove = performance.now();
    const over = event.pointerType === 'touch' ? null : catAt(event.clientX, event.clientY);
    cats.forEach((cat) => { cat.over = cat === over; });
    if (pointing !== Boolean(over)) { pointing = Boolean(over); document.documentElement.style.cursor = pointing ? 'pointer' : ''; }
    wake();
  }, { passive: true });
  window.addEventListener('pointerdown', (event) => {
    const cat = catAt(event.clientX, event.clientY);
    if (!cat) return;
    // A click mid-hop only tops the hop back up to its usual peak, so fast clicks cannot stack.
    if (!reducedMotion.matches) cat.popV = Math.sqrt(2 * GRAVITY * Math.max(0, POP_PEAK - cat.pop));
    cat.heart = 1.4; cat.trust = 1; world.lastMove = performance.now();
    wake();
  }, { passive: true });

  // --- theme, visibility and the loop ---
  function readTheme() {
    const night = document.documentElement.dataset.theme === 'dark';
    if (night === world.night && tint) { if (!running) wake(); return; }
    world.night = night;
    tint = night ? [.82, .83, .9] : [1, 1, 1];
    world.lastMove = night ? -1e9 : performance.now();
    wake();
  }
  let running = false, visible = true, last = 0, clock = 0;
  function loop(now) {
    const dt = Math.min((now - last) / 1000, .05);
    last = now;
    if (!reducedMotion.matches) clock += dt;
    frame(reducedMotion.matches ? .05 : dt, clock);
    // With reduced motion the scene is redrawn only while something is changing.
    const settling = cats.some((cat) => cat.over || cat.heart > 0 || cat.tag > .02);
    running = visible && !document.hidden && (!reducedMotion.matches || settling);
    if (running) requestAnimationFrame(loop);
  }
  function wake() {
    if (running || !visible || document.hidden) return;
    running = true; last = performance.now();
    requestAnimationFrame(loop);
  }
  new MutationObserver(readTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; wake(); }).observe(canvas);
  document.addEventListener('visibilitychange', wake);
  reducedMotion.addEventListener('change', wake);
  world.night = null;
  readTheme();
})();
