/* Dataverse — hero 3D scene (Three.js).
   Idle: ribbon arches drift and follow the cursor; light streaks run along the ribbons.
   Scrolling down from the hero plays a fly-through on a full-screen stage: the camera
   passes through the arches, a field of slabs and a stack of rings while tagline words
   assemble letter by letter. The scroll runway ([data-hero-journey]) sets its length;
   at the end the stage fades out, the runway collapses so the fly-through plays only once
   per visit, and the rest of the page scrolls in. Scrolling up before the end rewinds.
   Falls back to the CSS gradient background (and no runway) if WebGL is unavailable. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

const hero = document.querySelector('[data-hero3d]');
if (hero) init(hero);

function init(hero) {
  const canvas = hero.querySelector('.hero3d__canvas');
  const runway = document.querySelector('[data-hero-journey]');
  const stage = hero.querySelector('.hero3d__stage');
  const backdrop = hero.querySelector('.hero3d__backdrop');
  const taglineEl = hero.querySelector('[data-tagline]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    hero.classList.add('is-static');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x100c10, 16, 34);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);

  /* ---------- Lights ---------- */
  scene.add(new THREE.HemisphereLight(0xff8a6a, 0x100c10, 0.55));
  const key = new THREE.DirectionalLight(0xff5c38, 3.2);
  key.position.set(7, 9, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xff2e63, 1.4);
  fill.position.set(-9, 1, 5);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffd2c4, 1.1);
  rim.position.set(-2, 6, -10);
  scene.add(rim);

  const ribbonMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5c1a14'),
    roughness: 0.48,
    metalness: 0.12,
    side: THREE.DoubleSide,
    emissive: new THREE.Color('#ff5c38'),
    emissiveIntensity: 0
  });

  const streaks = [];
  /* Adds a solid ribbon along `pts` plus a slightly larger additive shell for light streaks. */
  function addRibbon(parent, pts, thick, width, streakOpts) {
    const mesh = new THREE.Mesh(ribbonGeometry(pts, thick, width), ribbonMat);
    parent.add(mesh);
    if (streakOpts) {
      const shellGeo = ribbonGeometry(pts, thick + 0.012, width + 0.012);
      const mat = streakMaterial(shellGeo.userData.length, streakOpts.len || 2.2);
      const shell = new THREE.Mesh(shellGeo, mat);
      shell.renderOrder = 2;
      mesh.add(shell);
      streaks.push({
        mat,
        range: streakOpts.range || [0, 1],
        dur: streakOpts.dur || 1.6,
        start: Math.random() * 6
      });
    }
    return mesh;
  }

  /* ---------- Home: ribbon arches ---------- */
  const home = new THREE.Group();
  scene.add(home);
  const LEG = 16;
  // A thicket of arches, generated so no two match: size, band width and how far each one
  // drifts with the cursor (mixed signs, so they pull apart instead of moving as one slab).
  const arand = mulberry32(21);
  const ARCHES = 18;
  const arches = [];
  for (let i = 0; i < ARCHES; i++) {
    const rx = 1.6 + arand() * 1.6;
    const h = 4.2 + arand() * 4.2;
    const w = 0.32 + Math.pow(arand(), 1.6) * 1.35;
    const pts = archPath(rx, h, LEG, 110);
    const legFrac = (LEG * 0.55) / pathLength(pts);
    const mesh = addRibbon(home, pts, 0.09 + arand() * 0.05, w, {
      range: [legFrac, 1 - legFrac],
      len: 2.2 + arand() * 1.6,
      dur: 1.2 + arand() * 1.4
    });
    const base = new THREE.Vector3(
      -2.4 + i * 1.12 + (arand() - 0.5) * 0.7,
      -3.6 + i * 0.16 + (arand() - 0.5) * 0.8,
      -i * 1.05 + (arand() - 0.5) * 0.8
    );
    mesh.position.copy(base);
    mesh.userData = {
      base,
      i,
      px: (arand() - 0.5) * 5.2,
      py: (arand() - 0.5) * 3,
      sway: 0.4 + arand() * 0.5
    };
    arches.push(mesh);
  }

  /* ---------- Journey scene 2: slab field ---------- */
  const slabs = new THREE.Group();
  scene.add(slabs);
  const rand = mulberry32(7);
  for (let i = 0; i < 18; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (2 + rand() * 7);
    const pts = [];
    for (let k = 0; k <= 40; k++) pts.push(new THREE.Vector2(0, -16 + (32 * k) / 40));
    const m = addRibbon(slabs, pts, 0.14, 0.6 + rand() * 0.9, { len: 3, dur: 0.9 + rand() * 0.8 });
    m.position.set(x, (rand() - 0.5) * 6, -34 - i * 2.6);
    m.rotation.set((rand() - 0.5) * 0.3, (rand() - 0.5) * 0.8, 0.6 + (rand() - 0.5) * 0.25);
  }

  /* ---------- Journey scene 3: ring stack ---------- */
  const rings = new THREE.Group();
  rings.position.set(0, -6, -112);
  rings.rotation.set(-1.05, 0, 0.35);
  scene.add(rings);
  [5.2, 4.4, 3.6, 2.8, 2.0, 1.2].forEach((r, i) => {
    const m = addRibbon(rings, circlePath(r, 180), 0.22, 0.32 + i * 0.05, { len: 2.5, dur: 1.4 + i * 0.15 });
    m.position.z = i * 0.75;
  });
  addRibbon(rings, circlePath(7.4, 220), 0.04, 0.05, { len: 5, dur: 2.2 });

  /* ---------- Particles ---------- */
  const P = 420;
  const pPos = new Float32Array(P * 3);
  const pSpeed = new Float32Array(P);
  for (let i = 0; i < P; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 40;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 24;
    pPos[i * 3 + 2] = 22 - Math.random() * 150;
    pSpeed[i] = 0.15 + Math.random() * 0.55;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xff9a80,
    size: 0.09,
    map: dotTexture(),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  scene.add(new THREE.Points(pGeo, pMat));

  /* ---------- Camera path for the hold ---------- */
  // Index 0 is the home view; positions and look-at targets are sampled along smooth curves.
  const keys = [
    { p: [0, 0, 20], look: [0, 0, 0] },
    { p: [2.5, 1.2, 9], look: [5, -1, -3] },
    { p: [5.5, 0.4, 0.5], look: [9, -1.5, -12] },
    { p: [2, 1, -18], look: [0, 0, -40] },
    { p: [0, 0.5, -38], look: [0, 0, -60] },
    { p: [-0.5, 0, -62], look: [0, -3, -90] },
    { p: [9, 7, -88], look: [0, -6, -112] },
    { p: [5, 5, -97], look: [0, -6, -112] }
  ];
  const posCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.p)), false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.look)), false, 'centripetal');

  /* ---------- Taglines ---------- */
  const phrases = (hero.dataset.taglines || '').split('|').map((s) => s.trim()).filter(Boolean);
  const windows = [[0.08, 0.3], [0.42, 0.64], [0.76, 1.01]];
  const spots = [{ x: 30, y: 44 }, { x: 50, y: 52 }, { x: 64, y: 46 }];
  const words = phrases.slice(0, 3).map((text, w) => {
    const el = document.createElement('div');
    el.className = 'tagline__word';
    el.style.setProperty('--x', spots[w].x + '%');
    el.style.setProperty('--y', spots[w].y + '%');
    el.setAttribute('aria-hidden', 'true');
    const parts = text.split(' ');
    let i = 0;
    parts.forEach((word, wi) => {
      const accent = wi === parts.length - 1 && parts.length > 1;
      ((wi ? ' ' : '') + word).split('').forEach((ch) => {
        const span = document.createElement('span');
        span.className = 'tagline__char' + (accent && ch !== ' ' ? ' is-accent' : '');
        span.style.setProperty('--i', i++);
        span.textContent = ch;
        el.appendChild(span);
      });
    });
    taglineEl.appendChild(el);
    return { el, text, state: '' };
  });

  function setWord(w, state) {
    if (w.state === state) return;
    w.state = state;
    w.el.classList.toggle('is-in', state === 'in');
    w.el.classList.toggle('is-out', state === 'out');
    if (state === 'in') taglineEl.setAttribute('aria-label', w.text);
  }

  /* ---------- Layout ---------- */
  const layout = { x: 2.8, y: -2.2 };
  let viewW = 0;
  let viewH = 0;
  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h || (w === viewW && h === viewH)) return;
    viewW = w;
    viewH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const narrow = hero.clientWidth < 760;
    layout.x = narrow ? -2.6 : 2.6;
    layout.y = narrow ? -1.2 : -2.2;
    home.scale.setScalar(narrow ? 0.85 : 1.45);
    if (reduced) render(0, 0);
  }
  new ResizeObserver(resize).observe(hero);

  /* ---------- Input ---------- */
  let progress = 0; // smoothed fly-through progress, 0 = home view
  const pointer = { x: 0, y: 0 };
  const follow = { x: 0, y: 0 };

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const journey = hero.classList.contains('is-journey');
    const r = journey ? { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight } : hero.getBoundingClientRect();
    const inside = journey || (e.clientX >= r.left && e.clientX <= r.left + r.width && e.clientY >= r.top && e.clientY <= r.top + r.height);
    pointer.x = inside ? ((e.clientX - r.left) / r.width) * 2 - 1 : 0;
    pointer.y = inside ? ((e.clientY - r.top) / r.height) * 2 - 1 : 0;
  });
  document.addEventListener('pointerleave', () => {
    pointer.x = 0;
    pointer.y = 0;
  });

  /* Scroll position relative to the runway.
     path: 0 at the top of the page → 1 when the runway's last screen is reached.
     exit: 0 → 1 over the next ~60% of a screen, as the following section scrolls in. */
  let played = false;
  function runwayEnd() {
    return runway.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
  }
  function scrollState() {
    if (!runway || played) return { path: 0, exit: 1 };
    const end = runwayEnd();
    const y = window.scrollY;
    return {
      path: end > 0 ? Math.min(1, Math.max(0, y / end)) : 0,
      exit: smoothstep(0, window.innerHeight * 0.6, y - end)
    };
  }

  // Third safety net: a jump (anchor link, End key) can skip the observer's threshold crossing.
  window.addEventListener('scroll', () => {
    if (!played && runway && window.scrollY - runwayEnd() >= window.innerHeight) finish();
  }, { passive: true });

  /* Once the runway has scrolled fully out of sight above the viewport, drop it so
     scrolling back up shows the plain hero instead of replaying the fly-through.
     The page is scrolled by the runway's own height, so nothing moves under the reader. */
  function finish() {
    played = true;
    // Hold the next section still: note where it sits, collapse the runway, put it back.
    const anchor = runway.nextElementSibling || document.body;
    const before = anchor.getBoundingClientRect().top;
    runway.classList.remove('is-ready');
    progress = 0;
    hero.classList.remove('is-journey');
    document.body.classList.remove('is-journey');
    stage.style.opacity = '';
    backdrop.style.opacity = '';
    const shift = anchor.getBoundingClientRect().top - before;
    const target = Math.max(0, window.scrollY + shift);
    window.scrollTo(0, target);
    // Re-apply after layout settles: scroll anchoring can otherwise move the page.
    requestAnimationFrame(() => window.scrollTo(0, target));
  }

  /* ---------- Render ---------- */
  const tmpPos = new THREE.Vector3();
  const tmpLook = new THREE.Vector3();

  function render(t, dt) {
    const { path: raw, exit } = scrollState();
    if (!played && runway && window.scrollY - runwayEnd() >= window.innerHeight) finish();
    progress += (raw - progress) * Math.min(1, dt * 5);
    if (Math.abs(raw - progress) < 0.0005) progress = raw;
    const pathT = progress;
    const p = easeInOut(pathT);
    const journey = window.scrollY > 1 && exit < 1;
    const homeWeight = 1 - smoothstep(0, 0.12, pathT);
    const away = 1 - homeWeight;

    // Cursor follow: strong at home, a subtle look-around during the journey
    const k = Math.min(1, dt * 3);
    follow.x += (pointer.x - follow.x) * k;
    follow.y += (pointer.y - follow.y) * k;

    home.position.set(layout.x + follow.x * 1.3 * homeWeight, layout.y - follow.y * 0.5 * homeWeight, 0);
    home.rotation.set(
      0.06 + follow.y * 0.08 * homeWeight,
      -0.8 + Math.sin(t * 0.12) * 0.06 + follow.x * 0.22 * homeWeight,
      -0.3
    );
    arches.forEach((m) => {
      const { base, i, px, py } = m.userData;
      // Each arch drifts its own way with the cursor, on top of the group's own slow sway.
      m.position.x = base.x + follow.x * px * homeWeight;
      m.position.y = base.y + Math.sin(t * m.userData.sway + i * 0.9) * 0.12 + follow.y * py * homeWeight;
      m.rotation.z = Math.sin(t * 0.3 + i) * 0.02 + follow.x * 0.03 * py * homeWeight;
    });
    rings.rotation.z = 0.35 + t * 0.08;

    posCurve.getPointAt(p, tmpPos);
    lookCurve.getPointAt(p, tmpLook);
    tmpLook.x += follow.x * 3 * away;
    tmpLook.y -= follow.y * 2 * away;
    camera.position.copy(tmpPos);
    camera.up.set(Math.sin(p * Math.PI * 1.2) * 0.25, 1, 0).normalize();
    camera.lookAt(tmpLook);

    ribbonMat.emissiveIntensity = away * 0.12;
    pMat.opacity = 0.55 + away * 0.25;

    // Particles drift up, and rush a little during the journey
    const speed = 0.12 + away * 1.2;
    for (let i = 0; i < P; i++) {
      let y = pPos[i * 3 + 1] + pSpeed[i] * dt * speed;
      if (y > 12) y = -12;
      pPos[i * 3 + 1] = y;
    }
    pGeo.attributes.position.needsUpdate = true;

    // Light streaks: occasional at home, frequent during the journey
    streaks.forEach((s) => {
      const u = (t - s.start) / s.dur;
      if (u < 0) { s.mat.uniforms.uHead.value = -1; return; }
      if (u > 1) {
        s.start = t + (journey ? 0.3 + Math.random() * 2 : 4 + Math.random() * 12);
        s.mat.uniforms.uHead.value = -1;
        return;
      }
      const [a, b] = s.range;
      s.mat.uniforms.uHead.value = a + (b - a + 0.1) * u;
      s.mat.uniforms.uIntensity.value = 1.4 + away * 0.8;
    });

    resize();
    renderer.render(scene, camera);

    // Taglines
    words.forEach((w, i) => {
      const [a, b] = windows[i];
      if (journey && exit < 0.05 && pathT >= a && pathT < b) setWord(w, 'in');
      else if (w.state === 'in') setWord(w, 'out');
    });

    // Page chrome
    hero.classList.toggle('is-journey', journey);
    document.body.classList.toggle('is-journey', journey && exit < 0.5);
    const fade = journey ? String(1 - exit) : '';
    stage.style.opacity = fade;
    backdrop.style.opacity = fade;
  }

  if (reduced) {
    hero.classList.add('is-static');
    resize();
    render(0, 0);
    return;
  }

  if (runway) runway.classList.add('is-ready');

  // Keep rendering while the hero or its scroll runway is on screen.
  const onScreen = new Set();
  let running = true;
  let last = performance.now();
  let t = 0;
  function frame(now) {
    if (!running) return;
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    t += dt;
    render(t, dt);
    requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => (en.isIntersecting ? onScreen.add(en.target) : onScreen.delete(en.target)));
    if (onScreen.size > 0 && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (onScreen.size === 0) {
      running = false;
    }
    // Scrolled clear of the runway: the fly-through is over.
    entries.forEach((en) => {
      if (en.target === runway && !en.isIntersecting && !played && window.scrollY > runwayEnd()) finish();
    });
  });
  io.observe(hero);
  if (runway) io.observe(runway);

  resize();
  requestAnimationFrame(frame);
}

/* ---------- Geometry helpers ---------- */

/* Arch centreline: left leg up, half-ellipse over the top, right leg down. */
function archPath(rx, h, leg, arcSteps) {
  const pts = [];
  const legSteps = 16;
  for (let i = 0; i < legSteps; i++) pts.push(new THREE.Vector2(-rx, -leg + (leg * i) / legSteps));
  for (let i = 0; i <= arcSteps; i++) {
    const a = Math.PI - (Math.PI * i) / arcSteps;
    pts.push(new THREE.Vector2(rx * Math.cos(a), h * Math.sin(a)));
  }
  for (let i = 1; i <= legSteps; i++) pts.push(new THREE.Vector2(rx, -(leg * i) / legSteps));
  return pts;
}

function circlePath(r, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return pts;
}

function pathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
  return len;
}

/* Flat band swept along a 2D path: `thick` in the path plane, `width` along Z.
   Adds aU (0→1 along the path) and aEdge (−1/1 across the width) for the streak shader. */
function ribbonGeometry(pts, thick, width) {
  const N = pts.length;
  const closed = pts[0].distanceTo(pts[N - 1]) < 1e-4;
  const frames = pts.map((p, i) => {
    let ia = i - 1;
    let ib = i + 1;
    if (closed) {
      if (ia < 0) ia = N - 2;
      if (ib > N - 1) ib = 1;
    } else {
      ia = Math.max(0, ia);
      ib = Math.min(N - 1, ib);
    }
    const t = new THREE.Vector2(pts[ib].x - pts[ia].x, pts[ib].y - pts[ia].y).normalize();
    return { p, n: new THREE.Vector2(-t.y, t.x) };
  });
  const cum = [0];
  for (let i = 1; i < N; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const total = cum[N - 1];

  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const pos = [];
  const us = [];
  const edges = [];
  const idx = [];
  let base = 0;
  for (let s = 0; s < 4; s++) {
    const c0 = corners[s];
    const c1 = corners[(s + 1) % 4];
    for (let i = 0; i < N; i++) {
      const { p, n } = frames[i];
      for (const c of [c0, c1]) {
        pos.push(p.x + n.x * thick * c[0], p.y + n.y * thick * c[0], width * c[1]);
        us.push(cum[i] / total);
        edges.push(c[1]);
      }
    }
    for (let i = 0; i < N - 1; i++) {
      const a = base + i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    base += N * 2;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aU', new THREE.Float32BufferAttribute(us, 1));
  g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edges, 1));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.userData.length = total;
  return g;
}

/* Glowing head with a fading tail that travels along aU, brightest at the ribbon's edges. */
function streakMaterial(pathLen, worldLen) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uHead: { value: -1 },
      uLen: { value: worldLen / pathLen },
      uColor: { value: new THREE.Color('#fff1ea') },
      uIntensity: { value: 1.4 },
      uFar: { value: 38 }
    },
    vertexShader: `
      attribute float aU;
      attribute float aEdge;
      varying float vU;
      varying float vEdge;
      varying float vDepth;
      void main() {
        vU = aU;
        vEdge = aEdge;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform float uHead;
      uniform float uLen;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uFar;
      varying float vU;
      varying float vEdge;
      varying float vDepth;
      void main() {
        float d = uHead - vU;
        float tail = smoothstep(-0.002, 0.0, d) * exp(-max(d, 0.0) / uLen);
        float edge = smoothstep(0.6, 1.0, abs(vEdge));
        float fade = 1.0 - smoothstep(uFar * 0.55, uFar, vDepth);
        float a = tail * edge * uIntensity * fade;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function easeInOut(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

/* Small seeded RNG so the slab field looks the same on every load. */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
