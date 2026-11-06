/* Livii 住宅プラン — 測量図・敷地図の読み込み。
   ・PDF は pdf.js（lib/ に同梱、使うときだけ読み込む）で1ページ目を画像にして「下図」にする。
   ・CAD から出した PDF のように文字が入っていれば、座標求積表（点名・X・Y）と地積・縮尺を読み取り、敷地の形を自動で作る。
   ・スキャンした PDF・写真は文字が読めないので、縮尺を合わせて境界をなぞる。
   座標：測量の X は北、Y は東（m）。図面では x＝Y、y＝−X（mm）にする。 */
'use strict';

let pdfjsReady = null;
function loadPdfJs() {
  if (pdfjsReady) return pdfjsReady;
  const add = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src + ' を読み込めません')); document.head.appendChild(s); });
  // worker を先に読むと、pdf.js は同じスレッドで動く（file:// でも使える）
  pdfjsReady = add('lib/pdf.worker.min.js').then(() => add('lib/pdf.min.js')).then(() => { pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js'; return pdfjsLib; });
  return pdfjsReady;
}

// 文字の一覧から、座標・地積・縮尺を探す
function parseSurvey(lines) {
  const res = { points: [], area: null, scale: null, lines: lines.length };
  const seen = new Set();
  for (const raw of lines) {
    const s = raw.normalize('NFKC').replace(/,/g, '');
    const re = /(?:^|\s)((?:[A-Za-z]{1,3}-?)?\d{1,3})\s+(-?\d{1,7}\.\d{2,4})\s+(-?\d{1,7}\.\d{2,4})(?=\s|$)/g;
    let m;
    while ((m = re.exec(s))) {
      const name = m[1], X = +m[2], Y = +m[3];
      if (seen.has(name)) continue;
      seen.add(name); res.points.push({ name, X, Y });
    }
    if (res.area == null) { const a = s.match(/(地積|面積|敷地面積|求積|合計)[^0-9]{0,12}([0-9]+\.[0-9]+)/); if (a) res.area = +a[2]; }
    if (res.scale == null) { const c = s.match(/(?:縮尺|S\s*=|Ｓ\s*=)?\s*1\s*[/:：]\s*(50|100|150|200|250|300|400|500|600|1000)(?![0-9])/); if (c) res.scale = +c[1]; }
  }
  if (res.points.length < 3) res.points = [];
  return res;
}
function polyArea(poly) { let s = 0; for (let i = 0; i < poly.length; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; }
function siteArea(st) { return (st.poly && st.poly.length >= 3 ? polyArea(st.poly) : st.w * st.d) / 1e6; }
function coordsToPoly(points) { return points.map(pt => [Math.round(pt.Y * 1000), Math.round(-pt.X * 1000)]); }

// 図面全体をずらす（敷地の形を作ったときに、敷地の左上を (0,0) にそろえる）
function shiftAll(p, dx, dy) {
  if (!dx && !dy) return;
  if (p.site.poly) p.site.poly = p.site.poly.map(([x, y]) => [x + dx, y + dy]);
  if (p.underlay) { p.underlay.x += dx; p.underlay.y += dy; }
  for (const f of p.floors) {
    f.rooms.forEach(r => { r.x += dx; r.y += dy; });
    f.walls.forEach(w => { w.x1 += dx; w.x2 += dx; w.y1 += dy; w.y2 += dy; });
    f.openings.forEach(o => { o.x += dx; o.y += dy; });
    f.items.forEach(it => { it.x += dx; it.y += dy; });
  }
  p.ext.forEach(it => { it.x += dx; it.y += dy; });
}
function normalizeSite(p) {
  const poly = p.site.poly; if (!poly || poly.length < 3) return;
  const xs = poly.map(q => q[0]), ys = poly.map(q => q[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  shiftAll(p, -x0, -y0);
  p.site.w = Math.round(Math.max(...xs) - x0); p.site.d = Math.round(Math.max(...ys) - y0);
}
// 読み取った座標で敷地を作る。建物などは敷地の中央あたりに来るよう合わせる
function applySitePoly(p, poly) {
  const oldCx = p.site.w / 2, oldCy = p.site.d / 2;
  p.site.poly = poly.map(q => [...q]);
  const xs = poly.map(q => q[0]), ys = poly.map(q => q[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), w = Math.max(...xs) - x0, d = Math.max(...ys) - y0;
  // いまの建物・外構を、新しい敷地の中心へ移す（敷地の点はそのまま）
  const keep = p.site.poly; p.site.poly = null;
  const ul = p.underlay; p.underlay = null;
  shiftAll(p, (x0 + w / 2) - oldCx, (y0 + d / 2) - oldCy);
  p.site.poly = keep; p.underlay = ul;
  normalizeSite(p);
}

// ファイル（PDF・画像）を読み込んで、下図と読み取り結果を返す
async function readSurveyFile(file, pageNo = 1) {
  const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
  let cv, paperMmPerPx = null, parsed = { points: [], area: null, scale: null, lines: 0 }, pages = 1;
  if (isPdf) {
    const lib = await loadPdfJs();
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    pages = doc.numPages;
    const page = await doc.getPage(Math.min(pageNo, pages));
    const vp1 = page.getViewport({ scale: 1 }), scale = 2400 / Math.max(vp1.width, vp1.height);
    const vp = page.getViewport({ scale });
    cv = document.createElement('canvas'); cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    paperMmPerPx = (25.4 / 72) / scale;
    // 文字を行にまとめる
    const tc = await page.getTextContent();
    const rows = [];
    for (const it of tc.items) {
      if (!it.str || !it.str.trim()) continue;
      const x = it.transform[4], y = it.transform[5];
      let row = rows.find(r => Math.abs(r.y - y) < 2.5);
      if (!row) { row = { y, items: [] }; rows.push(row); }
      row.items.push({ x, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    parsed = parseSurvey(rows.map(r => r.items.sort((a, b) => a.x - b.x).map(i => i.s).join(' ')));
  } else {
    const url = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('画像を読めません')); i.src = url; });
    const k = Math.min(1, 2400 / Math.max(im.width, im.height));
    cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
  }
  // 保存用に縮める（ブラウザの保存容量のため）
  const k2 = Math.min(1, 1800 / Math.max(cv.width, cv.height));
  const out = document.createElement('canvas'); out.width = Math.round(cv.width * k2); out.height = Math.round(cv.height * k2);
  out.getContext('2d').drawImage(cv, 0, 0, out.width, out.height);
  return { img: out.toDataURL('image/jpeg', .72), pw: out.width, ph: out.height, paperMmPerPx: paperMmPerPx ? paperMmPerPx / k2 : null, parsed, pages, name: file.name, isPdf };
}

// 下図を描く
const ulImgCache = new Map();
function ulImage(ul) {
  let im = ulImgCache.get(ul.img);
  if (!im) { im = new Image(); im.src = ul.img; ulImgCache.set(ul.img, im); im.onload = () => { if (typeof edSite !== 'undefined') { edSite.draw(); edPlan.draw(); } }; }
  return im;
}
function drawUnderlay(ctx, v, p) {
  const ul = p.underlay; if (!ul || !ul.show) return;
  const im = ulImage(ul); if (!im.complete || !im.naturalWidth) return;
  ctx.save();
  ctx.globalAlpha = ul.opacity ?? .6;
  ctx.translate(ul.x * v.s + v.ox, ul.y * v.s + v.oy);
  ctx.rotate((ul.rot || 0) * Math.PI / 180);
  const k = ul.mmpp * v.s;
  ctx.drawImage(im, 0, 0, ul.pw * k, ul.ph * k);
  ctx.restore();
}
