/* Livii 住宅プラン — 3D表示（three.js r147 を lib/ に同梱）。
   図面は mm、3D は m。X＝東、Z＝南（図面の y）、Y＝上。仕上げ材の模様は materials.js で描く。 */
'use strict';

const M = v => v / 1000;
const LAT = 33;            // 日影の計算に使う緯度（熊本）
let ANISO = 4;
const matCache = new Map();
function mat(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: .85, metalness: 0 }, o)));
  return matCache.get(key);
}
// 模様つきの材質（pat は materials.js の PATS）。bump：凹凸の強さ
const texCache = new Map();
function texMat(pat, color, o = {}, bump = .01) {
  const key = 'T' + pat + color + JSON.stringify(o) + bump;
  if (texCache.has(key)) return texCache.get(key);
  const pc = patCanvas(pat, color);
  const t = new THREE.CanvasTexture(pc.cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / pc.tw, 1 / pc.th); t.anisotropy = ANISO;
  const m = new THREE.MeshStandardMaterial(Object.assign({ map: t, bumpMap: t, bumpScale: bump, roughness: .85, metalness: 0 }, o));
  texCache.set(key, m); return m;
}
const GLASS = () => mat('#9fc0d4', { transparent: true, opacity: .35, roughness: .1, metalness: .2, depthWrite: false });
function mesh(geo, m, shadow = true) { const x = new THREE.Mesh(geo, m); x.castShadow = shadow; x.receiveShadow = true; return x; }
// 箱の UV を m 単位にする（模様の大きさをそろえる）。o は箱の中心の位置
function worldUV(geo, ox = 0, oy = 0, oz = 0) {
  const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + ox, y = pos.getY(i) + oy, z = pos.getZ(i) + oz, nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
    if (nx > .5) uv.setXY(i, z, y); else if (ny > .5) uv.setXY(i, x, -z); else uv.setXY(i, x, y);
  }
  uv.needsUpdate = true; return geo;
}
const asMat = c => typeof c === 'string' ? mat(c) : c;
// 下面が y の箱（中心 x,z）。color は色・材質・材質の配列
function B(g, w, h, d, x, y, z, color, o) {
  if (w <= 0 || h <= 0 || d <= 0) return null;
  const mm = Array.isArray(color) ? color.map(asMat) : typeof color === 'string' ? mat(color, o) : color;
  const m = mesh(worldUV(new THREE.BoxGeometry(w, h, d), x, y + h / 2, z), mm);
  m.position.set(x, y + h / 2, z); g.add(m); return m;
}
// 図面の四角 r（mm）の範囲で y0〜y1 の箱
function boxRect(r, y0, y1, color, shadow = true) {
  const cx = M(r.x + r.w / 2), cz = M(r.y + r.d / 2), cy = (y0 + y1) / 2;
  const mm = Array.isArray(color) ? color.map(asMat) : asMat(color);
  const m = mesh(worldUV(new THREE.BoxGeometry(M(r.w), y1 - y0, M(r.d)), cx, cy, cz), mm, shadow);
  m.position.set(cx, cy, cz); return m;
}
// 多角形の面（屋根・妻壁）。UV は面の向きから決める（屋根は流れ方向が v）
function polyGeo(polys) {
  const pos = [], uv = [];
  for (const pts of polys) {
    const [a, b, c] = pts;
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const nl = Math.hypot(...n) || 1; n = n.map(v => v / nl); if (n[1] < 0) n = n.map(v => -v);
    let U, V;
    if (n[1] < .5) { const hl = Math.hypot(n[0], n[2]) || 1, t = [n[2] / hl, -n[0] / hl]; U = p => p[0] * t[0] + p[2] * t[1]; V = p => p[1]; }
    else if (n[1] > .999) { U = p => p[0]; V = p => -p[2]; }
    else { const hl = Math.hypot(n[0], n[2]), d = [n[0] / hl, n[2] / hl], t = [-d[1], d[0]]; U = p => p[0] * t[0] + p[2] * t[1]; V = p => -(p[0] * d[0] + p[2] * d[1]) / n[1]; }
    for (let i = 1; i < pts.length - 1; i++) for (const q of [pts[0], pts[i], pts[i + 1]]) { pos.push(...q); uv.push(U(q), V(q)); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals(); return g;
}

/* ---------- 仕上げ材 ---------- */
function finishes(p) {
  const C = p.colors, F = p.finish;
  const extOf = i => { const f = p.floors[i], e = f && f.ext && EXT_WALLS[f.ext.key] ? f.ext : { key: F.ext, color: C.extWall }; return { pat: EXT_WALLS[e.key].pat, color: e.color }; };
  const paperOf = key => WALLPAPERS[key] || WALLPAPERS[F.wall] || WALLPAPERS.white;
  return {
    C,
    ext: (i, side) => { const e = extOf(i); return texMat(e.pat, e.color, side ? { side: THREE.DoubleSide } : {}, .02); },
    roof: (side) => texMat(ROOF_MATS[F.roof].pat, C.roof, { side: side ? THREE.DoubleSide : THREE.FrontSide, roughness: .7 }, .03),
    soffit: () => mat(C.soffit || '#e9e6df', { side: THREE.DoubleSide }),
    paper: key => { const w = paperOf(key); return texMat(w.pat, w.color, {}, .006); },
    // 部屋 r の、dir（N/S/E/W）側の壁の壁紙
    roomWall: (r, dir) => { const key = r ? (r.accent && r.accent === dir && r.accentPaper ? r.accentPaper : r.paper || F.wall) : F.wall; const w = paperOf(key); return texMat(w.pat, w.color, {}, .006); },
    ceil: r => { const w = paperOf((r && r.ceil) || F.ceil); return texMat(w.pat, w.color, {}, .004); },
    floor: r => { const f = FLOOR_MATS[r.floor] || FLOOR_MATS.oak; return texMat(f.pat, f.color, { roughness: .6 }, .008); },
    paving: (key, color) => { const pv = PAVINGS[key]; return texMat(pv.pat, color || pv.color, { roughness: .95 }, .02); },
  };
}

/* ---------- 壁と建具 ---------- */
function wallMesh(s, f, fi, Y0, X, ops) {
  const g = new THREE.Group();
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1, len = Math.hypot(dx, dy);
  if (len < 1) return g;
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  g.position.set(M(s.x1), Y0, M(s.y1)); g.rotation.y = Math.atan2(-uy, ux);
  const H = M(s.ext ? f.h : f.ceil), T = M(s.t), ext = s.ext ? T / 2 : 0;
  const indoor = f.rooms.filter(isIn);
  const extM = X.ext(fi);
  // 壁の片側（sign=+1 は法線側）に面している部屋の壁紙。部屋がなければ外壁
  const side = (sm, sign) => {
    const mm = sm * 1000, off = s.t / 2 + 40;
    const r = roomAt(indoor, s.x1 + ux * mm + sign * nx * off, s.y1 + uy * mm + sign * ny * off);
    if (!r) return s.ext ? extM : X.paper();
    const ddx = -sign * nx, ddy = -sign * ny;
    return X.roomWall(r, Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'E' : 'W') : (ddy > 0 ? 'S' : 'N'));
  };
  const list = ops.filter(o => opOnSeg(s, o)).map(o => {
    const sc = (o.x - s.x1) * ux + (o.y - s.y1) * uy;
    return { o, a: M(sc - o.w / 2), b: M(sc + o.w / 2), y0: Math.min(H, M(o.sill)), y1: Math.min(H, M(o.sill + o.h)) };
  }).sort((p, q) => p.a - q.a);
  const piece = (a, b, y0, y1) => {
    if (b - a < 1e-4 || y1 - y0 < 1e-4) return;
    const mid = (a + b) / 2, A = side(mid, 1), Bm = side(mid, -1), E = s.ext ? extM : A;
    const cx = mid, cy = (y0 + y1) / 2;
    const m = mesh(worldUV(new THREE.BoxGeometry(b - a, y1 - y0, T), cx, cy, 0), [E, E, E, E, A, Bm]);
    m.position.set(cx, cy, 0); g.add(m);
  };
  let cur = -ext;
  for (const q of list) {
    piece(cur, Math.max(cur, q.a), 0, H);
    piece(q.a, q.b, 0, q.y0); piece(q.a, q.b, q.y1, H);
    fillOpening(g, q, T, X.C);
    cur = Math.max(cur, q.b);
  }
  piece(cur, M(len) + ext, 0, H);
  return g;
}
function fillOpening(g, q, T, C) {
  const o = q.o, w = q.b - q.a, h = q.y1 - q.y0, cx = (q.a + q.b) / 2, y = q.y0;
  if (h <= 0) return;
  const sash = mat(C.sash, { roughness: .5, metalness: .3 });
  const fr = .04, fd = Math.min(T, .07);
  const sub = new THREE.Group(); sub.position.set(cx, 0, 0); g.add(sub);
  if (o.type === 'opening') return;
  if (o.type === 'door' || o.type === 'entrance') {
    const col = o.type === 'entrance' ? (C.entrance || '#3d3935') : C.door;
    B(sub, w - .02, h - .01, .04, 0, y, 0, col);
    const side = ((o.flip || 0) & 1) ? -1 : 1;
    if (o.type === 'entrance') {
      B(sub, .03, h * .55, .14, side * (w / 2 - .1), y + h * .25, 0, '#b9bcbf', { metalness: .7, roughness: .3 });
      const gl = mesh(new THREE.BoxGeometry(.12, h * .7, .045), GLASS(), false); gl.position.set(-side * (w / 2 - .14), y + h / 2, 0); sub.add(gl);
      for (const z of [-.03, .03]) B(sub, w - .1, .015, .01, 0, y + h * .3, z, shade(col, .1));
    } else B(sub, .02, .02, .14, side * (w / 2 - .08), y + .95, 0, '#c8c8c4', { metalness: .6, roughness: .3 });
    return;
  }
  if (o.type === 'sliding') {
    for (const sx of [-1, 1]) B(sub, w / 2 + .02, h - .01, .03, sx * w / 4, y, sx * .018, C.door);
    return;
  }
  // 窓：枠＋ガラス（＋引違いの召し合わせ）。外側に小さな水切り
  const frame = (bw, bh, x, yy) => { const m = mesh(new THREE.BoxGeometry(bw, bh, fd), sash); m.position.set(x, yy + bh / 2, 0); sub.add(m); };
  frame(w, fr, 0, y); frame(w, fr, 0, y + h - fr); frame(fr, h, -w / 2 + fr / 2, y); frame(fr, h, w / 2 - fr / 2, y);
  if (w > .9 && o.type !== 'high') frame(.035, h, 0, y);
  const gl = mesh(new THREE.BoxGeometry(w - fr * 2, h - fr * 2, .01), GLASS(), false);
  gl.position.set(0, y + h / 2, 0); sub.add(gl);
}

/* ---------- 屋根 ---------- */
// rect は m の {x0,z0,x1,z1}。ov: 軒の出 {u0,u1,v0,v1}（u＝棟の方向）。axis: 'x'|'z'。flipV: v の向きを反対に
// RM: { roof, wall, soffit, wallFlat, roofFlat } の材質
function roofGroup(rect, type, k, ov, baseY, axis, flipV, RM) {
  const g = new THREE.Group();
  const L = axis === 'x' ? rect.x1 - rect.x0 : rect.z1 - rect.z0;
  const S = axis === 'x' ? rect.z1 - rect.z0 : rect.x1 - rect.x0;
  const P3 = (u, v, y) => {
    let x, z;
    if (axis === 'x') { x = rect.x0 + u; z = flipV ? rect.z1 - v : rect.z0 + v; }
    else { z = rect.z0 + u; x = flipV ? rect.x1 - v : rect.x0 + v; }
    return [x, baseY + y, z];
  };
  const add = (polys, m) => { const geo = polyGeo(polys.map(p => p.map(a => P3(...a)))); g.add(mesh(geo, m)); return geo; };
  const addRoof = polys => { const geo = add(polys, RM.roof); const s = mesh(geo, RM.soffit, false); s.position.y = -.06; g.add(s); };
  const { u0, u1, v0, v1 } = ov;
  const d0 = -k * .08 - .01;
  if (type === 'flat') {
    const e = .1;
    const r = { x: (rect.x0 - e) * 1000, y: (rect.z0 - e) * 1000, w: (rect.x1 - rect.x0 + 2 * e) * 1000, d: (rect.z1 - rect.z0 + 2 * e) * 1000 };
    g.add(boxRect(r, baseY, baseY + .35, RM.wallFlat));
    const r2 = { x: rect.x0 * 1000 + 50, y: rect.z0 * 1000 + 50, w: (rect.x1 - rect.x0) * 1000 - 100, d: (rect.z1 - rect.z0) * 1000 - 100 };
    if (r2.w > 0 && r2.d > 0) g.add(boxRect(r2, baseY + .2, baseY + .36, RM.roofFlat));
    return g;
  }
  if (type === 'shed') {
    const top = k * S;
    addRoof([[[-u0, -v0, k * (S + v0)], [L + u1, -v0, k * (S + v0)], [L + u1, S + v1, -k * v1], [-u0, S + v1, -k * v1]]]);
    add([[[0, 0, d0], [0, S, d0], [0, 0, top]], [[L, 0, d0], [L, S, d0], [L, 0, top]], [[0, 0, d0], [L, 0, d0], [L, 0, top], [0, 0, top]]], RM.wall);
    addFascia(g, P3, [[-u0, -v0, k * (S + v0)], [L + u1, -v0, k * (S + v0)]], RM.edge);
    addFascia(g, P3, [[-u0, S + v1, -k * v1], [L + u1, S + v1, -k * v1]], RM.edge);
    return g;
  }
  const yr = k * S / 2;
  if (type === 'hip') {
    const a = Math.min(S / 2, L / 2);
    addRoof([
      [[-u0, -v0, -k * v0], [L + u1, -v0, -k * v0], [L - a, S / 2, yr], [a, S / 2, yr]],
      [[L + u1, S + v1, -k * v1], [-u0, S + v1, -k * v1], [a, S / 2, yr], [L - a, S / 2, yr]],
      [[-u0, S + v1, -k * v1], [-u0, -v0, -k * v0], [a, S / 2, yr]],
      [[L + u1, -v0, -k * v0], [L + u1, S + v1, -k * v1], [L - a, S / 2, yr]],
    ]);
    for (const [p, q] of [[[-u0, -v0, -k * v0], [L + u1, -v0, -k * v0]], [[-u0, S + v1, -k * v1], [L + u1, S + v1, -k * v1]], [[-u0, -v0, -k * v0], [-u0, S + v1, -k * v1]], [[L + u1, -v0, -k * v0], [L + u1, S + v1, -k * v1]]]) addFascia(g, P3, [p, q], RM.edge);
    return g;
  }
  // 切妻
  addRoof([
    [[-u0, -v0, -k * v0], [L + u1, -v0, -k * v0], [L + u1, S / 2, yr], [-u0, S / 2, yr]],
    [[L + u1, S + v1, -k * v1], [-u0, S + v1, -k * v1], [-u0, S / 2, yr], [L + u1, S / 2, yr]],
  ]);
  add([[[0, 0, d0], [0, S, d0], [0, S / 2, yr]], [[L, 0, d0], [L, S, d0], [L, S / 2, yr]]], RM.wall);
  addFascia(g, P3, [[-u0, -v0, -k * v0], [L + u1, -v0, -k * v0]], RM.edge);
  addFascia(g, P3, [[-u0, S + v1, -k * v1], [L + u1, S + v1, -k * v1]], RM.edge);
  // 棟
  const ridge = mesh(new THREE.BoxGeometry(1, 1, 1), RM.edge); g.add(ridge);
  const a = P3(-u0, S / 2, yr), b = P3(L + u1, S / 2, yr);
  ridge.position.set((a[0] + b[0]) / 2, a[1] + .02, (a[2] + b[2]) / 2);
  ridge.scale.set(axis === 'x' ? Math.abs(b[0] - a[0]) : .14, .07, axis === 'x' ? .14 : Math.abs(b[2] - a[2]));
  return g;
}
function addFascia(g, P3, [p, q], m) {
  const a = P3(...p), b = P3(...q);
  const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
  const f = mesh(new THREE.BoxGeometry(len, .16, .03), m);
  f.position.set((a[0] + b[0]) / 2, a[1] - .08, (a[2] + b[2]) / 2);
  f.rotation.y = Math.atan2(-(b[2] - a[2]), b[0] - a[0]); g.add(f);
}

/* ---------- 家具・外構 ---------- */
function itemMesh(it, isExt, Y0, fh, fc, X) {
  const g = new THREE.Group();
  g.position.set(M(it.x), Y0, M(it.y)); g.rotation.y = -it.rot * Math.PI / 180;
  const W = M(it.w), D = M(it.d), H = Math.max(.005, M(it.h)), c = it.color || '#999999';
  const CEIL = M(fc || 2400);
  const wood = '#8b6a4c', white = '#fafaf8', dark = '#2a2a2a', metal = { metalness: .6, roughness: .35 };
  const legs = (w, d, h, x0 = 0, z0 = 0, col = wood, t = .045) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, t, h, t, x0 + sx * (w / 2 - t), 0, z0 + sz * (d / 2 - t), col); };
  const cyl = (r, h, x, y, z, col, seg = 16, r2 = r) => { const m = mesh(new THREE.CylinderGeometry(r2, r, h, seg), asMat(col)); m.position.set(x, y + h / 2, z); g.add(m); return m; };
  const ball = (r, x, y, z, col, sy = 1) => { const m = mesh(new THREE.IcosahedronGeometry(r, 1), mat(col, { flatShading: true })); m.position.set(x, y, z); m.scale.y = sy; g.add(m); return m; };
  const chair = (x, z, faceZ, col) => { // faceZ：座る人が向く方向（+1/-1 は z、x 向きは 'x+'/'x-'）
    B(g, .42, .04, .42, x, .42, z, col); legs(.42, .42, .42, x, z, col, .03);
    if (faceZ === 1 || faceZ === -1) B(g, .42, .4, .03, x, .46, z - faceZ * .2, col);
    else B(g, .03, .4, .42, x - (faceZ === 'x+' ? .2 : -.2), .46, z, col);
  };
  const bed = (pillows) => {
    B(g, W, .25, D, 0, 0, 0, wood); B(g, W - .04, .2, D - .06, 0, .25, .01, white);
    B(g, W, .85, .06, 0, 0, -D / 2 + .03, wood);
    B(g, W - .02, .07, D * .62, 0, .43, D * .19, c);
    const pw = (W - .1) / pillows - .04;
    for (let i = 0; i < pillows; i++) B(g, pw, .1, .35, -W / 2 + .07 + pw / 2 + i * (pw + .04), .45, -D / 2 + .3, white);
  };
  const flat = (key) => B(g, W, H, D, 0, 0, 0, X.paving(it.mat || key, it.color));
  switch (it.type) {
    /* --- リビング --- */
    case 'sofa2': case 'sofa3': case 'armchair':
      B(g, W, .42, D, 0, 0, 0, c); B(g, W, .4, .2, 0, .42, -D / 2 + .1, c);
      B(g, .16, .2, D, -W / 2 + .08, .42, 0, c); B(g, .16, .2, D, W / 2 - .08, .42, 0, c);
      for (let x = -W / 2 + .25; x < W / 2 - .2; x += .45) B(g, .4, .08, .06, x + .1, .62, -D / 2 + .24, shade(c, .12));
      break;
    case 'sofaL': {
      const sd = Math.min(.9, D);
      B(g, W, .42, sd, 0, 0, -D / 2 + sd / 2, c); B(g, sd, .42, D - sd, W / 2 - sd / 2, 0, sd / 2, c);
      B(g, W, .4, .2, 0, .42, -D / 2 + .1, c); B(g, .2, .4, D, W / 2 - .1, .42, 0, c); B(g, .16, .2, sd, -W / 2 + .08, .42, -D / 2 + sd / 2, c);
      break;
    }
    case 'ottoman': B(g, W, H, D, 0, 0, 0, c); break;
    case 'lowtable': B(g, W, .04, D, 0, H - .04, 0, c); legs(W, D, H - .04, 0, 0, c, .05); break;
    case 'sidetable': cyl(Math.min(W, D) / 2, .03, 0, H - .03, 0, c, 24); cyl(.02, H - .03, 0, 0, 0, dark); cyl(.15, .02, 0, 0, 0, dark, 20); break;
    case 'tv':
      B(g, W, H, D, 0, 0, 0, c);
      B(g, .3, .05, .2, 0, H, -D * .1, dark); B(g, .05, .1, .05, 0, H + .05, -D * .1, dark);
      B(g, Math.min(1.45, W * .8), .82, .05, 0, H + .12, -D * .1, '#151515');
      break;
    case 'sideboard': B(g, W, H - .12, D, 0, .12, 0, c); legs(W, D, .12, 0, 0, dark, .03); for (let x = -W / 2 + W / 6; x < W / 2; x += W / 3) B(g, .005, H * .6, .005, x + W / 6 - W / 6, .2, D / 2, shade(c, -.3)); break;
    case 'shelf': {
      B(g, W, H, .02, 0, 0, -D / 2 + .01, c); B(g, .02, H, D, -W / 2 + .01, 0, 0, c); B(g, .02, H, D, W / 2 - .01, 0, 0, c);
      const n = Math.max(2, Math.round(H / .35));
      for (let i = 0; i <= n; i++) {
        B(g, W, .02, D, 0, i * (H - .02) / n, 0, c);
        if (i < n) for (let x = -W / 2 + .05; x < W / 2 - .08; x += .05 + (i * 7 + x * 30 & 3) * .01) B(g, .03, .2 + ((x * 100 | 0) % 5) * .02, D * .7, x + .015, i * (H - .02) / n + .02, 0, ['#8c4a3b', '#3b5f8a', '#d9c9a0', '#4f7a5a', '#7a6a8a'][(x * 100 | 0) % 5]);
      }
      break;
    }
    case 'rug': B(g, W, Math.max(.008, H), D, 0, 0, 0, texMat('carpet', c, {}, .01)); break;
    case 'plant': cyl(.14, .3, 0, 0, 0, '#d8d4cc', 16, .11); ball(Math.min(W, H) * .45, 0, .3 + H * .4, 0, c, 1.3); break;
    case 'floorlamp': cyl(.15, .02, 0, 0, 0, dark, 20); cyl(.012, H - .3, 0, .02, 0, dark); cyl(.14, .3, 0, H - .3, 0, mat(c, { emissive: '#7a6a4a', side: THREE.DoubleSide }), 20, .18); break;
    case 'pendant': {
      const yb = Math.max(.6, CEIL - .75);
      cyl(.004, CEIL - yb - H, 0, yb + H, 0, dark, 6);
      cyl(W / 2, H, 0, yb, 0, mat(c, { side: THREE.DoubleSide }), 20, W * .12);
      cyl(W * .25, .01, 0, yb, 0, mat('#fff6dd', { emissive: '#fff0c8' }), 16);
      break;
    }
    case 'aircon': B(g, W, H, D, 0, Math.max(1.6, CEIL - H - .1), -D / 2 + D / 2, c); B(g, W * .9, .02, .03, 0, Math.max(1.6, CEIL - H - .1) + .03, D / 2, '#c9c9c6'); break;
    case 'piano': B(g, W, H, D * .55, 0, 0, -D / 2 + D * .275, c, { roughness: .25 }); B(g, W * .92, .05, D * .45, 0, .7, D * .05, c, { roughness: .25 }); B(g, W * .86, .015, .14, 0, .75, D * .05 - .1, white); B(g, W * .9, .4, .03, 0, .9, -D / 2 + D * .55, c); break;
    /* --- ダイニング・キッチン --- */
    case 'dining': case 'dining2': case 'dining6': {
      const td = Math.min(.85, D * .52), tw = it.type === 'dining2' ? W : W;
      B(g, tw, .04, td, 0, .68, 0, c); legs(tw, td, .68, 0, 0, c, .05);
      const xs = it.type === 'dining2' ? [0] : it.type === 'dining6' ? [-.33, 0, .33] : [-.25, .25];
      for (const sx of xs) for (const sz of [-1, 1]) chair(sx * W, sz * (td / 2 + .2), sz === 1 ? -1 : 1, c);
      break;
    }
    case 'roundtable': {
      const r = Math.min(W, D) * .3;
      cyl(r, .04, 0, .68, 0, c, 32); cyl(.04, .68, 0, 0, 0, c); cyl(.25, .02, 0, 0, 0, c, 20);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * (r + .25), z = Math.sin(a) * (r + .25); B(g, .42, .04, .42, x, .42, z, c); legs(.42, .42, .42, x, z, c, .03); }
      break;
    }
    case 'stools': { const n = Math.max(1, Math.round(W / .5)); for (let i = 0; i < n; i++) { const x = -W / 2 + W * (i + .5) / n; cyl(.17, .05, x, H - .05, 0, c, 20); cyl(.02, H - .05, x, 0, 0, '#888'); cyl(.18, .02, x, 0, 0, '#888', 20); } break; }
    case 'kitchen': case 'island': case 'islandFree': case 'kitchenL': {
      const top = '#d9d7d1', cd = it.type === 'kitchenL' ? .65 : D;
      const counter = (w, d, x, z) => { B(g, w, .82, d, x, 0, z, c); B(g, w + .01, .03, d + .01, x, .82, z, top); };
      if (it.type === 'kitchenL') { counter(W, cd, 0, -D / 2 + cd / 2); counter(cd, D - cd, -W / 2 + cd / 2, cd / 2); }
      else counter(W, D, 0, 0);
      const z0 = -D / 2 + cd / 2;
      B(g, W * .26, .012, cd * .5, W * .2, .846, z0, '#a8adb2', metal);
      if (it.type === 'kitchenL') B(g, cd * .7, .01, .55, -W / 2 + cd / 2, .846, (D - cd) * .3, '#1b1b1b'); else B(g, W * .22, .01, cd * .5, -W * .25, .846, z0, '#1b1b1b');
      cyl(.012, .25, W * .2, .85, z0 - cd * .3, '#c8c8c6', 8);
      if (it.type === 'kitchen' || it.type === 'kitchenL') { B(g, W, .7, .35, 0, 1.5, -D / 2 + .175, c); B(g, .75, .35, .45, -W * .25, 1.8, -D / 2 + .225, '#c8c8c6', metal); }
      if (it.type === 'island') B(g, W, .2, .08, 0, .85, D / 2 - .04, c);
      if (it.type === 'islandFree') { B(g, .9, .3, .5, -W * .25, Math.max(1.9, CEIL - .5), z0, '#c8c8c6', metal); B(g, .1, CEIL - Math.max(1.9, CEIL - .5) - .3, .1, -W * .25, Math.max(1.9, CEIL - .5) + .3, z0, '#c8c8c6', metal); }
      break;
    }
    case 'fridge': B(g, W, H, D, 0, 0, 0, c, { metalness: .3, roughness: .4 }); B(g, .02, .5, .03, W / 2 - .06, H * .55, D / 2 + .01, '#999'); B(g, W - .01, .005, .01, 0, H * .62, D / 2, shade(c, -.3)); break;
    case 'cupboard': case 'appliance':
      B(g, W, .85, D, 0, 0, 0, c); B(g, W, .02, D, 0, .85, 0, '#d9d7d1'); B(g, W, H - 1.25, D * .75, 0, 1.25, -D * .125, c);
      if (it.type === 'appliance') { B(g, W * .55, .3, D * .6, -W * .15, .87, -D * .1, '#2a2a2a'); B(g, W * .3, .25, D * .5, W * .3, .87, -D * .1, '#d8d8d6'); }
      else B(g, W * .96, H - 1.35, .01, 0, 1.3, -D * .125 + D * .375, GLASS());
      break;
    /* --- 寝室 --- */
    case 'bedS': bed(1); break;
    case 'bedSD': case 'bedD': case 'bedQ': bed(W >= 1.2 ? 2 : 1); break;
    case 'bunk':
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, .06, H, .06, sx * (W / 2 - .03), 0, sz * (D / 2 - .03), c);
      for (const y of [.25, 1.15]) { B(g, W, .08, D, 0, y, 0, c); B(g, W - .08, .15, D - .1, 0, y + .08, 0, white); B(g, W - .1, .05, D * .6, 0, y + .23, D * .18, '#a9b9c8'); }
      B(g, W, .15, .03, 0, 1.4, -D / 2 + .015, c); B(g, W, .15, .03, 0, 1.4, D / 2 - .015, c);
      for (let y = .4; y < 1.2; y += .25) B(g, .03, .03, .35, W / 2 + .02, y, D / 2 - .25, c);
      break;
    case 'chest': case 'tansu': {
      B(g, W, H, D, 0, 0, 0, c);
      const n = Math.max(3, Math.round(H / .22));
      for (let i = 1; i < n; i++) B(g, W - .02, .006, .005, 0, H * i / n, D / 2, shade(c, -.35));
      for (let i = 0; i < n; i++) for (const sx of [-.25, .25]) B(g, .08, .015, .015, sx * W, H * (i + .5) / n, D / 2 + .005, it.type === 'tansu' ? '#c9a74b' : '#555', metal);
      break;
    }
    case 'dresser': B(g, W, .72, .45, 0, 0, -D / 2 + .225, c); B(g, W * .7, .9, .03, 0, .75, -D / 2 + .02, '#cfdde6', { metalness: .5, roughness: .15 }); cyl(.17, .45, 0, 0, D / 2 - .25, shade(c, -.1), 16); break;
    case 'wardrobe': case 'shoes': case 'shoesTall': case 'butsudan':
      B(g, W, H, D, 0, 0, 0, c);
      B(g, .01, H * .9, .01, 0, H * .05, D / 2, shade(c, -.3));
      if (it.type === 'butsudan') { B(g, W * .8, H * .5, .01, 0, H * .35, D / 2, '#b8913a', metal); }
      break;
    case 'hanger': {
      for (const sx of [-1, 1]) B(g, .03, H, .03, sx * (W / 2 - .015), 0, 0, c, metal);
      B(g, W, .02, D, 0, H - .02, 0, '#e8e2d6'); { const rod = cyl(.012, W, 0, 0, 0, c, 8); rod.rotation.z = Math.PI / 2; rod.position.y = H - .25; }
      const pal = ['#3b4a66', '#e9e3d6', '#8a5a36', '#6f8a6a', '#2b2b2b', '#c9b293', '#b4664a'];
      for (let x = -W / 2 + .1, i = 0; x < W / 2 - .05; x += .07, i++) B(g, .03, .7 + (i % 3) * .12, D * .8, x, H - .27 - .7 - (i % 3) * .12, 0, pal[i % pal.length]);
      break;
    }
    case 'desk': {
      const dd = Math.min(.6, D * .55), z0 = -D / 2 + dd / 2;
      B(g, W, .03, dd, 0, .7, z0, c); legs(W, dd, .7, 0, z0, '#3a3a3a', .04);
      const cz = z0 + dd / 2 + .22;
      B(g, .45, .06, .45, 0, .42, cz, dark); cyl(.03, .42, 0, 0, cz, '#555'); B(g, .42, .45, .04, 0, .5, cz + .22, dark);
      break;
    }
    /* --- 水まわり --- */
    case 'unitbath':
      B(g, W, .02, D, 0, 0, 0, '#d4d6d8');
      B(g, W, .55, D * .45, 0, 0, -D / 2 + D * .225, c); B(g, W - .14, .02, D * .45 - .14, 0, .43, -D / 2 + D * .225, '#a9cde0');
      B(g, .03, .8, .45, -W / 2 + .02, .9, D * .2, '#cfdde6', { metalness: .5, roughness: .15 }); B(g, .12, .02, .5, -W / 2 + .07, .8, D * .2, c);
      cyl(.02, .9, -W / 2 + .08, 1.0, D * .42, '#c8c8c6', 8);
      break;
    case 'bath': B(g, W, H, D, 0, 0, 0, c); B(g, W - .14, .02, D - .14, 0, H - .12, 0, '#a9cde0'); break;
    case 'basin': case 'basin2': {
      B(g, W, .82, D, 0, 0, 0, c); B(g, W, .05, D, 0, .82, 0, white);
      const bowls = it.type === 'basin2' ? [-W / 4, W / 4] : [0];
      for (const x of bowls) { B(g, .4, .01, .3, x, .871, .02, '#e6eef2'); cyl(.012, .15, x, .87, -D / 2 + .08, '#c8c8c6', 8); }
      B(g, W, .8, .03, 0, 1.0, -D / 2 + .015, '#cfdde6', { metalness: .5, roughness: .15 });
      break;
    }
    case 'washer': B(g, W, H * .95, D, 0, 0, 0, c); cyl(W * .3, .02, 0, H * .95, 0, '#bfc5c9'); break;
    case 'toilet': case 'toiletTl':
      if (it.type === 'toilet') B(g, W * .9, .4, .2, 0, .35, -D / 2 + .1, c); else B(g, W * .8, .25, .22, 0, .3, -D / 2 + .11, c);
      cyl(W * .45, .4, 0, 0, D * .08, c, 20, W * .38); B(g, W * .95, .03, D * .62, 0, .4, D * .1, c);
      break;
    case 'handwash': B(g, W, .1, D, 0, .72, 0, '#a8835f'); cyl(.17, .1, 0, .82, .02, c, 20, .12); cyl(.01, .15, 0, .82, -D / 2 + .05, '#c8c8c6', 8); B(g, W * .8, .5, .02, 0, 1.0, -D / 2 + .01, '#cfdde6', { metalness: .5, roughness: .15 }); break;
    /* --- 和室・その他 --- */
    case 'zataku': B(g, W, .04, D, 0, H - .04, 0, c, { roughness: .4 }); legs(W, D, H - .04, 0, 0, c, .06); for (const sz of [-1, 1]) B(g, .55, .06, .55, 0, 0, sz * (D / 2 + .35), '#7a3b3b'); break;
    case 'stairs': {
      const fhm = M(fh || it.h), n = Math.max(8, Math.round(fhm / .2)), rise = fhm / n, run = D / n;
      for (let i = 0; i < n; i++) B(g, W, rise * (i + 1), run, 0, 0, D / 2 - run * (i + .5), c);
      // 手すり
      const hr = mesh(new THREE.BoxGeometry(.04, .04, Math.hypot(D, fhm)), mat('#6b4c35')); hr.position.set(W / 2 - .03, fhm / 2 + .85, 0); hr.rotation.x = Math.atan2(fhm, D); g.add(hr);
      break;
    }
    /* --- 外構：床・舗装 --- */
    case 'parking': case 'approach': case 'interlock': case 'stonePave': case 'lawn': case 'turf': case 'gravel': case 'deck': case 'terrace':
      flat(EXT[it.type].mat);
      if (it.type === 'deck' || it.type === 'terrace') { for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, .09, .02, .09, sx * (W / 2 - .1), 0, sz * (D / 2 - .1), '#9a958c'); }
      break;
    case 'stepping': { const n = Math.max(1, Math.round(W / (D * 1.3))); for (let i = 0; i < n; i++) { const x = -W / 2 + W * (i + .5) / n; const m = cyl(D * .45, H, x, 0, 0, texMat('stone', c, {}, .02), 9); m.scale.z = .85; } break; }
    case 'sleepers': { const n = Math.max(1, Math.round(W / .3)); for (let i = 0; i < n; i++) B(g, W / n * .7, H, D, -W / 2 + W * (i + .5) / n, 0, 0, texMat('woodV', c, {}, .02)); break; }
    case 'steps': { const n = 3, rh = H / n, rd = D / n; for (let i = 0; i < n; i++) B(g, W, rh * (i + 1), rd, 0, 0, D / 2 - rd * (i + .5), X.paving('tilePave', c)); break; }
    case 'flowerbed':
      B(g, W, H, D, 0, 0, 0, texMat('brickP', c, {}, .02)); B(g, W - .12, .02, D - .12, 0, H - .01, 0, '#5a4636');
      for (let x = -W / 2 + .3; x < W / 2 - .1; x += .5) ball(.17, x, H + .12, 0, '#6aa152');
      break;
    case 'flowers': {
      const pal = ['#d76f8f', '#f2c14e', '#ffffff', '#9b7fd1', '#e8743b', c];
      B(g, W, .03, D, 0, 0, 0, '#5a4636');
      let i = 0;
      for (let x = -W / 2 + .1; x < W / 2; x += .18) for (let z = -D / 2 + .1; z < D / 2; z += .18) { ball(.07, x, H * .5 + (i % 3) * .03, z, '#5f8f4a'); ball(.035, x + .02, H * .75 + (i % 2) * .05, z, pal[i % pal.length]); i++; }
      break;
    }
    /* --- 塀・門まわり --- */
    case 'fence': case 'fenceTall': {
      const n = Math.max(1, Math.round(W / 2));
      for (let i = 0; i <= n; i++) B(g, .05, H, .05, -W / 2 + W * i / n, 0, 0, c);
      const nb = it.type === 'fenceTall' ? Math.round(H / .11) : 7;
      for (let i = 0; i < nb; i++) B(g, W, H / nb * (it.type === 'fenceTall' ? .82 : .62), Math.max(.015, D * .4), 0, .06 + i * (H - .06) / nb, 0, texMat('woodV', c, {}, .01));
      break;
    }
    case 'meshFence': {
      const n = Math.max(1, Math.round(W / 2));
      for (let i = 0; i <= n; i++) B(g, .04, H, .04, -W / 2 + W * i / n, 0, 0, c);
      B(g, W, .03, .03, 0, H - .03, 0, c); B(g, W, .03, .03, 0, .05, 0, c);
      for (let x = -W / 2; x <= W / 2; x += .05) B(g, .004, H - .08, .004, x, .05, 0, c);
      for (let y = .1; y < H - .05; y += .15) B(g, W, .004, .004, 0, y, 0, c);
      break;
    }
    case 'block': B(g, W, H, D, 0, 0, 0, texMat('brickW', '#cfccc4', {}, .02)); B(g, W + .02, .04, D + .02, 0, H, 0, '#bdbab2'); break;
    case 'blockFence': {
      const bh = Math.min(.6, H * .45);
      B(g, W, bh, Math.max(.12, D), 0, 0, 0, texMat('brickW', '#cfccc4', {}, .02)); B(g, W + .02, .03, D + .02, 0, bh, 0, '#bdbab2');
      const n = Math.max(1, Math.round(W / 2)), fh2 = H - bh - .03;
      for (let i = 0; i <= n; i++) B(g, .04, fh2, .04, -W / 2 + W * i / n, bh + .03, 0, c);
      for (let i = 0; i < 6; i++) B(g, W, fh2 / 6 * .6, .02, 0, bh + .06 + i * fh2 / 6, 0, c);
      break;
    }
    case 'plasterWall': B(g, W, H, D, 0, 0, 0, texMat('stucco', c, {}, .02)); B(g, W + .03, .05, D + .03, 0, H, 0, shade(c, -.4)); break;
    case 'hedge': { const m = B(g, W, H, D, 0, 0, 0, texMat('lawn', c, {}, .05)); break; }
    case 'gatepost':
      B(g, W, H, D, 0, 0, 0, texMat('stucco', c, {}, .02)); B(g, W * .35, .2, .01, -W * .2, H * .72, D / 2 + .005, '#d9d4c8');
      B(g, W * .35, .32, .12, W * .2, H * .45, D / 2 + .06, '#7a7a78'); B(g, .12, .06, .04, 0, H - .1, D / 2 + .02, '#fff6d8', { emissive: '#4a4030' });
      break;
    case 'funcpost':
      B(g, W * .5, H, D, 0, 0, 0, c, metal); B(g, W, .3, D * 1.4, 0, H * .55, D * .2, c, metal);
      B(g, .08, .12, .02, 0, H * .8, D / 2 + .01, '#222'); B(g, .2, .06, .01, 0, H * .92, D / 2 + .01, '#e8e2d6'); B(g, W * .5, .04, .03, 0, H - .04, D / 2, '#fff6d8', { emissive: '#4a4030' });
      break;
    case 'gate': {
      for (const sx of [-1, 1]) B(g, .08, H + .1, .08, sx * (W / 2 + .04), 0, 0, c);
      for (const sx of [-1, 1]) { const lw = W / 2 - .02, x0 = sx * W / 4; B(g, lw, .04, .04, x0, .1, 0, c); B(g, lw, .04, .04, x0, H - .04, 0, c); for (let x = -lw / 2 + .05; x < lw / 2; x += .1) B(g, .025, H - .14, .025, x0 + x, .14, 0, c); }
      break;
    }
    case 'mailbox': B(g, .06, H - .35, .06, 0, 0, 0, c); B(g, W, .35, D, 0, H - .35, 0, c, metal); B(g, W * .6, .02, .01, 0, H - .12, D / 2, '#888'); break;
    case 'delivery': B(g, W, H, D, 0, 0, 0, c, metal); B(g, W - .04, H * .55, .01, 0, H * .08, D / 2, shade(c, -.15)); B(g, W - .04, H * .3, .01, 0, H * .66, D / 2, shade(c, -.15)); break;
    /* --- カーポート・物置 --- */
    case 'carport': case 'carport2':
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, .08, H, .08, sx * (W / 2 - .1), 0, sz * (D / 2 - .1), c, metal);
      B(g, W + .2, .08, D + .2, 0, H, 0, c, metal);
      { const r = mesh(new THREE.BoxGeometry(W + .1, .02, D + .1), mat('#dfe8ee', { transparent: true, opacity: .55 }), false); r.position.set(0, H + .09, 0); g.add(r); }
      break;
    case 'cycleport': case 'terraceRoof': {
      const back = it.type === 'cycleport';
      for (const sx of [-1, 1]) B(g, .07, H, .07, sx * (W / 2 - .1), 0, back ? -D / 2 + .1 : D / 2 - .1, c, metal);
      const r = mesh(new THREE.BoxGeometry(W + .1, .03, D + .1), mat('#dfe8ee', { transparent: true, opacity: .55 }), false);
      r.position.set(0, H + .05, 0); r.rotation.x = back ? -.06 : .06; g.add(r);
      B(g, W + .1, .1, .06, 0, H - .05, back ? D / 2 : -D / 2, c, metal); B(g, W + .1, .08, .06, 0, H - .05, back ? -D / 2 + .1 : D / 2 - .1, c, metal);
      break;
    }
    case 'pergola':
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(g, .1, H, .1, sx * (W / 2 - .05), 0, sz * (D / 2 - .05), c);
      for (const sz of [-1, 1]) B(g, W + .3, .15, .06, 0, H - .15, sz * (D / 2 - .05), c);
      for (let x = -W / 2; x <= W / 2 + .01; x += .3) B(g, .05, .1, D + .3, x, H, 0, c);
      break;
    case 'storage': B(g, W, H * .93, D, 0, 0, 0, texMat('spandrel', c, {}, .01)); B(g, W + .08, H * .07, D + .08, 0, H * .93, 0, '#8c9094'); B(g, W * .45, H * .8, .01, -W * .2, .05, D / 2, shade(c, -.1)); B(g, W * .45, H * .8, .01, W * .2, .05, D / 2 + .01, shade(c, -.05)); break;
    /* --- 植栽 --- */
    case 'tree': {
      const tr = Math.max(.07, W * .05);
      cyl(tr, H * .5, 0, 0, 0, '#6b4f3a', 8, tr * .7);
      const r = W / 2; ball(r, 0, Math.max(H - r, H * .5 + r * .5), 0, c, .95);
      ball(r * .6, r * .45, H - r * 1.1, r * .2, shade(c, .08)); ball(r * .55, -r * .4, H - r * 1.2, -r * .25, shade(c, -.06));
      break;
    }
    case 'evergreen': {
      cyl(.08, H * .35, 0, 0, 0, '#5b4433', 8);
      const r = W / 2; ball(r, 0, H - r * 1.05, 0, c, 1.15); ball(r * .7, r * .4, H - r * 1.5, r * .3, shade(c, -.08)); ball(r * .7, -r * .35, H - r * 1.4, -r * .3, shade(c, .06));
      break;
    }
    case 'conifer': {
      cyl(.07, H * .25, 0, 0, 0, '#6b4f3a', 8);
      const m = mesh(new THREE.ConeGeometry(W / 2, H * .82, 10), mat(c, { flatShading: true })); m.position.set(0, H * .18 + H * .41, 0); g.add(m);
      break;
    }
    case 'shrub': ball(W / 2, 0, H / 2, 0, c, H / W); ball(W * .3, W * .25, H * .7, 0, shade(c, .1), .9); break;
    case 'planter': B(g, W, .35, D, 0, 0, 0, c); B(g, W - .06, .02, D - .06, 0, .34, 0, '#5a4636'); for (let x = -W / 2 + .15; x < W / 2; x += .25) ball(.14, x, .35 + Math.max(.1, H - .5), 0, '#5f8f4a', 1.4); break;
    /* --- 設備・その他 --- */
    case 'poleLight': cyl(.05, H - .15, 0, 0, 0, c, 10); cyl(.06, .15, 0, H - .15, 0, mat('#fff6d8', { emissive: '#bfae80' }), 12); cyl(.07, .02, 0, H, 0, c, 12); break;
    case 'faucet': B(g, .1, H, .1, 0, 0, 0, c); cyl(.01, .1, 0, H * .8, .07, '#c8c8c6', 8).rotation.x = Math.PI / 2; B(g, W, .05, D, 0, 0, 0, texMat('stone', '#9a958c', {}, .02)); break;
    case 'outdoorUnit': B(g, W, H, D, 0, 0, 0, c); { const f = mesh(new THREE.CylinderGeometry(H * .35, H * .35, .01, 24), mat('#555')); f.rotation.x = Math.PI / 2; f.position.set(-W * .15, H / 2, D / 2 + .005); g.add(f); } break;
    case 'heater': B(g, W, H, D, 0, 0, 0, c); B(g, W * .9, .005, .01, 0, H * .7, D / 2, '#aaa'); break;
    case 'clothesline':
      for (const sx of [-1, 1]) { B(g, .05, H, .05, sx * W / 2, 0, 0, c, metal); B(g, .04, .04, D, sx * W / 2, H - .1, 0, c, metal); }
      for (const sz of [-1, 1]) { const r = cyl(.012, W, 0, H - .08, sz * (D / 2 - .03), c, 8); r.rotation.z = Math.PI / 2; r.position.y = H - .08; }
      break;
    case 'gardenSet': {
      const r = Math.min(W, D) * .25;
      cyl(r, .03, 0, .7, 0, c, 24); cyl(.03, .7, 0, 0, 0, c);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * (r + .3), z = Math.sin(a) * (r + .3); B(g, .45, .04, .45, x, .42, z, c); legs(.45, .45, .42, x, z, c, .03); }
      break;
    }
    case 'parasol': cyl(.02, H, 0, 0, 0, '#777'); { const m = mesh(new THREE.ConeGeometry(W / 2, .5, 8, 1, true), mat(c, { side: THREE.DoubleSide })); m.position.set(0, H - .2, 0); g.add(m); } cyl(.2, .05, 0, 0, 0, '#555', 16); break;
    case 'bench': B(g, W, .05, D * .8, 0, .42, D * .1, texMat('woodV', c, {}, .01)); B(g, W, .35, .04, 0, .5, -D / 2 + .02, texMat('woodV', c, {}, .01)); legs(W, D * .8, .42, 0, D * .1, '#333', .05); break;
    case 'car': {
      const bh = H * .42;
      B(g, W, bh, D, 0, .22, 0, c, { metalness: .4, roughness: .35 });
      B(g, W * .86, H * .3, D * .46, 0, .22 + bh, -D * .04, '#3c4853', { metalness: .3, roughness: .25 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = mesh(new THREE.CylinderGeometry(.32, .32, .22, 16), mat('#1b1b1b')); w.rotation.z = Math.PI / 2; w.position.set(sx * (W / 2 - .1), .32, sz * (D / 2 - .75)); g.add(w); }
      break;
    }
    case 'bike': {
      for (const sz of [-1, 1]) { const w = mesh(new THREE.TorusGeometry(.33, .025, 8, 24), mat('#1b1b1b')); w.rotation.y = Math.PI / 2; w.position.set(0, .35, sz * .5); g.add(w); }
      const fr = (z0, y0, z1, y1) => { const l = Math.hypot(z1 - z0, y1 - y0), m = mesh(new THREE.BoxGeometry(.03, .03, l), mat(c)); m.position.set(0, (y0 + y1) / 2, (z0 + z1) / 2); m.rotation.x = -Math.atan2(y1 - y0, z1 - z0); g.add(m); };
      fr(-.5, .35, 0, .4); fr(0, .4, .45, .75); fr(-.5, .35, -.15, .8); fr(-.15, .8, .45, .75); fr(.5, .35, .45, .75); fr(0, .4, -.15, .8);
      B(g, .1, .04, .22, 0, .82, -.15, '#222'); B(g, .5, .03, .03, 0, .95, .42, '#222');
      break;
    }
    default: B(g, W, H, D, 0, 0, 0, c);
  }
  return g;
}

/* ---------- 建物全体 ---------- */
function buildHouse(p) {
  const root = new THREE.Group(), C = p.colors, st = p.site, X = finishes(p);
  const floorsG = [], roofsG = [], ceil = new THREE.Group();
  const fy = p.floors.map((f, i) => M(floorY(p, i)));
  // 地面・敷地・道路
  const big = mesh(new THREE.PlaneGeometry(600, 600), mat('#aeb79d'), false);
  big.rotation.x = -Math.PI / 2; big.position.set(M(st.w / 2), -.03, M(st.d / 2)); root.add(big);
  root.add(boxRect({ x: 0, y: 0, w: st.w, d: st.d }, -.03, 0, texMat('mortar', C.ground, { roughness: 1 }, .02), false));
  const rr = roadRect(st);
  root.add(boxRect(rr, -.03, -.01, texMat('mortar', '#6f7174', { roughness: .95 }, .01), false));
  for (const it of p.ext) root.add(itemMesh(it, true, 0, 0, 0, X));
  p.floors.forEach((f, i) => {
    const g = new THREE.Group(); floorsG.push(g); root.add(g);
    const Y0 = fy[i], indoor = f.rooms.filter(isIn);
    if (i === 0) rectsOf(indoor).forEach(r => g.add(boxRect(r, 0, Y0, texMat('mortar', '#b9b6ae', {}, .01))));
    const below = i > 0 ? p.floors[i - 1] : null, fz = below ? M(below.h - below.ceil) : .02;
    for (const r of indoor) {
      const isTop = i === p.floors.length - 1;
      const cm = X.ceil(r), fm = X.floor(r);
      if (!(i > 0 && r.name === '階段')) g.add(boxRect(r, Y0 - fz, Y0 + .02, [cm, cm, fm, cm, cm, cm]));
      const upper = p.floors[i + 1];
      const voidAbove = r.name === '階段' && upper && upper.rooms.some(q => q.name === '階段' && inRect({ x: q.x - 1, y: q.y - 1, w: q.w + 2, d: q.d + 2 }, r.x + r.w / 2, r.y + r.d / 2));
      if (!voidAbove || isTop) ceil.add(boxRect(r, Y0 + M(f.ceil) - .015, Y0 + M(f.ceil), cm, false));
      // 下の階の天井（上の階の床の裏）は、下の階の部屋の天井材に合わせる
    }
    // バルコニー・ポーチ・テラス
    const em = X.ext(i);
    for (const r of f.rooms.filter(r => !isIn(r))) {
      const fm = X.floor(r);
      if (i === 0) { g.add(boxRect(r, 0, Math.max(.05, Y0 - .15), [em, em, fm, em, em, em])); continue; }
      g.add(boxRect(r, Y0 - .3, Y0, [em, em, fm, X.soffit(), em, em]));
      if (r.name === 'バルコニー') parapets(g, r, indoor, Y0, em);
    }
    for (const s of allWalls(f)) g.add(wallMesh(s, f, i, Y0, X, f.openings));
    for (const it of f.items) g.add(itemMesh(it, false, Y0 + .02, f.h, f.ceil, X));
  });
  // 屋根：各階で、上の階（部屋・バルコニー）がかぶらない部分にかける
  const R = p.roof, k = R.pitch / 10, o = M(R.overhang);
  let topI = -1; p.floors.forEach((f, i) => { if (f.rooms.some(isIn)) topI = i; });
  const RM = i => ({ roof: X.roof(true), wall: X.ext(i, true), soffit: X.soffit(), edge: mat(shade(C.roof, -.1)), wallFlat: X.ext(i), roofFlat: X.roof(false) });
  p.floors.forEach((f, i) => {
    const g = new THREE.Group(); roofsG.push(g); root.add(g);
    const upper = p.floors[i + 1] ? p.floors[i + 1].rooms : [];
    const regions = rectsOf(f.rooms.filter(isIn), upper);
    const wallTop = fy[i] + M(f.h), rm = RM(i);
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
        g.add(roofGroup(rect, R.type, k, { u0: oo, u1: oo, v0: oo, v1: oo }, wallTop + (R.type === 'flat' ? 0 : k * .08 + .01), axis, flipV, rm));
      } else if (sides.length === 1 && R.type !== 'flat') {
        // 下屋：上の階の壁側を高くした片流れ
        const sd = sides[0], axis = (sd === 'N' || sd === 'S') ? 'x' : 'z', flipV = sd === 'S' || sd === 'E';
        const oo = Math.min(o, .45), kk = Math.min(k, .35);
        g.add(roofGroup(rect, 'shed', kk, { u0: oo, u1: oo, v0: 0, v1: oo }, wallTop + kk * .08 + .01, axis, flipV, rm));
      } else {
        g.add(roofGroup(rect, 'flat', k, { u0: 0, u1: 0, v0: 0, v1: 0 }, wallTop, 'x', false, rm));
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
function parapets(g, r, indoor, Y0, em) {
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
      const cx = M(px) + (horiz ? 0 : inward * t / 2), cy = Y0 + h / 2, cz = M(py) + (horiz ? inward * t / 2 : 0);
      const m = mesh(worldUV(new THREE.BoxGeometry(horiz ? len : t, h, horiz ? t : len), cx, cy, cz), em);
      m.position.set(cx, cy, cz);
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
    ANISO = Math.min(8, r.capabilities.getMaxAnisotropy());
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
