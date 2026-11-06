/* Livii 住宅プラン — メーカー商品（各分野の国内上位メーカーの代表シリーズ）。
   ・柄と色はプログラムで描いた「近似の見本」。実物の色・品番・最新のラインナップは必ず各社の電子カタログで確認する。
   ・メーカー名・シリーズ名は、お客様への説明や仕様書に書くためのもの。ロゴや写真は使わない。
   ・シェアの順位は業界資料・各社資料からの目安（年度により入れ替わる）。 */
'use strict';

/* ===== 追加の模様 ===== */
Object.assign(PATS, {
  // 窯業系サイディング（フラット）：横目地 455mm・縦目地 3030mm
  sidingPanel: { tw: 1.515, th: .91, draw(c, tw, th, col, R) {
    c.fillStyle = col; c.fillRect(0, 0, tw, th); speck(c, tw, th, R, 4000, col, .05, .003); blotch(c, tw, th, R, 40, col, .025, .05, .2);
    c.fillStyle = shade(col, -.3); c.fillRect(0, .452, tw, .006); c.fillRect(0, 0, tw, .006);
    c.fillStyle = shade(col, -.2); c.fillRect(0, 0, .008, th);
  } },
  // シーリングレス（目地がほとんど見えない）
  fuge: { tw: 1.82, th: .91, draw(c, tw, th, col, R) {
    c.fillStyle = col; c.fillRect(0, 0, tw, th); blotch(c, tw, th, R, 60, col, .03, .05, .25); speck(c, tw, th, R, 5000, col, .05, .003);
    c.fillStyle = shade(col, -.1); c.fillRect(0, .453, tw, .002);
  } },
  // 金属屋根の横葺き（段ごとの影）
  yokobuki: { tw: .91, th: .5, draw(c, tw, th, col, R) {
    for (let i = 0; i < 2; i++) {
      const y = i * .25, g = c.createLinearGradient(0, y, 0, y + .25);
      g.addColorStop(0, shade(col, .1)); g.addColorStop(.75, shade(col, -.02)); g.addColorStop(.92, shade(col, -.1)); g.addColorStop(1, shade(col, -.45));
      c.fillStyle = g; c.fillRect(0, y, tw, .25);
    }
    speck(c, tw, th, R, 2500, col, .06, .003);
    c.fillStyle = shade(col, -.25); c.fillRect(R() * tw, 0, .004, .25); c.fillRect(R() * tw, .25, .004, .25);
  } },
  // 刷毛引きコンクリート（細い平行の筋＋目地）
  brushConc: { tw: 1.8, th: 1.8, draw(c, tw, th, col, R) {
    c.fillStyle = col; c.fillRect(0, 0, tw, th); blotch(c, tw, th, R, 120, col, .04, .05, .3);
    c.lineWidth = .0025;
    for (let y = 0; y < th; y += .006 + R() * .006) { c.strokeStyle = shadeA(col, (R() - .5) * .25, .6); c.beginPath(); c.moveTo(0, y); c.lineTo(tw, y + (R() - .5) * .004); c.stroke(); }
    speck(c, tw, th, R, 6000, col, .08, .003);
    c.fillStyle = shade(col, -.4); c.fillRect(0, 0, tw, .012); c.fillRect(0, 0, .012, th);
  } },
  // 舗装ブロック 600×300（りゃんこ貼り）
  paver: { tw: 1.2, th: .6, draw(c, tw, th, col, R) { bond(c, tw, th, col, R, .6, .3, .006, .06, shade(col, -.3)); blotch(c, tw, th, R, 50, col, .04, .04, .15); speck(c, tw, th, R, 5000, col, .07, .003); } },
});

/* ===== 仕上げ材の商品 ===== maker：メーカー、series：シリーズ名、label：柄・色（近似） */
const addMat = (cat, list) => list.forEach(([key, maker, series, label, pat, color]) => { cat[key] = { maker, series, label: `${series}（${label}）`, pat, color }; });

// 外壁：窯業系サイディングはニチハ・ケイミューの2社で国内の大半。金属サイディングはアイジー工業が大手
addMat(EXT_WALLS, [
  ['nh_moen_flat', 'ニチハ', 'モエンエクセラード16', 'フラット・ホワイト系', 'sidingPanel', '#ecebe6'],
  ['nh_moen_stone', 'ニチハ', 'モエンエクセラード16', '石積調・ベージュ系', 'stone', '#cbbba4'],
  ['nh_moen_brick', 'ニチハ', 'モエンエクセラード16', 'レンガ調・ブラウン系', 'brick', '#8e5a45'],
  ['nh_moen_wood', 'ニチハ', 'モエンエクセラード16', '木目調・ナチュラル系', 'woodV', '#a27b55'],
  ['nh_moen_stripe', 'ニチハ', 'モエンエクセラード16', 'ストライプ・ブラック系', 'lapV', '#3a3b3d'],
  ['nh_fuge_flat', 'ニチハ', 'Fu-ge（シーリングレス）', 'フラット・ホワイト系', 'fuge', '#efeeea'],
  ['nh_fuge_tile', 'ニチハ', 'Fu-ge（シーリングレス）', 'タイル調・グレー系', 'tile2', '#7b7c7c'],
  ['km_hk_flat', 'ケイミュー', '光セラ', 'フラット・ホワイト系', 'sidingPanel', '#f0efea'],
  ['km_hk_tile', 'ケイミュー', '光セラ', 'タイル調・ダーク系', 'tile2', '#4b4a49'],
  ['km_hk_stone', 'ケイミュー', '光セラ', '石調・グレージュ系', 'stone', '#b7ada0'],
  ['km_hk_brick', 'ケイミュー', '光セラ', 'レンガ調・テラコッタ系', 'brick', '#a4624a'],
  ['km_hk_wood', 'ケイミュー', '光セラ', '木目調・ダーク系', 'woodV', '#6c4d37'],
  ['km_hk_stripe', 'ケイミュー', '光セラ', 'ストライプ・ネイビー系', 'lapV', '#34405a'],
  ['ig_galspan_k', 'アイジー工業', 'ガルスパン（金属）', '角波・ブラック系', 'rib', '#2f3133'],
  ['ig_galspan_s', 'アイジー工業', 'ガルスパン（金属）', 'スパンドレル・シルバー系', 'spandrel', '#9a9ea2'],
]);
// 屋根：化粧スレートはケイミューが国内最大手。金属屋根はアイジー工業・ニチハなど。瓦は三州瓦の鶴弥が大手
addMat(ROOF_MATS, [
  ['km_quad_bk', 'ケイミュー', 'カラーベスト コロニアルクァッド', 'ブラック系', 'slate', '#2f3135'],
  ['km_quad_br', 'ケイミュー', 'カラーベスト コロニアルクァッド', 'ブラウン系', 'slate', '#5a4637'],
  ['km_quad_gr', 'ケイミュー', 'カラーベスト コロニアルクァッド', 'グリーン系', 'slate', '#3e4c41'],
  ['km_glassa_bk', 'ケイミュー', 'カラーベスト コロニアルグラッサ', 'ブラック系', 'slate', '#28292c'],
  ['km_glassa_gy', 'ケイミュー', 'カラーベスト コロニアルグラッサ', 'グレー系', 'slate', '#5c6064'],
  ['km_rooga_m', 'ケイミュー', 'ROOGA（軽量瓦）', '雅・いぶし系', 'kawara', '#5b6067'],
  ['km_rooga_t', 'ケイミュー', 'ROOGA（軽量瓦）', '鉄平・ブラック系', 'flatTile', '#2f3033'],
  ['nh_yokodan_bk', 'ニチハ', '横暖ルーフ（金属）', 'ブラック系', 'yokobuki', '#2b2c2e'],
  ['nh_yokodan_br', 'ニチハ', '横暖ルーフ（金属）', 'ブラウン系', 'yokobuki', '#4d3c31'],
  ['nh_yokodan_gy', 'ニチハ', '横暖ルーフ（金属）', 'グレー系', 'yokobuki', '#6b6e71'],
  ['ig_galtect_bk', 'アイジー工業', 'スーパーガルテクト（金属）', 'ブラック系', 'yokobuki', '#2a2b2d'],
  ['ig_galtect_gn', 'アイジー工業', 'スーパーガルテクト（金属）', 'グリーン系', 'yokobuki', '#3d4a40'],
  ['tr_supertri', '鶴弥', 'スーパートライ110（平板瓦）', 'ブラック系', 'flatTile', '#2d2e31'],
]);
// 壁紙：サンゲツ・リリカラが大手。シリーズの品番は見本帳で選ぶ
addMat(WALLPAPERS, [
  ['sg_sp_white', 'サンゲツ', 'SP（量産）', '白・織物調', 'weave', '#f4f2ed'],
  ['sg_sp_ivory', 'サンゲツ', 'SP（量産）', 'アイボリー・石目調', 'stone', '#ece5d6'],
  ['sg_fine_conc', 'サンゲツ', 'ファイン', 'コンクリート調', 'concrete', '#b6b4ae'],
  ['sg_fine_wood', 'サンゲツ', 'ファイン', '木目調・ナチュラル', 'woodV', '#b8936b'],
  ['sg_fine_brick', 'サンゲツ', 'ファイン', 'レンガ調・ホワイト', 'brickW', '#efebe4'],
  ['sg_rs_navy', 'サンゲツ', 'リザーブ', '無地・ネイビー', 'weave', '#36445f'],
  ['sg_rs_greige', 'サンゲツ', 'リザーブ', '無地・グレージュ', 'weave', '#cfc6b9'],
  ['sg_rs_bota', 'サンゲツ', 'リザーブ', 'ボタニカル柄', 'leaf', '#e9ede4'],
  ['ll_light_white', 'リリカラ', 'ライト（量産）', '白・織物調', 'weave', '#f3f1ec'],
  ['ll_light_beige', 'リリカラ', 'ライト（量産）', 'ベージュ・織物調', 'weave', '#e8dfcf'],
  ['ll_vw_charcoal', 'リリカラ', 'V-wall', '無地・チャコール', 'weave', '#4f5154'],
  ['ll_vw_sage', 'リリカラ', 'V-wall', '無地・くすみグリーン', 'weave', '#a2b09c'],
  ['ll_lv_stripe', 'リリカラ', 'LV', 'ストライプ', 'stripe', '#e7e1d5'],
  ['ll_lv_washi', 'リリカラ', 'LV', '和紙調', 'washi', '#e8dfc8'],
]);
// 床：複合フローリングは大建工業・永大産業が上位。CF はサンゲツ・東リ。和紙畳は大建工業
addMat(FLOOR_MATS, [
  ['dk_trinity_oak', '大建工業', 'トリニティ', 'オーク・ナチュラル', 'plank', '#c59c71'],
  ['dk_trinity_wal', '大建工業', 'トリニティ', 'ウォールナット', 'plank', '#6a4b35'],
  ['dk_hapia_white', '大建工業', 'hapia フロア', 'ホワイト系', 'plank', '#e4dacb'],
  ['dk_hapia_greige', '大建工業', 'hapia フロア', 'グレージュ系', 'plank', '#b5a896'],
  ['dk_sukoyaka', '大建工業', '健やかおもて（和紙畳）', '銀白系', 'tatamiHalf', '#cdcbb8'],
  ['dk_sukoyaka_g', '大建工業', '健やかおもて（和紙畳）', '若草系', 'tatami', '#c4c48b'],
  ['ei_skism_oak', '永大産業', 'スキスムS', 'オーク・ナチュラル', 'plank', '#c8a57d'],
  ['ei_skism_ch', '永大産業', 'スキスムS', 'チェリー', 'plank', '#ab6e4a'],
  ['ei_skism_wh', '永大産業', 'スキスムS', 'ホワイトオーク', 'plank', '#ddd1bf'],
  ['pa_veritis', 'パナソニック', 'ベリティス フロアー', 'ナチュラル', 'plank', '#c09a72'],
  ['sg_hfloor_st', 'サンゲツ', 'Hフロア（CF）', '石目・ホワイト', 'marble', '#ebe9e4'],
  ['sg_hfloor_wd', 'サンゲツ', 'Hフロア（CF）', '木目・ナチュラル', 'plank', '#c7a47e'],
  ['tl_cf_tile', '東リ', 'CFシート（CF）', 'タイル調・グレー', 'tile300', '#bdbab3'],
  ['lx_tile600', 'LIXIL', '床タイル（600角）', '石調・ベージュ', 'tile600', '#cfc6b8'],
]);
// 舗装
addMat(PAVINGS, [
  ['brushConc', '一般', '土間コンクリート', '刷毛引き', 'brushConc', '#c9c7c1'],
  ['ty_salto', '東洋工業', 'サルトペイブ（600×300）', 'オフホワイト', 'paver', '#dcd8cf'],
  ['ty_salto_gy', '東洋工業', 'サルトペイブ（600×300）', 'グレー', 'paver', '#a9a7a2'],
  ['lx_deck', 'LIXIL', '樹ら楽ステージ（人工木デッキ）', 'ブラウン系', 'deck', '#7d5c45'],
  ['yk_deck', 'YKK AP', 'リウッドデッキ200（人工木デッキ）', 'ナチュラル系', 'deck', '#a17a58'],
]);

/* ===== エクステリア・住宅設備の商品（家具・外構の「商品」で選ぶ） ===== */
const LX_ALU = [['ブラック', '#262626'], ['シャイングレー', '#5f6267'], ['ステンカラー', '#7f786b'], ['オータムブラウン', '#4b3a2e'], ['ナチュラルシルバー', '#b9bcbe']];
const YK_ALU = [['カームブラック', '#2a2a2b'], ['プラチナステン', '#8b8a84'], ['ショコラウォールナット', '#4a3326'], ['キャラメルチーク', '#9b6a42'], ['ハニーチェリー', '#a5643c'], ['桑炭', '#3b3530']];
const WHITE = [['ホワイト', '#f4f4f2'], ['ベージュ', '#e9e1d2'], ['グレー', '#b9bab8']];
const KITCHEN = [['ホワイト', '#f2f0eb'], ['木目ナチュラル', '#c49a6c'], ['木目ダーク', '#5a4232'], ['グレー', '#8a8d90'], ['ブラック', '#2e2e2e']];
// type：家具・外構の種類（FURN / EXT のキー）。最初の行がその種類の代表
const PRODUCTS = {
  carport:    [['LIXIL', 'カーポートSC（1台用）', LX_ALU], ['YKK AP', 'エフルージュ FIRST（1台用）', YK_ALU]],
  carport2:   [['LIXIL', 'カーポートSC（2台用）', LX_ALU], ['LIXIL', 'カーポートSW（2台用）', LX_ALU], ['YKK AP', 'エフルージュ FIRST（2台用）', YK_ALU]],
  terraceRoof:[['LIXIL', 'スピーネ（テラス屋根）', LX_ALU], ['YKK AP', 'ソラリア（テラス屋根）', YK_ALU]],
  cycleport:  [['LIXIL', 'サイクルポート（各シリーズ）', LX_ALU], ['YKK AP', 'サイクルポート（各シリーズ）', YK_ALU]],
  fence:      [['LIXIL', 'フェンスAB YS3型（横スリット）', LX_ALU], ['YKK AP', 'ルシアスフェンス F04型（横板）', YK_ALU]],
  fenceTall:  [['LIXIL', 'ハイグリッドフェンス UF8型（目隠し）', LX_ALU], ['YKK AP', 'ルシアスフェンス F04型（目隠し・高尺）', YK_ALU]],
  meshFence:  [['LIXIL', 'メッシュフェンス（スチール）', [['ブラウン', '#4b3a2e'], ['グリーン', '#4f5a52']]], ['YKK AP', 'イーネットフェンス（スチール）', [['ブラウン', '#4b3a2e'], ['グリーン', '#4f5a52']]]],
  blockFence: [['LIXIL', 'フェンスAB YS3型＋ブロック', LX_ALU], ['YKK AP', 'シンプレオフェンス＋ブロック', YK_ALU]],
  gate:       [['LIXIL', '開き門扉AB', LX_ALU], ['YKK AP', 'シンプレオ門扉', YK_ALU]],
  funcpost:   [['LIXIL', 'ファンクションユニット（機能門柱）', LX_ALU], ['YKK AP', 'シンプレオ ポストユニット（機能門柱）', YK_ALU]],
  mailbox:    [['LIXIL', 'エクスポスト（スタンド）', LX_ALU], ['パナソニック', 'サインポスト（スタンド）', [['ブラック', '#2b2b2b'], ['ステンレス', '#a8abae']]]],
  delivery:   [['パナソニック', '宅配ボックス COMBO', [['エイジングブラウン', '#5a4a3e'], ['マットブラック', '#2b2b2b'], ['ステンシルバー', '#a8abae']]], ['LIXIL', '宅配ボックス（スタンドタイプ）', LX_ALU]],
  poleLight:  [['LIXIL', 'スパイクスポットライト／ポールライト（美彩）', [['ブラック', '#262626'], ['オフブラック', '#3a3a38']]], ['パナソニック', 'エクステリアライト', [['ブラック', '#262626'], ['シルバー', '#a8abae']]]],
  deck:       [['LIXIL', '樹ら楽ステージ（人工木デッキ）', [['ブラウン系', '#7d5c45'], ['ナチュラル系', '#a3825f'], ['グレー系', '#8a8780']]], ['YKK AP', 'リウッドデッキ200（人工木デッキ）', [['ナチュラル系', '#a17a58'], ['ダーク系', '#5a4232'], ['グレー系', '#8b8781']]]],
  storage:    [['イナバ物置', 'シンプリー', [['ホワイト', '#e9ebec'], ['ブラウン', '#6e5a48'], ['グリーン', '#5f7462']]], ['ヨド物置', 'エルモ', [['ホワイト', '#e9ebec'], ['ブラウン', '#6e5a48']]]],
  approach:   [['東洋工業', 'サルトペイブ（600×300）', [['オフホワイト', '#dcd8cf'], ['グレー', '#a9a7a2']]]],
  kitchen:    [['LIXIL', 'シエラS（壁付けI型）', KITCHEN], ['パナソニック', 'ラクシーナ（壁付けI型）', KITCHEN], ['クリナップ', 'ステディア（壁付けI型）', KITCHEN]],
  island:     [['LIXIL', 'リシェルSI（対面I型）', KITCHEN], ['パナソニック', 'ラクシーナ（対面I型）', KITCHEN], ['クリナップ', 'ステディア（対面I型）', KITCHEN]],
  kitchenL:   [['LIXIL', 'シエラS（L型）', KITCHEN], ['パナソニック', 'ラクシーナ（L型）', KITCHEN]],
  islandFree: [['LIXIL', 'リシェルSI（アイランド）', KITCHEN], ['パナソニック', 'L-CLASS（アイランド）', KITCHEN]],
  unitbath:   [['TOTO', 'サザナ（1616）', WHITE], ['LIXIL', 'リデア（1616）', WHITE], ['パナソニック', 'オフローラ（1616）', WHITE]],
  toilet:     [['TOTO', 'ピュアレストQR＋ウォシュレット', WHITE], ['LIXIL', 'アメージュ シャワートイレ', WHITE]],
  toiletTl:   [['TOTO', 'ネオレスト', WHITE], ['LIXIL', 'サティス', WHITE], ['パナソニック', 'アラウーノ', WHITE]],
  basin:      [['TOTO', 'オクターブ（750）', WHITE], ['LIXIL', 'ピアラ（750）', WHITE]],
  basin2:     [['TOTO', 'オクターブ（1500・2ボウル）', WHITE], ['LIXIL', 'ルミシス（1500）', WHITE]],
  stairs:     [['大建工業', 'リビング階段・ステップ材', [['ナチュラル', '#c49a6c'], ['ダーク', '#5a4232'], ['ホワイト', '#e4dacb']]], ['パナソニック', 'ベリティス 階段セット', [['ナチュラル', '#c09a72'], ['ダーク', '#5a4232']]]],
};
// 設定画面で選ぶ商品（サッシ・玄関ドア・室内ドア）
const SET_PRODUCTS = {
  sash:     [['YKK AP', 'APW330（樹脂窓）', [['ブラック', '#2b2b2b'], ['プラチナステン', '#8b8a84'], ['ホワイト', '#eeeeec'], ['ブラウン', '#4a3a30']]],
             ['LIXIL', 'サーモスX（アルミ樹脂複合）', [['ブラック', '#262626'], ['シャイングレー', '#5f6267'], ['ステンカラー', '#7f786b'], ['ホワイト', '#eeeeec']]]],
  entrance: [['LIXIL', 'ジエスタ2（玄関ドア）', [['ブラック', '#2e2c2a'], ['チーク調', '#8d5f3b'], ['ウォールナット調', '#4e3829'], ['シャイングレー', '#5f6267']]],
             ['YKK AP', 'ヴェナート D30（玄関ドア）', [['カームブラック', '#2a2a2b'], ['キャラメルチーク', '#9b6a42'], ['ショコラウォールナット', '#4a3326'], ['プラチナステン', '#8b8a84']]]],
  door:     [['大建工業', 'hapia（室内ドア）', [['ナチュラル', '#c49a6c'], ['ホワイト', '#f1efea'], ['ダーク', '#5a4232'], ['グレー', '#9a9a96']]],
             ['パナソニック', 'ベリティス（室内ドア）', [['ナチュラル', '#c09a72'], ['ホワイト', '#f1efea'], ['ダーク', '#5a4232']]]],
};
const productName = pr => pr ? `${pr.maker} ${pr.name}${pr.color ? ' ' + pr.color : ''}` : '';
const matName = m => m ? (m.maker ? `${m.maker} ${m.label}` : m.label) : '';
// カタログをメーカーごとに分けた <optgroup>
function optGroups(cat, cur) {
  const g = new Map();
  for (const [k, m] of Object.entries(cat)) { const mk = m.maker || '一般（汎用）'; if (!g.has(mk)) g.set(mk, []); g.get(mk).push([k, m]); }
  return [...g].map(([mk, list]) => `<optgroup label="${esc(mk)}">${list.map(([k, m]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${esc(m.label)}</option>`).join('')}</optgroup>`).join('');
}

/* ===== 車（トヨタ車）=====
   寸法は全長×全幅×全高の目安（mm。グレード・年式で変わる）。形は車の種類ごとの簡単なシルエット。 */
const CAR_CATS = ['軽自動車', '軽バン・軽トラック', 'コンパクトカー', 'ミニバン', 'セダン・ハッチバック', 'SUV', 'スポーツカー', '商用車'];
const CARS = {
  pixis_epoch:  { cat: 0, name: 'ピクシス エポック',          L: 3395, W: 1475, H: 1500, body: 'kei' },
  pixis_van:    { cat: 1, name: 'ピクシス バン',              L: 3395, W: 1475, H: 1890, body: 'keivan' },
  pixis_truck:  { cat: 1, name: 'ピクシス トラック',          L: 3395, W: 1475, H: 1780, body: 'truck' },
  yaris:        { cat: 2, name: 'ヤリス',                     L: 3940, W: 1695, H: 1500, body: 'compact' },
  aqua:         { cat: 2, name: 'アクア',                     L: 4050, W: 1695, H: 1485, body: 'compact' },
  roomy:        { cat: 2, name: 'ルーミー',                   L: 3700, W: 1670, H: 1735, body: 'tall' },
  sienta:       { cat: 3, name: 'シエンタ',                   L: 4260, W: 1695, H: 1695, body: 'minivan' },
  noah:         { cat: 3, name: 'ノア',                       L: 4695, W: 1730, H: 1895, body: 'minivan' },
  voxy:         { cat: 3, name: 'ヴォクシー',                 L: 4695, W: 1730, H: 1895, body: 'minivan' },
  alphard:      { cat: 3, name: 'アルファード',               L: 4995, W: 1850, H: 1935, body: 'minivan' },
  corolla:      { cat: 4, name: 'カローラ（セダン）',         L: 4495, W: 1745, H: 1435, body: 'sedan' },
  prius:        { cat: 4, name: 'プリウス',                   L: 4600, W: 1780, H: 1430, body: 'fastback' },
  crown:        { cat: 4, name: 'クラウン（クロスオーバー）', L: 4930, W: 1840, H: 1540, body: 'sedan' },
  raize:        { cat: 5, name: 'ライズ',                     L: 3995, W: 1695, H: 1620, body: 'suv' },
  yariscross:   { cat: 5, name: 'ヤリス クロス',              L: 4180, W: 1765, H: 1590, body: 'suv' },
  corollacross: { cat: 5, name: 'カローラ クロス',            L: 4490, W: 1825, H: 1620, body: 'suv' },
  rav4:         { cat: 5, name: 'RAV4',                       L: 4600, W: 1855, H: 1685, body: 'suv' },
  harrier:      { cat: 5, name: 'ハリアー',                   L: 4740, W: 1855, H: 1660, body: 'suv' },
  landcruiser:  { cat: 5, name: 'ランドクルーザー 300',       L: 4985, W: 1980, H: 1925, body: 'suvbox' },
  gr86:         { cat: 6, name: 'GR86',                       L: 4265, W: 1775, H: 1310, body: 'sports' },
  supra:        { cat: 6, name: 'GRスープラ',                 L: 4380, W: 1865, H: 1295, body: 'sports' },
  gryaris:      { cat: 6, name: 'GRヤリス',                   L: 3995, W: 1805, H: 1455, body: 'compact' },
  probox:       { cat: 7, name: 'プロボックス',               L: 4245, W: 1690, H: 1525, body: 'wagon' },
  hiace:        { cat: 7, name: 'ハイエース（標準ボディ）',   L: 4695, W: 1695, H: 1980, body: 'van' },
};
const CAR_COLORS = [['ホワイトパール', '#f1f0ec'], ['ブラック', '#1d1e20'], ['シルバー', '#b8bcc0'], ['グレー', '#6e7276'], ['レッド', '#a3201e'], ['ブルー', '#2c4f86'], ['ベージュ', '#cdbb9a'], ['カーキ', '#6f6b55']];
// 車の形（m）。cl：最低地上高、belt：窓の下の高さ、hood：ボンネットの長さ、hoodH：ボンネットの高さ
// rear：後ろの窓が始まる位置（後端から）、rearTop：屋根が始まる位置（後端から）、ws：フロントガラスの水平の長さ、r：タイヤ半径
const CAR_BODIES = {
  kei:      { cl: .15, belt: .92, hood: .45, hoodH: .82, rear: .06, rearTop: .14, ws: .55, r: .28 },
  keivan:   { cl: .16, belt: .98, hood: .22, hoodH: .9,  rear: .03, rearTop: .06, ws: .35, r: .27 },
  truck:    { cl: .18, belt: .98, hood: .22, hoodH: .9,  rear: .03, rearTop: .06, ws: .35, r: .27, bed: 1.95 },
  tall:     { cl: .15, belt: .95, hood: .5,  hoodH: .85, rear: .06, rearTop: .14, ws: .6,  r: .3 },
  compact:  { cl: .14, belt: .9,  hood: .75, hoodH: .78, rear: .12, rearTop: .45, ws: .75, r: .31 },
  minivan:  { cl: .15, belt: 1.0, hood: .65, hoodH: .95, rear: .06, rearTop: .14, ws: .7,  r: .32 },
  sedan:    { cl: .14, belt: .88, hood: 1.05, hoodH: .78, rear: .75, rearTop: 1.35, ws: .8, r: .32, deck: 1 },
  fastback: { cl: .13, belt: .86, hood: 1.0, hoodH: .74, rear: .25, rearTop: 1.45, ws: .9,  r: .32, deck: 1 },
  suv:      { cl: .2,  belt: 1.02, hood: .95, hoodH: .98, rear: .12, rearTop: .4, ws: .75, r: .36 },
  suvbox:   { cl: .23, belt: 1.12, hood: 1.0, hoodH: 1.1, rear: .05, rearTop: .1,  ws: .6,  r: .38 },
  sports:   { cl: .11, belt: .78, hood: 1.25, hoodH: .7, rear: .3,  rearTop: 1.35, ws: .85, r: .32, deck: 1 },
  wagon:    { cl: .15, belt: .9,  hood: .85, hoodH: .82, rear: .05, rearTop: .12, ws: .75, r: .3 },
  van:      { cl: .18, belt: 1.1, hood: .05, hoodH: 1.05, rear: .03, rearTop: .05, ws: .25, r: .32 },
};
function carOptions(cur) {
  return CAR_CATS.map((cn, i) => `<optgroup label="${esc(cn)}">${Object.entries(CARS).filter(([, c]) => c.cat === i).map(([k, c]) => `<option value="${k}"${k === cur ? ' selected' : ''}>トヨタ ${esc(c.name)}（${fmt(c.L)}×${fmt(c.W)}×${fmt(c.H)}）</option>`).join('')}</optgroup>`).join('');
}
