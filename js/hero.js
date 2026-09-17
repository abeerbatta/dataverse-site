/* Dataverse — hero 3D scene.
   Ribbon arches + drifting particles rendered with Three.js. The ribbons follow the cursor
   (right when it moves right, up when it moves up). Cursor movement (or scrolling on touch
   devices) also builds "energy" that fans the ribbons out, brightens the light and speeds
   the particles; it powers back down when movement stops.
   Falls back to the CSS gradient background if WebGL is unavailable. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

const hero = document.querySelector('[data-hero3d]');
if (hero) init(hero);

function init(hero) {
  const canvas = hero.querySelector('.hero3d__canvas');
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

  const BG = 0x100c10;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(BG, 16, 34);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const CAM_Z = 20;
  camera.position.set(0, 0, CAM_Z);

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

  /* ---------- Ribbons ---------- */
  const ribbonMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5c1a14'),
    roughness: 0.48,
    metalness: 0.12,
    side: THREE.DoubleSide,
    emissive: new THREE.Color('#ff5c38'),
    emissiveIntensity: 0
  });

  const group = new THREE.Group();
  scene.add(group);

  const specs = [
    { rx: 2.7, h: 5.0 },
    { rx: 2.5, h: 5.7 },
    { rx: 2.3, h: 6.4 },
    { rx: 2.1, h: 7.1 }
  ];
  const arches = specs.map((s, i) => {
    const mesh = new THREE.Mesh(ribbonGeometry(archPath(s.rx, s.h, 16, 120), 0.1, 1.05), ribbonMat);
    const base = new THREE.Vector3(i * 1.7, -3.4 + i * 0.3, -i * 1.9);
    mesh.position.copy(base);
    mesh.userData = { base, i };
    group.add(mesh);
    return mesh;
  });

  /* ---------- Particles ---------- */
  const P = 220;
  const pPos = new Float32Array(P * 3);
  const pSpeed = new Float32Array(P);
  for (let i = 0; i < P; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 34;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 14;
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

  /* ---------- Layout ---------- */
  let narrow = false;
  const layout = { x: 0, y: 0 };
  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    narrow = w < 760;
    if (narrow) {
      layout.x = -1.6; layout.y = -1.2;
      group.scale.setScalar(1.05);
    } else {
      layout.x = 2.8; layout.y = -2.2;
      group.scale.setScalar(2.0);
    }
    if (reduced) render(0, 0);
  }
  new ResizeObserver(resize).observe(hero);

  /* ---------- Interaction ---------- */
  // Movement adds to `impulse`; each frame it's converted into energy, which decays on its own.
  const GAIN = 1.2;   // energy per hero-width of cursor travel
  const DECAY = 0.55; // energy lost per second when still
  let energy = 0;
  let impulse = 0;
  const pointer = { x: 0, y: 0 };
  const cam = { x: 0, y: 0 };

  let prev = null; // last cursor position inside the hero (null after leaving)
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (prev) impulse += Math.hypot(x - prev.x, (y - prev.y) * (r.height / r.width)) / 2;
    prev = { x, y };
    pointer.x = x;
    pointer.y = y;
  });
  hero.addEventListener('pointerleave', () => {
    prev = null;
    pointer.x = 0;
    pointer.y = 0;
  });

  // Touch devices have no hover — scrolling through the hero powers it instead.
  let lastScroll = window.scrollY;
  window.addEventListener('scroll', () => {
    impulse += (Math.abs(window.scrollY - lastScroll) / window.innerHeight) * 1.5;
    lastScroll = window.scrollY;
  }, { passive: true });

  /* ---------- Render loop ---------- */
  function render(t, dt) {
    energy = Math.min(1, Math.max(0, energy + impulse * GAIN - dt * DECAY));
    impulse = 0;
    const e = energy * energy * (3 - 2 * energy);

    arches.forEach((m) => {
      const { base, i } = m.userData;
      m.position.x = base.x * (1 + e * 0.5);
      m.position.z = base.z * (1 + e * 0.7);
      m.position.y = base.y + Math.sin(t * 0.5 + i * 0.9) * 0.12 + e * i * 0.3;
      m.rotation.z = Math.sin(t * 0.3 + i) * 0.02 - e * 0.06 * i;
    });
    // Follow the cursor: shift and turn toward it
    cam.x += (pointer.x - cam.x) * Math.min(1, dt * 3);
    cam.y += (pointer.y - cam.y) * Math.min(1, dt * 3);
    group.position.set(layout.x + cam.x * 2.6, layout.y - cam.y * 1.0, 0);
    group.rotation.set(
      0.06 + cam.y * 0.1,
      -0.8 + Math.sin(t * 0.12) * 0.06 + e * 0.28 + cam.x * 0.35,
      -0.3
    );

    ribbonMat.emissiveIntensity = e * 0.4;
    key.intensity = 3.2 + e * 4.5;
    pMat.opacity = 0.55 + e * 0.35;

    const speed = 0.12 + e * 3.2;
    for (let i = 0; i < P; i++) {
      let y = pPos[i * 3 + 1] + pSpeed[i] * dt * speed;
      if (y > 10) y = -10;
      pPos[i * 3 + 1] = y;
    }
    pGeo.attributes.position.needsUpdate = true;

    camera.position.set(0, 0, CAM_Z - e * 2.5);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  if (reduced) {
    hero.classList.add('is-static');
    resize();
    render(0, 0);
    return;
  }

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
  new IntersectionObserver(([entry]) => {
    const visible = entry.isIntersecting;
    if (visible && !running) {
      running = true;
      impulse = 0;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!visible) {
      running = false;
    }
  }).observe(hero);

  resize();
  requestAnimationFrame(frame);
}

/* Arch centreline: left leg up, half-ellipse over the top, right leg down. */
function archPath(rx, h, leg, arcSteps) {
  const pts = [];
  const legSteps = 12;
  for (let i = 0; i < legSteps; i++) pts.push(new THREE.Vector2(-rx, -leg + (leg * i) / legSteps));
  for (let i = 0; i <= arcSteps; i++) {
    const a = Math.PI - (Math.PI * i) / arcSteps;
    pts.push(new THREE.Vector2(rx * Math.cos(a), h * Math.sin(a)));
  }
  for (let i = 1; i <= legSteps; i++) pts.push(new THREE.Vector2(rx, -(leg * i) / legSteps));
  return pts;
}

/* Flat band swept along a 2D path: `thick` in the arch plane, `width` along Z. */
function ribbonGeometry(pts, thick, width) {
  const N = pts.length;
  const frames = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(N - 1, i + 1)];
    const t = new THREE.Vector2(b.x - a.x, b.y - a.y).normalize();
    return { p, n: new THREE.Vector2(-t.y, t.x) };
  });
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const pos = [];
  const idx = [];
  let base = 0;
  for (let s = 0; s < 4; s++) {
    const c0 = corners[s];
    const c1 = corners[(s + 1) % 4];
    for (let i = 0; i < N; i++) {
      const { p, n } = frames[i];
      for (const c of [c0, c1]) {
        pos.push(p.x + n.x * thick * c[0], p.y + n.y * thick * c[0], width * c[1]);
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
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
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
