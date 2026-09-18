/* Dataverse — hero night sky (Three.js).
   Idle: a deep star field behind slow cloud banks, both leaning with the cursor.
   Scrolling down from the hero plays a fly-through on a full-screen stage: the camera
   climbs up through the cloud layers into clear sky while tagline words assemble letter
   by letter. The scroll runway ([data-hero-journey]) sets its length; at the end the stage
   fades out, the runway collapses so the fly-through plays only once per visit, and the
   rest of the page scrolls in. Scrolling up before the end rewinds.
   Falls back to the CSS gradient background (and no runway) if WebGL is unavailable. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';
import { dotTexture, smoothstep, easeInOut, mulberry32 } from './ribbon.js';

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  const rand = mulberry32(9);

  /* ---------- Stars ---------- */
  const STARS = 1400;
  const starPos = new Float32Array(STARS * 3);
  const starSize = new Float32Array(STARS);
  const starSeed = new Float32Array(STARS);
  const starTint = new Float32Array(STARS);
  for (let i = 0; i < STARS; i++) {
    starPos[i * 3] = (rand() - 0.5) * 300;
    starPos[i * 3 + 1] = (rand() - 0.5) * 200;
    starPos[i * 3 + 2] = -40 - rand() * 260;
    starSize[i] = 0.45 + Math.pow(rand(), 7) * 3.0;   // a few large, most small
    starSeed[i] = rand() * Math.PI * 2;
    starTint[i] = rand() < 0.12 ? 1 : 0;             // a handful pick up the brand red
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
  starGeo.setAttribute('aSeed', new THREE.BufferAttribute(starSeed, 1));
  starGeo.setAttribute('aTint', new THREE.BufferAttribute(starTint, 1));

  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 700 },
      uMap: { value: dotTexture() },
      uCool: { value: new THREE.Color('#EFE7E4') },
      uWarm: { value: new THREE.Color('#FF7A5C') }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aSeed;
      attribute float aTint;
      uniform float uTime;
      uniform float uScale;
      varying float vAlpha;
      varying float vTint;
      void main() {
        vTint = aTint;
        vAlpha = 0.45 + 0.55 * sin(uTime * 0.7 + aSeed);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uCool;
      uniform vec3 uWarm;
      varying float vAlpha;
      varying float vTint;
      void main() {
        float m = texture2D(uMap, gl_PointCoord).a;
        vec3 c = mix(uCool, uWarm, vTint);
        gl_FragColor = vec4(c, m * vAlpha);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  /* ---------- Clouds ----------
     Raymarched, not stacked planes: for every pixel we walk the ray through a slab of
     noise and accumulate density, so the bank has depth and the camera can rise through
     it. Rendered at half resolution into a texture and drawn over the stars, which keeps
     the step count affordable. */
  const noiseTex = noiseTexture(256, mulberry32(4));
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.minFilter = noiseTex.magFilter = THREE.LinearFilter;

  const cloudTarget = new THREE.WebGLRenderTarget(2, 2, {
    magFilter: THREE.LinearFilter,
    minFilter: THREE.LinearFilter,
    depthBuffer: false
  });

  const cloudMat = new THREE.ShaderMaterial({
    uniforms: {
      uNoise: { value: noiseTex },
      uTime: { value: 0 },
      uRes: { value: new THREE.Vector2(1, 1) },
      uCamY: { value: 0 },        // rises during the climb
      uPitch: { value: 0 },       // cursor tilt
      uSpeed: { value: 0.55 },
      uFade: { value: 1 },        // thins out once above the deck
      uCloud: { value: new THREE.Color('#3A2A33') },
      uLight: { value: new THREE.Color('#E9DDE3') },
      uGlow: { value: new THREE.Color('#FF5C38') }
    },
    vertexShader: `
      void main() {
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    /* Cloud march adapted from Vanta.js CLOUDS2 (MIT) — Copyright (c) 2019 Teng Bao.
       https://github.com/tengbao/vanta
       Changed here: transparent output so the stars show through the gaps, a rising
       camera for the scroll climb, and this site's colours. */
    fragmentShader: `
      precision highp float;
      uniform sampler2D uNoise;
      uniform vec2 uRes;
      uniform float uTime, uCamY, uPitch, uSpeed, uFade;
      uniform vec3 uCloud, uLight, uGlow;

      #define T texture2D(uNoise, fract((s * p.zw + ceil(s * p.x)) / 200.0)).y / (s += s) * 4.0

      void main() {
        vec2 coord = gl_FragCoord.xy;
        vec4 p, d = vec4(0.8, 0.0, coord / uRes.y - vec2(0.65, 0.65 + uPitch));
        vec3 col = vec3(0.0);
        float alpha = 0.0;
        float s, f, t = 200.0 + sin(dot(coord, coord));
        for (float i = 1.0; i <= 80.0; i += 1.0) {
          t -= 2.0; if (t < 0.0) break;
          p = 0.05 * t * d;
          p.xz += uTime * 0.5 * uSpeed;          // drift
          p.x += sin(uTime * 0.25 * uSpeed) * 0.25;
          p.w += uCamY;                          // the climb
          s = 2.0;
          f = p.w + 1.0 - T - T - T - T;
          if (f < 0.0) {
            vec3 shade = mix(uLight, uCloud, -f);
            shade += uGlow * 0.10 * clamp(-f, 0.0, 1.0);   // warm underside
            float a = clamp(-f * 0.4, 0.0, 1.0);
            col = mix(col, shade, a);
            alpha = alpha + (1.0 - alpha) * a;
          }
        }
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0) * uFade);
      }`,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  // A single triangle covering the screen, rendered with its own flat camera
  const screenGeo = new THREE.BufferGeometry();
  screenGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  screenGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const flatCam = new THREE.Camera();
  const cloudScene = new THREE.Scene();
  cloudScene.add(new THREE.Mesh(screenGeo, cloudMat));

  // The half-res cloud texture, drawn over the stars
  const compositeMat = new THREE.ShaderMaterial({
    uniforms: { uMap: { value: cloudTarget.texture } },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec2 vUv;
      void main() { gl_FragColor = texture2D(uMap, vUv); }`,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const compositeScene = new THREE.Scene();
  compositeScene.add(new THREE.Mesh(screenGeo, compositeMat));

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
  let needsResize = true;
  function resize() {
    if (!needsResize) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    needsResize = false;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    starMat.uniforms.uScale.value = renderer.getPixelRatio() * h * 0.6;
    const cw = Math.max(2, Math.round(w * 0.55));
    const ch = Math.max(2, Math.round(h * 0.55));
    cloudTarget.setSize(cw, ch);
    cloudMat.uniforms.uRes.value.set(cw, ch);
    if (reduced) render(0, 0);
  }
  const ro = new ResizeObserver(() => { needsResize = true; });
  ro.observe(hero);
  ro.observe(canvas);

  /* ---------- Input ---------- */
  let progress = 0;
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

  let played = false;
  let endY = 0;
  function measure() {
    if (!runway || played || !runway.offsetHeight) return;
    endY = runway.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
  }
  function runwayEnd() { return endY; }
  window.addEventListener('resize', () => { needsResize = true; measure(); });
  measure();

  function scrollState() {
    if (!runway || played || endY <= 0) return { path: 0, exit: 1 };
    const end = runwayEnd();
    const y = window.scrollY;
    return {
      path: end > 0 ? Math.min(1, Math.max(0, y / end)) : 0,
      exit: smoothstep(0, window.innerHeight * 0.6, y - end)
    };
  }

  window.addEventListener('scroll', () => {
    measure();
    if (!played && runway && window.scrollY - runwayEnd() >= window.innerHeight) finish();
  }, { passive: true });

  function finish() {
    if (played || !runway || endY <= 0) return;
    played = true;
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
    requestAnimationFrame(() => window.scrollTo(0, target));
  }

  /* ---------- Render ---------- */
  function render(t, dt) {
    const { path: raw, exit } = scrollState();
    progress += (raw - progress) * Math.min(1, dt * 5);
    if (Math.abs(raw - progress) < 0.0005) progress = raw;
    const p = easeInOut(progress);
    const journey = window.scrollY > 1 && exit < 1;

    const k = Math.min(1, dt * 3);
    follow.x += (pointer.x - follow.x) * k;
    follow.y += (pointer.y - follow.y) * k;

    // The climb: up through the banks, levelling out in clear sky
    camera.position.set(follow.x * 1.6, -2 + p * 46 + follow.y * -1.2, 22 - p * 150);
    camera.rotation.set(0.12 + p * 0.22 + follow.y * 0.04, follow.x * 0.06, Math.sin(t * 0.05) * 0.01 + p * 0.05);

    cloudMat.uniforms.uTime.value = t;
    cloudMat.uniforms.uCamY.value = 1.05 + p * 1.5;                 // sit above the deck, then climb
    cloudMat.uniforms.uPitch.value = follow.y * 0.04 - p * 0.28;
    cloudMat.uniforms.uFade.value = 1 - smoothstep(0.6, 1, progress) * 0.95;

    starMat.uniforms.uTime.value = t;
    stars.rotation.y = follow.x * 0.03 + t * 0.002;

    resize();
    // clouds at half resolution, then stars, then the clouds over the top
    renderer.setRenderTarget(cloudTarget);
    renderer.clear();
    renderer.render(cloudScene, flatCam);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
    renderer.autoClear = false;
    renderer.render(compositeScene, flatCam);
    renderer.autoClear = true;

    words.forEach((w, i) => {
      const [a, b] = windows[i];
      if (journey && exit < 0.05 && progress >= a && progress < b) setWord(w, 'in');
      else if (w.state === 'in') setWord(w, 'out');
    });

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
  measure();

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
    entries.forEach((en) => {
      if (en.target === runway && !en.isIntersecting && !played && window.scrollY > runwayEnd()) finish();
    });
  });
  io.observe(hero);
  if (runway) io.observe(runway);

  resize();
  requestAnimationFrame(frame);
}

/* Noise texture for the cloud raymarch: white noise, one value per texel, with the green
   channel holding the neighbouring slice. The shader's bilinear reads turn it into smooth
   3D value noise, which is what gives the clouds their billows. */
function noiseTexture(size, rnd) {
  const r = new Uint8Array(size * size);
  for (let i = 0; i < r.length; i++) r[i] = Math.floor(rnd() * 256);

  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // the slice offset the shader steps by: (37, 17)
      const j = ((y + 17) % size) * size + ((x + 37) % size);
      img.data[i] = r[y * size + x];
      img.data[i + 1] = r[j];
      img.data[i + 2] = 0;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  return tex;
}
