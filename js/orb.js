/* Dataverse — closing orb.
   A glass sphere holding a stack of ribbon slabs, with a light arc travelling its rim.
   Sits behind the contact section and turns slowly as that section scrolls through view,
   so the page closes on the same material the hero opens with.
   Does nothing if WebGL is unavailable or the visitor asked for reduced motion. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
import { circlePath, ribbonGeometry, streakMaterial, dotTexture, mulberry32 } from './ribbon.js';

const host = document.querySelector('[data-orb]');
if (host && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) init(host);

function init(host) {
  const canvas = host.querySelector('.orb__canvas');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 16);

  scene.add(new THREE.HemisphereLight(0xff8a6a, 0x100c10, 0.5));
  const key = new THREE.DirectionalLight(0xff5c38, 2.6);
  key.position.set(5, 6, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff2e63, 1.2);
  rim.position.set(-6, 2, -6);
  scene.add(rim);

  const group = new THREE.Group();
  group.position.x = -0.8;
  scene.add(group);

  /* Stacked slabs: concentric ribbon walls of different heights, like a cut-away core. */
  const slabMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#5c1a14'),
    roughness: 0.45,
    metalness: 0.15,
    side: THREE.DoubleSide
  });
  const rand = mulberry32(11);
  const streaks = [];
  [3.3, 2.75, 2.2, 1.65, 1.1, 0.6].forEach((r, i) => {
    const pts = circlePath(r, 150);
    const mesh = new THREE.Mesh(ribbonGeometry(pts, 0.2, 0.5 + rand() * 0.7), slabMat);
    mesh.position.z = -1.9 + i * 0.76;
    mesh.rotation.z = rand() * Math.PI;
    group.add(mesh);
  });

  /* The light that travels the rim. */
  const arcGeo = ribbonGeometry(circlePath(4.05, 200), 0.03, 0.05);
  const arcMat = streakMaterial(arcGeo.userData.length, 7);
  arcMat.uniforms.uFar.value = 60;
  arcMat.uniforms.uIntensity.value = 2.2;
  const arc = new THREE.Mesh(arcGeo, arcMat);
  arc.rotation.set(0.5, 0.2, 0);
  group.add(arc);
  streaks.push({ mat: arcMat, dur: 3.4, start: 1 });

  /* The glass shell: a dark sphere plus a fresnel rim that only shows at the edges. */
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(4.6, 64, 48),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color('#2a0f0d'),
      roughness: 0.35,
      metalness: 0,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  group.add(shell);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(4.62, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#ff5c38') } },
      vertexShader: `
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          vN = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec3 vN;
        varying vec3 vV;
        void main() {
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 3.2);
          gl_FragColor = vec4(uColor * f, f * 0.85);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    })
  );
  group.add(glow);

  /* Dust inside the shell. */
  const P = 160;
  const pos = new Float32Array(P * 3);
  for (let i = 0; i < P; i++) {
    const r = 4.4 * Math.cbrt(rand());
    const th = rand() * Math.PI * 2;
    const ph = Math.acos(2 * rand() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  group.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xffb49c,
    size: 0.055,
    map: dotTexture(),
    transparent: true,
    opacity: 0.6,
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
    group.scale.setScalar(w < 760 ? 0.72 : 1);
  }
  new ResizeObserver(resize).observe(host);

  let running = false;
  let last = performance.now();
  let t = 0;

  function frame(now) {
    if (!running) return;
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.05));
    last = now;
    t += dt;
    resize();

    // How far the section has travelled through the viewport, -1 → 1
    const r = host.getBoundingClientRect();
    const travel = 1 - 2 * ((r.top + r.height / 2) / window.innerHeight);

    const k = Math.min(1, dt * 2.5);
    follow.x += (pointer.x - follow.x) * k;
    follow.y += (pointer.y - follow.y) * k;

    // Tilted well off axis so the stack reads as slabs seen edge-on, not a bullseye
    group.rotation.set(
      -1.02 + travel * 0.28 + follow.y * 0.12,
      0.45 + t * 0.05 + travel * 0.35 + follow.x * 0.2,
      0.22
    );

    streaks.forEach((s) => {
      const u = (t - s.start) / s.dur;
      if (u < 0 || u > 1) {
        if (u > 1) s.start = t + 1.5 + Math.random() * 4;
        s.mat.uniforms.uHead.value = -1;
        return;
      }
      s.mat.uniforms.uHead.value = u * 1.1;
    });

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
