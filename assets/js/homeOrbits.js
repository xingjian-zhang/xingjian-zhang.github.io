// A decorative ring field with exaggerated differential rotation. No layout or pointer ownership.
// Visual study: https://x.com/0010_888/status/2117473772710015352 (second animation).
(() => {
  const canvas = document.querySelector('.intro-orbits canvas');
  if (!canvas) return;
  const intro = canvas.closest('.intro');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 820px)');

  function mount() {
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, depth: false, powerPreference: 'low-power' });
    if (!gl) return; // The ordinary homepage remains complete without WebGL.
    const vertexSource = `
      attribute vec4 point;
      attribute float beltProgress;
      uniform vec2 size;
      uniform float time, pixelRatio;
      varying float pigment, opacity;
      varying vec2 uv;
      void main() {
        float r = point.x;
        // Exaggerated orbital shear for visibility; Kepler's physical exponent is 1.5.
        // Both wrap boundaries are outside the clipped canvas (right / above).
        float angle = 1.55 + mod(point.y - 1.55 + time * .0105 * pow(.8 / r, 2.2), 1.65);
        float unit = max(size.x, size.y * .8);
        vec2 p = vec2(size.x * 1.06, -size.y * .12) + r * unit * vec2(cos(angle), sin(angle));
        uv = p / size;
        gl_Position = vec4(uv.x * 2. - 1., 1. - uv.y * 2., 0., 1.);
        gl_PointSize = point.z * pixelRatio;
        pigment = point.w;
        float rimLight = mix(.28, 1., smoothstep(0., 1., beltProgress));
        opacity = rimLight * (.55 + .45 * fract(point.y * 37.)) * (.8 + .2 * sin(r * 360.));
      }`;
    const fragmentSource = `
      precision mediump float;
      uniform vec3 copper, stone;
      uniform float intensity;
      varying float pigment, opacity;
      varying vec2 uv;
      void main() {
        float dotAlpha = 1. - smoothstep(.15, .5, length(gl_PointCoord - .5));
        float edge = smoothstep(.0, .32, uv.x) * (1. - smoothstep(.94, 1., uv.x));
        edge *= smoothstep(.0, .08, uv.y) * (1. - smoothstep(.78, 1., uv.y));
        float a = dotAlpha * edge * opacity * intensity;
        gl_FragColor = vec4(mix(stone, copper, pigment) * a, a);
      }`;
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        throw new Error('Orbit shader unavailable');
      }
      return shader;
    };
    let program;
    try {
      program = gl.createProgram();
      const shaders = [compile(gl.VERTEX_SHADER, vertexSource), compile(gl.FRAGMENT_SHADER, fragmentSource)];
      shaders.forEach(shader => gl.attachShader(program, shader));
      gl.linkProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Orbit program unavailable');
    } catch (_) {
      if (program) gl.deleteProgram(program);
      return;
    }
    gl.useProgram(program);
    let seed = 888;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    // Wide belts: sparse inner dust builds toward a dense, brighter outer rim.
    // Spend the same particle budget on the visible orbital sector, not full circles.
    const bands = [[.40, .49, 0], [.502, .60, 0], [.612, .88, 1], [.895, 1.00, 0], [1.014, 1.20, 0]];
    const count = narrow.matches ? 18000 : 54000;
    const points = new Float32Array(count * 5);
    for (let i = 0; i < count;) {
      const sampleRadius = Math.sqrt(.40 ** 2 + random() * (1.20 ** 2 - .40 ** 2));
      const band = bands.find(([inner, outer]) => sampleRadius >= inner && sampleRadius <= outer);
      if (!band) continue;
      // Inverse-CDF sampling changes actual particle density, not just opacity.
      // A small uniform component leaves a faint dust veil at the inner edge.
      const progress = random() < .06 ? random() : Math.pow(random(), 1 / 2.8);
      const radius = band[0] + (band[1] - band[0]) * progress;
      points.set([radius, 1.55 + random() * 1.65, 1.0 + random() * 1.45, band[2], progress], i * 5);
      i++;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, 'point');
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 4, gl.FLOAT, false, 20, 0);
    const progressAttribute = gl.getAttribLocation(program, 'beltProgress');
    gl.enableVertexAttribArray(progressAttribute);
    gl.vertexAttribPointer(progressAttribute, 1, gl.FLOAT, false, 20, 16);
    const uniforms = Object.fromEntries(['size', 'time', 'pixelRatio', 'copper', 'stone', 'intensity'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    let elapsed = 0, last = null, frame = null, visible = false, lost = false;
    function draw() {
      if (lost) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.time, elapsed);
      gl.drawArrays(gl.POINTS, 0, count);
    }
    function palette() {
      if (lost) return;
      const dark = document.documentElement.dataset.theme === 'dark';
      gl.uniform3fv(uniforms.copper, dark ? [.83, .39, .22] : [.43, .19, .10]);
      gl.uniform3fv(uniforms.stone, dark ? [.68, .70, .60] : [.29, .30, .24]);
      gl.uniform1f(uniforms.intensity, dark ? .85 : .9);
      draw();
    }
    function resize() {
      if (lost) return;
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uniforms.size, width, height);
      gl.uniform1f(uniforms.pixelRatio, ratio);
      palette();
    }
    function tick(now) {
      frame = requestAnimationFrame(tick);
      if (last !== null && now - last < 1000 / 24) return;
      if (last !== null) elapsed += Math.min((now - last) / 1000, .1);
      last = now;
      draw();
    }
    function sync() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      last = null;
      if (!lost && visible && !document.hidden && !reduced.matches) frame = requestAnimationFrame(tick);
    }
    const visibility = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    });
    visibility.observe(intro);
    new ResizeObserver(resize).observe(canvas.parentElement);
    new MutationObserver(palette).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('pagehide', () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; });
    window.addEventListener('pageshow', sync);
    canvas.addEventListener('webglcontextlost', () => { lost = true; sync(); canvas.style.visibility = 'hidden'; });
    resize();
  }
  // Delay the decorative work until after the initial page has loaded.
  const schedule = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(mount, { timeout: 1800 });
    else setTimeout(mount, 200);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
