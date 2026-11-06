/* Livii 住宅プラン — 仕上げ材（外壁・屋根・壁紙・床・舗装）のカタログと模様。
   模様は画像ファイルを使わず、すべてプログラムで描く。描くときの単位は m。
   メーカー名・商品名は使わない（一般的な呼び名だけ）。 */
'use strict';

/* ===== カタログ ===== */
// pat：模様の種類（下の PATS）。color：基本の色（設定画面で変えられる）
const EXT_WALLS = {
  siding_h:  { label: 'サイディング（横張り）',     pat: 'lapH',     color: '#ebe8e1' },
  siding_v:  { label: 'サイディング（縦ストライプ）', pat: 'lapV',     color: '#dcd9d2' },
  siding_st: { label: 'サイディング（石積み調）',   pat: 'stone',    color: '#c9bdab' },
  siding_br: { label: 'サイディング（レンガ調）',   pat: 'brick',    color: '#9b5a43' },
  siding_wd: { label: 'サイディング（木目調）',     pat: 'woodV',    color: '#9a7350' },
  tile:      { label: '外壁タイル',                 pat: 'tile2',    color: '#bfae98' },
  stucco:    { label: '塗り壁（左官仕上げ）',       pat: 'stucco',   color: '#efe9de' },
  galva_v:   { label: 'ガルバリウム（角波）',       pat: 'rib',      color: '#3a3d40' },
  galva_sp:  { label: 'ガルバリウム（スパンドレル）', pat: 'spandrel', color: '#8b9094' },
  cedar:     { label: '板張り（焼杉・木）',         pat: 'board',    color: '#2e2b28' },
  concrete:  { label: 'コンクリート打ち放し調',     pat: 'concrete', color: '#b5b3ad' },
  alc:       { label: 'ALCパネル（塗装）',          pat: 'panel',    color: '#d8d5ce' },
};
const ROOF_MATS = {
  slate:     { label: 'スレート',                   pat: 'slate',    color: '#34373b' },
  galva:     { label: 'ガルバリウム（立平葺き）',   pat: 'standing', color: '#2f3236' },
  kawara:    { label: '和瓦（いぶし銀）',           pat: 'kawara',   color: '#5c6168' },
  flattile:  { label: '平板瓦',                     pat: 'flatTile', color: '#3c3e41' },
  stile:     { label: '洋瓦（S型）',                pat: 'sTile',    color: '#a9583b' },
  shingle:   { label: 'アスファルトシングル',       pat: 'shingle',  color: '#4b4844' },
};
const WALLPAPERS = {
  white:     { label: '白（織物調）',               pat: 'weave',    color: '#f3f1ec' },
  ivory:     { label: 'アイボリー',                 pat: 'weave',    color: '#eee5d3' },
  greige:    { label: 'グレージュ',                 pat: 'weave',    color: '#d6cdc0' },
  gray:      { label: 'ライトグレー',               pat: 'weave',    color: '#c3c4c1' },
  charcoal:  { label: 'チャコール',                 pat: 'weave',    color: '#55575a' },
  navy:      { label: 'ネイビー',                   pat: 'weave',    color: '#3b4a66' },
  sage:      { label: 'くすみグリーン',             pat: 'weave',    color: '#a7b4a0' },
  blue:      { label: 'くすみブルー',               pat: 'weave',    color: '#a9b9c8' },
  pink:      { label: 'ピンクベージュ',             pat: 'weave',    color: '#e6cec4' },
  mustard:   { label: 'マスタード',                 pat: 'weave',    color: '#cfa955' },
  stripe:    { label: 'ストライプ',                 pat: 'stripe',   color: '#e9e4d9' },
  brickw:    { label: 'レンガ調（ホワイト）',       pat: 'brickW',   color: '#efebe4' },
  concrete:  { label: 'コンクリート調',             pat: 'concrete', color: '#b9b7b1' },
  wood:      { label: '木目（板張り）',             pat: 'woodV',    color: '#b08a64' },
  wooddk:    { label: '木目（ダーク）',             pat: 'woodV',    color: '#6b4c35' },
  stone:     { label: '石目調',                     pat: 'stone',    color: '#d8d3c9' },
  tilew:     { label: 'タイル調（水まわり）',       pat: 'tileSq',   color: '#f4f4f2' },
  botanical: { label: '柄（ボタニカル）',           pat: 'leaf',     color: '#eceee6' },
  washi:     { label: '和紙調（和室）',             pat: 'washi',    color: '#e9e0c9' },
  juraku:    { label: '聚楽壁調（和室）',           pat: 'stucco',   color: '#cdb98f' },
};
const FLOOR_MATS = {
  oak:     { label: 'フローリング（ナチュラル）', pat: 'plank',      color: '#c9a27a' },
  white:   { label: 'フローリング（ホワイト）',   pat: 'plank',      color: '#e2d6c3' },
  greige:  { label: 'フローリング（グレージュ）', pat: 'plank',      color: '#b9ab98' },
  cherry:  { label: 'フローリング（チェリー）',   pat: 'plank',      color: '#b0714b' },
  walnut:  { label: 'フローリング（ダーク）',     pat: 'plank',      color: '#6f4f37' },
  parquet: { label: '寄木（パーケット）',         pat: 'parquet',    color: '#b58a5e' },
  tatami:  { label: '畳',                         pat: 'tatami',     color: '#c8c58c' },
  ryukyu:  { label: '縁なし畳（半畳）',           pat: 'tatamiHalf', color: '#c2bf88' },
  tile:    { label: 'タイル（300角）',            pat: 'tile300',    color: '#d3d0c9' },
  tile600: { label: 'タイル（600角）',            pat: 'tile600',    color: '#c7c3bb' },
  marble:  { label: '大理石調',                   pat: 'marble',     color: '#ecebe7' },
  cf:      { label: 'クッションフロア',           pat: 'tileSq',     color: '#e7e3da' },
  carpet:  { label: 'カーペット',                 pat: 'carpet',     color: '#a9a196' },
  mortar:  { label: 'モルタル（土間）',           pat: 'mortar',     color: '#a9a7a1' },
};
const PAVINGS = {
  concJoint: { label: '土間コンクリート',   pat: 'concJoint', color: '#c4c2bc' },
  arai:      { label: '洗い出し',           pat: 'gravelF',   color: '#cbc2b2' },
  tilePave:  { label: 'タイル',             pat: 'tilePave',  color: '#cdbca6' },
  interlock: { label: 'インターロッキング', pat: 'interlock', color: '#b79a80' },
  stoneP:    { label: '乱形石',             pat: 'stoneP',    color: '#b9b1a3' },
  brickP:    { label: 'レンガ敷き',         pat: 'brickP',    color: '#a3604a' },
  gravel:    { label: '砂利',               pat: 'gravel',    color: '#bdb7ab' },
  lawn:      { label: '天然芝',             pat: 'lawn',      color: '#7fa650' },
  turf:      { label: '人工芝',             pat: 'turf',      color: '#6aa34a' },
  deckP:     { label: 'ウッドデッキ材',     pat: 'deck',      color: '#a3764f' },
  deckG:     { label: '樹脂デッキ（グレー）', pat: 'deck',    color: '#8b8781' },
  soil:      { label: '土',                 pat: 'mortar',    color: '#9b8467' },
};
// 色見本（家具・サッシ・ドアなど）
const SWATCH = {
  wood:  [['ナチュラル', '#c49a6c'], ['オーク', '#a8835f'], ['ウォールナット', '#6b4c35'], ['ホワイト', '#f1efea'], ['グレー', '#8a8f96'], ['ブラック', '#2b2b2b'], ['ネイビー', '#34405a'], ['ベージュ', '#d8cbb3'], ['グリーン', '#6f8a6a'], ['テラコッタ', '#b4664a']],
  sash:  [['ブラック', '#2b2b2b'], ['ダークブラウン', '#4a3a30'], ['シルバー', '#b9bcbf'], ['ホワイト', '#eeeeec'], ['ステンカラー', '#7c7a74']],
  door:  [['ナチュラル', '#c49a6c'], ['ミディアム', '#a07650'], ['ダーク', '#5a4232'], ['ホワイト', '#f1efea'], ['グレー', '#9a9a96'], ['ブラック', '#2e2e2e']],
  entrance: [['ブラック', '#2e2c2a'], ['木目ダーク', '#5a4232'], ['木目ナチュラル', '#a07650'], ['ネイビー', '#2f3b52'], ['ホワイト', '#eeeeea'], ['シルバー', '#a8abae']],
};

/* ===== 色と乱数 ===== */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rgbOf(hex) { const n = parseInt(String(hex).slice(1, 7), 16) || 0; return [n >> 16, (n >> 8) & 255, n & 255]; }
// a>0 で明るく、a<0 で暗く
function shade(hex, a) {
  let [r, g, b] = rgbOf(hex); const t = a < 0 ? 0 : 255, p = Math.min(1, Math.abs(a));
  r = Math.round(r + (t - r) * p); g = Math.round(g + (t - g) * p); b = Math.round(b + (t - b) * p);
  return `rgb(${r},${g},${b})`;
}
function shadeA(hex, a, al) { const s = shade(hex, a); return s.replace('rgb(', 'rgba(').replace(')', `,${al})`); }

/* ===== 模様の部品 ===== */
const wrap3 = (tw, th, fn) => { for (const dx of [-tw, 0, tw]) for (const dy of [-th, 0, th]) fn(dx, dy); };
function speck(c, tw, th, R, n, col, amp, sz) {
  for (let i = 0; i < n; i++) { c.fillStyle = shade(col, (R() - .5) * 2 * amp); const s = sz * (.5 + R()); c.fillRect(R() * tw, R() * th, s, s); }
}
function blotch(c, tw, th, R, n, col, amp, r0, r1) {
  for (let i = 0; i < n; i++) {
    const x = R() * tw, y = R() * th, r = r0 + R() * (r1 - r0);
    c.fillStyle = shadeA(col, (R() - .5) * 2 * amp, .5);
    wrap3(tw, th, (dx, dy) => { c.beginPath(); c.arc(x + dx, y + dy, r, 0, Math.PI * 2); c.fill(); });
  }
}
function grain(c, x, y, w, h, col, R, vertical, lw = .0015) {
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  const span = vertical ? w : h, n = Math.max(4, Math.round(span / .008));
  for (let i = 0; i < n; i++) {
    c.strokeStyle = shadeA(col, (R() - .55) * .35, .55); c.lineWidth = lw * (.5 + R()); c.beginPath();
    if (vertical) { const x0 = x + R() * w, a = (R() - .5) * .01; c.moveTo(x0, y); c.bezierCurveTo(x0 + a, y + h * .33, x0 - a, y + h * .66, x0 + a * .5, y + h); }
    else { const y0 = y + R() * h, a = (R() - .5) * .01; c.moveTo(x, y0); c.bezierCurveTo(x + w * .33, y0 + a, x + w * .66, y0 - a, x + w, y0 + a * .5); }
    c.stroke();
  }
  if (R() < .5) { // 節
    const kx = x + R() * w, ky = y + R() * h;
    c.strokeStyle = shadeA(col, -.3, .35); c.lineWidth = lw;
    for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(kx, ky, vertical ? .004 * k : .012 * k, vertical ? .012 * k : .004 * k, 0, 0, Math.PI * 2); c.stroke(); }
  }
  c.restore();
}
// 横方向に繰り返す四角（端をまたぐときは反対側にも描く）
function hrect(c, tw, x, y, w, h) { c.fillRect(x, y, w, h); if (x + w > tw) c.fillRect(x - tw, y, w, h); if (x < 0) c.fillRect(x + tw, y, w, h); }
function bond(c, tw, th, col, R, bw, bh, j, amp, mortar, half = .5) {
  c.fillStyle = mortar; c.fillRect(0, 0, tw, th);
  const rows = Math.round(th / bh), cols = Math.round(tw / bw);
  for (let i = 0; i < rows; i++) for (let k = 0; k < cols; k++) {
    const x = k * bw + (i % 2 ? bw * half : 0), y = i * bh;
    c.fillStyle = shade(col, (R() - .5) * 2 * amp);
    hrect(c, tw, x + j / 2, y + j / 2, bw - j, bh - j);
  }
}
function planks(c, tw, th, col, R, bw, amp, gap, vertical, gapCol) {
  // bw：板の幅。vertical=false で横向きの板（長さ方向が x）
  const n = Math.round((vertical ? tw : th) / bw), len = vertical ? th : tw;
  for (let i = 0; i < n; i++) {
    let s = R() * len; const segs = R() < .5 ? [len] : (() => { const a = len * (.35 + R() * .3); return [a, len - a]; })();
    for (const L of segs) {
      const cc = shade(col, (R() - .5) * 2 * amp);
      const draw = (o) => {
        c.fillStyle = cc;
        if (vertical) { c.fillRect(i * bw, s + o, bw, L); grain(c, i * bw, s + o, bw, L, col, R, true); }
        else { c.fillRect(s + o, i * bw, L, bw); grain(c, s + o, i * bw, L, bw, col, R, false); }
      };
      draw(0); if (s + L > len) draw(-len);
      c.fillStyle = gapCol || shade(col, -.4);
      if (vertical) { c.fillRect(i * bw, (s % len), bw, gap * .6); }
      else { c.fillRect(s % len, i * bw, gap * .6, bw); }
      s = (s + L) % len;
    }
    c.fillStyle = gapCol || shade(col, -.4);
    if (vertical) c.fillRect(i * bw, 0, gap, len); else c.fillRect(0, i * bw, len, gap);
  }
}
function gridTiles(c, tw, th, col, R, s, j, amp, jc) {
  c.fillStyle = jc; c.fillRect(0, 0, tw, th);
  for (let x = 0; x < tw - 1e-6; x += s) for (let y = 0; y < th - 1e-6; y += s) {
    c.fillStyle = shade(col, (R() - .5) * 2 * amp); c.fillRect(x + j / 2, y + j / 2, s - j, s - j);
  }
}
function weave(c, tw, th, col, R, n, amp) {
  c.lineWidth = .0012;
  for (let i = 0; i < n; i++) {
    const x = R() * tw, y = R() * th, h = R() < .5;
    c.strokeStyle = shadeA(col, (R() - .5) * 2 * amp, .8); c.beginPath(); c.moveTo(x, y); c.lineTo(x + (h ? .006 : 0), y + (h ? 0 : .006)); c.stroke();
  }
}

/* ===== 模様の一覧 ===== tw,th はくり返しの大きさ（m） */
const PATS = {
  plain:   { tw: .5, th: .5, draw(c, tw, th, col, R) { c.fillStyle = col; c.fillRect(0, 0, tw, th); speck(c, tw, th, R, 2500, col, .04, .003); } },
  weave:   { tw: .3, th: .3, draw(c, tw, th, col, R) { c.fillStyle = col; c.fillRect(0, 0, tw, th); weave(c, tw, th, col, R, 2600, .05); } },
  stripe:  { tw: .4, th: .4, draw(c, tw, th, col, R) { c.fillStyle = col; c.fillRect(0, 0, tw, th); for (let x = 0; x < tw; x += .05) { c.fillStyle = shade(col, -.05); c.fillRect(x, 0, .022, th); c.fillStyle = shade(col, -.1); c.fillRect(x + .022, 0, .002, th); } weave(c, tw, th, col, R, 1500, .04); } },
  washi:   { tw: .5, th: .5, draw(c, tw, th, col, R) {
    c.fillStyle = col; c.fillRect(0, 0, tw, th); speck(c, tw, th, R, 1500, col, .05, .003);
    c.lineWidth = .0015;
    for (let i = 0; i < 450; i++) { const x = R() * tw, y = R() * th, l = .02 + R() * .05, a = R() * Math.PI; c.strokeStyle = shadeA(col, R() < .5 ? .15 : -.08, .55); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l / 2 + (R() - .5) * .01, y + Math.sin(a) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  } },
  leaf:    { tw: .6, th: .6, draw(c, tw, th, col, R) {
    c.fillStyle = col; c.fillRect(0, 0, tw, th); weave(c, tw, th, col, R, 1500, .03);
    const pal = ['#8fa98a', '#a7b89d', '#6f8f6c', '#b9c4ad'];
    for (let i = 0; i < 18; i++) {
      const x = R() * tw, y = R() * th, a = R() * Math.PI * 2, l = .04 + R() * .05, cc = pal[Math.floor(R() * pal.length)];
      wrap3(tw, th, (dx, dy) => {
        c.save(); c.translate(x + dx, y + dy); c.rotate(a);
        c.fillStyle = cc; c.beginPath(); c.ellipse(0, 0, l, l * .38, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = shade(cc, -.25); c.lineWidth = .0015; c.beginPath(); c.moveTo(-l, 0); c.lineTo(l * 1.25, 0); c.stroke();
        c.restore();
      });
    }
  } },
  stucco:  { tw: 1, th: 1, draw(c, tw, th, col, R) {
    c.fillStyle = col; c.fillRect(0, 0, tw, th);
    blotch(c, tw, th, R, 260, col, .07, .02, .12);
    c.lineWidth = .004;
    for (let i = 0; i < 70; i++) { const x = R() * tw, y = R() * th, r = .05 + R() * .12, a = R() * 6; c.strokeStyle = shadeA(col, (R() - .5) * .12, .35); c.beginPath(); c.arc(x, y, r, a, a + .8 + R()); c.stroke(); }
    speck(c, tw, th, R, 3000, col, .06, .003);
  } },
  mortar:  { tw: 1, th: 1, draw(c, tw, th, col, R) { c.fillStyle = col; c.fillRect(0, 0, tw, th); blotch(c, tw, th, R, 220, col, .06, .03, .18); speck(c, tw, th, R, 4000, col, .08, .003); } },
  concrete:{ tw: 1.8, th: .9, draw(c, tw, th, col, R) {
    c.fillStyle = col; c.fillRect(0, 0, tw, th); blotch(c, tw, th, R, 160, col, .05, .04, .25); speck(c, tw, th, R, 5000, col, .07, .003);
    c.fillStyle = shade(col, -.22); c.fillRect(0, 0, tw, .004); c.fillRect(0, 0, .004, th);
    for (const x of [.3, .9, 1.5]) for (const y of [.225, .675]) { c.fillStyle = shade(col, -.32); c.beginPath(); c.arc(x, y, .013, 0, 7); c.fill(); c.fillStyle = shade(col, .08); c.beginPath(); c.arc(x - .003, y - .003, .006, 0, 7); c.fill(); }
  } },
  panel:   { tw: 1.2, th: .6, draw(c, tw, th, col, R) { c.fillStyle = col; c.fillRect(0, 0, tw, th); speck(c, tw, th, R, 3500, col, .05, .003); c.fillStyle = shade(col, -.25); c.fillRect(0, 0, tw, .006); c.fillStyle = shade(col, -.1); c.fillRect(0, 0, .003, th); } },
  lapH:    { tw: 1.82, th: .42, draw(c, tw, th, col, R) {
    for (let i = 0; i < 2; i++) {
      const y = i * .21, g = c.createLinearGradient(0, y, 0, y + .21);
      g.addColorStop(0, shade(col, .07)); g.addColorStop(.85, shade(col, -.02)); g.addColorStop(1, shade(col, -.14));
      c.fillStyle = g; c.fillRect(0, y, tw, .21);
      c.fillStyle = shade(col, -.38); c.fillRect(0, y + .203, tw, .007);
      c.fillStyle = shade(col, -.12); c.fillRect(R() * tw, y, .006, .21);
    }
    speck(c, tw, th, R, 3000, col, .05, .003);
  } },
  lapV:    { tw: .6, th: .6, draw(c, tw, th, col, R) { c.fillStyle = col; c.fillRect(0, 0, tw, th); speck(c, tw, th, R, 2000, col, .05, .003); for (let x = 0; x < tw; x += .15) { c.fillStyle = shade(col, -.32); c.fillRect(x, 0, .009, th); c.fillStyle = shade(col, .14); c.fillRect(x + .009, 0, .004, th); } } },
  stone:   { tw: 1.2, th: .9, draw(c, tw, th, col, R) {
    c.fillStyle = shade(col, -.42); c.fillRect(0, 0, tw, th);
    let y = 0;
    while (y < th - 1e-6) {
      let h = [.12, .15, .18, .22][Math.floor(R() * 4)]; if (th - y < h + .1) h = th - y;
      const x0 = R() * tw; let x = 0;
      while (x < tw - 1e-6) {
        let w = .22 + R() * .35; if (tw - x < w + .15) w = tw - x;
        const cc = shade(col, (R() - .5) * .34);
        c.fillStyle = cc; hrect(c, tw, (x0 + x) % tw + .005, y + .005, w - .01, h - .01);
        c.fillStyle = shadeA(col, .25, .5); hrect(c, tw, (x0 + x) % tw + .005, y + .005, w - .01, .006);
        x += w;
      }
      y += h;
    }
    speck(c, tw, th, R, 5000, col, .12, .004);
  } },
  brick:   { tw: .88, th: .56, draw(c, tw, th, col, R) { bond(c, tw, th, col, R, .22, .07, .01, .17, '#cfcabf'); speck(c, tw, th, R, 3000, col, .12, .003); } },
  brickW:  { tw: .88, th: .56, draw(c, tw, th, col, R) { bond(c, tw, th, col, R, .22, .07, .01, .05, shade(col, -.12)); speck(c, tw, th, R, 3000, col, .06, .003); } },
  brickP:  { tw: .8, th: .4, draw(c, tw, th, col, R) { bond(c, tw, th, col, R, .2, .1, .008, .16, '#a9a49a'); speck(c, tw, th, R, 2500, col, .1, .003); } },
  tile2:   { tw: .94, th: .544, draw(c, tw, th, col, R) { bond(c, tw, th, col, R, .235, .068, .008, .12, shade(col, .38)); speck(c, tw, th, R, 3000, col, .07, .003); } },
  woodV:   { tw: .96, th: 1.8, draw(c, tw, th, col, R) { planks(c, tw, th, col, R, .12, .1, .004, true); } },
  board:   { tw: .72, th: 1.8, draw(c, tw, th, col, R) {
    planks(c, tw, th, col, R, .18, .12, .004, true);
    for (let x = 0; x < tw; x += .18) { c.fillStyle = shade(col, -.15); c.fillRect(x, 0, .03, th); c.fillStyle = shade(col, .1); c.fillRect(x, 0, .004, th); }
    speck(c, tw, th, R, 3000, col, .15, .003);
  } },
  rib:     { tw: .8, th: .4, draw(c, tw, th, col, R) {
    for (let x = 0; x < tw - 1e-6; x += .2) { const g = c.createLinearGradient(x, 0, x + .2, 0); g.addColorStop(0, shade(col, .1)); g.addColorStop(.3, shade(col, .18)); g.addColorStop(.5, shade(col, -.16)); g.addColorStop(.7, shade(col, -.05)); g.addColorStop(1, shade(col, .1)); c.fillStyle = g; c.fillRect(x, 0, .2, th); }
    speck(c, tw, th, R, 800, col, .04, .003);
  } },
  spandrel:{ tw: .6, th: .6, draw(c, tw, th, col, R) { c.fillStyle = col; c.fillRect(0, 0, tw, th); for (let x = 0; x < tw; x += .1) { c.fillStyle = shade(col, -.3); c.fillRect(x, 0, .005, th); c.fillStyle = shade(col, .2); c.fillRect(x + .005, 0, .003, th); } } },
  slate:   { tw: .9, th: .36, draw(c, tw, th, col, R) {
    c.fillStyle = shade(col, -.35); c.fillRect(0, 0, tw, th);
    for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) {
      const x = k * .3 + i * .15, y = i * .18;
      c.fillStyle = shade(col, (R() - .5) * .14); hrect(c, tw, x + .003, y, .294, .18);
      c.fillStyle = shade(col, -.4); hrect(c, tw, x, y + .166, .3, .014);
    }
    speck(c, tw, th, R, 2500, col, .07, .003);
  } },
  standing:{ tw: .7, th: .7, draw(c, tw, th, col, R) {
    c.fillStyle = col; c.fillRect(0, 0, tw, th); speck(c, tw, th, R, 1200, col, .04, .003);
    for (const x of [0, .35]) { c.fillStyle = shade(col, .28); c.fillRect(x, 0, .01, th); c.fillStyle = shade(col, -.35); c.fillRect(x + .01, 0, .01, th); }
  } },
  kawara:  { tw: .9, th: .46, draw(c, tw, th, col, R) {
    for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) {
      const x = k * .3, y = i * .23, cc = shade(col, (R() - .5) * .08).replace(/rgb\((\d+),(\d+),(\d+)\)/, (m, r, g, b) => '#' + [r, g, b].map(v => (+v).toString(16).padStart(2, '0')).join(''));
      const g = c.createLinearGradient(x, 0, x + .3, 0);
      g.addColorStop(0, shade(cc, -.32)); g.addColorStop(.35, shade(cc, .18)); g.addColorStop(.6, shade(cc, .04)); g.addColorStop(1, shade(cc, -.36));
      c.fillStyle = g; c.fillRect(x, y, .3, .23);
      const g2 = c.createLinearGradient(0, y + .19, 0, y + .23); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.45)');
      c.fillStyle = g2; c.fillRect(x, y + .19, .3, .04);
    }
  } },
  flatTile:{ tw: .66, th: .46, draw(c, tw, th, col, R) {
    c.fillStyle = shade(col, -.45); c.fillRect(0, 0, tw, th);
    for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) {
      const x = k * .33 + i * .165, y = i * .23;
      c.fillStyle = shade(col, (R() - .5) * .12); hrect(c, tw, x + .003, y, .324, .23);
      c.fillStyle = shade(col, .12); hrect(c, tw, x + .003, y, .324, .006);
      c.fillStyle = shade(col, -.42); hrect(c, tw, x, y + .205, .33, .025);
    }
    speck(c, tw, th, R, 1500, col, .05, .003);
  } },
  sTile:   { tw: .75, th: .6, draw(c, tw, th, col, R) {
    for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) {
      const x = k * .25, y = i * .3, a = (R() - .5) * .3;
      const g = c.createLinearGradient(x, 0, x + .25, 0);
      g.addColorStop(0, shade(col, a - .3)); g.addColorStop(.28, shade(col, a + .15)); g.addColorStop(.55, shade(col, a + .05)); g.addColorStop(.8, shade(col, a - .18)); g.addColorStop(1, shade(col, a - .32));
      c.fillStyle = g; c.fillRect(x, y, .25, .3);
      const g2 = c.createLinearGradient(0, y + .25, 0, y + .3); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,.4)');
      c.fillStyle = g2; c.fillRect(x, y + .25, .25, .05);
    }
    speck(c, tw, th, R, 2000, col, .08, .003);
  } },
  shingle: { tw: .99, th: .28, draw(c, tw, th, col, R) {
    c.fillStyle = shade(col, -.4); c.fillRect(0, 0, tw, th);
    for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) {
      const x = k * .33 + i * .11, y = i * .14;
      c.fillStyle = shade(col, (R() - .5) * .26); hrect(c, tw, x + .004, y, .322, .14);
      c.fillStyle = shade(col, -.45); hrect(c, tw, x, y + .128, .33, .012);
    }
    speck(c, tw, th, R, 6000, col, .2, .003);
  } },
  plank:   { tw: 1.8, th: .9, draw(c, tw, th, col, R) { planks(c, tw, th, col, R, .15, .08, .0016, false); } },
  deck:    { tw: 2.4, th: .96, draw(c, tw, th, col, R) { planks(c, tw, th, col, R, .12, .12, .006, false, '#2a1f17'); } },
  parquet: { tw: .6, th: .6, draw(c, tw, th, col, R) {
    for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) {
      const x0 = i * .3, y0 = k * .3, v = (i + k) % 2 === 0;
      for (let s = 0; s < 4; s++) {
        c.fillStyle = shade(col, (R() - .5) * .18);
        const x = v ? x0 + s * .075 : x0, y = v ? y0 : y0 + s * .075, w = v ? .075 : .3, h = v ? .3 : .075;
        c.fillRect(x, y, w, h); grain(c, x, y, w, h, col, R, v);
        c.fillStyle = shade(col, -.35); c.fillRect(x, y, v ? .0015 : w, v ? h : .0015);
      }
    }
  } },
  tatami:  { tw: .91, th: 1.82, draw(c, tw, th, col, R) {
    c.fillStyle = col; c.fillRect(0, 0, tw, th);
    c.lineWidth = .0035;
    for (let y = 0; y < th; y += .014) { c.strokeStyle = shadeA(col, -.08 + (R() - .5) * .04, .9); c.beginPath(); c.moveTo(0, y); c.lineTo(tw, y); c.stroke(); }
    c.fillStyle = '#3c3a2c'; c.fillRect(0, 0, .03, th); c.fillRect(tw - .03, 0, .03, th);
    c.fillStyle = shade(col, -.3); c.fillRect(0, 0, tw, .003);
  } },
  tatamiHalf: { tw: 1.82, th: 1.82, draw(c, tw, th, col, R) {
    c.lineWidth = .0035;
    for (let i = 0; i < 2; i++) for (let k = 0; k < 2; k++) {
      const x = i * .91, y = k * .91, v = (i + k) % 2 === 0, cc = (i + k) % 2 ? shade(col, .05) : shade(col, -.03);
      c.fillStyle = cc; c.fillRect(x, y, .91, .91);
      for (let t = 0; t < .91; t += .014) { c.strokeStyle = shadeA(col, -.1, .8); c.beginPath(); if (v) { c.moveTo(x + t, y); c.lineTo(x + t, y + .91); } else { c.moveTo(x, y + t); c.lineTo(x + .91, y + t); } c.stroke(); }
      c.fillStyle = shade(col, -.3); c.fillRect(x, y, .91, .004); c.fillRect(x, y, .004, .91);
    }
  } },
  tile300: { tw: .6, th: .6, draw(c, tw, th, col, R) { gridTiles(c, tw, th, col, R, .3, .004, .03, shade(col, -.18)); speck(c, tw, th, R, 2500, col, .05, .003); } },
  tile600: { tw: 1.2, th: 1.2, draw(c, tw, th, col, R) { gridTiles(c, tw, th, col, R, .6, .004, .03, shade(col, -.15)); blotch(c, tw, th, R, 60, col, .03, .05, .2); speck(c, tw, th, R, 5000, col, .04, .003); } },
  tileSq:  { tw: .6, th: .6, draw(c, tw, th, col, R) { gridTiles(c, tw, th, col, R, .15, .004, .02, shade(col, -.14)); } },
  marble:  { tw: 1.2, th: 1.2, draw(c, tw, th, col, R) {
    c.fillStyle = col; c.fillRect(0, 0, tw, th); blotch(c, tw, th, R, 50, col, .04, .05, .25);
    for (let i = 0; i < 9; i++) {
      const x = R() * tw, y = R() * th, a = R() * Math.PI, l = .4 + R() * .6;
      c.strokeStyle = shadeA(col, -.35 - R() * .2, .4); c.lineWidth = .002 + R() * .004;
      wrap3(tw, th, (dx, dy) => { c.beginPath(); c.moveTo(x + dx, y + dy); c.bezierCurveTo(x + dx + Math.cos(a) * l * .3 + (R() - .5) * .1, y + dy + Math.sin(a) * l * .3, x + dx + Math.cos(a) * l * .6, y + dy + Math.sin(a) * l * .6 + (R() - .5) * .1, x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); c.stroke(); });
    }
    c.fillStyle = shade(col, -.12); c.fillRect(0, 0, tw, .002); c.fillRect(0, .6, tw, .002); c.fillRect(0, 0, .002, th); c.fillRect(.6, 0, .002, th);
  } },
  carpet:  { tw: .5, th: .5, draw(c, tw, th, col, R) { c.fillStyle = col; c.fillRect(0, 0, tw, th); speck(c, tw, th, R, 9000, col, .12, .003); } },
  concJoint: { tw: 1.8, th: 1.8, draw(c, tw, th, col, R) {
    c.fillStyle = col; c.fillRect(0, 0, tw, th); blotch(c, tw, th, R, 200, col, .05, .05, .3); speck(c, tw, th, R, 7000, col, .08, .004);
    c.fillStyle = shade(col, -.38); c.fillRect(0, 0, tw, .01); c.fillRect(0, 0, .01, th);
  } },
  tilePave:{ tw: .6, th: .6, draw(c, tw, th, col, R) { gridTiles(c, tw, th, col, R, .3, .008, .07, shade(col, -.3)); speck(c, tw, th, R, 3000, col, .08, .003); } },
  interlock: { tw: .8, th: .4, draw(c, tw, th, col, R) { bond(c, tw, th, col, R, .2, .1, .006, .16, shade(col, -.45)); speck(c, tw, th, R, 2500, col, .1, .003); } },
  gravel:  { tw: .6, th: .6, draw(c, tw, th, col, R) {
    c.fillStyle = shade(col, -.3); c.fillRect(0, 0, tw, th);
    for (let i = 0; i < 2400; i++) { const x = R() * tw, y = R() * th, r = .004 + R() * .007; c.fillStyle = shade(col, (R() - .5) * .55); wrap3(tw, th, (dx, dy) => { if (Math.abs(dx) + Math.abs(dy) && (x + dx < -r || x + dx > tw + r || y + dy < -r || y + dy > th + r)) return; c.beginPath(); c.ellipse(x + dx, y + dy, r, r * .75, R() * 3, 0, 7); c.fill(); }); }
  } },
  gravelF: { tw: .4, th: .4, draw(c, tw, th, col, R) {
    c.fillStyle = shade(col, -.08); c.fillRect(0, 0, tw, th);
    for (let i = 0; i < 2600; i++) { const x = R() * tw, y = R() * th, r = .002 + R() * .004; c.fillStyle = shade(col, (R() - .5) * .5); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
  } },
  lawn:    { tw: 1, th: 1, draw(c, tw, th, col, R) {
    c.fillStyle = shade(col, -.12); c.fillRect(0, 0, tw, th); blotch(c, tw, th, R, 60, col, .08, .05, .2);
    c.lineWidth = .0025;
    for (let i = 0; i < 6000; i++) { const x = R() * tw, y = R() * th, l = .012 + R() * .025, a = -Math.PI / 2 + (R() - .5) * .9; c.strokeStyle = shade(col, (R() - .45) * .5); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  } },
  turf:    { tw: .5, th: .5, draw(c, tw, th, col, R) {
    c.fillStyle = shade(col, -.08); c.fillRect(0, 0, tw, th);
    c.lineWidth = .002;
    for (let i = 0; i < 4500; i++) { const x = R() * tw, y = R() * th, l = .01 + R() * .015, a = -Math.PI / 2 + (R() - .5) * .6; c.strokeStyle = shade(col, (R() - .5) * .25); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
  } },
  stoneP:  { tw: 1.2, th: 1.2, raw: true, draw(img, W, H, col, R) {
    // 乱形石：ボロノイ分割（端がつながるように距離をくり返しで測る）
    const n = 22, seeds = [], cols = [];
    for (let i = 0; i < n; i++) { seeds.push([R() * W, R() * H]); cols.push(rgbOf(col).map(v => clamp255(v * (.8 + R() * .4)))); }
    const mort = rgbOf(col).map(v => v * .55), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let b1 = 1e9, b2 = 1e9, bi = 0;
      for (let i = 0; i < n; i++) {
        let dx = Math.abs(x - seeds[i][0]), dy = Math.abs(y - seeds[i][1]);
        if (dx > W / 2) dx = W - dx; if (dy > H / 2) dy = H - dy;
        const dd = Math.sqrt(dx * dx + dy * dy);
        if (dd < b1) { b2 = b1; b1 = dd; bi = i; } else if (dd < b2) b2 = dd;
      }
      const k = (y * W + x) * 4, edge = b2 - b1 < W * .009, cc = edge ? mort : cols[bi], nz = (R() - .5) * 18;
      d[k] = clamp255(cc[0] + nz); d[k + 1] = clamp255(cc[1] + nz); d[k + 2] = clamp255(cc[2] + nz); d[k + 3] = 255;
    }
  } },
};
function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }

/* ===== 模様を描いたキャンバス（キャッシュ） ===== */
const patCache = new Map();
const pot = v => { let p = 64; while (p < v && p < 1024) p *= 2; return p; };
function patCanvas(pat, color) {
  const def = PATS[pat] || PATS.plain, key = pat + '|' + color;
  if (patCache.has(key)) return patCache.get(key);
  const W = pot(def.tw * 380), H = pot(def.th * 380);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d'), R = mulberry(hashStr(key));
  if (def.raw) { const img = c.createImageData(W, H); def.draw(img, W, H, color, R); c.putImageData(img, 0, 0); }
  else { c.scale(W / def.tw, H / def.th); def.draw(c, def.tw, def.th, color, R); }
  const out = { cv, tw: def.tw, th: def.th };
  patCache.set(key, out);
  return out;
}
// 2D の図面用：pxPerM（1m が何px か）で塗りつぶしパターンを作る
function canvasPat(ctx, pat, color, pxPerM, ox = 0, oy = 0) {
  const p = patCanvas(pat, color);
  const cp = ctx.createPattern(p.cv, 'repeat');
  if (cp.setTransform) cp.setTransform(new DOMMatrix().translateSelf(ox, oy).scaleSelf(pxPerM * p.tw / p.cv.width, pxPerM * p.th / p.cv.height));
  return cp;
}
// 見本の小さな画像（meters：見本の横幅が何 m 分か）
const thumbCache = new Map();
function patThumb(pat, color, w = 84, h = 56, meters = 1.2) {
  const key = [pat, color, w, h, meters].join('|');
  if (thumbCache.has(key)) return thumbCache.get(key);
  const cv = document.createElement('canvas'); cv.width = w * 2; cv.height = h * 2;
  const c = cv.getContext('2d');
  c.fillStyle = canvasPat(c, pat, color, w * 2 / meters); c.fillRect(0, 0, cv.width, cv.height);
  const url = cv.toDataURL('image/png'); thumbCache.set(key, url); return url;
}
