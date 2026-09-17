/* Dataverse — shared 3D helpers for the hero and the orb scene. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.min.js';

/* ---------- Geometry helpers ---------- */

/* Arch centreline: left leg up, half-ellipse over the top, right leg down. */
export function archPath(rx, h, leg, arcSteps) {
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

export function circlePath(r, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  return pts;
}

export function pathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += pts[i].distanceTo(pts[i - 1]);
  return len;
}

/* Flat band swept along a 2D path: `thick` in the path plane, `width` along Z.
   Adds aU (0→1 along the path) and aEdge (−1/1 across the width) for the streak shader. */
export function ribbonGeometry(pts, thick, width) {
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
export function streakMaterial(pathLen, worldLen) {
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

export function dotTexture() {
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

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function easeInOut(x) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

/* Small seeded RNG so the slab field looks the same on every load. */
export function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
