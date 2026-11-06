/* Livii 住宅プラン — 間取り（平面図）・外構図・3Dパース。長さの単位はすべて mm。
   図面の座標：敷地の左上（北西の角）が (0,0)、x は東へ、y は南へ増える。 */
'use strict';

const P = 910;                       // 1マス（尺モジュール）
const KEY = 'livii-house-plan-v1';
const TATAMI = 1.62;                 // 1帖＝1.62㎡（不動産の表示に関する公正競争規約）
const TSUBO = 3.30579;               // 1坪＝3.30579㎡
const pad2 = n => String(n).padStart(2, '0');
const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const num = (v, d = 0) => (v === '' || v == null || isNaN(+v)) ? d : +v;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uniq = a => [...new Set(a)].sort((x, y) => x - y);
const fmt = (v, d = 0) => (+v).toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
const short = label => label.replace(/（.*）/, '');

/* ===== カタログ（大きさの初期値は mm） ===== */
const OPENINGS = {
  door:     { label: 'ドア（片開き）', w: 780,  h: 2000, sill: 0 },
  sliding:  { label: '引戸',           w: 1640, h: 2000, sill: 0 },
  entrance: { label: '玄関ドア',       w: 900,  h: 2300, sill: 0 },
  opening:  { label: '開口（建具なし）', w: 800, h: 2000, sill: 0 },
  window:   { label: '腰窓',           w: 1650, h: 1100, sill: 900 },
  patio:    { label: '掃出し窓',       w: 1650, h: 2000, sill: 0 },
  small:    { label: '小窓',           w: 600,  h: 600,  sill: 1400 },
  high:     { label: '高窓（FIX）',    w: 1650, h: 450,  sill: 1800 },
};
// 家具・設備（cat は左の一覧の見出し。w,d,h は mm）
const FURN_CATS = ['リビング', 'ダイニング・キッチン', '寝室・書斎', '水まわり', '和室・収納・その他'];
const FURN = {
  sofa2:     { cat: 0, label: 'ソファ（2人）',        w: 1600, d: 850,  h: 800,  color: '#8a8f96' },
  sofa3:     { cat: 0, label: 'ソファ（3人）',        w: 2000, d: 900,  h: 800,  color: '#8a8f96' },
  sofaL:     { cat: 0, label: 'ソファ（L字）',        w: 2400, d: 1600, h: 800,  color: '#b9ae9c' },
  armchair:  { cat: 0, label: '1人掛けソファ',        w: 800,  d: 850,  h: 800,  color: '#b4664a' },
  ottoman:   { cat: 0, label: 'オットマン',           w: 600,  d: 450,  h: 400,  color: '#8a8f96' },
  lowtable:  { cat: 0, label: 'ローテーブル',         w: 1000, d: 500,  h: 400,  color: '#9b7653' },
  sidetable: { cat: 0, label: 'サイドテーブル',       w: 450,  d: 450,  h: 550,  color: '#6b4c35' },
  tv:        { cat: 0, label: 'テレビボード',         w: 1800, d: 450,  h: 450,  color: '#6b5642' },
  sideboard: { cat: 0, label: 'サイドボード',         w: 1500, d: 450,  h: 750,  color: '#a8835f' },
  shelf:     { cat: 0, label: '本棚',                 w: 900,  d: 350,  h: 1800, color: '#c9b293' },
  rug:       { cat: 0, label: 'ラグ',                 w: 2000, d: 1400, h: 10,   color: '#d8cdb8' },
  plant:     { cat: 0, label: '観葉植物',             w: 450,  d: 450,  h: 1200, color: '#4f8a4a' },
  floorlamp: { cat: 0, label: 'フロアライト',         w: 400,  d: 400,  h: 1600, color: '#d8cbb3' },
  pendant:   { cat: 0, label: 'ペンダントライト',     w: 400,  d: 400,  h: 300,  color: '#2b2b2b', above: 1 },
  aircon:    { cat: 0, label: 'エアコン',             w: 800,  d: 250,  h: 300,  color: '#f4f4f2', above: 1 },
  piano:     { cat: 0, label: 'ピアノ',               w: 1530, d: 620,  h: 1250, color: '#1d1d1d' },
  dining2:   { cat: 1, label: 'ダイニング（2人）',    w: 800,  d: 1450, h: 720,  color: '#9b7653' },
  dining:    { cat: 1, label: 'ダイニング（4人）',    w: 1500, d: 1650, h: 720,  color: '#9b7653' },
  dining6:   { cat: 1, label: 'ダイニング（6人）',    w: 1800, d: 1650, h: 720,  color: '#9b7653' },
  roundtable:{ cat: 1, label: '丸テーブル（4人）',    w: 1700, d: 1700, h: 720,  color: '#c49a6c' },
  stools:    { cat: 1, label: 'カウンタースツール',   w: 1200, d: 450,  h: 650,  color: '#2b2b2b' },
  kitchen:   { cat: 1, label: 'キッチン（壁付け）',   w: 2550, d: 650,  h: 850,  color: '#f2f0eb' },
  island:    { cat: 1, label: 'キッチン（対面）',     w: 2550, d: 1000, h: 850,  color: '#f2f0eb' },
  kitchenL:  { cat: 1, label: 'キッチン（L型）',      w: 2550, d: 1650, h: 850,  color: '#f2f0eb' },
  islandFree:{ cat: 1, label: 'アイランドキッチン',   w: 2550, d: 1000, h: 850,  color: '#3b3d40' },
  fridge:    { cat: 1, label: '冷蔵庫',               w: 700,  d: 700,  h: 1800, color: '#d9dadb' },
  cupboard:  { cat: 1, label: '食器棚',               w: 1200, d: 450,  h: 2000, color: '#e8e2d6' },
  appliance: { cat: 1, label: '家電収納',             w: 900,  d: 450,  h: 2000, color: '#e8e2d6' },
  bedS:      { cat: 2, label: 'ベッド（シングル）',   w: 970,  d: 1950, h: 450,  color: '#e6e1d6' },
  bedSD:     { cat: 2, label: 'ベッド（セミダブル）', w: 1220, d: 1950, h: 450,  color: '#e6e1d6' },
  bedD:      { cat: 2, label: 'ベッド（ダブル）',     w: 1400, d: 1950, h: 450,  color: '#e6e1d6' },
  bedQ:      { cat: 2, label: 'ベッド（クイーン）',   w: 1600, d: 1950, h: 450,  color: '#e6e1d6' },
  bunk:      { cat: 2, label: '2段ベッド',            w: 1000, d: 2050, h: 1600, color: '#c49a6c' },
  chest:     { cat: 2, label: 'チェスト',             w: 900,  d: 450,  h: 1000, color: '#a8835f' },
  dresser:   { cat: 2, label: 'ドレッサー',           w: 800,  d: 800,  h: 1400, color: '#f1efea' },
  wardrobe:  { cat: 2, label: '収納棚',               w: 1800, d: 600,  h: 2000, color: '#ece6da' },
  hanger:    { cat: 2, label: 'ハンガーパイプ（服）', w: 1800, d: 600,  h: 1800, color: '#c0c0bd' },
  desk:      { cat: 2, label: 'デスク・チェア',       w: 1000, d: 1100, h: 720,  color: '#a8835f' },
  unitbath:  { cat: 3, label: 'ユニットバス（1616）', w: 1600, d: 1600, h: 2000, color: '#f4f4f2' },
  bath:      { cat: 3, label: '浴槽',                 w: 1600, d: 800,  h: 550,  color: '#f7f7f5' },
  basin:     { cat: 3, label: '洗面台',               w: 750,  d: 550,  h: 850,  color: '#f2f0eb' },
  basin2:    { cat: 3, label: '洗面台（2ボウル）',    w: 1500, d: 550,  h: 850,  color: '#f2f0eb' },
  washer:    { cat: 3, label: '洗濯機',               w: 640,  d: 640,  h: 1000, color: '#eceeef' },
  toilet:    { cat: 3, label: 'トイレ',               w: 400,  d: 700,  h: 800,  color: '#f7f7f5' },
  toiletTl:  { cat: 3, label: 'トイレ（タンクレス）', w: 400,  d: 650,  h: 600,  color: '#f7f7f5' },
  handwash:  { cat: 3, label: '手洗い器',             w: 450,  d: 300,  h: 850,  color: '#f7f7f5' },
  zataku:    { cat: 4, label: '座卓',                 w: 1200, d: 750,  h: 330,  color: '#5a4232' },
  butsudan:  { cat: 4, label: '仏壇',                 w: 600,  d: 500,  h: 1400, color: '#3b2a1f' },
  tansu:     { cat: 4, label: '和箪笥',               w: 1000, d: 450,  h: 1100, color: '#8a5a36' },
  shoes:     { cat: 4, label: '下駄箱',               w: 1200, d: 400,  h: 1000, color: '#ece6da' },
  shoesTall: { cat: 4, label: '下駄箱（トール）',     w: 900,  d: 400,  h: 2100, color: '#ece6da' },
  stairs:    { cat: 4, label: '階段（直階段）',       w: 780,  d: 3400, h: 2900, color: '#b48d67' },
};
// 外構（mat：仕上げ PAVINGS。round：上から見て丸い）
const EXT_CATS = ['床・舗装', '塀・門まわり', 'カーポート・物置', '植栽', '設備・その他'];
const EXT = {
  parking:    { cat: 0, label: '駐車場（コンクリート）', w: 5500, d: 5500, h: 100,  mat: 'concJoint', flat: 1 },
  approach:   { cat: 0, label: 'アプローチ（タイル）', w: 1200, d: 4000, h: 60,   mat: 'tilePave', flat: 1 },
  interlock:  { cat: 0, label: 'インターロッキング',   w: 1500, d: 3000, h: 60,   mat: 'interlock', flat: 1 },
  stonePave:  { cat: 0, label: '乱形石',               w: 1500, d: 1500, h: 60,   mat: 'stoneP', flat: 1 },
  lawn:       { cat: 0, label: '芝生',                 w: 4000, d: 3000, h: 30,   mat: 'lawn', flat: 1 },
  turf:       { cat: 0, label: '人工芝',               w: 3000, d: 2000, h: 30,   mat: 'turf', flat: 1 },
  gravel:     { cat: 0, label: '砂利',                 w: 2000, d: 2000, h: 40,   mat: 'gravel', flat: 1 },
  deck:       { cat: 0, label: 'ウッドデッキ',         w: 2730, d: 1820, h: 400,  mat: 'deckP', flat: 1 },
  terrace:    { cat: 0, label: 'タイルテラス',         w: 2730, d: 1820, h: 400,  mat: 'tilePave', flat: 1 },
  stepping:   { cat: 0, label: '飛び石',               w: 2400, d: 400,  h: 50,   color: '#9a958c', flat: 1 },
  sleepers:   { cat: 0, label: '枕木',                 w: 1800, d: 600,  h: 80,   color: '#5c4632', flat: 1 },
  steps:      { cat: 0, label: '階段（外・3段）',      w: 1800, d: 900,  h: 450,  color: '#c4c2bc', flat: 1 },
  flowerbed:  { cat: 0, label: '花壇',                 w: 1800, d: 450,  h: 400,  color: '#a35d40', flat: 1 },
  fence:      { cat: 1, label: 'フェンス（横格子）',   w: 5000, d: 60,   h: 1200, color: '#5d5249' },
  fenceTall:  { cat: 1, label: '目隠しフェンス',       w: 4000, d: 60,   h: 1800, color: '#6b5a4a' },
  meshFence:  { cat: 1, label: 'メッシュフェンス',     w: 5000, d: 50,   h: 800,  color: '#4f5a52' },
  block:      { cat: 1, label: 'ブロック塀',           w: 5000, d: 120,  h: 1000, color: '#d0cdc5' },
  blockFence: { cat: 1, label: 'ブロック＋フェンス',   w: 5000, d: 120,  h: 1400, color: '#3f3d3a' },
  plasterWall:{ cat: 1, label: '塗り壁の塀',           w: 3000, d: 150,  h: 1200, color: '#e9e3d6' },
  hedge:      { cat: 1, label: '生垣',                 w: 3000, d: 500,  h: 1200, color: '#4f7a3a' },
  gatepost:   { cat: 1, label: '門柱',                 w: 800,  d: 250,  h: 1400, color: '#3f3d3a' },
  funcpost:   { cat: 1, label: '機能門柱',             w: 400,  d: 200,  h: 1300, color: '#3a3a3a' },
  gate:       { cat: 1, label: '門扉（両開き）',       w: 1600, d: 100,  h: 1200, color: '#3f3d3a' },
  mailbox:    { cat: 1, label: 'ポスト（スタンド）',   w: 400,  d: 300,  h: 1100, color: '#2b2b2b' },
  delivery:   { cat: 1, label: '宅配ボックス',         w: 450,  d: 450,  h: 1000, color: '#8b8f93' },
  carport:    { cat: 2, label: 'カーポート（1台）',    w: 3000, d: 5000, h: 2300, color: '#b8bcc0' },
  carport2:   { cat: 2, label: 'カーポート（2台）',    w: 5400, d: 5000, h: 2300, color: '#b8bcc0' },
  cycleport:  { cat: 2, label: 'サイクルポート',       w: 2200, d: 1200, h: 2100, color: '#b8bcc0' },
  terraceRoof:{ cat: 2, label: 'テラス屋根',           w: 3600, d: 1800, h: 2400, color: '#b8bcc0' },
  pergola:    { cat: 2, label: 'パーゴラ',             w: 2700, d: 2700, h: 2400, color: '#7a5a3e' },
  storage:    { cat: 2, label: '物置',                 w: 1800, d: 900,  h: 1900, color: '#cfd2d4' },
  tree:       { cat: 3, label: '落葉樹（シンボルツリー）', w: 2000, d: 2000, h: 4000, color: '#6f9a4f', round: 1 },
  evergreen:  { cat: 3, label: '常緑樹',               w: 1800, d: 1800, h: 3000, color: '#3f6e3a', round: 1 },
  conifer:    { cat: 3, label: '高木（針葉樹）',       w: 1200, d: 1200, h: 3500, color: '#3e6b3a', round: 1 },
  shrub:      { cat: 3, label: '低木',                 w: 800,  d: 800,  h: 700,  color: '#6b9a4e', round: 1 },
  flowers:    { cat: 3, label: '草花',                 w: 1200, d: 600,  h: 300,  color: '#d76f8f', flat: 1 },
  planter:    { cat: 3, label: 'プランター',           w: 600,  d: 300,  h: 700,  color: '#8a6b4f' },
  poleLight:  { cat: 4, label: 'ポールライト',         w: 150,  d: 150,  h: 800,  color: '#2b2b2b' },
  faucet:     { cat: 4, label: '立水栓',               w: 300,  d: 300,  h: 900,  color: '#9a958c' },
  outdoorUnit:{ cat: 4, label: 'エアコン室外機',       w: 800,  d: 300,  h: 600,  color: '#d9dadb' },
  heater:     { cat: 4, label: '給湯器（貯湯タンク）', w: 650,  d: 750,  h: 2100, color: '#e4e5e3' },
  clothesline:{ cat: 4, label: '物干し',               w: 2400, d: 500,  h: 1800, color: '#c0c0bd' },
  gardenSet:  { cat: 4, label: 'ガーデンテーブルセット', w: 1500, d: 1500, h: 720, color: '#4a4a48' },
  parasol:    { cat: 4, label: 'パラソル',             w: 2400, d: 2400, h: 2400, color: '#e9e3d6', round: 1 },
  bench:      { cat: 4, label: 'ベンチ',               w: 1500, d: 500,  h: 800,  color: '#8a6b4f' },
  car:        { cat: 4, label: '車（参考）',           w: 1700, d: 4500, h: 1500, color: '#8796a8' },
  bike:       { cat: 4, label: '自転車',               w: 600,  d: 1800, h: 1000, color: '#3b5f8a' },
};
const ROOM_NAMES = ['LDK', 'リビング', 'ダイニング', 'キッチン', '洋室', '和室', '主寝室', '子ども部屋1', '子ども部屋2', '書斎',
  '玄関', 'ホール', '廊下', '階段', '洗面所', '浴室', 'トイレ', 'WIC', 'クローゼット', '収納', 'パントリー', '納戸', 'ランドリー',
  'シューズクローク', 'ファミリークローゼット', 'バルコニー', 'ポーチ', 'テラス'];
const OUTDOOR = new Set(['バルコニー', 'ポーチ', 'テラス']);   // 床面積に入れない・屋根をかけない
const isIn = r => !OUTDOOR.has(r.name);
function defaultFloor(name) {
  if (name === '和室') return 'tatami';
  if (['玄関', '浴室', 'ポーチ', 'テラス', 'バルコニー'].includes(name)) return 'tile';
  if (['洗面所', 'トイレ', 'ランドリー'].includes(name)) return 'cf';
  if (name === 'シューズクローク') return 'mortar';
  return 'oak';
}
function defaultPaper(name) {
  if (name === '和室') return 'washi';
  if (name === '浴室') return 'tilew';
  return '';
}
const DIRS = { N: '北', S: '南', E: '東', W: '西' };
// 外観の組み合わせ（lower：1階だけ別の外壁）
const SCHEMES = [
  { name: 'ホワイト×ブラック',     ext: 'siding_h', extWall: '#ebe8e1', roof: 'galva',    roofC: '#2f3236', sash: '#2b2b2b' },
  { name: 'ツートン（タイル×白）', ext: 'siding_h', extWall: '#ebe8e1', roof: 'slate',    roofC: '#34373b', sash: '#2b2b2b', lower: { key: 'tile', color: '#8c7a66' } },
  { name: 'モダン（ガルバ×木）',   ext: 'galva_v',  extWall: '#3a3d40', roof: 'galva',    roofC: '#2f3236', sash: '#2b2b2b', lower: { key: 'siding_wd', color: '#9a7350' } },
  { name: '塗り壁ナチュラル',       ext: 'stucco',   extWall: '#efe9de', roof: 'galva',    roofC: '#4a4743', sash: '#4a3a30' },
  { name: '南欧風',                 ext: 'stucco',   extWall: '#f1e6cf', roof: 'stile',    roofC: '#a9583b', sash: '#4a3a30' },
  { name: '和モダン',               ext: 'stucco',   extWall: '#e6e1d6', roof: 'kawara',   roofC: '#5c6168', sash: '#4a3a30', lower: { key: 'cedar', color: '#2e2b28' } },
  { name: 'レンガ調',               ext: 'siding_br', extWall: '#9b5a43', roof: 'flattile', roofC: '#3c3e41', sash: '#4a3a30' },
  { name: 'ネイビー×シルバー',     ext: 'siding_v', extWall: '#34405a', roof: 'galva',    roofC: '#8b9094', sash: '#b9bcbf' },
];

/* ===== データ ===== */
function newFloor() { return { h: 2900, ceil: 2400, rooms: [], walls: [], openings: [], items: [] }; }
function mkItem(cat, type, x, y, rot = 0, extra = {}) {
  const c = cat[type];
  const it = { id: uid(), type, x, y, w: c.w, d: c.d, h: c.h, rot, color: c.color || (c.mat ? PAVINGS[c.mat].color : '#999999') };
  if (c.mat) it.mat = c.mat;
  return Object.assign(it, extra);
}
function mkOpening(type, dir, x, y, extra = {}) {
  const c = OPENINGS[type];
  return Object.assign({ id: uid(), type, dir, x, y, w: c.w, h: c.h, sill: c.sill, flip: 0 }, extra);
}
function newPlan(sample) {
  const p = {
    id: uid(), name: sample ? 'サンプル 2階建て 4LDK' : '新しいプラン', client: '', staff: '', createdOn: today(), memo: '',
    site: { w: 17 * P, d: 20 * P, road: 'S', roadW: 6000 },
    baseH: 450,
    floors: [newFloor(), newFloor()],
    ext: [],
    roof: { type: 'gable', pitch: 4, overhang: 600, rotate: false, flip: false },
  };
  ensurePlan(p);
  if (sample) fillSample(p);
  return p;
}
// 足りない項目を初期値で補う（古いデータ・読み込んだデータ用）
function ensurePlan(p) {
  p.finish = Object.assign({ ext: 'siding_h', roof: 'slate', wall: 'white', ceil: 'white' }, p.finish || {});
  if (!EXT_WALLS[p.finish.ext]) p.finish.ext = 'siding_h';
  if (!ROOF_MATS[p.finish.roof]) p.finish.roof = 'slate';
  if (!WALLPAPERS[p.finish.wall]) p.finish.wall = 'white';
  if (!WALLPAPERS[p.finish.ceil]) p.finish.ceil = 'white';
  p.colors = Object.assign({ extWall: EXT_WALLS[p.finish.ext].color, roof: ROOF_MATS[p.finish.roof].color, sash: '#2b2b2b',
    door: '#c49a6c', entrance: '#2e2c2a', soffit: '#e9e6df', ground: '#c9bfa8' }, p.colors || {});
  p.ext = p.ext || [];
  p.roof = Object.assign({ type: 'gable', pitch: 4, overhang: 600, rotate: false, flip: false }, p.roof || {});
  (p.floors || []).forEach(f => {
    f.rooms = f.rooms || []; f.walls = f.walls || []; f.openings = f.openings || []; f.items = f.items || [];
    f.rooms.forEach(r => { if (!FLOOR_MATS[r.floor]) r.floor = defaultFloor(r.name); });
  });
  p.ext.forEach(it => { if (EXT[it.type]?.mat && !PAVINGS[it.mat]) it.mat = EXT[it.type].mat; });
  return p;
}
function fillSample(p) {
  const X = 3 * P, Y = 5 * P;   // 建物の北西の角
  const R = (name, x0, y0, x1, y1) => ({ id: uid(), name, x: X + x0 * P, y: Y + y0 * P, w: (x1 - x0) * P, d: (y1 - y0) * P, floor: defaultFloor(name) });
  const O = (type, dir, a, b, extra) => mkOpening(type, dir, X + a * P, Y + b * P, extra);
  const F = (type, x, y, rot = 0, extra) => mkItem(FURN, type, X + x, Y + y, rot, extra);
  const E = (type, x, y, rot = 0, extra) => mkItem(EXT, type, x, y, rot, extra);
  const [f1, f2] = p.floors;
  f1.rooms = [R('浴室', 0, 0, 2, 2), R('洗面所', 2, 0, 4, 2), R('トイレ', 4, 0, 5, 2), R('ホール', 5, 0, 6, 2), R('階段', 6, 0, 7, 4),
    R('LDK', 7, 0, 10, 4), R('玄関', 0, 2, 2, 4), R('ホール', 2, 2, 6, 4), R('和室', 0, 4, 3, 8), R('LDK', 3, 4, 10, 8)];
  f1.openings = [O('entrance', 'v', 0, 3), O('patio', 'h', 5, 8), O('patio', 'h', 8.3, 8), O('window', 'h', 1.5, 8),
    O('window', 'v', 10, 2), O('window', 'h', 8.5, 0, { w: 1200 }), O('small', 'h', 1, 0), O('small', 'h', 4.5, 0),
    O('opening', 'v', 2, 3, { w: 900 }), O('door', 'h', 3, 2), O('door', 'h', 4.5, 2, { w: 700 }), O('door', 'h', 4.5, 4),
    O('opening', 'v', 6, 0.5, { w: 700 }), O('sliding', 'v', 3, 6), O('door', 'v', 2, 1, { w: 700 })];
  f1.items = [F('kitchen', 7735, 400), F('dining', 7735, 2300), F('sofa3', 5800, 5460, 270), F('lowtable', 7000, 5460, 90),
    F('tv', 8800, 5460, 90), F('bath', 910, 475), F('basin', 2270, 350), F('washer', 3245, 395), F('toilet', 4095, 425),
    F('stairs', 5915, 1820, 180, { w: 760, d: 3490 }), F('shoes', 910, 1820 + 75 + 200), F('lowtable', 1365, 5460, 0, { w: 900, d: 900 }),
    F('plant', 3100, 7000)];
  f2.rooms = [R('納戸', 0, 0, 2, 4), R('ホール', 2, 0, 4, 2), R('トイレ', 4, 0, 5, 2), R('収納', 5, 0, 6, 2), R('階段', 6, 0, 7, 4),
    R('書斎', 7, 0, 10, 2), R('ホール', 2, 2, 6, 4), R('WIC', 7, 2, 10, 4), R('子ども部屋1', 0, 4, 3, 8), R('子ども部屋2', 3, 4, 6, 8),
    R('主寝室', 6, 4, 10, 8), R('バルコニー', 3, 8, 10, 9)];
  f2.openings = [O('window', 'h', 1.5, 8), O('patio', 'h', 4.5, 8), O('patio', 'h', 8, 8), O('window', 'v', 10, 6),
    O('window', 'h', 8.5, 0, { w: 1200 }), O('small', 'v', 0, 2), O('small', 'h', 4.5, 0),
    O('door', 'h', 2.5, 4), O('door', 'h', 3.5, 4), O('door', 'h', 6.5, 4, { w: 700 }), O('door', 'h', 8.5, 4, { w: 700 }),
    O('door', 'h', 8.5, 2, { w: 700 }), O('door', 'h', 4.5, 2, { w: 700 }), O('door', 'h', 5.5, 2, { w: 700 }),
    O('door', 'v', 2, 1), O('opening', 'v', 6, 3.5, { w: 700 })];
  f2.items = [F('bedD', 7280, 4690), F('bedS', 560, 4690), F('desk', 2000, 6655, 180), F('bedS', 4900, 4690),
    F('desk', 3600, 6655, 180), F('desk', 7735, 625), F('shelf', 9100 - 75 - 175, 1000, 90), F('wardrobe', 8190, 1820 + 75 + 300)];
  // 内装：アクセントクロス・和室・浴室
  const room = (f, name) => f.rooms.filter(r => r.name === name).sort((a, b) => b.w * b.d - a.w * a.d)[0];
  Object.assign(room(f1, 'LDK'), { accent: 'E', accentPaper: 'wooddk' });
  Object.assign(room(f1, '和室'), { paper: 'juraku' });
  Object.assign(room(f1, '浴室'), { paper: 'tilew' });
  Object.assign(room(f2, '主寝室'), { accent: 'N', accentPaper: 'navy', floor: 'greige' });
  Object.assign(room(f2, '子ども部屋1'), { accent: 'W', accentPaper: 'blue' });
  Object.assign(room(f2, '子ども部屋2'), { accent: 'E', accentPaper: 'pink' });
  f1.items.push(F('pendant', 7735, 2300, 0), F('aircon', 4400, 3640 + 75 + 125, 0), F('rug', 6900, 5460, 90, { w: 2000, d: 1400 }));
  f1.items.unshift(f1.items.pop());   // ラグは一番下に描く
  f2.items.push(F('aircon', 7280, 3640 + 75 + 125, 0), F('chest', 9100 - 75 - 225, 6800, 90));
  // 外観：1階タイル＋2階サイディングのツートン
  p.finish.roof = 'galva'; p.colors.roof = ROOF_MATS.galva.color;
  f1.ext = { key: 'tile', color: '#8c7a66' };
  p.ext = [
    E('parking', 2730, 15470, 0, { w: 5460, d: 5460 }), E('approach', 1820, 9555, 0, { w: 1820, d: 6370 }),
    E('lawn', 10465, 15925, 0, { w: 9100, d: 4550 }), E('deck', 9555, 12513, 0, { w: 3640, d: 1365 }),
    E('flowerbed', 4095, 12058, 0, { w: 2730, d: 455 }),
    E('fence', 7735, 30, 0, { w: 15470 }), E('fence', 15440, 9100, 90, { w: 18200 }), E('fence', 30, 6370, 90, { w: 12740 }),
    E('block', 10465, 18140, 0, { w: 10010, h: 600 }), E('gatepost', 5860, 17700),
    E('storage', 14105, 910), E('tree', 14378, 13650), E('tree', 728, 2730, 0, { w: 1600, d: 1600, h: 3200 }),
    E('conifer', 14560, 4500), E('shrub', 6300, 17650), E('shrub', 14100, 17600), E('shrub', 12900, 17650),
    E('car', 1365, 16380), E('car', 4095, 16380, 0, { color: '#c9c9c6' }),
    E('funcpost', 2900, 13500), E('poleLight', 1000, 11000), E('poleLight', 1000, 8200),
    E('stepping', 13300, 15200, 90, { w: 2400 }), E('outdoorUnit', 11300, 4550 - 250, 0), E('heater', 6200, 4550 - 420, 0),
    E('gardenSet', 13200, 17000), E('flowers', 9555, 13450, 0, { w: 3640, d: 400 }),
  ];
}

let store = load();
store.plans.forEach(ensurePlan);
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.plans && s.plans.length) return s; } catch (e) { /* 壊れていたら作り直す */ }
  const p = newPlan(true);
  return { plans: [p], cur: p.id };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { toast('保存できませんでした（ブラウザの保存容量が足りない可能性）'); }
}
const plan = () => store.plans.find(p => p.id === store.cur) || store.plans[0];

/* 元に戻す・やり直す */
let undoS = [], redoS = [];
function pushUndo() { undoS.push(JSON.stringify(plan())); if (undoS.length > 80) undoS.shift(); redoS = []; }
function restore(json) {
  const p = JSON.parse(json), i = store.plans.findIndex(q => q.id === p.id);
  if (i >= 0) store.plans[i] = p; else store.plans.push(p);
  store.cur = p.id;
}
function undo() { if (!undoS.length) return toast('これ以上戻せません'); redoS.push(JSON.stringify(plan())); restore(undoS.pop()); afterSwap(); }
function redo() { if (!redoS.length) return; undoS.push(JSON.stringify(plan())); restore(redoS.pop()); afterSwap(); }

/* ===== 図形の計算 ===== */
const inRect = (r, x, y) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.d;
function roomAt(rooms, x, y) { for (let i = rooms.length - 1; i >= 0; i--) if (inRect(rooms[i], x, y)) return rooms[i]; return null; }

// 部屋の四角から壁を自動で作る。外壁（片側だけ部屋）は ext=true。同じ名前の部屋どうしの境目には壁を作らない（L字のLDKなど）。
function deriveWalls(f) {
  const R = f.rooms.filter(isIn);
  if (!R.length) return [];
  const xs = uniq(R.flatMap(r => [r.x, r.x + r.w])), ys = uniq(R.flatMap(r => [r.y, r.y + r.d]));
  const out = [];
  const scan = (lines, cuts, horiz) => {
    for (const c of lines) {
      let cur = null;
      for (let i = 0; i < cuts.length - 1; i++) {
        const a = cuts[i], b = cuts[i + 1], m = (a + b) / 2;
        const onEdge = R.some(r => horiz
          ? (r.y === c || r.y + r.d === c) && r.x <= a && r.x + r.w >= b
          : (r.x === c || r.x + r.w === c) && r.y <= a && r.y + r.d >= b);
        let pc = null;
        if (onEdge) {
          const A = horiz ? roomAt(R, m, c - 1) : roomAt(R, c - 1, m);   // 上・左
          const B = horiz ? roomAt(R, m, c + 1) : roomAt(R, c + 1, m);   // 下・右
          if (A && B) { if (A.name !== B.name) pc = { ext: false, inSign: 0 }; }
          else if (A || B) pc = { ext: true, inSign: horiz ? (B ? 1 : -1) : (A ? 1 : -1) };
        }
        if (pc && cur && cur.ext === pc.ext && cur.inSign === pc.inSign && (horiz ? cur.x2 : cur.y2) === a) {
          if (horiz) cur.x2 = b; else cur.y2 = b;
        } else if (pc) {
          cur = horiz ? { x1: a, y1: c, x2: b, y2: c } : { x1: c, y1: a, x2: c, y2: b };
          Object.assign(cur, pc, { t: pc.ext ? 150 : 105 });
          out.push(cur);
        } else cur = null;
      }
    }
  };
  scan(ys, xs, true);
  scan(xs, ys, false);
  return out;
}
function allWalls(f) {
  return deriveWalls(f).concat((f.walls || []).map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, ext: false, inSign: 0, t: 105, free: w.id })));
}
function opOnSeg(s, o) {
  if (o.dir === 'h') {
    if (s.y1 !== s.y2 || Math.abs(s.y1 - o.y) > 1) return false;
    return o.x - o.w / 2 >= Math.min(s.x1, s.x2) - 1 && o.x + o.w / 2 <= Math.max(s.x1, s.x2) + 1;
  }
  if (s.x1 !== s.x2 || Math.abs(s.x1 - o.x) > 1) return false;
  return o.y - o.w / 2 >= Math.min(s.y1, s.y2) - 1 && o.y + o.w / 2 <= Math.max(s.y1, s.y2) + 1;
}
function segDist(s, x, y) {
  const x0 = Math.min(s.x1, s.x2), x1 = Math.max(s.x1, s.x2), y0 = Math.min(s.y1, s.y2), y1 = Math.max(s.y1, s.y2);
  return Math.hypot(x - clamp(x, x0, x1), y - clamp(y, y0, y1));
}
// 建具を、(x,y) にいちばん近い壁に取り付ける。近くに壁がなければ false。
function attachOpening(f, o, x, y) {
  let best = null, bd = 700;
  for (const s of allWalls(f)) {
    if (s.x1 !== s.x2 && s.y1 !== s.y2) continue;
    const d = segDist(s, x, y);
    if (d < bd) { bd = d; best = s; }
  }
  if (!best) return false;
  const st = 50;
  if (best.y1 === best.y2) {
    const a = Math.min(best.x1, best.x2), b = Math.max(best.x1, best.x2);
    o.dir = 'h'; o.y = best.y1;
    o.x = b - a <= o.w ? (a + b) / 2 : clamp(Math.round(x / st) * st, a + o.w / 2, b - o.w / 2);
    if (b - a < o.w) o.w = Math.floor((b - a) / 10) * 10;
  } else {
    const a = Math.min(best.y1, best.y2), b = Math.max(best.y1, best.y2);
    o.dir = 'v'; o.x = best.x1;
    o.y = b - a <= o.w ? (a + b) / 2 : clamp(Math.round(y / st) * st, a + o.w / 2, b - o.w / 2);
    if (b - a < o.w) o.w = Math.floor((b - a) / 10) * 10;
  }
  return true;
}
// inc の四角の和集合から exc を除いた範囲を、なるべく大きな四角に分ける
function rectsOf(inc, exc = []) {
  if (!inc.length) return [];
  const all = inc.concat(exc);
  const xs = uniq(all.flatMap(r => [r.x, r.x + r.w])), ys = uniq(all.flatMap(r => [r.y, r.y + r.d]));
  const out = []; let open = [];
  for (let j = 0; j < ys.length - 1; j++) {
    const my = (ys[j] + ys[j + 1]) / 2, runs = [];
    let s = null;
    for (let i = 0; i < xs.length - 1; i++) {
      const mx = (xs[i] + xs[i + 1]) / 2;
      const on = inc.some(r => inRect(r, mx, my)) && !exc.some(r => inRect(r, mx, my));
      if (on) { if (s == null) s = xs[i]; } else if (s != null) { runs.push([s, xs[i]]); s = null; }
    }
    if (s != null) runs.push([s, xs[xs.length - 1]]);
    const next = [];
    for (const [a, b] of runs) {
      const r = open.find(q => q.x === a && q.x + q.w === b);
      if (r) { r.d += ys[j + 1] - ys[j]; next.push(r); }
      else { const n = { x: a, y: ys[j], w: b - a, d: ys[j + 1] - ys[j] }; out.push(n); next.push(n); }
    }
    open = next;
  }
  return out;
}
const areaOf = rects => rects.reduce((s, r) => s + r.w * r.d, 0) / 1e6;   // ㎡
function floorArea(f) { return areaOf(rectsOf(f.rooms.filter(isIn))); }
function bboxOf(rects) {
  if (!rects.length) return null;
  const x0 = Math.min(...rects.map(r => r.x)), y0 = Math.min(...rects.map(r => r.y));
  const x1 = Math.max(...rects.map(r => r.x + r.w)), y1 = Math.max(...rects.map(r => r.y + r.d));
  return { x: x0, y: y0, w: x1 - x0, d: y1 - y0 };
}
function roadRect(st) {
  const r = st.roadW, m = 6000;
  switch (st.road) {
    case 'N': return { x: -m, y: -r, w: st.w + 2 * m, d: r };
    case 'E': return { x: st.w, y: -m, w: r, d: st.d + 2 * m };
    case 'W': return { x: -r, y: -m, w: r, d: st.d + 2 * m };
    default:  return { x: -m, y: st.d, w: st.w + 2 * m, d: r };
  }
}
// 同じ名前で接している部屋をひとまとめにする（L字のLDKなど）
function roomGroups(f) {
  const rs = f.rooms, par = rs.map((_, i) => i);
  const find = i => par[i] === i ? i : (par[i] = find(par[i]));
  const ov = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0) > 0;
  const touch = (a, b) => ((a.x + a.w === b.x || b.x + b.w === a.x) && ov(a.y, a.y + a.d, b.y, b.y + b.d))
    || ((a.y + a.d === b.y || b.y + b.d === a.y) && ov(a.x, a.x + a.w, b.x, b.x + b.w));
  for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (rs[i].name === rs[j].name && touch(rs[i], rs[j])) par[find(i)] = find(j);
  const m = new Map();
  rs.forEach((r, i) => { const k = find(i); if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
  return [...m.values()].map(list => {
    const main = list.reduce((a, b) => a.w * a.d >= b.w * b.d ? a : b);
    return { name: main.name, main, list, area: list.reduce((s, r) => s + r.w * r.d, 0) / 1e6, indoor: isIn(main) };
  });
}
function floorY(p, i) { let y = p.baseH; for (let k = 0; k < i; k++) y += p.floors[k].h; return y; }
function rotPt(x, y, deg) { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; }
function itemCorners(it) {
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => { const [dx, dy] = rotPt(sx * it.w / 2, sy * it.d / 2, it.rot); return [it.x + dx, it.y + dy]; });
}

/* ===== 2D 図面を描く ===== */
const PAPER = '#fbfaf7', ACC = '#1f5c46';
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function drawScene(ctx, W, H, v, p, mode, fi, ui = {}) {
  const X = x => x * v.s + v.ox, Y = y => y * v.s + v.oy, L = m => m * v.s;
  const st = p.site;
  ctx.save();
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.lineJoin = 'miter';
  // 道路
  const rr = roadRect(st);
  ctx.fillStyle = '#e1e1dd'; ctx.fillRect(X(rr.x), Y(rr.y), L(rr.w), L(rr.d));
  ctx.fillStyle = '#7d7d78'; ctx.font = `${clamp(L(500), 10, 15)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const rlab = `道路（幅員 ${(st.roadW / 1000).toFixed(1)}m）`;
  if (st.road === 'S' || st.road === 'N') ctx.fillText(rlab, X(st.w / 2), Y(rr.y + rr.d / 2));
  else { ctx.save(); ctx.translate(X(rr.x + rr.w / 2), Y(st.d / 2)); ctx.rotate(-Math.PI / 2); ctx.fillText(rlab, 0, 0); ctx.restore(); }
  // マス目
  if (ui.grid && !ui.print) {
    let step = ui.grid < 455 ? 455 : ui.grid;
    while (L(step) < 9) step *= 2;
    const wx0 = Math.floor((-v.ox / v.s) / step) * step, wx1 = (W - v.ox) / v.s;
    const wy0 = Math.floor((-v.oy / v.s) / step) * step, wy1 = (H - v.oy) / v.s;
    ctx.lineWidth = 1;
    for (let x = wx0; x <= wx1; x += step) { ctx.strokeStyle = (Math.round(x) % 910 === 0) ? '#e4e2da' : '#efeee8'; ctx.beginPath(); ctx.moveTo(Math.round(X(x)) + .5, 0); ctx.lineTo(Math.round(X(x)) + .5, H); ctx.stroke(); }
    for (let y = wy0; y <= wy1; y += step) { ctx.strokeStyle = (Math.round(y) % 910 === 0) ? '#e4e2da' : '#efeee8'; ctx.beginPath(); ctx.moveTo(0, Math.round(Y(y)) + .5); ctx.lineTo(W, Math.round(Y(y)) + .5); ctx.stroke(); }
  }
  // 敷地境界
  ctx.strokeStyle = '#c0504d'; ctx.lineWidth = 1.4; ctx.setLineDash([12, 4, 2, 4]);
  ctx.strokeRect(X(0), Y(0), L(st.w), L(st.d)); ctx.setLineDash([]);
  if (mode === 'site') drawSite(ctx, W, H, v, p, ui); else drawPlan(ctx, W, H, v, p, fi, ui);
  ctx.restore();
}
function labelAt(ctx, x, y, lines, size, color = '#333') {
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((t, i) => { ctx.font = `${i ? '' : '600 '}${i ? size * .85 : size}px sans-serif`; ctx.fillText(t, x, y + (i - (lines.length - 1) / 2) * size * 1.15); });
}
function dimLine(ctx, v, cuts, at, horiz, off) {
  // cuts: 寸法を区切る座標（mm）。at: 線を引く位置（mm）
  const X = x => x * v.s + v.ox, Y = y => y * v.s + v.oy;
  ctx.strokeStyle = '#6d6c67'; ctx.fillStyle = '#4a4945'; ctx.lineWidth = 1;
  ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const a = cuts[0], b = cuts[cuts.length - 1];
  ctx.beginPath();
  if (horiz) { ctx.moveTo(X(a), Y(at)); ctx.lineTo(X(b), Y(at)); } else { ctx.moveTo(X(at), Y(a)); ctx.lineTo(X(at), Y(b)); }
  for (const c of cuts) {
    if (horiz) { ctx.moveTo(X(c), Y(at) - 4); ctx.lineTo(X(c), Y(at) + 4); } else { ctx.moveTo(X(at) - 4, Y(c)); ctx.lineTo(X(at) + 4, Y(c)); }
  }
  ctx.stroke();
  for (let i = 0; i < cuts.length - 1; i++) {
    const len = cuts[i + 1] - cuts[i], m = (cuts[i] + cuts[i + 1]) / 2, t = fmt(len);
    if (Math.abs(len * v.s) < ctx.measureText(t).width + 4) continue;
    if (horiz) ctx.fillText(t, X(m), Y(at) - 2);
    else { ctx.save(); ctx.translate(X(at) - 2, Y(m)); ctx.rotate(-Math.PI / 2); ctx.fillText(t, 0, 0); ctx.restore(); }
  }
}
function drawWalls(ctx, v, walls, color, intColor) {
  const X = x => x * v.s + v.ox, Y = y => y * v.s + v.oy, L = m => m * v.s;
  for (const s of walls) {
    const e = s.ext ? s.t / 2 : 0;
    ctx.fillStyle = s.ext ? color : intColor;
    if (s.y1 === s.y2) { const a = Math.min(s.x1, s.x2) - e, b = Math.max(s.x1, s.x2) + e; ctx.fillRect(X(a), Y(s.y1 - s.t / 2), L(b - a), Math.max(1, L(s.t))); }
    else { const a = Math.min(s.y1, s.y2) - e, b = Math.max(s.y1, s.y2) + e; ctx.fillRect(X(s.x1 - s.t / 2), Y(a), Math.max(1, L(s.t)), L(b - a)); }
  }
}
function drawOpening(ctx, v, o, seg) {
  const L = m => m * v.s;
  const t = seg ? seg.t : 120, w = L(o.w), tt = Math.max(3, L(t));
  ctx.save();
  ctx.translate(o.x * v.s + v.ox, o.y * v.s + v.oy);
  if (o.dir === 'v') ctx.rotate(Math.PI / 2);
  ctx.fillStyle = PAPER; ctx.fillRect(-w / 2, -tt / 2 - .5, w, tt + 1);
  ctx.strokeStyle = seg ? '#333' : '#d03b3b'; ctx.lineWidth = 1;
  const fl = o.flip || 0, hs = (fl & 1) ? 1 : -1, sw = (fl & 2) ? -1 : 1;
  // 外側（部屋がない側）に開くかどうかは flip で切り替える
  if (o.type === 'door' || o.type === 'entrance') {
    const hx = hs * w / 2, r = w;
    ctx.lineWidth = o.type === 'entrance' ? 2 : 1.2;
    ctx.beginPath(); ctx.moveTo(hx, 0); ctx.lineTo(hx, sw * r); ctx.stroke();
    ctx.lineWidth = .8; ctx.beginPath();
    const a0 = sw * Math.PI / 2, a1 = hs > 0 ? Math.PI : 0;
    let df = a1 - a0; while (df > Math.PI) df -= 2 * Math.PI; while (df <= -Math.PI) df += 2 * Math.PI;
    ctx.arc(hx, 0, r, a0, a1, df < 0);
    ctx.stroke();
  } else if (o.type === 'sliding') {
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-w / 2, -tt / 6); ctx.lineTo(w * .06, -tt / 6); ctx.moveTo(-w * .06, tt / 6); ctx.lineTo(w / 2, tt / 6); ctx.stroke();
  } else if (o.type === 'opening') {
    ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.stroke(); ctx.setLineDash([]);
  } else {
    ctx.strokeRect(-w / 2, -tt / 2, w, tt);
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0);
    if (o.type === 'patio' || o.type === 'window') { ctx.moveTo(-w / 2, -tt / 5); ctx.lineTo(w * .05, -tt / 5); ctx.moveTo(-w * .05, tt / 5); ctx.lineTo(w / 2, tt / 5); }
    ctx.stroke();
    if (o.type === 'patio') { ctx.fillStyle = '#333'; ctx.fillRect(-w / 2, -tt / 2, 2, tt); ctx.fillRect(w / 2 - 2, -tt / 2, 2, tt); }
  }
  // 両端の枠
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-w / 2, -tt / 2); ctx.lineTo(-w / 2, tt / 2); ctx.moveTo(w / 2, -tt / 2); ctx.lineTo(w / 2, tt / 2); ctx.stroke();
  ctx.restore();
}
function drawItem(ctx, v, it, isExt, faint) {
  const L = m => m * v.s;
  const cat = isExt ? EXT : FURN, c = cat[it.type] || { label: it.type };
  const w = L(it.w), d = L(it.d);
  ctx.save();
  ctx.translate(it.x * v.s + v.ox, it.y * v.s + v.oy);
  ctx.rotate(it.rot * Math.PI / 180);
  if (faint) ctx.globalAlpha = .35;
  ctx.lineWidth = 1;
  const col = it.color || c.color || '#999';
  if (c.round) {
    ctx.fillStyle = hexA(col, .45); ctx.strokeStyle = hexA(col, .95);
    ctx.beginPath(); ctx.arc(0, 0, w / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (it.type !== 'shrub') { ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * w / 2 * .8, Math.sin(a) * w / 2 * .8); } ctx.stroke(); }
    ctx.restore(); return;
  }
  const pv = isExt && PAVINGS[it.mat || c.mat];
  if (isExt) { ctx.fillStyle = pv ? canvasPat(ctx, pv.pat, col, v.s * 1000, -w / 2, -d / 2) : hexA(col, c.flat ? .5 : .75); ctx.strokeStyle = shade(col, -.35); }
  else { ctx.fillStyle = it.type === 'rug' ? hexA(col, .55) : '#ffffff'; ctx.strokeStyle = '#6a6964'; }
  if (['carport', 'carport2', 'cycleport', 'terraceRoof', 'pergola'].includes(it.type)) { ctx.fillStyle = hexA(col, .15); }
  if (c.above) { ctx.setLineDash([3, 3]); ctx.fillStyle = 'rgba(255,255,255,.6)'; }
  if (['stepping', 'flowers', 'sleepers'].includes(it.type)) ctx.fillStyle = 'rgba(0,0,0,0)';
  ctx.fillRect(-w / 2, -d / 2, w, d); ctx.strokeRect(-w / 2, -d / 2, w, d);
  ctx.setLineDash([]);
  ctx.strokeStyle = isExt ? hexA(col, 1) : '#6a6964';
  const T = it.type;
  ctx.beginPath();
  if (!isExt && !['dining', 'dining2', 'dining6', 'roundtable', 'lowtable', 'sidetable', 'zataku', 'rug', 'plant', 'floorlamp', 'pendant', 'stairs', 'desk', 'stools', 'ottoman', 'islandFree'].includes(T)) { // 背面
    ctx.lineWidth = 2.2; ctx.moveTo(-w / 2, -d / 2); ctx.lineTo(w / 2, -d / 2); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath();
  }
  if (T === 'stairs') {
    const n = Math.max(3, Math.round(it.d / 230));
    for (let k = 1; k < n; k++) { const y = -d / 2 + d * k / n; ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); }
    ctx.stroke(); ctx.beginPath(); ctx.strokeStyle = '#c03c3c';
    ctx.moveTo(0, d / 2 - 4); ctx.lineTo(0, -d / 2 + 6); ctx.moveTo(-w / 6, -d / 2 + w / 6 + 6); ctx.lineTo(0, -d / 2 + 6); ctx.lineTo(w / 6, -d / 2 + w / 6 + 6);
  } else if (T === 'bedS' || T === 'bedD') {
    const pw = T === 'bedD' ? w * .42 : w * .8;
    if (T === 'bedD') { ctx.rect(-w / 2 + w * .05, -d / 2 + d * .04, pw, d * .12); ctx.rect(w / 2 - w * .05 - pw, -d / 2 + d * .04, pw, d * .12); }
    else ctx.rect(-pw / 2, -d / 2 + d * .04, pw, d * .12);
    ctx.moveTo(-w / 2, -d / 2 + d * .3); ctx.lineTo(w / 2, -d / 2 + d * .3);
  } else if (T === 'sofa2' || T === 'sofa3') {
    ctx.rect(-w / 2 + d * .2, -d / 2 + d * .25, w - d * .4, d * .75);
  } else if (T === 'dining') {
    ctx.rect(-w / 2, -d * .26, w, d * .52);
    for (const sx of [-.25, .25]) for (const sy of [-1, 1]) { ctx.rect(sx * w - w * .13, sy * d * .38 - d * .1, w * .26, d * .2); }
  } else if (T === 'desk') {
    ctx.rect(-w / 2, -d / 2, w, d * .55); ctx.moveTo(0, 0); ctx.arc(0, d * .25, Math.min(w, d) * .2, 0, Math.PI * 2);
  } else if (T === 'kitchen' || T === 'island') {
    ctx.rect(-w * .35, -d * .3, w * .25, d * .55);
    for (const cx of [w * .18, w * .32]) { ctx.moveTo(cx + d * .12, -d * .05); ctx.arc(cx, -d * .05, d * .12, 0, Math.PI * 2); }
  } else if (T === 'toilet') {
    ctx.rect(-w / 2, -d / 2, w, d * .28); ctx.moveTo(w * .4, d * .15); ctx.ellipse(0, d * .15, w * .4, d * .3, 0, 0, Math.PI * 2);
  } else if (T === 'bath') {
    ctx.roundRect ? ctx.roundRect(-w / 2 + 4, -d / 2 + 4, w - 8, d - 8, 8) : ctx.rect(-w / 2 + 4, -d / 2 + 4, w - 8, d - 8);
  } else if (T === 'basin') {
    ctx.moveTo(w * .3, 0); ctx.ellipse(0, 0, w * .3, d * .28, 0, 0, Math.PI * 2);
  } else if (T === 'washer') {
    ctx.moveTo(w * .32, 0); ctx.arc(0, 0, w * .32, 0, Math.PI * 2);
  } else if (T === 'car') {
    ctx.rect(-w * .42, -d * .2, w * .84, d * .38);
  } else if (T === 'carport' || T === 'storage') {
    ctx.moveTo(-w / 2, -d / 2); ctx.lineTo(w / 2, d / 2); ctx.moveTo(w / 2, -d / 2); ctx.lineTo(-w / 2, d / 2);
  } else if (T === 'fence') {
    const n = Math.max(1, Math.round(it.w / 2000));
    for (let k = 0; k <= n; k++) { const x = -w / 2 + w * k / n; ctx.rect(x - 2, -3, 4, 6); }
  } else if (T === 'roundtable' || T === 'gardenSet') {
    const r = Math.min(w, d) * .3; ctx.moveTo(r, 0); ctx.arc(0, 0, r, 0, Math.PI * 2);
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4, cx = Math.cos(a) * r * 1.55, cy = Math.sin(a) * r * 1.55; ctx.moveTo(cx + r * .4, cy); ctx.arc(cx, cy, r * .4, 0, Math.PI * 2); }
  } else if (T === 'stepping') {
    const n = Math.max(1, Math.round(it.w / (it.d * 1.3)));
    ctx.fillStyle = hexA(col, .8);
    for (let k = 0; k < n; k++) { const x = -w / 2 + w * (k + .5) / n; ctx.moveTo(x + d * .45, 0); ctx.ellipse(x, 0, d * .45, d * .4, 0, 0, Math.PI * 2); }
    ctx.fill();
  } else if (T === 'sleepers') {
    const n = Math.max(1, Math.round(it.w / 300));
    ctx.fillStyle = hexA(col, .85);
    for (let k = 0; k < n; k++) { const x = -w / 2 + w * k / n; ctx.rect(x + w / n * .1, -d / 2, w / n * .7, d); }
    ctx.fill();
  } else if (T === 'flowers') {
    const pal = ['#d76f8f', '#f2c14e', '#ffffff', '#9b7fd1', '#e8743b'];
    for (let x = -w / 2 + 5; x < w / 2; x += 9) for (let y = -d / 2 + 5; y < d / 2; y += 9) { ctx.fillStyle = pal[Math.abs(Math.round(x * 7 + y * 13)) % pal.length]; ctx.fillRect(x, y, 3, 3); }
  } else if (T === 'unitbath') {
    ctx.rect(-w / 2 + 4, -d / 2 + 4, w - 8, d * .45);
  } else if (T === 'basin2') {
    for (const cx of [-w * .25, w * .25]) { ctx.moveTo(cx + w * .14, 0); ctx.ellipse(cx, 0, w * .14, d * .28, 0, 0, Math.PI * 2); }
  } else if (T === 'toiletTl' || T === 'handwash') {
    ctx.moveTo(w * .4, d * .1); ctx.ellipse(0, d * .1, w * .4, d * .32, 0, 0, Math.PI * 2);
  } else if (T === 'kitchenL') {
    ctx.moveTo(-w / 2, -d / 2 + L(650)); ctx.lineTo(-w / 2 + L(650), -d / 2 + L(650)); ctx.lineTo(-w / 2 + L(650), d / 2);
  } else if (T === 'sofaL') {
    ctx.moveTo(-w / 2, -d / 2 + L(900)); ctx.lineTo(w / 2 - L(900), -d / 2 + L(900)); ctx.lineTo(w / 2 - L(900), d / 2);
  } else if (T === 'gate') {
    ctx.moveTo(-w / 2, 0); ctx.arc(-w / 2, 0, w / 2, 0, Math.PI / 2); ctx.moveTo(w / 2, 0); ctx.arc(w / 2, 0, w / 2, Math.PI, Math.PI / 2, true);
  } else if (T === 'bedSD' || T === 'bedQ' || T === 'bunk') {
    ctx.rect(-w / 2 + w * .1, -d / 2 + d * .04, w * .8, d * .12); ctx.moveTo(-w / 2, -d / 2 + d * .3); ctx.lineTo(w / 2, -d / 2 + d * .3);
  } else if (T === 'parking') {
    ctx.setLineDash([4, 4]); ctx.moveTo(0, -d / 2); ctx.lineTo(0, d / 2);
  }
  ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  // 名前（回転しない）
  const lab = short(c.label);
  const fs = clamp(Math.min(w, d) * .28, 0, 12);
  if (fs >= 8 && !['fence', 'block', 'hedge'].includes(T) && Math.max(w, d) > lab.length * fs * .9) {
    ctx.save(); if (faint) ctx.globalAlpha = .35;
    labelAt(ctx, it.x * v.s + v.ox, it.y * v.s + v.oy + (T === 'stairs' ? 0 : 0), [lab], fs, isExt ? '#2f2f2c' : '#555');
    ctx.restore();
  }
}
function drawPlan(ctx, W, H, v, p, fi, ui) {
  const X = x => x * v.s + v.ox, Y = y => y * v.s + v.oy, L = m => m * v.s;
  const f = p.floors[fi];
  // 1階には外構をうすく、2階以上には下の階をうすく表示
  if (fi === 0) p.ext.forEach(it => drawItem(ctx, v, it, true, true));
  else {
    const lw = allWalls(p.floors[fi - 1]);
    ctx.globalAlpha = .18; drawWalls(ctx, v, lw, '#555', '#888'); ctx.globalAlpha = 1;
  }
  // 部屋の床
  for (const r of f.rooms) {
    const fm = FLOOR_MATS[r.floor] || FLOOR_MATS.oak;
    ctx.fillStyle = PAPER; ctx.fillRect(X(r.x), Y(r.y), L(r.w), L(r.d));
    ctx.globalAlpha = isIn(r) ? .5 : .35;
    ctx.fillStyle = canvasPat(ctx, fm.pat, fm.color, v.s * 1000, X(r.x), Y(r.y));
    ctx.fillRect(X(r.x), Y(r.y), L(r.w), L(r.d));
    ctx.globalAlpha = 1;
    // アクセントクロスの面に色の線
    if (r.accent && WALLPAPERS[r.accentPaper] && isIn(r)) {
      const wp = WALLPAPERS[r.accentPaper], k = Math.max(3, L(60)), o = L(75);
      ctx.fillStyle = wp.color; ctx.strokeStyle = '#555'; ctx.lineWidth = .5;
      const rr = r.accent === 'N' ? [X(r.x), Y(r.y) + o, L(r.w), k] : r.accent === 'S' ? [X(r.x), Y(r.y + r.d) - o - k, L(r.w), k]
        : r.accent === 'W' ? [X(r.x) + o, Y(r.y), k, L(r.d)] : [X(r.x + r.w) - o - k, Y(r.y), k, L(r.d)];
      ctx.fillRect(...rr); ctx.strokeRect(...rr);
    }
    if (!isIn(r)) { ctx.strokeStyle = '#555'; ctx.lineWidth = 1.2; ctx.strokeRect(X(r.x), Y(r.y), L(r.w), L(r.d)); }
  }
  const walls = allWalls(f);
  drawWalls(ctx, v, walls, '#2b2b2b', '#55544f');
  for (const o of f.openings) drawOpening(ctx, v, o, walls.find(s => opOnSeg(s, o)));
  for (const it of f.items) drawItem(ctx, v, it, false, false);
  // 部屋名
  for (const gq of roomGroups(f)) {
    const r = gq.main, a = gq.area, fs = clamp(Math.min(L(r.w), L(r.d)) * .16, 0, 15);
    if (fs < 7) continue;
    const lines = gq.indoor && !['ホール', '廊下', '階段'].includes(r.name) ? [r.name, `${(a / TATAMI).toFixed(1)}帖`] : [r.name];
    let cy = Y(r.y + r.d / 2);
    const hasItem = f.items.some(it => inRect(r, it.x, it.y) && Math.abs(it.y - (r.y + r.d / 2)) < 500 && Math.abs(it.x - (r.x + r.w / 2)) < it.w / 2 + 300);
    if (hasItem) cy = Y(r.y) + fs * 1.6 + 4;
    ctx.fillStyle = 'rgba(251,250,247,.75)';
    const tw = Math.max(...lines.map(t => t.length)) * fs * .95 + 8;
    ctx.fillRect(X(r.x + r.w / 2) - tw / 2, cy - fs * lines.length * .62, tw, fs * lines.length * 1.2);
    labelAt(ctx, X(r.x + r.w / 2), cy, lines, fs, '#26261f');
  }
  // 寸法
  const ind = f.rooms.filter(isIn);
  const bb = bboxOf(f.rooms);
  if (bb) {
    const xs = uniq(ind.length ? ind.flatMap(r => [r.x, r.x + r.w]) : [bb.x, bb.x + bb.w]);
    const ys = uniq(ind.length ? ind.flatMap(r => [r.y, r.y + r.d]) : [bb.y, bb.y + bb.d]);
    const gap = 26 / v.s;
    if (xs.length > 2) dimLine(ctx, v, xs, bb.y - gap * 1.6, true);
    dimLine(ctx, v, [bb.x, bb.x + bb.w], bb.y - gap * 2.6, true);
    if (ys.length > 2) dimLine(ctx, v, ys, bb.x - gap * 1.6, false);
    dimLine(ctx, v, [bb.y, bb.y + bb.d], bb.x - gap * 2.6, false);
  }
  drawNorth(ctx, W, ui);
  drawSel(ctx, v, ui);
}
function drawSite(ctx, W, H, v, p, ui) {
  const X = x => x * v.s + v.ox, Y = y => y * v.s + v.oy, L = m => m * v.s;
  const flat = p.ext.filter(it => (EXT[it.type] || {}).flat), tall = p.ext.filter(it => !(EXT[it.type] || {}).flat);
  flat.forEach(it => drawItem(ctx, v, it, true, false));
  // 建物（1階を塗り、2階以上は点線）
  const f0 = p.floors[0];
  for (const r of f0.rooms) {
    ctx.fillStyle = isIn(r) ? '#dedbd3' : '#ecebe6';
    ctx.fillRect(X(r.x), Y(r.y), L(r.w), L(r.d));
  }
  drawWalls(ctx, v, allWalls(f0).filter(s => s.ext), '#2b2b2b', '#2b2b2b');
  p.floors.slice(1).forEach((f, k) => {
    ctx.strokeStyle = '#55544f'; ctx.lineWidth = 1.2; ctx.setLineDash([6, 4]);
    for (const r of rectsOf(f.rooms.filter(isIn))) ctx.strokeRect(X(r.x), Y(r.y), L(r.w), L(r.d));
    ctx.setLineDash([2, 3]);
    for (const r of f.rooms.filter(r => !isIn(r))) ctx.strokeRect(X(r.x), Y(r.y), L(r.w), L(r.d));
    ctx.setLineDash([]);
  });
  for (const o of f0.openings.filter(o => o.type === 'entrance')) {
    ctx.fillStyle = '#c0504d'; ctx.beginPath(); ctx.arc(X(o.x), Y(o.y), 4, 0, Math.PI * 2); ctx.fill();
  }
  const bb = bboxOf(f0.rooms.filter(isIn));
  if (bb) labelAt(ctx, X(bb.x + bb.w / 2), Y(bb.y + bb.d / 2), ['建物', `延床 ${fmt(p.floors.reduce((s, f) => s + floorArea(f), 0), 2)}㎡`], clamp(L(600), 9, 14), '#333');
  tall.filter(it => !EXT[it.type].round).forEach(it => drawItem(ctx, v, it, true, false));
  tall.filter(it => EXT[it.type].round).forEach(it => drawItem(ctx, v, it, true, false));
  // 敷地の寸法・建物からの距離
  const st = p.site, gap = 26 / v.s;
  dimLine(ctx, v, [0, st.w], -gap * 1.2, true);
  dimLine(ctx, v, [0, st.d], -gap * 1.2, false);
  // 外構の名前（建物の下に隠れないよう最後に）
  for (const it of flat) { const c = EXT[it.type], w = L(it.w), d = L(it.d), fs = clamp(Math.min(w, d) * .28, 0, 12), lab = short(c.label); if (fs >= 8 && Math.max(w, d) > lab.length * fs * .9) labelAt(ctx, X(it.x), Y(it.y), [lab], fs, '#2f2f2c'); }
  if (bb) {
    dimLine(ctx, v, [0, bb.x, bb.x + bb.w, st.w], -gap * 2.3, true);
    dimLine(ctx, v, [0, bb.y, bb.y + bb.d, st.d], -gap * 2.3, false);
  }
  drawNorth(ctx, W, ui);
  drawSel(ctx, v, ui);
}
function drawNorth(ctx, W, ui) {
  const x = W - 34, y = 40;
  ctx.save(); ctx.strokeStyle = '#333'; ctx.fillStyle = '#333'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 15); ctx.lineTo(x + 6, y + 8); ctx.lineTo(x, y + 3); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y - 15); ctx.lineTo(x - 6, y + 8); ctx.lineTo(x, y + 3); ctx.closePath(); ctx.stroke();
  ctx.font = '600 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText('N', x, y - 18);
  ctx.restore();
}
function drawSel(ctx, v, ui) {
  const X = x => x * v.s + v.ox, Y = y => y * v.s + v.oy, L = m => m * v.s;
  if (ui.preview) {
    const q = ui.preview;
    ctx.strokeStyle = ACC; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    if (q.kind === 'room') {
      ctx.fillStyle = hexA(ACC, .08); ctx.fillRect(X(q.x), Y(q.y), L(q.w), L(q.d)); ctx.strokeRect(X(q.x), Y(q.y), L(q.w), L(q.d));
      ctx.setLineDash([]);
      labelAt(ctx, X(q.x + q.w / 2), Y(q.y + q.d / 2), [`${fmt(q.w)} × ${fmt(q.d)}`, `${(q.w * q.d / 1e6 / TATAMI).toFixed(1)}帖`], 13, ACC);
    } else if (q.kind === 'wall') {
      ctx.lineWidth = Math.max(3, L(105)); ctx.setLineDash([]); ctx.strokeStyle = hexA(ACC, .7);
      ctx.beginPath(); ctx.moveTo(X(q.x1), Y(q.y1)); ctx.lineTo(X(q.x2), Y(q.y2)); ctx.stroke();
      labelAt(ctx, X((q.x1 + q.x2) / 2), Y((q.y1 + q.y2) / 2) - 14, [fmt(Math.hypot(q.x2 - q.x1, q.y2 - q.y1))], 12, ACC);
    }
    ctx.setLineDash([]);
  }
  const s = ui.selObj;
  if (!s) return;
  ctx.strokeStyle = ACC; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
  const hs = [];
  if (s.kind === 'room') { const r = s.o; ctx.strokeRect(X(r.x), Y(r.y), L(r.w), L(r.d)); hs.push([r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.d], [r.x, r.y + r.d]); }
  else if (s.kind === 'item' || s.kind === 'ext') {
    const cs = itemCorners(s.o); ctx.beginPath(); cs.forEach(([x, y], i) => i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))); ctx.closePath(); ctx.stroke();
    hs.push(...cs);
  } else if (s.kind === 'opening') {
    const o = s.o, w = L(o.w) + 6, t = Math.max(14, L(300));
    ctx.save(); ctx.translate(X(o.x), Y(o.y)); if (o.dir === 'v') ctx.rotate(Math.PI / 2); ctx.strokeRect(-w / 2, -t / 2, w, t); ctx.restore();
  } else if (s.kind === 'wall') {
    const w = s.o; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X(w.x1), Y(w.y1)); ctx.lineTo(X(w.x2), Y(w.y2)); ctx.stroke();
    hs.push([w.x1, w.y1], [w.x2, w.y2]);
  }
  ctx.setLineDash([]);
  ctx.fillStyle = '#fff'; ctx.lineWidth = 1.5;
  for (const [x, y] of hs) { ctx.fillRect(X(x) - 5, Y(y) - 5, 10, 10); ctx.strokeRect(X(x) - 5, Y(y) - 5, 10, 10); }
}

/* ===== 図面エディタ ===== */
class Editor {
  constructor(cv, mode) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.mode = mode; this.fi = 0;
    this.v = { s: .04, ox: 0, oy: 0 }; this.tool = 'select'; this.sel = null; this.drag = null; this.preview = null;
    this.ptrs = new Map(); this.grid = 455; this.fitted = false; this.space = false;
    cv.addEventListener('pointerdown', e => this.down(e));
    cv.addEventListener('pointermove', e => this.move(e));
    cv.addEventListener('pointerup', e => this.up(e));
    cv.addEventListener('pointercancel', e => this.up(e));
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .0015)); }, { passive: false });
    new ResizeObserver(() => this.resize()).observe(cv.parentElement);
  }
  get floor() { return plan().floors[this.fi]; }
  resize() {
    const r = this.cv.parentElement.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = window.devicePixelRatio || 1;
    this.W = r.width; this.H = r.height; this.dpr = dpr;
    this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    if (!this.fitted) this.fit(); else this.draw();
  }
  fit() {
    if (!this.W) return;
    const p = plan(), st = p.site, m = 2600;
    let bb = { x: -m, y: -m, w: st.w + 2 * m, d: st.d + 2 * m };
    if (this.mode === 'plan') {
      const b = bboxOf(p.floors.flatMap(f => f.rooms));
      if (b) bb = { x: b.x - 2800, y: b.y - 2800, w: b.w + 4400, d: b.d + 4400 };
    }
    this.v.s = Math.min(this.W / bb.w, this.H / bb.d);
    this.v.ox = (this.W - bb.w * this.v.s) / 2 - bb.x * this.v.s;
    this.v.oy = (this.H - bb.d * this.v.s) / 2 - bb.y * this.v.s;
    this.fitted = true; this.draw();
  }
  zoomAt(sx, sy, k) {
    const s2 = clamp(this.v.s * k, .004, 1.2); k = s2 / this.v.s;
    this.v.ox = sx - (sx - this.v.ox) * k; this.v.oy = sy - (sy - this.v.oy) * k; this.v.s = s2; this.draw();
  }
  pt(e) { const r = this.cv.getBoundingClientRect(); const sx = e.clientX - r.left, sy = e.clientY - r.top; return { sx, sy, x: (sx - this.v.ox) / this.v.s, y: (sy - this.v.oy) / this.v.s }; }
  snap(v) { return Math.round(v / this.grid) * this.grid; }
  obj(sel = this.sel) {
    if (!sel) return null;
    const p = plan(), f = p.floors[this.fi];
    const arr = sel.kind === 'ext' ? p.ext : sel.kind === 'room' ? f.rooms : sel.kind === 'opening' ? f.openings : sel.kind === 'item' ? f.items : f.walls;
    return arr.find(o => o.id === sel.id) || null;
  }
  list(kind) { const p = plan(), f = p.floors[this.fi]; return kind === 'ext' ? p.ext : kind === 'room' ? f.rooms : kind === 'opening' ? f.openings : kind === 'item' ? f.items : f.walls; }
  pick(w) {
    const p = plan(), tol = 6 / this.v.s;
    const hitItem = it => { const [lx, ly] = rotPt(w.x - it.x, w.y - it.y, -it.rot); return Math.abs(lx) <= it.w / 2 + tol && Math.abs(ly) <= it.d / 2 + tol; };
    if (this.mode === 'site') {
      // 木・物置など背の高いものを先に
      const order = [...p.ext].sort((a, b) => (EXT[a.type]?.flat ? 0 : 1) - (EXT[b.type]?.flat ? 0 : 1));
      for (let i = order.length - 1; i >= 0; i--) if (hitItem(order[i])) return { kind: 'ext', id: order[i].id };
      return null;
    }
    const f = this.floor;
    for (const o of [...f.openings].reverse()) {
      const along = o.dir === 'h' ? w.x - o.x : w.y - o.y, perp = o.dir === 'h' ? w.y - o.y : w.x - o.x;
      if (Math.abs(along) <= o.w / 2 && Math.abs(perp) <= Math.max(220, tol * 1.5)) return { kind: 'opening', id: o.id };
    }
    for (let i = f.items.length - 1; i >= 0; i--) if (hitItem(f.items[i])) return { kind: 'item', id: f.items[i].id };
    for (const wl of [...f.walls].reverse()) if (segDist(wl, w.x, w.y) < Math.max(120, tol)) return { kind: 'wall', id: wl.id };
    for (let i = f.rooms.length - 1; i >= 0; i--) if (inRect(f.rooms[i], w.x, w.y)) return { kind: 'room', id: f.rooms[i].id };
    return null;
  }
  handleAt(w) {
    const o = this.obj(); if (!o) return null;
    const tol = 9 / this.v.s, k = this.sel.kind;
    let cs = [];
    if (k === 'room') cs = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.d], [o.x, o.y + o.d]];
    else if (k === 'item' || k === 'ext') cs = itemCorners(o);
    else if (k === 'wall') cs = [[o.x1, o.y1], [o.x2, o.y2]];
    const i = cs.findIndex(([x, y]) => Math.abs(x - w.x) < tol && Math.abs(y - w.y) < tol);
    return i < 0 ? null : { i, cs };
  }
  setTool(t) {
    this.tool = t; this.preview = null;
    const host = this.cv.closest('section');
    host.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
    this.cv.style.cursor = t === 'select' ? 'default' : 'crosshair';
    this.hud();
  }
  hud(msg) {
    const el = this.mode === 'site' ? $('#hudSite') : $('#hudPlan');
    const t = this.tool;
    el.textContent = msg || (t === 'room' ? 'ドラッグで部屋の四角を描きます（マス目に合わせます）'
      : t === 'wall' ? 'ドラッグで壁を描きます（水平・垂直）'
      : t.startsWith('op:') ? '取り付ける壁の上をクリック'
      : (t.startsWith('fu:') || t.startsWith('ex:')) ? '置きたい場所をクリック'
      : 'クリックで選択・ドラッグで移動・角の□で大きさを変更。何もない所のドラッグで画面移動、ホイールで拡大縮小');
  }
  down(e) {
    this.cv.setPointerCapture(e.pointerId);
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()];
      this.drag = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v0: { ...this.v } };
      this.preview = null; this.draw(); return;
    }
    if (this.ptrs.size > 2) return;
    const w = this.pt(e), t = this.tool, f = this.floor, p = plan();
    if (e.button === 1 || e.button === 2 || this.space) { this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: this.v.ox, oy: this.v.oy }; return; }
    if (t === 'room' || t === 'wall') {
      const a = { x: this.snap(w.x), y: this.snap(w.y) };
      this.drag = { kind: t, a, b: a }; return;
    }
    if (t.startsWith('op:')) {
      const o = mkOpening(t.slice(3), 'h', 0, 0);
      if (!attachOpening(f, o, w.x, w.y)) { toast('近くに壁がありません。先に部屋を描いてください'); return; }
      pushUndo(); f.openings.push(o); this.select({ kind: 'opening', id: o.id }); this.setTool('select'); commit(); return;
    }
    if (t.startsWith('fu:') || t.startsWith('ex:')) {
      const isExt = t.startsWith('ex:'), type = t.slice(3);
      const it = mkItem(isExt ? EXT : FURN, type, Math.round(w.x / 50) * 50, Math.round(w.y / 50) * 50);
      if (type === 'stairs') it.h = f.h;
      pushUndo(); (isExt ? p.ext : f.items).push(it); this.select({ kind: isExt ? 'ext' : 'item', id: it.id }); this.setTool('select'); commit(); return;
    }
    // 選択ツール
    const h = this.handleAt(w);
    if (h) { this.drag = { kind: 'resize', h, orig: JSON.parse(JSON.stringify(this.obj())), moved: false }; return; }
    const hit = this.pick(w);
    this.select(hit);
    if (hit) this.drag = { kind: 'move', start: w, orig: JSON.parse(JSON.stringify(this.obj())), moved: false, sx: e.clientX, sy: e.clientY };
    else this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: this.v.ox, oy: this.v.oy };
  }
  move(e) {
    if (this.ptrs.has(e.pointerId)) this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const d = this.drag;
    if (!d) return;
    if (d.kind === 'pinch') {
      if (this.ptrs.size < 2) return;
      const [a, b] = [...this.ptrs.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y), m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const r = this.cv.getBoundingClientRect();
      const k = dist / d.d0, s2 = clamp(d.v0.s * k, .004, 1.2), kk = s2 / d.v0.s;
      const mx0 = d.m0.x - r.left, my0 = d.m0.y - r.top;
      this.v.s = s2;
      this.v.ox = mx0 - (mx0 - d.v0.ox) * kk + (m.x - d.m0.x);
      this.v.oy = my0 - (my0 - d.v0.oy) * kk + (m.y - d.m0.y);
      this.draw(); return;
    }
    const w = this.pt(e);
    if (d.kind === 'pan') { this.v.ox = d.ox + e.clientX - d.sx; this.v.oy = d.oy + e.clientY - d.sy; this.draw(); return; }
    if (d.kind === 'room') {
      d.b = { x: this.snap(w.x), y: this.snap(w.y) };
      this.preview = { kind: 'room', x: Math.min(d.a.x, d.b.x), y: Math.min(d.a.y, d.b.y), w: Math.abs(d.b.x - d.a.x), d: Math.abs(d.b.y - d.a.y) };
      this.draw(); return;
    }
    if (d.kind === 'wall') {
      let b = { x: this.snap(w.x), y: this.snap(w.y) };
      if (Math.abs(b.x - d.a.x) >= Math.abs(b.y - d.a.y)) b.y = d.a.y; else b.x = d.a.x;
      d.b = b; this.preview = { kind: 'wall', x1: d.a.x, y1: d.a.y, x2: b.x, y2: b.y }; this.draw(); return;
    }
    const o = this.obj(); if (!o) return;
    if (!d.moved) {
      if (d.kind === 'move' && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
      pushUndo(); d.moved = true;
    }
    const k = this.sel.kind, g = d.orig;
    if (d.kind === 'move') {
      const dx = w.x - d.start.x, dy = w.y - d.start.y;
      if (k === 'room') { o.x = this.snap(g.x + dx); o.y = this.snap(g.y + dy); }
      else if (k === 'item' || k === 'ext') { const st = this.grid >= 455 ? 50 : this.grid; o.x = Math.round((g.x + dx) / st) * st; o.y = Math.round((g.y + dy) / st) * st; }
      else if (k === 'opening') { attachOpening(this.floor, o, w.x, w.y); }
      else if (k === 'wall') { const ddx = this.snap(dx), ddy = this.snap(dy); o.x1 = g.x1 + ddx; o.x2 = g.x2 + ddx; o.y1 = g.y1 + ddy; o.y2 = g.y2 + ddy; }
    } else if (d.kind === 'resize') {
      const i = d.h.i, cs = d.h.cs;
      if (k === 'room') {
        const opp = cs[(i + 2) % 4], nx = this.snap(w.x), ny = this.snap(w.y);
        const gx = Math.max(this.grid, 100);
        o.x = Math.min(opp[0], nx); o.y = Math.min(opp[1], ny);
        o.w = Math.max(gx, Math.abs(nx - opp[0])); o.d = Math.max(gx, Math.abs(ny - opp[1]));
        if (nx < opp[0]) o.x = opp[0] - o.w; if (ny < opp[1]) o.y = opp[1] - o.d;
      } else if (k === 'wall') {
        const nx = this.snap(w.x), ny = this.snap(w.y);
        const fx = i === 0 ? g.x2 : g.x1, fy = i === 0 ? g.y2 : g.y1;
        let px = nx, py = ny;
        if (Math.abs(px - fx) >= Math.abs(py - fy)) py = fy; else px = fx;
        if (i === 0) { o.x1 = px; o.y1 = py; } else { o.x2 = px; o.y2 = py; }
      } else {
        const opp = cs[(i + 2) % 4];
        const [lx, ly] = rotPt(w.x - opp[0], w.y - opp[1], -g.rot);
        const st = 10;
        const nw = Math.max(100, Math.round(Math.abs(lx) / st) * st), nd = Math.max(EXT[o.type]?.round ? 100 : 20, Math.round(Math.abs(ly) / st) * st);
        o.w = nw; o.d = EXT[o.type]?.round ? nw : nd;
        const [cx, cy] = rotPt(Math.sign(lx || 1) * o.w / 2, Math.sign(ly || 1) * o.d / 2, g.rot);
        o.x = Math.round(opp[0] + cx); o.y = Math.round(opp[1] + cy);
      }
    }
    dirty3d = true; this.draw(); this.hud(this.dimText(o));
  }
  dimText(o) {
    const k = this.sel?.kind;
    if (k === 'room') return `${o.name}　${fmt(o.w)} × ${fmt(o.d)} mm　${(o.w * o.d / 1e6).toFixed(2)}㎡（${(o.w * o.d / 1e6 / TATAMI).toFixed(1)}帖）`;
    if (k === 'item' || k === 'ext') return `${fmt(o.w)} × ${fmt(o.d)} mm`;
    return '';
  }
  up(e) {
    this.ptrs.delete(e.pointerId);
    const d = this.drag;
    if (!d) return;
    if (d.kind === 'pinch') { if (this.ptrs.size < 2) this.drag = null; return; }
    this.drag = null;
    const f = this.floor;
    if (d.kind === 'room' && this.preview) {
      const q = this.preview; this.preview = null;
      if (q.w >= 455 && q.d >= 455) {
        const name = $('#roomNameSel').value;
        const r = { id: uid(), name, x: q.x, y: q.y, w: q.w, d: q.d, floor: defaultFloor(name) };
        if (defaultPaper(name)) r.paper = defaultPaper(name);
        pushUndo(); f.rooms.push(r); this.select({ kind: 'room', id: r.id }); commit();
      } else this.draw();
      return;
    }
    if (d.kind === 'wall' && this.preview) {
      const q = this.preview; this.preview = null;
      if (Math.hypot(q.x2 - q.x1, q.y2 - q.y1) >= 455) {
        const wl = { id: uid(), x1: q.x1, y1: q.y1, x2: q.x2, y2: q.y2 };
        pushUndo(); (f.walls = f.walls || []).push(wl); this.select({ kind: 'wall', id: wl.id }); commit();
      } else this.draw();
      return;
    }
    if ((d.kind === 'move' || d.kind === 'resize') && d.moved) { this.hud(); commit(); }
  }
  select(sel) { this.sel = sel; renderProps(this); this.draw(); }
  del() {
    if (!this.sel) return;
    const arr = this.list(this.sel.kind), i = arr.findIndex(o => o.id === this.sel.id);
    if (i < 0) return;
    pushUndo(); arr.splice(i, 1); this.sel = null; commit();
  }
  rotate(deg = 90) {
    const o = this.obj(), k = this.sel?.kind;
    if (!o) return;
    pushUndo();
    if (k === 'item' || k === 'ext') o.rot = ((o.rot + deg) % 360 + 360) % 360;
    else if (k === 'room') { const cx = o.x + o.w / 2, cy = o.y + o.d / 2; [o.w, o.d] = [o.d, o.w]; o.x = this.snap(cx - o.w / 2); o.y = this.snap(cy - o.d / 2); }
    else if (k === 'opening') o.flip = ((o.flip || 0) + 1) % 4;
    commit();
  }
  duplicate() {
    const o = this.obj(), k = this.sel?.kind;
    if (!o || k === 'opening') return;
    const c = JSON.parse(JSON.stringify(o)); c.id = uid();
    const off = k === 'room' ? 910 : 300;
    if (k === 'wall') { c.x1 += off; c.x2 += off; c.y1 += off; c.y2 += off; } else { c.x += off; c.y += off; }
    pushUndo(); this.list(k).push(c); this.select({ kind: k, id: c.id }); commit();
  }
  draw() {
    if (!this.W) return;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const o = this.obj();
    drawScene(ctx, this.W, this.H, this.v, plan(), this.mode, this.fi, { grid: this.grid, preview: this.preview, selObj: o ? { kind: this.sel.kind, o } : null });
  }
}

/* ===== 右側のパネル ===== */
const optList = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${esc(v.label)}</option>`).join('');
// 仕上げ材のセレクト（見本の画像つき）
function matSel(label, key, cat, cur, blank, fallback) {
  const m = cat[cur] || cat[fallback];
  const img = m ? `<img class="mthumb" src="${patThumb(m.pat, m.color, 60, 30, 1.2)}" alt="">` : '<span class="mthumb"></span>';
  return `<label class="f">${label}<span class="msel">${img}<select data-k="${key}">${blank ? `<option value=""${cur ? '' : ' selected'}>${esc(blank)}</option>` : ''}${optList(cat, cur)}</select></span></label>`;
}
function swatchBtns(key, list, dataAttr = 'data-sw') {
  return list.map(([n, c]) => `<button type="button" class="sw" ${dataAttr}="${key}" data-c="${c}" title="${esc(n)}" style="background:${c}"></button>`).join('');
}
function swatchRow(key, list, dataAttr = 'data-sw') { return `<div class="sws">${swatchBtns(key, list, dataAttr)}</div>`; }
const nIn = (k, v, step = 10, extra = '') => `<input type="number" data-k="${k}" value="${v}" step="${step}" ${extra}>`;
function renderProps(ed) {
  const host = ed.mode === 'site' ? $('#propsSite') : $('#propsPlan');
  const o = ed.obj(), k = ed.sel?.kind;
  let h = '';
  if (!o) h = ed.mode === 'site' ? siteSummary() : planSummary(ed);
  else if (k === 'room') {
    const a = o.w * o.d / 1e6, grp = roomGroups(ed.floor).find(g => g.list.includes(o)), grpA = grp && grp.list.length > 1 ? grp.area : 0;
    h = `<h3>部屋</h3><div class="stack">
      <label class="f">名前<input type="text" data-k="name" list="roomNames" value="${esc(o.name)}"></label>
      ${matSel('床', 'floor', FLOOR_MATS, o.floor)}
      ${isIn(o) ? `${matSel('壁紙', 'paper', WALLPAPERS, o.paper || '', `標準（${WALLPAPERS[plan().finish.wall].label}）`, plan().finish.wall)}
      <div class="pg"><label class="f">アクセントクロス<select data-k="accent"><option value="">なし</option>${Object.entries(DIRS).map(([k, l]) => `<option value="${k}"${o.accent === k ? ' selected' : ''}>${l}の壁</option>`).join('')}</select></label>
      ${o.accent ? `<label class="f">クロス<select data-k="accentPaper">${optList(WALLPAPERS, o.accentPaper || 'navy')}</select></label>` : ''}</div>
      ${matSel('天井', 'ceil', WALLPAPERS, o.ceil || '', `標準（${WALLPAPERS[plan().finish.ceil].label}）`, plan().finish.ceil)}` : ''}
      <div class="pg"><label class="f">横（東西）mm${nIn('w', o.w, 455, 'min="455"')}</label><label class="f">縦（南北）mm${nIn('d', o.d, 455, 'min="455"')}</label>
      <label class="f">左端 X${nIn('x', o.x, 455)}</label><label class="f">上端 Y${nIn('y', o.y, 455)}</label></div>
      <div class="calc"><b>${(a / TATAMI).toFixed(1)}帖</b>　${a.toFixed(2)}㎡${grpA ? `<br>つながった「${esc(o.name)}」全体：<b>${(grpA / TATAMI).toFixed(1)}帖</b>　${grpA.toFixed(2)}㎡` : ''}</div>
      ${isIn(o) ? '' : '<p class="hint">バルコニー・ポーチ・テラスは床面積に入れず、屋根もかけません。</p>'}
      <p class="hint">となりの部屋と同じ名前にすると、間の壁がなくなります（L字のLDKなど）。</p>
      <div class="acts"><button class="btn sm" data-act="walk">この部屋を3D内観で見る</button><button class="btn sm" data-act="rot">縦横を入れ替え</button><button class="btn sm" data-act="dup">複製</button><button class="btn sm danger" data-act="del">削除</button></div></div>`;
  } else if (k === 'opening') {
    h = `<h3>建具</h3><div class="stack">
      <label class="f">種類<select data-k="type">${optList(OPENINGS, o.type)}</select></label>
      <div class="pg"><label class="f">幅 mm${nIn('w', o.w, 10, 'min="300"')}</label><label class="f">高さ mm${nIn('h', o.h, 10, 'min="200"')}</label>
      <label class="f">床からの高さ mm${nIn('sill', o.sill, 10, 'min="0"')}</label></div>
      <p class="hint">ドラッグで同じ壁・別の壁へ動かせます。「開き方を変える」でドアの吊元・開く向きが変わります（R キーでも）。</p>
      <div class="acts"><button class="btn sm" data-act="rot">開き方を変える</button><button class="btn sm danger" data-act="del">削除</button></div></div>`;
  } else if (k === 'item' || k === 'ext') {
    const c = (k === 'ext' ? EXT : FURN)[o.type];
    h = `<h3>${esc(c.label)}</h3><div class="stack">
      <div class="pg"><label class="f">幅 mm${nIn('w', o.w, 10, 'min="20"')}</label><label class="f">奥行 mm${nIn('d', o.d, 10, 'min="20"')}</label>
      <label class="f">高さ mm${nIn('h', o.h, 10, 'min="0"')}</label><label class="f">向き（度）${nIn('rot', o.rot, 15)}</label></div>
      ${k === 'ext' && c.mat ? matSel('仕上げ', 'mat', PAVINGS, o.mat || c.mat) : ''}
      <label class="f">色<input type="color" data-k="color" value="${o.color || c.color}"></label>
      ${swatchRow('color', SWATCH.wood)}
      ${k === 'item' ? '<p class="hint">太い線の側が背中（壁につける側）です。</p>' : ''}
      <div class="acts"><button class="btn sm" data-act="rot">90°回す</button><button class="btn sm" data-act="dup">複製</button><button class="btn sm danger" data-act="del">削除</button></div></div>`;
  } else if (k === 'wall') {
    h = `<h3>壁（追加した壁）</h3><div class="stack"><div class="calc">長さ <b>${fmt(Math.hypot(o.x2 - o.x1, o.y2 - o.y1))}</b> mm</div>
      <p class="hint">部屋の外まわり・部屋どうしの境目の壁は自動でできます。ここで描いた壁は部屋の中の間仕切りです。</p>
      <div class="acts"><button class="btn sm" data-act="dup">複製</button><button class="btn sm danger" data-act="del">削除</button></div></div>`;
  }
  host.innerHTML = h + `<ul class="keys"><li>Delete：削除　R：回す　Ctrl+D：複製</li><li>Ctrl+Z：元に戻す　Esc：選択に戻る</li><li>スペース＋ドラッグ／右ドラッグ：画面移動</li></ul>`;
  host.querySelectorAll('[data-k]').forEach(el => el.addEventListener('change', () => {
    const o2 = ed.obj(); if (!o2) return;
    pushUndo();
    const key = el.dataset.k, old = o2[key];
    if (el.type === 'number') o2[key] = num(el.value, o2[key]);
    else o2[key] = el.value;
    if (key === 'name' && o2.floor === defaultFloor(old)) o2.floor = defaultFloor(el.value);
    if (k === 'opening' && key === 'type') { const c = OPENINGS[el.value]; Object.assign(o2, { w: c.w, h: c.h, sill: c.sill }); attachOpening(ed.floor, o2, o2.x, o2.y); }
    if (k === 'opening' && key === 'w') attachOpening(ed.floor, o2, o2.x, o2.y);
    if (k === 'ext' && EXT[o2.type]?.round && key === 'w') o2.d = o2.w;
    if (key === 'mat') o2.color = PAVINGS[o2.mat].color;
    if (key === 'accent' && o2.accent && !o2.accentPaper) o2.accentPaper = 'navy';
    if (key === 'name' && !o2.paper && defaultPaper(o2.name)) o2.paper = defaultPaper(o2.name);
    commit();
  }));
  host.querySelectorAll('[data-sw]').forEach(b => b.addEventListener('click', () => {
    const o2 = ed.obj(); if (!o2) return;
    pushUndo(); o2[b.dataset.sw] = b.dataset.c; commit();
  }));
  host.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'del') ed.del(); else if (a === 'rot') ed.rotate(); else if (a === 'dup') ed.duplicate();
    else if (a === 'walk') { const r = ed.obj(); showTab('int3d'); getView().goRoom(r, ed.fi); syncWalkSel(ed.fi, r.id); }
  }));
  host.querySelectorAll('tr[data-room]').forEach(tr => tr.addEventListener('click', () => ed.select({ kind: 'room', id: tr.dataset.room })));
}
function planSummary(ed) {
  const p = plan(), f = ed.floor;
  const rows = roomGroups(f).map(g => ({ r: g.main, a: g.area, n: g.list.length })).sort((a, b) => b.a - a.a);
  const total = p.floors.reduce((s, q) => s + floorArea(q), 0);
  return `<h3>${ed.fi + 1}階の部屋</h3>
    <table><tr><th>部屋</th><th class="r">帖</th><th class="r">㎡</th></tr>
    ${rows.map(({ r, a, n }) => `<tr class="click" data-room="${r.id}"><td>${esc(r.name)}${n > 1 ? `<span class="hint">（${n}つの四角）</span>` : ''}</td><td class="r">${isIn(r) ? (a / TATAMI).toFixed(1) : '—'}</td><td class="r">${a.toFixed(2)}</td></tr>`).join('') || '<tr><td colspan="3" class="hint">まだ部屋がありません。「部屋」を選んでドラッグで描きます。</td></tr>'}
    </table>
    <h3 style="margin-top:14px">床面積</h3>
    <table>${p.floors.map((q, i) => `<tr><td>${i + 1}階</td><td class="r">${floorArea(q).toFixed(2)}㎡</td><td class="r">${(floorArea(q) / TSUBO).toFixed(2)}坪</td></tr>`).join('')}
    <tr class="t"><td>延床面積</td><td class="r">${total.toFixed(2)}㎡</td><td class="r">${(total / TSUBO).toFixed(2)}坪</td></tr></table>
    <p class="hint">壁の中心線で計算した目安です（バルコニー等は除く）。</p>`;
}
function siteSummary() {
  const p = plan(), st = p.site, sa = st.w * st.d / 1e6;
  const foot = areaOf(rectsOf(p.floors.flatMap(f => f.rooms.filter(isIn))));
  const total = p.floors.reduce((s, q) => s + floorArea(q), 0);
  return `<h3>敷地と建物</h3>
    <table>
    <tr><td>敷地面積</td><td class="r">${sa.toFixed(2)}㎡</td><td class="r">${(sa / TSUBO).toFixed(2)}坪</td></tr>
    <tr><td>建築面積</td><td class="r">${foot.toFixed(2)}㎡</td><td class="r">${(foot / TSUBO).toFixed(2)}坪</td></tr>
    <tr><td>延床面積</td><td class="r">${total.toFixed(2)}㎡</td><td class="r">${(total / TSUBO).toFixed(2)}坪</td></tr>
    <tr class="t"><td>建ぺい率</td><td class="r" colspan="2">${(foot / sa * 100).toFixed(1)}%</td></tr>
    <tr class="t"><td>容積率</td><td class="r" colspan="2">${(total / sa * 100).toFixed(1)}%</td></tr>
    </table>
    <p class="hint">建築面積は各階の部屋を上から見た広さ（バルコニー・軒は除く）。用途地域の上限と比べる目安で、正式な数字は設計者に確認します。</p>
    <h3 style="margin-top:14px">外構の数</h3>
    <table>${Object.entries(p.ext.reduce((m, it) => (m[it.type] = (m[it.type] || 0) + 1, m), {})).map(([t, n]) => `<tr><td>${esc(EXT[t]?.label || t)}</td><td class="r">${n}</td></tr>`).join('') || '<tr><td class="hint">左の一覧から置きます</td></tr>'}</table>`;
}

/* ===== 画面の組み立て ===== */
let edPlan, edSite, view = null, dirty3d = true, curTab = 'plan';
function getView() {
  if (!view) { view = new View3D(); view.build(plan()); dirty3d = false; }
  else if (dirty3d) { view.build(plan()); dirty3d = false; }
  return view;
}
function commit() {
  save(); dirty3d = true;
  edPlan.draw(); edSite.draw();
  renderProps(edPlan); renderProps(edSite);
  if (view && (curTab === 'ext3d' || curTab === 'int3d')) getView();
}
function afterSwap() {
  // プランの切替・元に戻す の後
  const p = plan();
  for (const ed of [edPlan, edSite]) { if (ed.fi >= p.floors.length) ed.fi = 0; if (ed.sel && !ed.obj()) ed.sel = null; }
  renderPlanSel(); renderFloorSeg(); renderSettings(); commit();
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2400); }
function renderPlanSel() {
  $('#planSel').innerHTML = store.plans.map(p => `<option value="${p.id}"${p.id === store.cur ? ' selected' : ''}>${esc(p.name)}${p.client ? '（' + esc(p.client) + '様）' : ''}</option>`).join('');
}
function renderFloorSeg() {
  const p = plan();
  $('#floorSeg').innerHTML = p.floors.map((f, i) => `<button data-fi="${i}" class="${i === edPlan.fi ? 'on' : ''}">${i + 1}階</button>`).join('');
  $$('#floorSeg button').forEach(b => b.onclick = () => { edPlan.fi = +b.dataset.fi; edPlan.sel = null; renderFloorSeg(); renderProps(edPlan); edPlan.draw(); });
}
function showTab(t) {
  curTab = t;
  $$('nav.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
  $$('section.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + t));
  if (t === 'plan') { edPlan.resize(); }
  if (t === 'site') { edSite.resize(); renderProps(edSite); }
  if (t === 'ext3d' || t === 'int3d') {
    const v = getView();
    v.attach($(t === 'ext3d' ? '#host-ext' : '#host-int'), t === 'ext3d' ? 'orbit' : 'walk');
    if (t === 'ext3d') renderUpTo(); else syncWalkSel(v.walk.fi);
  } else if (view) view.detach();
  if (t === 'set') renderSettings();
}
function renderUpTo() {
  const p = plan(), sel = $('#upToSel'), cur = view ? view.opt.upTo : -1;
  sel.innerHTML = `<option value="-1">全体（屋根あり）</option>` + p.floors.map((f, i) => `<option value="${i}">${i + 1}階まで（上を外して中を見る）</option>`).join('');
  sel.value = String(cur < p.floors.length ? cur : -1);
}
function syncWalkSel(fi, roomId) {
  const p = plan();
  $('#walkFloorSel').innerHTML = p.floors.map((f, i) => `<option value="${i}"${i === fi ? ' selected' : ''}>${i + 1}階</option>`).join('');
  const rooms = (p.floors[fi] || p.floors[0]).rooms;
  $('#walkRoomSel').innerHTML = '<option value="">（選ぶ）</option>' + rooms.filter(r => r.name !== '階段').map(r => `<option value="${r.id}"${r.id === roomId ? ' selected' : ''}>${esc(r.name)}</option>`).join('');
}
function getPath(o, path) { return path.split('.').reduce((a, k) => a?.[k], o); }
function setPath(o, path, v) { const ks = path.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; }
function renderSettings() {
  const p = plan();
  $$('[data-s]').forEach(el => {
    const v = getPath(p, el.dataset.s);
    if (el.type === 'checkbox') el.checked = !!v; else el.value = v ?? '';
  });
  $('#floorHeights').innerHTML = p.floors.map((f, i) => `<h3>${i + 1}階</h3><div class="grid">
    <label class="f">階高（床〜上の階の床）<div class="u"><input type="number" data-fh="${i}" data-key="h" value="${f.h}" step="10"><span>mm</span></div></label>
    <label class="f">天井高<div class="u"><input type="number" data-fh="${i}" data-key="ceil" value="${f.ceil}" step="10"><span>mm</span></div></label></div>`).join('');
  $$('[data-fh]').forEach(el => el.onchange = () => {
    pushUndo(); const f = plan().floors[+el.dataset.fh];
    f[el.dataset.key] = clamp(num(el.value, f[el.dataset.key]), 1800, 6000);
    if (f.ceil > f.h - 200) f.ceil = f.h - 200;
    f.items.filter(it => it.type === 'stairs').forEach(it => it.h = f.h);
    commit(); renderSettings();
  });
  // 仕上げ材の見本
  const pick = (host, cat, cur, onPick, meters = 1.2) => {
    host.innerHTML = Object.entries(cat).map(([k, m]) => `<button type="button" class="mt${k === cur ? ' on' : ''}" data-mk="${k}"><img src="${patThumb(m.pat, m.color, 96, 64, meters)}" alt=""><span>${esc(m.label)}</span></button>`).join('');
    host.querySelectorAll('[data-mk]').forEach(b => b.onclick = () => { pushUndo(); onPick(b.dataset.mk); commit(); renderSettings(); });
  };
  pick($('#pkExt'), EXT_WALLS, p.finish.ext, k => { p.finish.ext = k; p.colors.extWall = EXT_WALLS[k].color; }, 1.6);
  pick($('#pkRoof'), ROOF_MATS, p.finish.roof, k => { p.finish.roof = k; p.colors.roof = ROOF_MATS[k].color; }, 1.4);
  pick($('#pkWall'), WALLPAPERS, p.finish.wall, k => { p.finish.wall = k; }, .9);
  pick($('#pkCeil'), WALLPAPERS, p.finish.ceil, k => { p.finish.ceil = k; }, .9);
  $('#floorExt').innerHTML = p.floors.map((f, i) => `<div class="row fext"><b>${i + 1}階</b>
    <select data-fe="${i}"><option value="">全体と同じ（${esc(EXT_WALLS[p.finish.ext].label)}）</option>${optList(EXT_WALLS, f.ext ? f.ext.key : '')}</select>
    ${f.ext ? `<img class="mthumb" src="${patThumb(EXT_WALLS[f.ext.key].pat, f.ext.color, 60, 30, 1.6)}" alt=""><input type="color" data-fec="${i}" value="${f.ext.color}">` : ''}</div>`).join('');
  $$('[data-fe]').forEach(el => el.onchange = () => { pushUndo(); const f = plan().floors[+el.dataset.fe]; f.ext = el.value ? { key: el.value, color: EXT_WALLS[el.value].color } : null; commit(); renderSettings(); });
  $$('[data-fec]').forEach(el => el.onchange = () => { pushUndo(); plan().floors[+el.dataset.fec].ext.color = el.value; commit(); renderSettings(); });
  const st = p.site, sa = st.w * st.d / 1e6;
  $('#siteCalc').textContent = `敷地面積 ${sa.toFixed(2)}㎡（${(sa / TSUBO).toFixed(2)}坪）`;
}

function exportJSON() {
  const p = plan();
  const blob = new Blob([JSON.stringify(p, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${p.createdOn || today()}_住宅プラン_${(p.client || p.name).replace(/[\\/:*?"<>|]/g, '')}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function importJSON(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const p = JSON.parse(fr.result);
      if (!p || !Array.isArray(p.floors) || !p.site) throw new Error('形式が違います');
      p.id = uid(); p.name = (p.name || '読み込んだプラン');
      ensurePlan(p);
      store.plans.push(p); store.cur = p.id; undoS = []; redoS = [];
      edPlan.fitted = edSite.fitted = false; afterSwap(); edPlan.fit(); edSite.fit(); toast('読み込みました');
    } catch (e) { toast('読み込めませんでした：' + e.message); }
  };
  fr.readAsText(file);
}

/* ===== 印刷 ===== */
function planImage(p, mode, fi, W = 2200, H = 1500) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  const st = p.site;
  let bb;
  if (mode === 'site') { const rr = roadRect(st); bb = { x: -3000, y: -3000, w: st.w + 6000, d: st.d + 6000 }; if (st.road === 'S') bb.d = st.d + 3000 + Math.min(rr.d, 6000) + 1500; }
  else { const b = bboxOf(p.floors[fi].rooms) || bboxOf(p.floors.flatMap(f => f.rooms)) || { x: 0, y: 0, w: st.w, d: st.d }; bb = { x: b.x - 3200, y: b.y - 3200, w: b.w + 4800, d: b.d + 4800 }; }
  const s = Math.min(W / bb.w, H / bb.d) * 0.98;
  const v = { s: s, ox: (W - bb.w * s) / 2 - bb.x * s, oy: (H - bb.d * s) / 2 - bb.y * s };
  ctx.scale(1, 1);
  // 文字が小さくなりすぎないよう、高解像度でも 1.6 倍の大きさで描く
  const k = 1.6;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  drawScene(ctx, W / k, H / k, { s: s / k, ox: v.ox / k, oy: v.oy / k }, p, mode, fi, { print: true });
  return cv.toDataURL('image/png');
}
async function printAll() {
  const p = plan();
  toast('図面を準備しています…');
  const pages = [];
  p.floors.forEach((f, i) => { if (f.rooms.length) pages.push({ t: `${i + 1}階 平面図`, img: planImage(p, 'plan', i) }); });
  pages.push({ t: '外構図（配置図）', img: planImage(p, 'site', 0) });
  try {
    const v = getView();
    pages.push({ t: '外観パース（南東から）', img: v.snapshotPreset('SE') });
    pages.push({ t: '外観パース（南西から）', img: v.snapshotPreset('SW') });
    pages.push({ t: '鳥瞰（1階の中）', img: v.snapshotPreset('SE', 0) });
  } catch (e) { console.warn(e); }
  const total = p.floors.reduce((s, q) => s + floorArea(q), 0);
  const meta = [p.client ? `${esc(p.client)} 様` : '', p.staff ? `担当 ${esc(p.staff)}` : '', p.createdOn ? `作成日 ${esc(p.createdOn)}` : ''].filter(Boolean).join('　');
  $('#printArea').innerHTML = pages.map((pg, i) => `<section class="pp"><header><h1>${esc(p.name)}</h1><div class="t">${esc(pg.t)}</div><div class="m">${meta}</div></header>
    <div class="im"><img src="${pg.img}" alt="${esc(pg.t)}"></div>
    <footer><span>延床面積 ${total.toFixed(2)}㎡（${(total / TSUBO).toFixed(2)}坪）　参考図・縮尺不定。設計図・施工図ではありません。</span><span>Livii　${i + 1}/${pages.length}</span></footer></section>`).join('');
  await Promise.all([...$('#printArea').querySelectorAll('img')].map(im => im.decode().catch(() => { })));
  window.print();
}

/* ===== 起動 ===== */
function startApp() {
  edPlan = new Editor($('#cvPlan'), 'plan');
  edSite = new Editor($('#cvSite'), 'site');
  $('#roomNameSel').innerHTML = ROOM_NAMES.map(n => `<option>${n}</option>`).join('');
  $('#roomNames').innerHTML = ROOM_NAMES.map(n => `<option value="${n}">`).join('');
  $('#opTools').innerHTML = Object.entries(OPENINGS).map(([k, c]) => `<button class="tool" data-tool="op:${k}">${esc(c.label)}</button>`).join('');
  const grouped = (cats, cat, pre) => cats.map((name, i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(name)}<span>${Object.values(cat).filter(c => c.cat === i).length}</span></summary><div class="tools-grid">${
    Object.entries(cat).filter(([, c]) => c.cat === i).map(([k, c]) => `<button class="tool" data-tool="${pre}:${k}">${esc(c.label)}</button>`).join('')}</div></details>`).join('');
  $('#fuTools').innerHTML = grouped(FURN_CATS, FURN, 'fu');
  $('#exTools').innerHTML = grouped(EXT_CATS, EXT, 'ex');
  for (const [ed, sec] of [[edPlan, '#tab-plan'], [edSite, '#tab-site']]) {
    $$(sec + ' [data-tool]').forEach(b => b.onclick = () => ed.setTool(ed.tool === b.dataset.tool ? 'select' : b.dataset.tool));
    $(sec + ' .gridSel').onchange = e => { ed.grid = +e.target.value; ed.draw(); };
    $(sec + ' .bFit').onclick = () => ed.fit();
    $(sec + ' .bUndo').onclick = undo;
    $(sec + ' .bRedo').onclick = redo;
    ed.setTool('select');
  }
  $$('nav.tabs button').forEach(b => b.onclick = () => showTab(b.dataset.tab));
  $('#planSel').onchange = e => { store.cur = e.target.value; undoS = []; redoS = []; edPlan.fitted = edSite.fitted = false; edPlan.fi = 0; afterSwap(); edPlan.fit(); edSite.fit(); };
  $('#bNew').onclick = () => {
    const sample = confirm('サンプル（2階建て4LDK）から始めますか？\n「キャンセル」で白紙から始めます。');
    const p = newPlan(sample); store.plans.push(p); store.cur = p.id; undoS = []; redoS = [];
    edPlan.fi = 0; edPlan.fitted = edSite.fitted = false; afterSwap(); edPlan.fit(); edSite.fit(); showTab(sample ? 'plan' : 'set');
  };
  $('#bDup').onclick = () => { const c = JSON.parse(JSON.stringify(plan())); c.id = uid(); c.name += '（コピー）'; store.plans.push(c); store.cur = c.id; undoS = []; redoS = []; afterSwap(); toast('複製しました'); };
  $('#bDel').onclick = () => {
    if (!confirm(`「${plan().name}」を削除しますか？（元に戻せません）`)) return;
    store.plans = store.plans.filter(p => p.id !== store.cur);
    if (!store.plans.length) store.plans.push(newPlan(true));
    store.cur = store.plans[0].id; undoS = []; redoS = []; edPlan.fitted = edSite.fitted = false; afterSwap(); edPlan.fit(); edSite.fit();
  };
  $('#bExport').onclick = exportJSON;
  $('#fImport').onchange = e => { if (e.target.files[0]) importJSON(e.target.files[0]); e.target.value = ''; };
  $('#bPrint').onclick = printAll;
  $('#bAddFloor').onclick = () => {
    const p = plan(); if (p.floors.length >= 4) return toast('4階までです');
    pushUndo(); p.floors.push(newFloor()); edPlan.fi = p.floors.length - 1; edPlan.sel = null; renderFloorSeg(); commit();
  };
  $('#bDelFloor').onclick = () => {
    const p = plan(); if (p.floors.length <= 1) return toast('1階は削除できません');
    if (!confirm(`${edPlan.fi + 1}階を削除しますか？`)) return;
    pushUndo(); p.floors.splice(edPlan.fi, 1); edPlan.fi = Math.max(0, edPlan.fi - 1); edPlan.sel = null; renderFloorSeg(); commit();
  };
  // 設定
  $$('[data-s]').forEach(el => el.addEventListener('change', () => {
    const p = plan(), path = el.dataset.s;
    pushUndo();
    let v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? num(el.value, getPath(p, path)) : el.value;
    if (path === 'site.w' || path === 'site.d') v = clamp(v, 3000, 200000);
    if (path === 'roof.pitch') v = clamp(v, .5, 10);
    setPath(p, path, v);
    if (path === 'name' || path === 'client') renderPlanSel();
    commit(); renderSettings();
    if (path.startsWith('site')) { edSite.fitted = false; }
  }));
  $('#schemeBtns').innerHTML = SCHEMES.map((s, i) => `<button class="scheme" data-sc="${i}"><span class="sch"><img src="${patThumb(ROOF_MATS[s.roof].pat, s.roofC, 64, 14, .9)}" alt=""><img src="${patThumb(EXT_WALLS[s.ext].pat, s.extWall, 64, 22, 1.2)}" alt="">${s.lower ? `<img src="${patThumb(EXT_WALLS[s.lower.key].pat, s.lower.color, 64, 22, 1.2)}" alt="">` : ''}</span>${esc(s.name)}</button>`).join('');
  $$('[data-sc]').forEach(b => b.onclick = () => {
    const s = SCHEMES[+b.dataset.sc], p = plan(); pushUndo();
    Object.assign(p.finish, { ext: s.ext, roof: s.roof }); Object.assign(p.colors, { extWall: s.extWall, roof: s.roofC, sash: s.sash });
    p.floors.forEach(f => f.ext = null);
    if (s.lower && p.floors.length > 1) p.floors[0].ext = { ...s.lower };
    commit(); renderSettings(); toast(`「${s.name}」にしました`);
  });
  $$('[data-swg]').forEach(el => { const k = el.dataset.swg.split('.')[1]; el.innerHTML = swatchBtns(el.dataset.swg, SWATCH[k === 'sash' ? 'sash' : k === 'entrance' ? 'entrance' : 'door'], 'data-swp'); });
  $$('[data-swp]').forEach(b => b.onclick = () => { pushUndo(); setPath(plan(), b.dataset.swp, b.dataset.c); commit(); renderSettings(); });
  // 3D の操作
  $$('[data-view]').forEach(b => b.onclick = () => getView().preset(b.dataset.view));
  $('#upToSel').onchange = e => { const v = getView(); v.opt.upTo = +e.target.value; v.applyVis(); };
  $('#seasonSel').onchange = e => { const v = getView(); v.opt.season = e.target.value; v.updateSun(); };
  const setHour = val => { const v = getView(); v.opt.hour = +val; v.updateSun(); const hh = Math.floor(val), mm = Math.round((val - hh) * 60); [$('#hourLbl'), $('#hourLbl2')].forEach(l => l.textContent = `${hh}:${pad2(mm)}`); $('#hourRng').value = val; $('#hourRng2').value = val; };
  $('#hourRng').oninput = e => setHour(e.target.value);
  $('#hourRng2').oninput = e => setHour(e.target.value);
  const shot = () => { const a = document.createElement('a'); a.href = getView().snapshot(); a.download = `${today()}_${plan().name}_パース.png`; a.click(); };
  $('#bShot1').onclick = shot; $('#bShot2').onclick = shot;
  $('#walkFloorSel').onchange = e => { const v = getView(), fi = +e.target.value; v.setWalkFloor(fi); syncWalkSel(fi); };
  $('#walkRoomSel').onchange = e => { const v = getView(), fi = +$('#walkFloorSel').value; const r = plan().floors[fi].rooms.find(q => q.id === e.target.value); if (r) v.goRoom(r, fi); };
  $$('#walkPad button').forEach(b => {
    const on = e => { e.preventDefault(); getView().pad.add(b.dataset.mv); };
    const off = () => getView().pad.delete(b.dataset.mv);
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
  // キーボード
  window.addEventListener('keydown', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'select', 'textarea'].includes(tag)) return;
    const ed = curTab === 'plan' ? edPlan : curTab === 'site' ? edSite : null;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (!ed) return;
    if (e.key === ' ') { ed.space = true; e.preventDefault(); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); ed.del(); }
    else if (e.key === 'Escape') { ed.setTool('select'); ed.select(null); }
    else if (e.key.toLowerCase() === 'r') ed.rotate();
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); ed.duplicate(); }
  });
  window.addEventListener('keyup', e => { if (e.key === ' ') { edPlan.space = edSite.space = false; } });
  renderPlanSel(); renderFloorSeg(); renderSettings(); renderProps(edPlan); renderProps(edSite);
  showTab('plan');
}
