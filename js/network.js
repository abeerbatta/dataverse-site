/* Dataverse — constellation network.
   Nodes joined by lines drawn as fine dust, a few nodes in the accent colour, and pulses
   of light that travel the links. Sits behind the contact section, drifts slowly and leans
   with the cursor. The same idea as the logomark, at page scale.
   Skipped entirely without WebGL or for reduced-motion visitors. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
import { dotTexture, mulberry32 } from './ribbon.js';

const host = document.querySelector('[data-network]');
if (host && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) init(host);

function init(host) {
  const canvas = host.querySelector('.network__canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 15);

  const group = new THREE.Group();
  scene.add(group);

  const rand = mulberry32(5);
  const INK = new THREE.Color('#EDE4E0');
  const ACCENT = new THREE.Color('#FF5C38');

  /* ---------- Nodes ---------- */
  // Spread over a jittered grid so the network fills the frame instead of clumping
  const COLS = 7;
  const ROWS = 5;
  const nodes = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (rand() < 0.14) continue; // leave the odd gap
      nodes.push({
        p: new THREE.Vector3(
          -9 + (c + 0.5) * (18 / COLS) + (rand() - 0.5) * 2.2,
          -5 + (r + 0.5) * (10 / ROWS) + (rand() - 0.5) * 1.6,
          (rand() - 0.5) * 5
        ),
        accent: rand() < 0.14,
        phase: rand() * Math.PI * 2
      });
    }
  }

  /* Join each node to its nearest few, without duplicating a link. */
  const links = [];
  const seen = new Set();
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: n.p.distanceTo(m.p) }))
      .filter((x) => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2 + Math.floor(rand() * 2));
    near.forEach(({ j, d }) => {
      const key = i < j ? i + ':' + j : j + ':' + i;
      if (seen.has(key) || d > 7) return;
      seen.add(key);
      links.push([i, j]);
    });
  });

  /* ---------- Links drawn as dust ---------- */
  const DUST_PER_UNIT = 16;
  const dustPos = [];
  const dustAlpha = [];
  const dustSeed = [];
  const dustSize = [];
  links.forEach(([a, b]) => {
    const pa = nodes[a].p;
    const pb = nodes[b].p;
    const count = Math.max(10, Math.round(pa.distanceTo(pb) * DUST_PER_UNIT));
    for (let k = 0; k < count; k++) {
      const t = k / (count - 1);
      // Slight wander off the straight line, thinnest in the middle of the run
      const spread = 0.055 + Math.sin(t * Math.PI) * 0.1;
      dustPos.push(
        pa.x + (pb.x - pa.x) * t + (rand() - 0.5) * spread,
        pa.y + (pb.y - pa.y) * t + (rand() - 0.5) * spread,
        pa.z + (pb.z - pa.z) * t + (rand() - 0.5) * spread
      );
      // Brighter near the ends, so links feel anchored to their nodes
      const ends = Math.pow(1 - Math.sin(t * Math.PI), 1.5);
      dustAlpha.push(0.4 + ends * 0.6 + rand() * 0.2);
      dustSeed.push(rand() * Math.PI * 2);
      dustSize.push(0.075 + rand() * 0.07);
    }
  });

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3));
  dustGeo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(dustAlpha, 1));
  dustGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(dustSeed, 1));
  dustGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(dustSize, 1));

  const dustMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: INK },
      uMap: { value: dotTexture() },
      uScale: { value: 600 }
    },
    vertexShader: `
      attribute float aAlpha;
      attribute float aSeed;
      attribute float aSize;
      uniform float uTime;
      uniform float uScale;
      varying float vAlpha;
      void main() {
        vAlpha = aAlpha * (0.55 + 0.45 * sin(uTime * 0.9 + aSeed));
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform sampler2D uMap;
      varying float vAlpha;
      void main() {
        float m = texture2D(uMap, gl_PointCoord).a;
        gl_FragColor = vec4(uColor, m * vAlpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  group.add(new THREE.Points(dustGeo, dustMat));

  /* ---------- Node lights ---------- */
  const nodePos = [];
  const nodeCol = [];
  const nodeSize = [];
  const nodeSeed = [];
  nodes.forEach((n) => {
    nodePos.push(n.p.x, n.p.y, n.p.z);
    const c = n.accent ? ACCENT : INK;
    nodeCol.push(c.r, c.g, c.b);
    nodeSize.push(n.accent ? 0.85 : 0.42 + rand() * 0.3);
    nodeSeed.push(n.phase);
  });
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute('position', new THREE.Float32BufferAttribute(nodePos, 3));
  nodeGeo.setAttribute('aColor', new THREE.Float32BufferAttribute(nodeCol, 3));
  nodeGeo.setAttribute('aSize', new THREE.Float32BufferAttribute(nodeSize, 1));
  nodeGeo.setAttribute('aSeed', new THREE.Float32BufferAttribute(nodeSeed, 1));

  const nodeMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMap: { value: dotTexture() }, uScale: { value: 600 } },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aSeed;
      uniform float uTime;
      uniform float uScale;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        vAlpha = 0.65 + 0.35 * sin(uTime * 1.3 + aSeed);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float m = texture2D(uMap, gl_PointCoord).a;
        gl_FragColor = vec4(vColor, m * vAlpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  group.add(new THREE.Points(nodeGeo, nodeMat));

  /* ---------- Pulses running along the links ---------- */
  const PULSES = 7;
  const pulses = [];
  const pulsePos = new Float32Array(PULSES * 3);
  for (let i = 0; i < PULSES; i++) {
    pulses.push({ link: Math.floor(rand() * links.length), t: rand(), speed: 0.18 + rand() * 0.3 });
  }
  const pulseGeo = new THREE.BufferGeometry();
  pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePos, 3));
  const pulseMat = new THREE.PointsMaterial({
    color: ACCENT,
    size: 0.75,
    map: dotTexture(),
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  group.add(new THREE.Points(pulseGeo, pulseMat));

  /* ---------- Far stars ---------- */
  const S = 220;
  const starPos = new Float32Array(S * 3);
  for (let i = 0; i < S; i++) {
    starPos[i * 3] = (rand() - 0.5) * 46;
    starPos[i * 3 + 1] = (rand() - 0.5) * 26;
    starPos[i * 3 + 2] = -6 - rand() * 18;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xd8cec9,
    size: 0.1,
    map: dotTexture(),
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })));

  /* ---------- Behaviour ---------- */
  const pointer = { x: 0, y: 0 };
  const follow = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const r = host.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  });

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
    const scale = renderer.getPixelRatio() * h * 1.1;
    dustMat.uniforms.uScale.value = scale;
    nodeMat.uniforms.uScale.value = scale;
    group.scale.setScalar(w < 760 ? 0.78 : 1);
  }
  new ResizeObserver(resize).observe(host);

  let running = false;
  let last = performance.now();
  let t = 0;
  const tmp = new THREE.Vector3();

  function frame(now) {
    if (!running) return;
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    t += dt;
    resize();

    dustMat.uniforms.uTime.value = t;
    nodeMat.uniforms.uTime.value = t;

    // Pulses travel their link, then hop to another one
    pulses.forEach((p, i) => {
      p.t += dt * p.speed;
      if (p.t > 1) {
        p.t = 0;
        p.link = Math.floor(rand() * links.length);
        p.speed = 0.18 + rand() * 0.3;
      }
      const [a, b] = links[p.link];
      tmp.copy(nodes[a].p).lerp(nodes[b].p, p.t);
      pulsePos[i * 3] = tmp.x;
      pulsePos[i * 3 + 1] = tmp.y;
      pulsePos[i * 3 + 2] = tmp.z;
    });
    pulseGeo.attributes.position.needsUpdate = true;

    // How far the section has travelled through the viewport, -1 → 1
    const r = host.getBoundingClientRect();
    const travel = 1 - 2 * ((r.top + r.height / 2) / window.innerHeight);

    const k = Math.min(1, dt * 2);
    follow.x += (pointer.x - follow.x) * k;
    follow.y += (pointer.y - follow.y) * k;

    group.rotation.set(
      follow.y * 0.14 + Math.sin(t * 0.08) * 0.03,
      follow.x * 0.26 + t * 0.02,
      0
    );
    group.position.set(follow.x * 0.6, -follow.y * 0.4 + travel * 0.9, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) {
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    } else if (!entry.isIntersecting) {
      running = false;
    }
  }, { rootMargin: '10% 0px' }).observe(host);

  resize();
}
