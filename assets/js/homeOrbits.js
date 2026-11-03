// Orbital Study 02 particles, projected into an uncropped page corner.

(() => {
  'use strict';
  const canvas = document.querySelector('#dust');
  const moons = document.querySelector('#moons');
  if (!canvas || !moons) return;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) { canvas.parentElement.hidden = true; return; }
  const vertex = `
    attribute vec4 particle;
    attribute vec4 tint;
    uniform float time;
    uniform float pigment;
    uniform float scale, artScale, particleScale;
    uniform vec2 viewport;
    varying vec4 color;
    void main() {
      float r = particle.x;
      // Adjacent bands counter-rotate; inner orbits retain their faster drift.
      float speed = particle.w * .008 * pow(900. / r, 1.5);
      float a = mod(particle.y + time * speed + 1.7, 3.4) - 1.7;
      float wave = sin(a * 15. + r * .019 - time * .22) * 1.15;
      vec2 p = vec2(viewport.x, 0.) + artScale * vec2(240. - (r + wave) * cos(a), -240. + (r + wave) * sin(a) * 1.02);
      gl_Position = vec4(p.x / viewport.x * 2. - 1., 1. - p.y / viewport.y * 2., 0., 1.);
      // Keep individual grains legible independently of the overall orbit scale.
      gl_PointSize = max(1.45, max(1.5, particle.z * .9) * 1.2 * particleScale) * scale;
      color = vec4(tint.rgb * pigment, tint.a);
    }`;
  const fragment = `
    precision mediump float;
    varying vec4 color;
    void main() {
      float d = length(gl_PointCoord - .5);
      gl_FragColor = vec4(color.rgb, color.a * (1. - smoothstep(.25, .5, d)));
    }`;
  function shader(type, source) {
    const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  let seed = 888;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  function smooth(a, b, x) { const t = Math.max(0, Math.min(1, (x-a)/(b-a))); return t*t*(3-2*t); }
  // The geometry and pigments are generated; no frames from the source video are replayed.
  const data = [];
  // Midpoints of the gaps between the six visible bands, from inside out.
  const bandBoundaries = [559, 628, 700.5, 995.5, 1063.5];
  for (let i = 0; i < 700000; i++) {
    const r = 440 + random() * 1050;
    const angle = (random() - .5) * 3.4;
    // Bridge internal gaps with sparse dust without extending the outer edge.
    let density = r >= 480 && r <= 1330 ? .045 : .006;
    let rgb = [129, 113, 93], brightness = 1;
    const greyBands = [[480, 550], [568, 614], [642, 691], [1005, 1047], [1080, 1330]];
    for (const [lo, hi] of greyBands) {
      if (r >= lo && r <= hi) {
        const u = (r-lo)/(hi-lo);
        density = .14 + .58 * Math.pow(u, 1.15);
        brightness = .3 + .7 * Math.pow(u, 1.05);
        rgb = [176, 156, 125];
      }
    }
    const isColoredBand = r > 710 && r < 986;
    if (isColoredBand) {
      const u = (r-710)/276;
      density = .12 + .605 * Math.pow(u, .7);
      brightness = .38 + .62 * smooth(710, 920, r);
      rgb = [166, 107, 46];
    }
    // Unevenly spaced frequencies produce broad swells, beating bands and fine
    // fibres. Radial-only modulation keeps the texture stable during rotation.
    const drift = .9 * Math.sin(r * .017 + .6) + .35 * Math.sin(r * .031);
    const low = Math.sin(r * .071 + drift);
    const mid = Math.sin(r * .173 + .65 * Math.sin(r * .043 + 1.2));
    const beat = Math.sin(r * .211 + 1.8);
    const fine = Math.sin(r * .487 + .8 * Math.sin(r * .097));
    const detail = Math.sin(r * .793 + 2.4);
    const composite = .28 * low + .32 * mid + .19 * beat + .14 * fine + .07 * detail;
    const layered = Math.pow(.5 + .5 * composite, 1.35);
    const striation = .4 + 1.18 * layered;
    density = Math.min(.95, density * striation);
    if (random() > density) continue;
    // Let dense fibres carry more pigment while sparse dust stays neutral.
    const luminance = rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
    const saturation = .45 + .55 * smooth(.05, .6, density);
    rgb = rgb.map(channel => luminance + (channel - luminance) * saturation);
    const variation = .65 + random() * .35;
    if (random() < .008 && r < 1100) rgb = [174, 164, 135];
    // The canvas uses 40% opacity; keep neutral dust subdued at about 25%.
    const opacity = (.7 + random() * .3) * brightness * (isColoredBand ? 1 : .625);
    const bandIndex = bandBoundaries.filter(edge => r >= edge).length;
    const direction = bandIndex % 2 === 0 ? 1 : -1;
    data.push(r, angle, 1.05 + Math.pow(random(), 2) * 1.75, direction,
      rgb[0]/255 * variation, rgb[1]/255 * variation, rgb[2]/255 * variation, opacity);
  }
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  for (const [name, offset] of [['particle', 0], ['tint', 16]]) {
    const loc = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 32, offset);
  }
  const pigmentLoc = gl.getUniformLocation(program, 'pigment');
  let dark = document.documentElement.dataset.theme === 'dark';
  const timeLoc = gl.getUniformLocation(program, 'time');
  const scaleLoc = gl.getUniformLocation(program, 'scale');
  const particleScaleLoc = gl.getUniformLocation(program, 'particleScale');
  const artScaleLoc = gl.getUniformLocation(program, 'artScale');
  const viewportLoc = gl.getUniformLocation(program, 'viewport');
  gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  const count = data.length / 8;
  const context = moons.getContext('2d');
  // Two flat wood-grain discs, staggered in position and size.
  // Place the larger disc near the sparse gap at orbital radius 1063.
  const bodies = [[-20,1408,38],[35,1490,22]];
  const sprites = bodies.map(([x,y,r], index) => {
    const side = Math.ceil(r * 4 + 4);
    const off = document.createElement('canvas'); off.width = off.height = side;
    const c = off.getContext('2d'); const img = c.createImageData(side,side);
    const rotation = [.3, -.45][index];
    const base = [[215,203,181],[204,194,175]][index];
    for (let py=0; py<side; py++) for(let px=0; px<side; px++) {
      const nx=(px+.5-side/2)/(r*2), ny=(py+.5-side/2)/(r*2);
      const rr=nx*nx+ny*ny;
      if(rr>1) continue;
      const u=nx*Math.cos(rotation)-ny*Math.sin(rotation);
      const v=nx*Math.sin(rotation)+ny*Math.cos(rotation);
      // Warped parallel fibres give a flat cut-wood texture, without lighting.
      const warp=u+.11*Math.sin(v*3+index)+.035*Math.sin(v*7+u*2);
      const lines=Math.pow(.5+.5*Math.sin(warp*36+index*2),8);
      const broad=Math.sin(warp*12+v*.6)*.055;
      const grain=(random()-.5)*.045;
      const tone=.96-lines*.23+broad+grain;
      const k=(py*side+px)*4;
      for(let j=0;j<3;j++) img.data[k+j]=base[j]*tone;
      img.data[k+3]=Math.min(1,(1-Math.sqrt(rr))*r*2)*255;
    }
    // Invert the dust projection to keep each body on its current elliptical band.
    const orbitRadius = Math.hypot(x + 520, (y - 450) / 1.02);
    const orbitAngle = Math.atan2((y - 450) / 1.02, x + 520);
    const bandIndex = bandBoundaries.filter(edge => orbitRadius >= edge).length;
    const orbitSpeed = (bandIndex % 2 === 0 ? 1 : -1) * .012 * Math.pow(900 / orbitRadius, 1.5);
    c.putImageData(img,0,0);
    return {off,r,side,orbitRadius,orbitAngle,orbitSpeed,spin: 2 * Math.PI / (index === 0 ? 120 : 160)};
  });
  let elapsed = 0, last = null, frame = null;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = motion.matches;
  let visible = false;
  let moonScale = 1, moonX = 0, moonY = 0;
  function draw() {
    gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(pigmentLoc,dark ? 1 : .65);
    gl.uniform1f(timeLoc,elapsed);
    gl.drawArrays(gl.POINTS,0,dark ? count : Math.floor(count*.6));
    context.setTransform(1,0,0,1,0,0);
    context.clearRect(0,0,moons.width,moons.height);
    context.setTransform(-moonScale,0,0,moonScale,moonX,moonY);
    for (const s of sprites) {
      context.save();
      const angle = s.orbitAngle + elapsed * s.orbitSpeed;
      context.translate(s.orbitRadius * Math.cos(angle) - 520,
        450 + s.orbitRadius * Math.sin(angle) * 1.02);
      context.rotate(elapsed*s.spin);
      context.drawImage(s.off,-s.side/4,-s.side/4,s.side/2,s.side/2);
      context.restore();
    }
  }
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const cssWidth = canvas.clientWidth, cssHeight = canvas.clientHeight;
    const artScale = cssWidth <= 820 ? .208 : .364;
    const width = Math.round(cssWidth * ratio), height = Math.round(cssHeight * ratio);
    canvas.width=moons.width=width; canvas.height=moons.height=height;
    gl.viewport(0,0,width,height);
    gl.uniform1f(scaleLoc,ratio);
    // Phone-sized dots are 18% smaller, easing back to desktop size at 820px.
    gl.uniform1f(particleScaleLoc, .82 + .18 * smooth(480, 820, cssWidth));
    gl.uniform1f(artScaleLoc,artScale);
    gl.uniform2f(viewportLoc,cssWidth,cssHeight);
    // Cache the corner projection; the shared clock drives orbit and self-rotation.
    moonScale = artScale * ratio;
    moonX = (cssWidth - 280 * artScale) * ratio;
    moonY = -690 * artScale * ratio;
    draw();
  }
  function tick(now) {
    frame=null;
    if(paused || !visible || document.hidden) { last=null; return; }
    if(last!==null) elapsed+=Math.min((now-last)/1000,.08);
    last=now; draw(); frame=requestAnimationFrame(tick);
  }
  function sync() {
    if(frame!==null) cancelAnimationFrame(frame);
    frame=null; last=null;
    if(!paused && visible && !document.hidden) frame=requestAnimationFrame(tick);
  }
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(canvas.parentElement);
  motion.addEventListener('change',e=>{paused=e.matches;sync();});
  document.addEventListener('visibilitychange',sync);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();paused=true;sync();canvas.parentElement.hidden=true;});
  new ResizeObserver(resize).observe(canvas);
  window.addEventListener('pagehide', () => { if(frame!==null) cancelAnimationFrame(frame); frame=null; });
  window.addEventListener('pageshow', sync);
  new MutationObserver(() => {
    dark = document.documentElement.dataset.theme === 'dark';
    draw();
  }).observe(document.documentElement, {attributes:true,attributeFilter:['data-theme']});
  resize(); sync();
})();
