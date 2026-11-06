/* Livii 住宅プラン — 3D表示（three.js r147 を lib/ に同梱）。
   図面は mm、3D は m。X＝東、Z＝南（図面の y）、Y＝上。 */
'use strict';

const M = v => v / 1000;
const LAT = 33;            // 日影の計算に使う緯度（熊本）
const matCache = new Map();
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .85, metalness: 0 }, o)));
  return matCache.get(key);
}
const GLASS = () => mat('#9fc0d4', { transparent: true, opacity: .35, roughness: .1, metalness: .2, depthWrite: false });
function mesh(geo, m, shadow = true) { const x = new THREE.Mesh(geo, m); x.castShadow = shadow; x.receiveShadow = true; return x; }
// 下面が y の箱（中心 x,z）
function B(g, w, h, d, x, y, z, color, o) {
  if (w <= 0 || h <= 0 || d <= 0) return null;
  const m = mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color, o) : color);
  m.position.set(x, y + h / 2, z); g.add(m); return m;
}
// 図面の四角 r（mm）の範囲で y0〜y1 の箱
function boxRect(r, y0, y1, color, shadow = true) {
  const m = mesh(new THREE.BoxGeometry(M(r.w), y1 - y0, M(r.d)), Array.isArray(color) ? color.map(c => mat(c)) : mat(color), shadow);
  m.position.set(M(r.x + r.w / 2), (y0 + y1) / 2, M(r.y + r.d / 2)); return m;
}
function polyGeo(polys) {
  const pos = [];
  for (const pts of polys) for (let i = 1; i < pts.length - 1; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals(); return g;
}

/* ---------- 壁と建具 ---------- */
function wallMesh(s, f, Y0, C, ops) {
  const g = new THREE.Group();
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy);
  if (len < 1) return g;
  const ux = dx / len, uy = dy / len;
  g.position.set(M(s.x1), Y0, M(s.y1)); g.rotation.y = Math.atan2(-uy, ux);
  const H = M(s.ext ? f.h : f.ceil), T = M(s.t), ext = s.ext ? T / 2 : 0;
  const A = s.ext ? (s.inSign > 0 ? C.intWall : C.extWall) : C.intWall;   // 法線側（+z）
  const Bc = s.ext ? (s.inSign > 0 ? C.extWall : C.intWall) : C.intWall;
  const E = s.ext ? C.extWall : C.intWall;
  const mats = [mat(E), mat(E), mat(E), mat(E), mat(A), mat(Bc)];
  const list = ops.filter(o => opOnSeg(s, o)).map(o => {
    const sc = (o.x - s.x1) * ux + (o.y - s.y1) * uy;
    return { o, a: M(sc - o.w / 2), b: M(sc + o.w / 2), y0: Math.min(H, M(o.sill)), y1: Math.min(H, M(o.sill + o.h)) };
  }).sort((p, q) => p.a - q.a);
  const piece = (a, b, y0, y1) => {
    if (b - a < 1e-4 || y1 - y0 < 1e-4) return;
    const m = mesh(new THREE.BoxGeometry(b - a, y1 - y0, T), mats); m.position.set((a + b) / 2, (y0 + y1) / 2, 0); g.add(m);
  };
  let cur = -ext;
  for (const q of list) {
    piece(cur, Math.max(cur, q.a), 0, H);
    piece(q.a, q.b, 0, q.y0); piece(q.a, q.b, q.y1, H);
    fillOpening(g, q, T, C, s);
    cur = Math.max(cur, q.b);
  }
  piece(cur, M(len) + ext, 0, H);
  return g;
}
function fillOpening(g, q, T, C, s) {
  const o = q.o, w = q.b - q.a, h = q.y1 - q.y0, cx = (q.a + q.b) / 2, y = q.y0;
  if (h <= 0) return;
  const sash = mat(C.sash);
  const fr = .04, fd = Math.min(T, .07);
  const sub = new THREE.Group(); sub.position.set(cx, 0, 0); g.add(sub);
  if (o.type === 'opening') return;
  if (o.type === 'door' || o.type === 'entrance') {
    const col = o.type === 'entrance' ? '#3d3935' : C.door;
    B(sub, w - .02, h - .01, .04, 0, y, 0, col);
    const side = ((o.flip || 0) & 1) ? -1 : 1;
    B(sub, .02, .02, .14, side * (w / 2 - .08), y + .95, 0, '#c8c8c4', { metalness: .6, roughness: .3 });
    if (o.type === 'entrance') { const gl = mesh(new THREE.BoxGeometry(.12, h * .7, .045), GLASS(), false); gl.position.set(-side * (w / 2 - .14), y + h / 2, 0); sub.add(gl); }
    return;
  }
  if (o.type === 'sliding') {
    for (const sx of [-1, 1]) B(sub, w / 2 + .02, h - .01, .03, sx * w / 4, y, sx * .018, C.door);
    return;
  }
  // 窓：枠＋ガラス（＋引違いの召し合わせ）
  const frame = (bw, bh, x, yy) => { const m = mesh(new THREE.BoxGeometry(bw, bh, fd), sash); m.position.set(x, yy + bh / 2, 0); sub.add(m); };
  frame(w, fr, 0, y); frame(w, fr, 0, y + h - fr); frame(fr, h, -w / 2 + fr / 2, y); frame(fr, h, w / 2 - fr / 2, y);
  if (w > .9 && o.type !== 'high') frame(.035, h, 0, y);
  const gl = mesh(new THREE.BoxGeometry(w - fr * 2, h - fr * 2, .01), GLASS(), false);
  gl.position.set(0, y + h / 2, 0); sub.add(gl);
}

/* ---------- 屋根 ---------- */
// rect は m の {x0,z0,x1,z1}。ov: 軒の出 {u0,u1,v0,v1}（u＝棟の方向）。axis: 'x'|'z'。flipV: v の向きを反対に
function roofGroup(rect, type, k, ov, baseY, axis, flipV, C) {
  const g = new THREE.Group();
  const L = axis === 'x' ? rect.x1 - rect.x0 : rect.z1 - rect.z0;
  const S = axis === 'x' ? rect.z1 - rect.z0 : rect.x1 - rect.x0;
  const P3 = (u, v, y) => {
    let x, z;
    if (axis === 'x') { x = rect.x0 + u; z = flipV ? rect.z1 - v : rect.z0 + v; }
    else { z = rect.z0 + u; x = flipV ? rect.x1 - v : rect.x0 + v; }
    return [x, baseY + y, z];
  };
  const roofM = mat(C.roof, { side: THREE.DoubleSide, roughness: .7 });
  const wallM = mat(C.extWall, { side: THREE.DoubleSide });
  const add = (polys, m) => g.add(mesh(polyGeo(polys.map(p => p.map(a => P3(...a)))), m));
  const { u0, u1, v0, v1 } = ov;
  if (type === 'flat') {
    const e = .1;
    const r = { x: (rect.x0 - e) * 1000, y: (rect.z0 - e) * 1000, w: (rect.x1 - rect.x0 + 2 * e) * 1000, d: (rect.z1 - rect.z0 + 2 * e) * 1000 };
    g.add(boxRect(r, baseY, baseY + .35, C.extWall));
    const r2 = { x: rect.x0 * 1000 + 50, y: rect.z0 * 1000 + 50, w: (rect.x1 - rect.x0) * 1000 - 100, d: (rect.z1 - rect.z0) * 1000 - 100 };
    if (r2.w > 0 && r2.d > 0) g.add(boxRect(r2, baseY + .2, baseY + .36, C.roof));
    return g;
  }
  if (type === 'shed') {
    const top = k * S;
    add([[[-u0, -v0, k * (S + v0)], [L + u1, -v0, k * (S + v0)], [L + u1, S + v1, -k * v1], [-u0, S + v1, -k * v1]]], roofM);
    const d0 = -k * .08 - .01;
    add([[[0, 0, d0], [0, S, d0], [0, 0, top]], [[L, 0, d0], [L, S, d0], [L, 0, top]], [[0, 0, d0], [L, 0, d0], [L, 0, top], [0, 0, top]]], wallM);
    addFascia(g, P3, [[-u0, -v0, k * (S + v0)], [L + u1, -v0, k * (S + v0)]], C);
    return g;
  }
  const yr = k * S / 2;
  if (type === 'hip') {
    const a = Math.min(S / 2, L / 2);
    add([
      [[-u0, -v0, -k * v0], [L + u1, -v0, -k * v0], [L - a, S / 2, yr], [a, S / 2, yr]],
      [[L + u1, S + v1, -k * v1], [-u0, S + v1, -k * v1], [a, S / 2, yr], [L - a, S / 2, yr]],
      [[-u0, S + v1, -k * v1], [-u0, -v0, -k * v0], [a, S / 2, yr]],
      [[L + u1, -v0, -k * v0], [L + u1, S + v1, -k * v1], [L - a, S / 2, yr]],
    ], roofM);
    return g;
  }
  // 切妻
  add([
    [[-u0, -v0, -k * v0], [L + u1, -v0, -k * v0], [L + u1, S / 2, yr], [-u0, S / 2, yr]],
    [[L + u1, S + v1, -k * v1], [-u0, S + v1, -k * v1], [-u0, S / 2, yr], [L + u1, S / 2, yr]],
  ], roofM);
  const d0 = -k * .08 - .01;
  add([[[0, 0, d0], [0, S, d0], [0, S / 2, yr], ], [[L, 0, d0], [L, S, d0], [L, S / 2, yr]]], wallM);
  // 棟と破風
  const ridge = mesh(new THREE.BoxGeometry(1, 1, 1), mat(C.roof)); g.add(ridge);
  const a = P3(-u0, S / 2, yr), b = P3(L + u1, S / 2, yr);
  ridge.position.set((a[0] + b[0]) / 2, a[1] + .02, (a[2] + b[2]) / 2);
  ridge.scale.set(axis === 'x' ? Math.abs(b[0] - a[0]) : .12, .06, axis === 'x' ? .12 : Math.abs(b[2] - a[2]));
  return g;
}
function addFascia(g, P3, [p, q], C) {
  const a = P3(...p), b = P3(...q);
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const m = mesh(new THREE.BoxGeometry(len, .15, .03), mat(C.roof));
  m.position.set((a[0] + b[0]) / 2, a[1] - .07, (a[2] + b[2]) / 2);
  m.rotation.y = Math.atan2(-(b[2] - a[2]), b[0] - a[0]); g.add(m);
}

/* ---------- 家具・外構 ---------- */
function itemMesh(it, isExt, Y0, fh) {
  const g = new THREE.Group();
  g.position.set(M(it.x), Y0, M(it.y)); g.rotation.y = -it.rot * Math.PI / 180;
  const W = M(it.w), D = M(it.d), H = Math.max(.005, M(it.h)), c = it.color || '#999999';
  const wood = '#8b6a4c', white = '#fafaf8', dark = '#2a2a2a';
  const legs = (w, d, h, x0 = 0, z0 = 0, col = wood, t = .045) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, t, h, t, x0 + sx * (w / 2 - t), 0, z0 + sz * (d / 2 - t), col); };
  const cyl = (r, h, x, y, z, col, seg = 16) => { const m = mesh(new THREE.CylinderGeometry(r, r, h, seg), mat(col)); m.position.set(x, y + h / 2, z); g.add(m); return m; };
  const ball = (r, x, y, z, col, sy = 1) => { const m = mesh(new THREE.IcosahedronGeometry(r, 1), mat(col, { flatShading: true })); m.position.set(x, y, z); m.scale.y = sy; g.add(m); return m; };
  switch (it.type) {
    case 'bedS': case 'bedD':
      B(g, W, .25, D, 0, 0, 0, wood); B(g, W - .04, .2, D - .06, 0, .25, .01, white);
      B(g, W, .85, .06, 0, 0, -D / 2 + .03, wood);
      B(g, W - .02, .07, D * .62, 0, .43, D * .19, c);
      if (it.type === 'bedD') { B(g, W * .4, .1, .35, -W * .23, .45, -D / 2 + .3, white); B(g, W * .4, .1, .35, W * .23, .45, -D / 2 + .3, white); }
      else B(g, W * .7, .1, .35, 0, .45, -D / 2 + .3, white);
      break;
    case 'sofa2': case 'sofa3':
      B(g, W, .42, D, 0, 0, 0, c); B(g, W, .4, .2, 0, .42, -D / 2 + .1, c);
      B(g, .16, .2, D, -W / 2 + .08, .42, 0, c); B(g, .16, .2, D, W / 2 - .08, .42, 0, c);
      break;
    case 'dining': {
      const td = Math.min(.85, D * .52);
      B(g, W, .04, td, 0, .68, 0, c); legs(W, td, .68, 0, 0, c, .05);
      for (const sx of [-.25, .25]) for (const sz of [-1, 1]) {
        const z = sz * (td / 2 + .2);
        B(g, .42, .04, .42, sx * W, .42, z, c); legs(.42, .42, .42, sx * W, z, c, .03);
        B(g, .42, .4, .03, sx * W, .46, z + sz * .2, c);
      }
      break;
    }
    case 'lowtable': B(g, W, .04, D, 0, H - .04, 0, c); legs(W, D, H - .04, 0, 0, c, .05); break;
    case 'tv':
      B(g, W, H, D, 0, 0, 0, c);
      B(g, .3, .05, .2, 0, H, -D * .1, dark); B(g, .05, .1, .05, 0, H + .05, -D * .1, dark);
      B(g, Math.min(1.45, W * .8), .82, .05, 0, H + .12, -D * .1, '#151515');
      break;
    case 'kitchen': case 'island': {
      B(g, W, .82, D, 0, 0, 0, c); B(g, W + .01, .03, D + .01, 0, .82, 0, '#d9d7d1');
      B(g, W * .26, .012, D * .5, -W * .22, .846, 0, '#a8adb2', { metalness: .6, roughness: .3 });
      B(g, W * .22, .01, D * .5, W * .25, .846, 0, '#1b1b1b');
      if (it.type === 'kitchen') { B(g, W, .7, .35, 0, 1.5, -D / 2 + .175, c); B(g, .9, .4, .5, W * .25, 1.8, -D / 2 + .25, '#c8c8c6'); }
      else B(g, W, .2, .08, 0, .85, D / 2 - .04, c);
      break;
    }
    case 'fridge': B(g, W, H, D, 0, 0, 0, c, { metalness: .3, roughness: .4 }); B(g, .02, .5, .03, W / 2 - .06, H * .55, D / 2 + .01, '#999'); break;
    case 'cupboard': B(g, W, .85, D, 0, 0, 0, c); B(g, W, .02, D, 0, .85, 0, '#d9d7d1'); B(g, W, H - 1.05, D * .75, 0, 1.05, -D * .125, c); break;
    case 'bath': B(g, W, H, D, 0, 0, 0, c); B(g, W - .14, .02, D - .14, 0, H - .12, 0, '#a9cde0'); break;
    case 'basin':
      B(g, W, .82, D, 0, 0, 0, c); B(g, W, .05, D, 0, .82, 0, white);
      B(g, W, .8, .03, 0, 1.0, -D / 2 + .015, '#cfdde6', { metalness: .5, roughness: .15 });
      break;
    case 'washer': B(g, W, H * .95, D, 0, 0, 0, c); cyl(W * .3, .02, 0, H * .95, 0, '#bfc5c9'); break;
    case 'toilet':
      B(g, W * .9, .4, .2, 0, .35, -D / 2 + .1, c);
      cyl(W * .45, .4, 0, 0, D * .08, c); B(g, W * .95, .03, D * .62, 0, .4, D * .1, c);
      break;
    case 'desk': {
      const dd = Math.min(.6, D * .55), z0 = -D / 2 + dd / 2;
      B(g, W, .03, dd, 0, .7, z0, c); legs(W, dd, .7, 0, z0, '#3a3a3a', .04);
      const cz = z0 + dd / 2 + .22;
      B(g, .45, .06, .45, 0, .42, cz, dark); cyl(.03, .42, 0, 0, cz, '#555'); B(g, .42, .45, .04, 0, .5, cz + .22, dark);
      break;
    }
    case 'shelf': {
      B(g, W, H, .02, 0, 0, -D / 2 + .01, c); B(g, .02, H, D, -W / 2 + .01, 0, 0, c); B(g, .02, H, D, W / 2 - .01, 0, 0, c);
      const n = Math.max(2, Math.round(H / .35));
      for (let i = 0; i <= n; i++) B(g, W, .02, D, 0, i * (H - .02) / n, 0, c);
      break;
    }
    case 'wardrobe': case 'shoes': B(g, W, H, D, 0, 0, 0, c); B(g, .01, H * .9, .01, 0, H * .05, D / 2, '#9a958c'); break;
    case 'stairs': {
      const fhm = M(fh || it.h), n = Math.max(8, Math.round(fhm / .2)), rise = fhm / n, run = D / n;
      for (let i = 0; i < n; i++) B(g, W, rise * (i + 1), run, 0, 0, D / 2 - run * (i + .5), c);
      break;
    }
    case 'plant': cyl(.14, .3, 0, 0, 0, '#d8d4cc'); ball(Math.min(W, H) * .45, 0, .3 + H * .4, 0, c, 1.3); break;
    case 'rug': B(g, W, Math.max(.008, H), D, 0, 0, 0, c); break;
    // 外構
    case 'parking': case 'lawn': case 'approach': case 'gravel': case 'deck': case 'terrace':
      B(g, W, H, D, 0, 0, 0, c, { roughness: it.type === 'deck' ? .8 : .95 });
      if (it.type === 'deck') for (let x = -W / 2 + .1; x < W / 2; x += .14) B(g, .006, .003, D, x, H, 0, '#6f4f33');
      break;
    case 'flowerbed':
      B(g, W, H, D, 0, 0, 0, c); B(g, W - .12, .02, D - .12, 0, H - .01, 0, '#5a4636');
      for (let x = -W / 2 + .3; x < W / 2 - .1; x += .5) ball(.17, x, H + .12, 0, '#6aa152');
      break;
    case 'fence': {
      const n = Math.max(1, Math.round(W / 2));
      for (let i = 0; i <= n; i++) B(g, .05, H, .05, -W / 2 + W * i / n, 0, 0, c);
      const nb = 7;
      for (let i = 0; i < nb; i++) B(g, W, H / nb * .62, Math.max(.015, D * .4), 0, .06 + i * (H - .06) / nb, 0, c);
      break;
    }
    case 'block': B(g, W, H, D, 0, 0, 0, c); B(g, W + .02, .04, D + .02, 0, H, 0, '#bdbab2'); break;
    case 'hedge': B(g, W, H, D, 0, 0, 0, c, { flatShading: true }); break;
    case 'gatepost':
      B(g, W, H, D, 0, 0, 0, c); B(g, W * .35, .2, .01, -W * .2, H * .72, D / 2 + .005, '#d9d4c8');
      B(g, W * .35, .32, .12, W * .2, H * .45, D / 2 + .06, '#7a7a78'); B(g, .12, .06, .04, 0, H - .1, D / 2 + .02, '#fff6d8', { emissive: '#4a4030' });
      break;
    case 'carport':
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, .08, H, .08, sx * (W / 2 - .1), 0, sz * (D / 2 - .1), c, { metalness: .5, roughness: .4 });
      B(g, W + .2, .08, D + .2, 0, H, 0, c, { metalness: .5, roughness: .4 });
      { const r = mesh(new THREE.BoxGeometry(W + .1, .02, D + .1), mat('#dfe8ee', { transparent: true, opacity: .55 }), false); r.position.set(0, H + .09, 0); g.add(r); }
      break;
    case 'storage': B(g, W, H * .93, D, 0, 0, 0, c); B(g, W + .08, H * .07, D + .08, 0, H * .93, 0, '#8c9094'); break;
    case 'tree': {
      const tr = Math.max(.07, W * .05);
      cyl(tr, H * .5, 0, 0, 0, '#6b4f3a', 8);
      const r = W / 2; ball(r, 0, Math.max(H - r, H * .5 + r * .5), 0, c, .95);
      ball(r * .6, r * .45, H - r * 1.1, r * .2, c); ball(r * .55, -r * .4, H - r * 1.2, -r * .25, c);
      break;
    }
    case 'conifer': {
      cyl(.07, H * .25, 0, 0, 0, '#6b4f3a', 8);
      const m = mesh(new THREE.ConeGeometry(W / 2, H * .82, 10), mat(c, { flatShading: true })); m.position.set(0, H * .18 + H * .41, 0); g.add(m);
      break;
    }
    case 'shrub': ball(W / 2, 0, H / 2, 0, c, H / W); break;
    case 'car': {
      const bh = H * .42;
      B(g, W, bh, D, 0, .22, 0, c, { metalness: .4, roughness: .35 });
      B(g, W * .86, H * .3, D * .46, 0, .22 + bh, -D * .04, '#3c4853', { metalness: .3, roughness: .25 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = mesh(new THREE.CylinderGeometry(.32, .32, .22, 16), mat('#1b1b1b')); w.rotation.z = Math.PI / 2; w.position.set(sx * (W / 2 - .1), .32, sz * (D / 2 - .75)); g.add(w); }
      break;
    }
    default: B(g, W, H, D, 0, 0, 0, c);
  }
  return g;
}

/* ---------- 建物全体 ---------- */
function buildHouse(p) {
  const root = new THREE.Group(), C = p.colors, st = p.site;
  const floorsG = [], roofsG = [], ceil = new THREE.Group();
  const fy = p.floors.map((f, i) => M(floorY(p, i)));
  // 地面・敷地・道路
  const big = mesh(new THREE.PlaneGeometry(600, 600), mat('#aeb79d'), false);
  big.rotation.x = -Math.PI / 2; big.position.set(M(st.w / 2), -.03, M(st.d / 2)); root.add(big);
  root.add(boxRect({ x: 0, y: 0, w: st.w, d: st.d }, -.03, 0, C.ground, false));
  const rr = roadRect(st);
  const road = boxRect(rr, -.03, -.01, '#77797c', false); root.add(road);
  for (const it of p.ext) root.add(itemMesh(it, true, 0));
  p.floors.forEach((f, i) => {
    const g = new THREE.Group(); floorsG.push(g); root.add(g);
    const Y0 = fy[i], indoor = f.rooms.filter(isIn);
    if (i === 0) rectsOf(indoor).forEach(r => g.add(boxRect(r, 0, Y0, '#b9b6ae')));
    const below = i > 0 ? p.floors[i - 1] : null, fz = below ? M(below.h - below.ceil) : .02;
    for (const r of indoor) {
      const isTop = i === p.floors.length - 1;
      const fc = (FLOOR_MATS[r.floor] || FLOOR_MATS.oak).color;
      if (!(i > 0 && r.name === '階段')) g.add(boxRect(r, Y0 - fz, Y0 + .02, [C.ceiling, C.ceiling, fc, C.ceiling, C.ceiling, C.ceiling]));
      const upper = p.floors[i + 1];
      const voidAbove = r.name === '階段' && upper && upper.rooms.some(q => q.name === '階段' && inRect({ x: q.x - 1, y: q.y - 1, w: q.w + 2, d: q.d + 2 }, r.x + r.w / 2, r.y + r.d / 2));
      if (!voidAbove || isTop) ceil.add(boxRect(r, Y0 + M(f.ceil) - .015, Y0 + M(f.ceil), C.ceiling, false));
    }
    // バルコニー・ポーチ・テラス
    for (const r of f.rooms.filter(r => !isIn(r))) {
      const fc = (FLOOR_MATS[r.floor] || FLOOR_MATS.tile).color;
      if (i === 0) { g.add(boxRect(r, 0, Math.max(.05, Y0 - .15), [C.extWall, C.extWall, fc, C.extWall, C.extWall, C.extWall])); continue; }
      g.add(boxRect(r, Y0 - .3, Y0, [C.extWall, C.extWall, fc, C.ceiling, C.extWall, C.extWall]));
      if (r.name === 'バルコニー') parapets(g, r, indoor, Y0, C);
    }
    for (const s of allWalls(f)) g.add(wallMesh(s, f, Y0, C, f.openings));
    for (const it of f.items) g.add(itemMesh(it, false, Y0 + .02, f.h));
  });
  // 屋根：各階で、上の階（部屋・バルコニー）がかぶらない部分にかける
  const R = p.roof, k = R.pitch / 10, o = M(R.overhang);
  let topI = -1; p.floors.forEach((f, i) => { if (f.rooms.some(isIn)) topI = i; });
  p.floors.forEach((f, i) => {
    const g = new THREE.Group(); roofsG.push(g); root.add(g);
    const upper = p.floors[i + 1] ? p.floors[i + 1].rooms : [];
    const regions = rectsOf(f.rooms.filter(isIn), upper);
    const wallTop = fy[i] + M(f.h);
    for (const r of regions) {
      const rect = { x0: M(r.x), z0: M(r.y), x1: M(r.x + r.w), z1: M(r.y + r.d) };
      // どの辺が上の階にくっついているか
      const touch = side => {
        const pts = [.2, .5, .8].map(t => side === 'N' ? [r.x + r.w * t, r.y - 20] : side === 'S' ? [r.x + r.w * t, r.y + r.d + 20] : side === 'W' ? [r.x - 20, r.y + r.d * t] : [r.x + r.w + 20, r.y + r.d * t]);
        return pts.some(([x, y]) => upper.some(q => inRect(q, x, y)));
      };
      const sides = ['N', 'S', 'W', 'E'].filter(touch);
      if (i === topI || !sides.length) {
        let axis = r.w >= r.d ? 'x' : 'z';
        if (R.rotate) axis = axis === 'x' ? 'z' : 'x';
        const flipV = R.type === 'shed' ? !!R.flip : false;
        const oo = R.type === 'flat' ? 0 : o;
        g.add(roofGroup(rect, R.type, k, { u0: oo, u1: oo, v0: oo, v1: oo }, wallTop + (R.type === 'flat' ? 0 : k * .08 + .01), axis, flipV, C));
      } else if (sides.length === 1 && R.type !== 'flat') {
        // 下屋：上の階の壁側を高くした片流れ
        const sd = sides[0], axis = (sd === 'N' || sd === 'S') ? 'x' : 'z', flipV = sd === 'S' || sd === 'E';
        const oo = Math.min(o, .45);
        g.add(roofGroup(rect, 'shed', Math.min(k, .35), { u0: oo, u1: oo, v0: 0, v1: oo }, wallTop + Math.min(k, .35) * .08 + .01, axis, flipV, C));
      } else {
        g.add(roofGroup(rect, 'flat', k, { u0: 0, u1: 0, v0: 0, v1: 0 }, wallTop, 'x', false, C));
      }
    }
  });
  root.add(ceil);
  // 大きさ
  const all = p.floors.flatMap(f => f.rooms);
  const bb = bboxOf(all) || { x: 0, y: 0, w: st.w, d: st.d };
  const topY = fy[fy.length - 1] + M(p.floors[p.floors.length - 1].h) + 1.5;
  return { root, floorsG, roofsG, ceil, fy, bb, topY };
}
function parapets(g, r, indoor, Y0, C) {
  const step = 455, h = 1.1, t = .12;
  const sides = [
    { n: 'N', len: r.w, pt: s => [r.x + s, r.y], out: [0, -60] },
    { n: 'S', len: r.w, pt: s => [r.x + s, r.y + r.d], out: [0, 60] },
    { n: 'W', len: r.d, pt: s => [r.x, r.y + s], out: [-60, 0] },
    { n: 'E', len: r.d, pt: s => [r.x + r.w, r.y + s], out: [60, 0] },
  ];
  for (const sd of sides) {
    let run = null;
    const flush = () => {
      if (!run) return;
      const [a, b] = run, horiz = sd.n === 'N' || sd.n === 'S';
      const len = M(b - a), mid = (a + b) / 2;
      const [px, py] = sd.pt(mid);
      const inward = sd.n === 'N' || sd.n === 'W' ? 1 : -1;
      const m = mesh(new THREE.BoxGeometry(horiz ? len : t, h, horiz ? t : len), mat(C.extWall));
      m.position.set(M(px) + (horiz ? 0 : inward * t / 2), Y0 + h / 2, M(py) + (horiz ? inward * t / 2 : 0));
      g.add(m); run = null;
    };
    for (let s = 0; s < sd.len; s += step) {
      const e = Math.min(sd.len, s + step), [x, y] = sd.pt((s + e) / 2);
      const blocked = indoor.some(q => inRect(q, x + sd.out[0], y + sd.out[1]));
      if (blocked) flush(); else run = run ? [run[0], e] : [s, e];
    }
    flush();
  }
}

// 部屋の中で、家具からいちばん離れた立ち位置（mm）
function freeSpot(r, items) {
  const its = items.map(it => ({ it, rr: Math.hypot(it.w, it.d) / 2 }));
  let best = [r.x + r.w / 2, r.y + r.d / 2], bd = -1;
  const m = Math.min(500, r.w / 2, r.d / 2);
  for (let x = r.x + m; x <= r.x + r.w - m + 1; x += 150) for (let y = r.y + m; y <= r.y + r.d - m + 1; y += 150) {
    let d = Infinity;
    for (const { it } of its) {
      const [lx, ly] = rotPt(x - it.x, y - it.y, -it.rot);
      const ex = Math.max(0, Math.abs(lx) - it.w / 2), ey = Math.max(0, Math.abs(ly) - it.d / 2);
      d = Math.min(d, Math.hypot(ex, ey));
    }
    d = Math.min(d, 900) - Math.hypot(x - r.x - r.w / 2, y - r.y - r.d / 2) * .02;
    if (d > bd) { bd = d; best = [x, y]; }
  }
  return best;
}

/* ---------- 画面（カメラ・操作） ---------- */
class View3D {
  constructor() {
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.el = r.domElement; this.el.tabIndex = 0;
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#cfe0ee'); this.scene.fog = new THREE.Fog(0xcfe0ee, 90, 320);
    this.cam = new THREE.PerspectiveCamera(40, 1, .05, 800); this.cam.rotation.order = 'YXZ';
    this.hemi = new THREE.HemisphereLight(0xe4edf5, 0x7d7a6e, .5); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff3e2, .7);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.bias = -.0004; this.sun.shadow.normalBias = .03;
    this.scene.add(this.sun, this.sun.target);
    this.lamp = new THREE.PointLight(0xfff1dc, 0, 14, 1.5); this.scene.add(this.lamp);
    this.orb = { x: 0, y: 3, z: 0, az: .7, el: .42, r: 30 };
    this.walk = { x: 0, y: 1.5, z: 0, yaw: Math.PI, pitch: -.05, fi: 0 };
    this.opt = { upTo: -1, season: 'equinox', hour: 10 };
    this.mode = 'orbit'; this.keys = new Set(); this.pad = new Set(); this.ptr = new Map();
    this.active = false; this.dirty = true; this.planId = null; this.H = null;
    this.bindEvents();
    this.loop = this.loop.bind(this);
    this.ro = new ResizeObserver(() => this.resize());
  }
  build(p) {
    if (this.H) {
      this.scene.remove(this.H.root);
      this.H.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    this.H = buildHouse(p); this.scene.add(this.H.root);
    const st = p.site, size = Math.max(M(st.w), M(st.d)) + 16;
    const sc = this.sun.shadow.camera; sc.left = -size / 2 - 6; sc.right = size / 2 + 6; sc.top = size / 2 + 6; sc.bottom = -size / 2 - 6; sc.near = 1; sc.far = 250; sc.updateProjectionMatrix();
    this.center = new THREE.Vector3(M(st.w / 2), 0, M(st.d / 2));
    if (this.planId !== p.id) { this.planId = p.id; this.preset('SE', true); this.resetWalk(p); }
    if (this.walk.fi >= p.floors.length) this.resetWalk(p);
    this.applyVis(); this.updateSun(); this.dirty = true;
  }
  resetWalk(p) {
    const gs = roomGroups(p.floors[0]).filter(g => g.indoor).sort((a, b) => b.area - a.area);
    const g = gs.find(q => /LDK|リビング/.test(q.name)) || gs[0], r = g && g.main;
    if (r) this.goRoom(r, 0, true); else { this.walk.x = this.center.x; this.walk.z = this.center.z; }
  }
  goRoom(r, fi, quiet) {
    const p = plan();
    const sp = freeSpot(r, p.floors[fi].items);
    this.walk.fi = fi; this.walk.x = M(sp[0]); this.walk.z = M(sp[1]);
    this.walk.y = M(floorY(p, fi)) + 1.5; this.walk.pitch = -.05;
    // 部屋の中心の方を向く。中心にいるときは南を向く
    const dx = r.x + r.w / 2 - sp[0], dz = r.y + r.d / 2 - sp[1];
    this.walk.yaw = Math.hypot(dx, dz) > 300 ? Math.atan2(-dx, -dz) : Math.PI;
    if (!quiet) { this.applyVis(); this.dirty = true; }
  }
  setWalkFloor(fi) { const p = plan(); this.walk.fi = fi; this.walk.y = M(floorY(p, fi)) + 1.5; this.applyVis(); this.dirty = true; }
  attach(host, mode) {
    this.host = host; host.prepend(this.el); this.mode = mode; this.active = true;
    this.ro.disconnect(); this.ro.observe(host);
    this.cam.fov = mode === 'walk' ? 65 : 40;
    this.applyVis(); this.updateSun(); this.resize();
    if (!this.raf) this.raf = requestAnimationFrame(this.loop);
  }
  detach() { this.active = false; this.keys.clear(); this.pad.clear(); }
  resize() {
    if (!this.host) return;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); this.dirty = true;
  }
  applyVis() {
    const H = this.H; if (!H) return;
    const n = H.floorsG.length;
    if (this.mode === 'walk') {
      H.floorsG.forEach(g => g.visible = true); H.roofsG.forEach(g => g.visible = true); H.ceil.visible = true;
    } else {
      const up = this.opt.upTo < 0 || this.opt.upTo >= n ? n - 1 : this.opt.upTo, cut = this.opt.upTo >= 0 && this.opt.upTo < n;
      H.floorsG.forEach((g, i) => g.visible = i <= up);
      H.roofsG.forEach((g, i) => g.visible = cut ? i < up : true);
      H.ceil.visible = false;
    }
    this.updateSun(); this.dirty = true;
  }
  updateSun() {
    const dec = { summer: 23.44, equinox: 0, winter: -23.44 }[this.opt.season] * Math.PI / 180;
    const phi = LAT * Math.PI / 180, Hh = (this.opt.hour - 12) * 15 * Math.PI / 180;
    const el = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(Hh));
    const az = Math.atan2(Math.sin(Hh), Math.cos(Hh) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));   // 南から西回り
    const c = this.center || new THREE.Vector3();
    const dir = new THREE.Vector3(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    this.sun.position.copy(c).addScaledVector(dir, 80); this.sun.target.position.copy(c);
    const day = Math.max(0, Math.sin(el));
    const walk = this.mode === 'walk';
    this.sun.intensity = el > 0 ? .2 + .55 * Math.min(1, day * 2.2) : 0;
    this.hemi.intensity = (walk ? .55 : .42) + .12 * Math.min(1, day * 2);
    this.hemi.groundColor.set(walk ? 0xd9d4ca : 0x7d7a6e);
    this.lamp.intensity = walk ? .3 : 0;
    const sky = el > 0 ? 0xcfe0ee : 0x2c3442;
    this.scene.background.set(sky); this.scene.fog.color.set(sky);
    this.dirty = true;
  }
  preset(name, quiet) {
    const H = this.H; if (!H) return;
    const bb = H.bb, cx = M(bb.x + bb.w / 2), cz = M(bb.y + bb.d / 2);
    const size = Math.max(M(bb.w), M(bb.d), H.topY);
    const az = { SE: Math.PI / 4, SW: -Math.PI / 4, NE: Math.PI * 3 / 4, NW: -Math.PI * 3 / 4, S: 0, TOP: 0 }[name] ?? Math.PI / 4;
    Object.assign(this.orb, { x: cx, y: H.topY * .38, z: cz, az, el: name === 'TOP' ? 1.5 : name === 'S' ? .16 : .38, r: size * (name === 'TOP' ? 2.3 : 2.05) + 4 });
    if (!quiet) { if (this.mode !== 'orbit') return; this.dirty = true; }
  }
  updateCam() {
    if (this.mode === 'walk') {
      const w = this.walk; this.cam.position.set(w.x, w.y, w.z); this.cam.rotation.set(w.pitch, w.yaw, 0);
      this.lamp.position.set(w.x, w.y + .6, w.z);
    } else {
      const o = this.orb, ce = Math.cos(o.el);
      this.cam.position.set(o.x + o.r * ce * Math.sin(o.az), o.y + o.r * Math.sin(o.el), o.z + o.r * ce * Math.cos(o.az));
      this.cam.lookAt(o.x, o.y, o.z);
    }
  }
  render() { this.updateCam(); this.renderer.render(this.scene, this.cam); this.dirty = false; }
  loop(t) {
    this.raf = null;
    if (!this.active) return;
    const dt = Math.min(.05, (t - (this.lt || t)) / 1000); this.lt = t;
    if (this.mode === 'walk') {
      const K = this.keys, Pd = this.pad, w = this.walk, sp = (K.has('shift') ? 3.2 : 1.6) * dt;
      let f = 0, s = 0, turn = 0;
      if (K.has('w') || K.has('arrowup') || Pd.has('f')) f += 1;
      if (K.has('s') || K.has('arrowdown') || Pd.has('b')) f -= 1;
      if (K.has('a')) s -= 1; if (K.has('d')) s += 1;
      if (K.has('arrowleft') || Pd.has('l')) turn += 1;
      if (K.has('arrowright') || Pd.has('r')) turn -= 1;
      if (f || s || turn) {
        w.yaw += turn * 1.6 * dt;
        w.x += (-Math.sin(w.yaw) * f + Math.cos(w.yaw) * s) * sp;
        w.z += (-Math.cos(w.yaw) * f - Math.sin(w.yaw) * s) * sp;
        this.dirty = true;
      }
    }
    if (this.dirty) this.render();
    this.raf = requestAnimationFrame(this.loop);
  }
  bindEvents() {
    const el = this.el;
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); el.focus(); this.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY, b: e.button, sh: e.shiftKey }); this.pinch = null; });
    el.addEventListener('pointerup', e => { this.ptr.delete(e.pointerId); this.pinch = null; });
    el.addEventListener('pointercancel', e => { this.ptr.delete(e.pointerId); this.pinch = null; });
    el.addEventListener('pointermove', e => {
      const q = this.ptr.get(e.pointerId); if (!q) return;
      const dx = e.clientX - q.x, dy = e.clientY - q.y;
      q.x = e.clientX; q.y = e.clientY;
      if (this.ptr.size === 2) {
        const [a, b] = [...this.ptr.values()], d = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (this.pinch) {
          const k = this.pinch.d / d;
          if (this.mode === 'orbit') { this.orb.r = clamp(this.orb.r * k, 2, 300); this.panBy((m.x - this.pinch.m.x) / 2, (m.y - this.pinch.m.y) / 2); }
          else this.stepForward((d - this.pinch.d) * .01);
        }
        this.pinch = { d, m }; this.dirty = true; return;
      }
      if (this.mode === 'orbit') {
        if (q.b === 2 || q.b === 1 || q.sh) this.panBy(dx, dy);
        else { this.orb.az -= dx * .007; this.orb.el = clamp(this.orb.el + dy * .006, .02, 1.55); }
      } else {
        this.walk.yaw += dx * .004; this.walk.pitch = clamp(this.walk.pitch + dy * .004, -1.3, 1.3);
      }
      this.dirty = true;
    });
    el.addEventListener('wheel', e => {
      e.preventDefault();
      if (this.mode === 'orbit') this.orb.r = clamp(this.orb.r * Math.exp(e.deltaY * .0012), 2, 300);
      else this.stepForward(-e.deltaY * .003);
      this.dirty = true;
    }, { passive: false });
    el.addEventListener('dblclick', e => {
      if (this.mode !== 'orbit' || !this.H) return;
      const r = el.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), this.cam);
      const hit = ray.intersectObject(this.H.root, true).find(h => h.object.visible && h.object.parent.visible);
      if (hit) { this.orb.x = hit.point.x; this.orb.y = hit.point.y; this.orb.z = hit.point.z; this.dirty = true; }
    });
    window.addEventListener('keydown', e => {
      if (!this.active || this.mode !== 'walk') return;
      if (['input', 'select', 'textarea'].includes((e.target.tagName || '').toLowerCase())) return;
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { this.keys.add(k); e.preventDefault(); }
    });
    window.addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }
  panBy(dx, dy) {
    const o = this.orb, k = o.r * .0016;
    const rx = Math.cos(o.az), rz = -Math.sin(o.az), fx = -Math.sin(o.az), fz = -Math.cos(o.az);
    o.x += -rx * dx * k + fx * dy * k; o.z += -rz * dx * k + fz * dy * k;
  }
  stepForward(d) { const w = this.walk; w.x += -Math.sin(w.yaw) * d; w.z += -Math.cos(w.yaw) * d; }
  snapshot() { this.render(); return this.el.toDataURL('image/png'); }
  // 印刷用：決まった視点・大きさで1枚描いて、元に戻す
  snapshotPreset(name, upTo = -1) {
    const saved = { orb: { ...this.orb }, mode: this.mode, upTo: this.opt.upTo, size: this.renderer.getSize(new THREE.Vector2()), aspect: this.cam.aspect, fov: this.cam.fov };
    this.mode = 'orbit'; this.opt.upTo = upTo; this.cam.fov = 40; this.applyVis();
    this.renderer.setSize(1800, 1200, false); this.cam.aspect = 1.5; this.cam.updateProjectionMatrix();
    this.preset(name, true);
    if (upTo >= 0) { this.orb.el = .75; this.orb.r *= .85; }
    this.render();
    const url = this.el.toDataURL('image/png');
    this.orb = saved.orb; this.mode = saved.mode; this.opt.upTo = saved.upTo; this.cam.fov = saved.fov;
    if (saved.size.x) this.renderer.setSize(saved.size.x, saved.size.y); else this.renderer.setSize(1, 1);
    this.cam.aspect = saved.aspect; this.cam.updateProjectionMatrix(); this.applyVis(); this.dirty = true;
    return url;
  }
}
