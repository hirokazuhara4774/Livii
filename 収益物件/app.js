/* Livii 収益物件シミュレーション — 計算と画面。金額の単位はすべて「万円」。 */
'use strict';

/* ===== 目安の数字（税制が変わったらここを直す） ===== */
const LIFE = { // 建物（住宅用）の法定耐用年数
  '木造': 22,
  '軽量鉄骨（骨格3mm以下）': 19,
  '軽量鉄骨（骨格3〜4mm）': 27,
  '重量鉄骨（骨格4mm超）': 34,
  'RC・SRC': 47,
};
const CAP_TAX_LONG = 20.315;   // 譲渡所得の税率（長期・所有5年超）所得税15%＋復興税0.315%＋住民税5%
const CAP_TAX_SHORT = 39.63;   // 譲渡所得の税率（短期・所有5年以下）所得税30%＋復興税0.63%＋住民税9%
const LONG_FROM = 6;           // 売却が「◯年目の末」以降なら長期とみなす（1月1日時点で5年超の判定を安全側に）
const CORP_CARRY = 10;         // 法人の欠損金くり越し年数
// 修繕計画の目安（1戸あたりの費用・万円、間隔・年）。「目安を入れる」で 戸数をかけて入れる。
// whole: 建物全体の工事（区分マンションでは修繕積立金でまかなうので入れない）
const REPAIR_GUIDE = {
  wood: [ // 木造・軽量鉄骨
    { name: '外壁塗装・シーリング', unit: 25, cycle: 12, whole: true },
    { name: '屋根・バルコニー防水', unit: 12, cycle: 15, whole: true },
    { name: '鉄部塗装・共用部', unit: 5, cycle: 6, whole: true },
    { name: '給排水管の更新', unit: 20, cycle: 30, whole: true },
    { name: '給湯器の交換', unit: 15, cycle: 12 },
    { name: 'エアコンの交換', unit: 12, cycle: 12 },
    { name: 'キッチン・浴室・トイレの交換', unit: 50, cycle: 25 },
  ],
  rc: [ // 重量鉄骨・RC
    { name: '大規模修繕（外壁・屋上防水）', unit: 60, cycle: 15, whole: true },
    { name: '鉄部塗装・共用部', unit: 5, cycle: 6, whole: true },
    { name: 'エレベーター・給水ポンプなど', unit: 10, cycle: 15, whole: true },
    { name: '給排水管の更新', unit: 30, cycle: 30, whole: true },
    { name: '給湯器の交換', unit: 15, cycle: 12 },
    { name: 'エアコンの交換', unit: 12, cycle: 12 },
    { name: 'キッチン・浴室・トイレの交換', unit: 50, cycle: 25 },
  ],
};
const MILESTONES = [1, 10, 20, 30]; // 「購入後〜30年後」で見る年目

/* ===== データ ===== */
const KEY = 'livii-income-property-v1';
const Y0 = new Date().getFullYear();
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const num = v => (v === '' || v == null || isNaN(+v)) ? 0 : +v;

function newPlan(sample) {
  const p = {
    id: uid(), name: sample ? 'サンプル アパート' : '新しい物件', client: '', staff: '', createdOn: today(), memo: '',
    address: '', kind: '一棟アパート', structure: '木造', age: 15, units: 8, startYear: Y0,
    price: 6000, building: 2400, costRate: 7,
    own: 1000, rate: 2.0, years: 25, method: '元利均等', reprice: false, repriceYear: 6, repriceRate: 3.0,
    rent: 42, otherRent: 1, vacancy: 8, decline: 0.5,
    mgmtRate: 5, bldgMgmt: 30, propTax: 40, insurance: 8, otherExp: 10, repairRate: 3, expInflation: 1.0,
    repairs: [],
    owner: '個人', taxRate: 33, offset: true,
    holdYears: 10, exitYield: 9.0, saleCostRate: 4, horizon: 30,
  };
  if (!sample) Object.assign(p, { price: 0, building: 0, own: 0, rent: 0, otherRent: 0, age: 0, units: 0,
    bldgMgmt: 0, propTax: 0, insurance: 0, otherExp: 0 });
  else p.repairs = repairGuide(p);
  return p;
}

// 構造・戸数・築年数から修繕計画の目安を作る。最初の年は、前の持ち主が周期どおりに工事した前提で計算する
function repairGuide(p) {
  const rc = /重量鉄骨|RC/.test(p.structure);
  const units = Math.max(1, Math.round(num(p.units)) || 1);
  const kubun = p.kind === '区分マンション';
  return REPAIR_GUIDE[rc ? 'rc' : 'wood'].filter(g => !(kubun && g.whole)).map(g => {
    const done = Math.max(0, Math.round(num(p.age))) % g.cycle;
    return { name: g.name, cost: g.unit * (kubun ? 1 : units), cycle: g.cycle, first: g.cycle - done };
  });
}

// 古い保存データ（大規模修繕が1つだけの形）を修繕計画の形に直す
function migrate(p) {
  if ('bigRepair' in p && !(Array.isArray(p.repairs) && p.repairs.length)) {
    p.repairs = num(p.bigRepair) > 0 ? [{ name: '大規模修繕', cost: num(p.bigRepair), cycle: num(p.bigCycle), first: num(p.bigFirst) || num(p.bigCycle) }] : [];
  }
  if (!Array.isArray(p.repairs)) p.repairs = [];
  delete p.bigRepair; delete p.bigCycle; delete p.bigFirst;
  return p;
}

let store = { plans: [], current: null, tab: 'prop' };
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.plans && s.plans.length) store = s; } catch (e) {}
  if (!store.plans.length) { const p = newPlan(true); store.plans = [p]; store.current = p.id; }
  store.plans = store.plans.map(p => migrate(Object.assign(newPlan(false), p))); // 項目が増えても古いデータを開けるように
  if (!store.plans.find(p => p.id === store.current)) store.current = store.plans[0].id;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
const plan = () => store.plans.find(p => p.id === store.current);

/* ===== 計算 ===== */
// 中古の耐用年数（簡便法）。法定耐用年数を過ぎていれば 法定×20%、途中なら (法定−築年数)＋築年数×20%。2年未満は2年。
function usefulLife(p) {
  const L = LIFE[p.structure] || 22, a = Math.max(0, num(p.age));
  const y = a >= L ? Math.floor(L * 0.2) : Math.floor(L - a + a * 0.2);
  return Math.max(2, y);
}

function basics(p) {
  const price = num(p.price), costs = price * num(p.costRate) / 100;
  const total = price + costs;
  const loan = Math.max(0, total - num(p.own));
  const bShare = price > 0 ? Math.min(1, num(p.building) / price) : 0;
  const bldgBasis = total * bShare;          // 諸費用も建物・土地の割合で取得価額に入れる
  const landBasis = total - bldgBasis;
  const life = usefulLife(p);
  return { price, costs, total, loan, bldgBasis, landBasis, life, depYear: bldgBasis / life };
}

// 毎月の返済を積み上げて、年ごとの元金・利息・年末残高を出す
function loanSchedule(p, loan, horizon) {
  const n = Math.round(num(p.years) * 12);
  const out = [];
  let bal = loan, pay = 0, r = 0;
  const fixedPrin = n ? loan / n : 0;
  for (let y = 1; y <= horizon; y++) {
    let prin = 0, int = 0;
    for (let m = 1; m <= 12; m++) {
      const k = (y - 1) * 12 + m; // 何回目の返済か
      if (k > n || bal <= 1e-9) break;
      const rateNow = (p.reprice && y >= num(p.repriceYear)) ? num(p.repriceRate) : num(p.rate);
      const rNew = rateNow / 100 / 12;
      if (k === 1 || rNew !== r) { // 最初と金利が変わった月に返済額を計算し直す
        r = rNew; const left = n - k + 1;
        pay = r === 0 ? bal / left : bal * r / (1 - Math.pow(1 + r, -left));
      }
      const i = bal * r;
      const pr = p.method === '元金均等' ? Math.min(bal, fixedPrin) : Math.min(bal, pay - i);
      int += i; prin += pr; bal -= pr;
    }
    out.push({ prin, int, bal: Math.max(0, bal) });
  }
  return out;
}

function simulate(p) {
  const b = basics(p);
  const N = Math.max(30, Math.min(50, Math.round(num(p.horizon)) || 30)); // 30年後まで必ず計算する
  const sched = loanSchedule(p, b.loan, N);
  const rows = [];
  let cum = -num(p.own), accDep = 0, carry = []; // carry: 法人の欠損金 [{amt, year}]
  for (let t = 1; t <= N; t++) {
    const g = Math.pow(1 - num(p.decline) / 100, t - 1);
    const inf = Math.pow(1 + num(p.expInflation) / 100, t - 1);
    const gpi = (num(p.rent) + num(p.otherRent)) * 12 * g;
    const vacLoss = gpi * num(p.vacancy) / 100;
    const egi = gpi - vacLoss;
    const mgmt = egi * num(p.mgmtRate) / 100;
    const fixed = (num(p.bldgMgmt) + num(p.propTax) + num(p.insurance) + num(p.otherExp)) * inf;
    const repair = gpi * num(p.repairRate) / 100;
    const works = (p.repairs || []).filter(w => {
      const cyc = Math.round(num(w.cycle)), first = Math.round(num(w.first)) || cyc;
      return num(w.cost) > 0 && cyc > 0 && t >= first && (t - first) % cyc === 0;
    });
    const big = works.reduce((s, w) => s + num(w.cost), 0) * inf;
    const opex = mgmt + fixed + repair + big;
    const noi = egi - opex;
    const L = sched[t - 1];
    const ads = L.prin + L.int;
    const btcf = noi - ads;
    const dep = Math.max(0, Math.min(b.depYear, b.bldgBasis - accDep));
    accDep += dep;
    const income = egi - opex - L.int - dep; // 不動産所得（法人なら所得）
    const rate = num(p.taxRate) / 100;
    let tax = 0, used = 0;
    if (p.owner === '法人') {
      carry = carry.filter(c => t - c.year <= CORP_CARRY && c.amt > 0);
      if (income < 0) carry.push({ amt: -income, year: t });
      else {
        let rest = income;
        for (const c of carry) { const u = Math.min(c.amt, rest); c.amt -= u; rest -= u; used += u; }
        tax = rest * rate;
      }
    } else {
      tax = income >= 0 ? income * rate : (p.offset ? income * rate : 0);
    }
    const atcf = btcf - tax;
    cum += atcf;
    rows.push({ t, year: num(p.startYear) + t - 1, gpi, vacLoss, egi, mgmt, fixed, repair, big, opex, noi,
      prin: L.prin, int: L.int, ads, btcf, dep, accDep, income, tax, atcf, cum, bal: L.bal,
      carryLeft: carry.reduce((s, c) => s + c.amt, 0), works: works.map(w => w.name || '修繕'), notes: works.map(w => w.name || '修繕') });
  }
  let rc = 0; rows.forEach(r => { rc += r.repair + r.big; r.repairCum = rc; });
  rows.forEach((r, i) => { r.sale = saleAt(p, b, rows, i + 1); });
  return { b, rows };
}

// t年目の末に売却した場合
function saleAt(p, b, rows, t) {
  const r = rows[t - 1];
  const nextGpi = r.gpi * (1 - num(p.decline) / 100); // 買い手が見る翌年の満室家賃
  const ey = num(p.exitYield);
  const price = ey > 0 ? nextGpi / (ey / 100) : 0;
  const cost = price * num(p.saleCostRate) / 100;
  const book = b.landBasis + b.bldgBasis - r.accDep;
  const gain = price - cost - book;
  let taxRate, label;
  if (p.owner === '法人') { taxRate = num(p.taxRate); label = '法人税など'; }
  else if (t >= LONG_FROM) { taxRate = CAP_TAX_LONG; label = '譲渡所得税（長期）'; }
  else { taxRate = CAP_TAX_SHORT; label = '譲渡所得税（短期）'; }
  let taxable = gain;
  if (p.owner === '法人' && gain > 0) taxable = Math.max(0, gain - r.carryLeft);
  const tax = Math.max(0, taxable) * taxRate / 100;
  const net = price - cost - r.bal - tax;
  const cfSum = rows.slice(0, t).reduce((s, x) => s + x.atcf, 0);
  const own = num(p.own);
  const profit = cfSum + net - own;
  const flows = [-own, ...rows.slice(0, t).map(x => x.atcf)];
  flows[t] += net;
  return { t, price, cost, book, gain, taxRate, label, tax, bal: r.bal, net, cfSum, profit, irr: own > 0 ? irr(flows) : null };
}

function irr(cf) {
  const npv = x => cf.reduce((s, v, i) => s + v / Math.pow(1 + x, i), 0);
  let lo = -0.99, hi = 1;
  if (npv(lo) * npv(hi) > 0) { hi = 10; if (npv(lo) * npv(hi) > 0) return null; }
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2 * 100;
}

/* ===== 表示用 ===== */
const fmt = v => Math.round(v).toLocaleString('ja-JP');
const f1 = v => (Math.round(v * 10) / 10).toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pctf = v => v == null || !isFinite(v) ? '—' : `${f1(v)}%`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function getPath(o, path) { return path.split('.').reduce((x, k) => x == null ? x : x[k], o); }
function setPath(o, path, v) {
  const ks = path.split('.'); const last = ks.pop();
  ks.reduce((x, k) => x[k], o)[last] = v;
}
function bindValues(root = document) {
  const p = plan();
  root.querySelectorAll('[data-k]').forEach(el => {
    const v = getPath(p, el.dataset.k);
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v ?? '';
  });
}

function renderPlanSelect() {
  $('#planSel').innerHTML = store.plans.map(p =>
    `<option value="${p.id}"${p.id === store.current ? ' selected' : ''}>${esc(p.name || '名前なし')}${p.client ? '・' + esc(p.client) : ''}（${esc(p.createdOn || '')}）</option>`).join('');
}

function renderRepairs() {
  const p = plan();
  $('#repairs').innerHTML = p.repairs.map((w, i) => `<tr>
    <td><input type="text" data-k="repairs.${i}.name" style="min-width:180px"></td>
    <td><input type="number" data-k="repairs.${i}.cost" style="width:90px"></td>
    <td><input type="number" data-k="repairs.${i}.cycle" style="width:70px"></td>
    <td><input type="number" data-k="repairs.${i}.first" style="width:70px"></td>
    <td class="num" data-rep-years="${i}"></td>
    <td><button class="btn sm danger" data-del-rep="${i}">削除</button></td></tr>`).join('')
    || '<tr><td colspan="6" class="hint">修繕工事の予定はまだありません。「目安を入れる」で構造・戸数・築年数から入れられます。</td></tr>';
  bindValues($('#repairs'));
}

function updateDerived() {
  const p = plan(), b = basics(p);
  const gpi = (num(p.rent) + num(p.otherRent)) * 12;
  $('#priceCalc').innerHTML = `諸費用 <b class="num">${fmt(b.costs)}</b> 万円 → 必要な総額 <b class="num">${fmt(b.total)}</b> 万円 ／ 表面利回り <b class="num">${b.price ? pctf(gpi / b.price * 100) : '—'}</b>`;
  $$('#repriceFields input').forEach(el => el.disabled = !p.reprice);
  $('#repriceFields').style.opacity = p.reprice ? 1 : .45;
  const s = loanSchedule(p, b.loan, 1)[0];
  const ltv = b.price ? b.loan / b.price * 100 : 0;
  $('#loanCalc').innerHTML = `借入額 <b class="num">${fmt(b.loan)}</b> 万円（物件価格の ${f1(ltv)}%）→ 1年目の返済 <b class="num">${fmt(s.prin + s.int)}</b> 万円（月 ${f1((s.prin + s.int) / 12)} 万円）`
    + (num(p.own) < b.costs ? `<br><span class="flag warn">⚠ 自己資金が諸費用（${fmt(b.costs)}万円）より少ない＝オーバーローンです。金融機関の審査に注意</span>` : '');
  const egi = gpi * (1 - num(p.vacancy) / 100);
  const opex = egi * num(p.mgmtRate) / 100 + num(p.bldgMgmt) + num(p.propTax) + num(p.insurance) + num(p.otherExp) + gpi * num(p.repairRate) / 100;
  $('#opsCalc').innerHTML = `1年目：満室家賃 <b class="num">${fmt(gpi)}</b> − 空室 ${fmt(gpi - egi)} − 経費 ${fmt(opex)}（修繕工事を除く）＝ 営業収益(NOI) <b class="num">${fmt(egi - opex)}</b> 万円・経費率 ${egi ? f1(opex / egi * 100) : '—'}%`;
  $('#depCalc').innerHTML = `減価償却：建物の取得価額 <b class="num">${fmt(b.bldgBasis)}</b> 万円 ÷ 耐用年数 <b class="num">${b.life}</b> 年（${esc(p.structure)}・法定${LIFE[p.structure]}年・築${num(p.age)}年）＝ 年 <b class="num">${fmt(b.depYear)}</b> 万円`;
  const yrs = Math.round(num(p.holdYears));
  $('#saleCalc').innerHTML = p.owner === '法人' ? '売却益には法人の税率がかかります（くり越し欠損金と相殺）。'
    : `${yrs}年目の末に売却 → <b>${yrs >= LONG_FROM ? '長期譲渡（20.315%）' : '短期譲渡（39.63%）'}</b>として計算します。所有期間は売った年の1月1日時点で判定するため、${LONG_FROM}年目の末以降を長期としています。`;
  const inf = 1 + num(p.expInflation) / 100;
  let rep30 = 0;
  p.repairs.forEach((w, i) => {
    const cyc = Math.round(num(w.cycle)), first = Math.round(num(w.first)) || cyc, ts = [];
    if (cyc > 0 && num(w.cost) > 0) for (let t = first; t <= 30; t += cyc) if (t >= 1) { ts.push(t); rep30 += num(w.cost) * Math.pow(inf, t - 1); }
    const c = document.querySelector(`[data-rep-years="${i}"]`);
    if (c) c.textContent = ts.length ? ts.map(t => `${t}年目（築${num(p.age) + t}年）`).join('、') : '—';
  });
  const daily30 = Array.from({ length: 30 }, (_, k) => gpi * Math.pow(1 - num(p.decline) / 100, k) * num(p.repairRate) / 100).reduce((a, c) => a + c, 0);
  $('#repairCalc').innerHTML = `30年間の修繕費：修繕工事 <b class="num">${fmt(rep30)}</b> 万円 ＋ 日常の修繕・原状回復 <b class="num">${fmt(daily30)}</b> 万円 ＝ <b class="num">${fmt(rep30 + daily30)}</b> 万円（年平均 ${fmt((rep30 + daily30) / 30)} 万円・満室家賃の ${gpi ? f1((rep30 + daily30) / 30 / gpi * 100) : '—'}%）`;
  $$('[data-owner]').forEach(el => el.style.display = el.dataset.owner === p.owner ? '' : 'none');
}

/* ===== グラフ（SVG） ===== */
function niceScale(min, max, count = 4) {
  if (min === max) max = min + 1;
  const raw = (max - min) / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mag;
  const step = (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = []; for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
  return { lo, hi, ticks };
}
const W = 960, H = 280, PL = 64, PR = 12, PT = 12, PB = 30;
function chartFrame(rows, lo, hi) {
  const n = rows.length, step = (W - PL - PR) / n;
  return { n, step, x: i => PL + i * step, y: v => PT + (hi - v) / (hi - lo) * (H - PT - PB) };
}
function axes(rows, sc, f) {
  let g = '';
  sc.ticks.forEach(t => {
    g += `<line x1="${PL}" x2="${W - PR}" y1="${f.y(t)}" y2="${f.y(t)}" stroke="var(--grid)" stroke-width="1"/>`;
    g += `<text x="${PL - 6}" y="${f.y(t) + 4}" text-anchor="end">${fmt(t)}</text>`;
  });
  g += `<line x1="${PL}" x2="${W - PR}" y1="${f.y(0)}" y2="${f.y(0)}" stroke="var(--axis)" stroke-width="1"/>`;
  rows.forEach((r, i) => {
    if (r.t === 1 || r.t % 5 === 0) g += `<text x="${f.x(i) + f.step / 2}" y="${H - 10}" text-anchor="middle">${r.t}年目</text>`;
  });
  return g;
}
function roundedBar(x, y0, y1, w, r) {
  const top = Math.min(y0, y1), h = Math.abs(y1 - y0); if (h < .5) return '';
  r = Math.min(r, w / 2, h);
  if (y1 <= y0) return `M${x},${y0}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${y0}Z`;
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}
const linePath = (rows, f, get) => rows.map((r, i) => `${i ? 'L' : 'M'}${(f.x(i) + f.step / 2).toFixed(1)},${f.y(get(r)).toFixed(1)}`).join('');
const overlay = () => `<line class="cross" y1="${PT}" y2="${H - PB}" stroke="var(--ink-3)" stroke-width="1" style="display:none"/><g class="dots"></g>`;

function hover(el, rows, f, lines) {
  const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), cross = svg.querySelector('.cross'), dots = svg.querySelector('.dots');
  const hide = () => { tip.style.display = 'none'; cross.style.display = 'none'; dots.innerHTML = ''; };
  svg.addEventListener('pointermove', ev => {
    const b = svg.getBoundingClientRect();
    const i = Math.floor(((ev.clientX - b.left) / b.width * W - PL) / f.step);
    if (i < 0 || i >= rows.length) return hide();
    const r = rows[i], cx = f.x(i) + f.step / 2;
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.style.display = '';
    dots.innerHTML = lines.filter(l => l.dot).map(l => `<circle cx="${cx}" cy="${f.y(l.get(r))}" r="4.5" fill="${l.color}" stroke="var(--surface)" stroke-width="2"/>`).join('');
    tip.innerHTML = `<b>${r.t}年目（${r.year}年）</b>` + lines.map(l =>
      `<div class="r"><span><i style="background:${l.color}"></i>${l.label}</span><span class="num">${fmt(l.get(r))} 万円</span></div>`).join('')
      + (r.notes.length ? `<div class="hint">${esc(r.notes.join('・'))}</div>` : '');
    tip.style.display = 'block';
    const px = cx / W * b.width;
    tip.style.left = Math.min(Math.max(0, px + 12), b.width - tip.offsetWidth) + 'px';
    tip.style.top = '8px';
  });
  svg.addEventListener('pointerleave', hide);
}

function drawCF(rows) {
  const el = $('#chCF');
  const vals = rows.flatMap(r => [r.atcf, r.cum]);
  const sc = niceScale(Math.min(0, ...vals), Math.max(0, ...vals));
  const f = chartFrame(rows, sc.lo, sc.hi);
  const bw = Math.max(1, f.step * 0.62), off = (f.step - bw) / 2;
  const bars = rows.map((r, i) => `<path d="${roundedBar(f.x(i) + off, f.y(0), f.y(r.atcf), bw, 3)}" fill="${r.atcf < 0 ? 'var(--critical)' : 'var(--s-save)'}"/>`).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="毎年の手取りと累計">${axes(rows, sc, f)}${bars}
    <path d="${linePath(rows, f, r => r.cum)}" fill="none" stroke="var(--s-income)" stroke-width="2" stroke-linejoin="round"/>${overlay()}</svg><div class="tip"></div>`;
  hover(el, rows, f, [
    { label: '年間の手取り', color: 'var(--s-save)', get: r => r.atcf },
    { label: '累計（自己資金を引いた後）', color: 'var(--s-income)', get: r => r.cum, dot: true },
  ]);
}

function drawLoan(rows) {
  const el = $('#chLoan');
  const vals = rows.flatMap(r => [r.bal, r.sale.price]);
  const sc = niceScale(0, Math.max(...vals, 1));
  const f = chartFrame(rows, sc.lo, sc.hi);
  const lines = [
    { label: '売却価格の見込み', color: 'var(--s-income)', get: r => r.sale.price, dot: true },
    { label: 'ローン残高', color: 'var(--s-expense)', get: r => r.bal, dot: true },
  ];
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="ローン残高と売却価格の見込み">${axes(rows, sc, f)}
    ${lines.map(l => `<path d="${linePath(rows, f, l.get)}" fill="none" stroke="${l.color}" stroke-width="2" stroke-linejoin="round"/>`).join('')}${overlay()}</svg><div class="tip"></div>`;
  hover(el, rows, f, [...lines, { label: '売却の手取り', color: 'transparent', get: r => r.sale.net }]);
}

/* ===== 結果 ===== */
function kpi(label, value, detail, bad) {
  return `<div class="kpi${bad ? ' bad' : ''}"><div class="l">${label}</div><div class="v">${value}</div><div class="d">${detail || ''}</div></div>`;
}
const kvRow = (l, v, cls) => `<tr${cls ? ` class="${cls}"` : ''}><td>${l}</td><td>${v}</td></tr>`;
const flag = (ok, okText, ngText) => ok ? `<span class="flag ok">✓ ${okText}</span>` : `<span class="flag bad">⚠ ${ngText}</span>`;

function renderCF(p, b, rows) {
  const r1 = rows[0];
  const gross = b.price ? r1.gpi / b.price * 100 : null;
  const net = b.total ? (r1.egi - (r1.opex - r1.big)) / b.total * 100 : null; // 修繕工事を除いた実質利回り
  const dscr = r1.ads ? r1.noi / r1.ads : null;
  const payRatio = r1.gpi ? r1.ads / r1.gpi * 100 : null;
  const fixedOut = r1.fixed + r1.repair + r1.ads;
  const be = r1.gpi ? fixedOut / (r1.gpi * (1 - num(p.mgmtRate) / 100)) * 100 : null;
  const payback = rows.find(r => r.cum >= 0);
  const firstNeg = rows.find(r => r.atcf < 0);
  const rate = num(p.rate);
  const ccr = num(p.own) > 0 ? r1.atcf / num(p.own) * 100 : null;

  $('#kpis').innerHTML =
    kpi('表面利回り / 実質利回り', `${pctf(gross)}<small>/ ${pctf(net)}</small>`, `イールドギャップ ${net == null ? '—' : f1(net - rate) + '%'}（実質利回り − 金利）`) +
    kpi('1年目の手取り（税引後）', `${fmt(r1.atcf)}<small>万円</small>`, `月 ${f1(r1.atcf / 12)} 万円・税引前 ${fmt(r1.btcf)} 万円`, r1.atcf < 0) +
    kpi('自己資金の回収', payback ? `${payback.t}<small>年目</small>` : `${rows.length}年で未回収`,
      ccr == null ? 'フルローン（自己資金 0）' : `自己資金利回り(CCR) ${f1(ccr)}%`, !payback) +
    kpi('手取りが赤字になる年', firstNeg ? `${firstNeg.t}<small>年目</small>` : 'なし',
      firstNeg ? `<span class="flag bad">⚠ ${firstNeg.year}年 ${fmt(firstNeg.atcf)}万円${firstNeg.big ? '（修繕工事）' : ''}</span>` : `<span class="flag ok">✓ ${rows.length}年間 黒字</span>`, !!firstNeg);

  $('#year1').innerHTML =
    kvRow('満室時の家賃収入', fmt(r1.gpi)) + kvRow(`空室・滞納（${f1(num(p.vacancy))}%）`, '−' + fmt(r1.vacLoss), 'minus') +
    kvRow('実際の家賃収入', fmt(r1.egi), 't') +
    kvRow('管理委託費', '−' + fmt(r1.mgmt), 'minus') + kvRow('建物管理・税・保険・その他', '−' + fmt(r1.fixed), 'minus') +
    kvRow('日常の修繕・原状回復', '−' + fmt(r1.repair), 'minus') + (r1.big ? kvRow(`修繕工事（${esc(r1.works.join('・'))}）`, '−' + fmt(r1.big), 'minus') : '') +
    kvRow('営業収益（NOI）', fmt(r1.noi), 't') +
    kvRow(`ローン返済（元金 ${fmt(r1.prin)}・利息 ${fmt(r1.int)}）`, '−' + fmt(r1.ads), 'minus') +
    kvRow('税引前の手取り', fmt(r1.btcf), 't') +
    kvRow(`税金（不動産所得 ${fmt(r1.income)}・減価償却 ${fmt(r1.dep)}）`, r1.tax < 0 ? `＋${fmt(-r1.tax)}（節税）` : '−' + fmt(r1.tax), 'minus') +
    kvRow('税引後の手取り', fmt(r1.atcf), 't');

  const depEnd = rows.find(r => r.dep === 0 && r.t > 1);
  const ded = rows.find(r => r.prin > r.int + r.dep && r.income > 0);
  $('#checks').innerHTML =
    kvRow(`返済比率（返済 ÷ 満室家賃）<br>${flag(payRatio != null && payRatio <= 50, '50%以下', '50%超：空室・金利上昇に弱い')}`, pctf(payRatio)) +
    kvRow(`DSCR（NOI ÷ 返済）<br>${flag(dscr == null || dscr >= 1.2, '1.2倍以上', '1.2倍未満：返済に余裕が少ない')}`, dscr == null ? '—' : `${dscr.toFixed(2)}倍`) +
    kvRow(`損益分岐の入居率<br>${flag(be != null && be <= 80, '80%以下', '80%超：空室が増えると赤字')}`, pctf(be)) +
    kvRow(`イールドギャップ<br>${flag(net != null && net - rate >= 1.5, '1.5%以上', '1.5%未満：借入のうま味が少ない')}`, net == null ? '—' : f1(net - rate) + '%') +
    kvRow('減価償却が終わる年（税金が増える）', depEnd ? `${depEnd.t}年目（${depEnd.year}年）` : `${rows.length}年目より後`) +
    kvRow('デッドクロス（元金返済 ＞ 利息＋減価償却）', ded ? `${ded.t}年目（${ded.year}年）` : 'なし');

  drawCF(rows); drawLoan(rows);

  const cols = [['gpi', '満室家賃'], ['vacLoss', '空室'], ['opex', '経費'], ['big', 'うち修繕工事'], ['noi', 'NOI'], ['int', '利息'], ['prin', '元金'], ['btcf', '税引前CF'],
    ['dep', '減価償却'], ['income', '所得'], ['tax', '税金'], ['atcf', '税引後CF'], ['cum', '累計'], ['bal', 'ローン残高']];
  const hold = Math.round(num(p.holdYears));
  let html = `<thead><tr><th class="sticky l">年目</th><th class="l">年</th><th class="l">メモ</th>${cols.map(c => `<th>${c[1]}</th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(r => {
    html += `<tr${r.t === hold ? ' class="ret"' : ''}><td class="sticky l">${r.t}</td><td class="l">${r.year}</td><td class="ev">${esc([...r.notes, r.t === hold ? '売却予定' : ''].filter(Boolean).join('・'))}</td>`
      + cols.map(c => { const v = r[c[0]]; const neg = ['btcf', 'atcf', 'cum', 'income'].includes(c[0]) && v < 0;
        return `<td class="${['noi', 'atcf'].includes(c[0]) ? 'tot ' : ''}${neg ? 'neg' : ''}">${v ? fmt(v) : ''}</td>`; }).join('') + '</tr>';
  });
  $('#cfTable').innerHTML = html + '</tbody>';
}

function renderSale(p, b, rows) {
  const hold = Math.min(rows.length, Math.max(1, Math.round(num(p.holdYears))));
  const s = rows[hold - 1].sale;
  const best = rows.reduce((m, r) => (r.sale.irr ?? -1e9) > (m.sale.irr ?? -1e9) ? r : m, rows[0]);
  $('#saleKpis').innerHTML =
    kpi(`${hold}年目に売却したときの最終損益`, `${fmt(s.profit)}<small>万円</small>`, `手取り合計 ${fmt(s.cfSum)} ＋ 売却の手取り ${fmt(s.net)} − 自己資金 ${fmt(num(p.own))}`, s.profit < 0) +
    kpi('IRR（税引後・年あたり）', s.irr == null ? '—' : `${f1(s.irr)}<small>%</small>`, s.irr == null ? '自己資金 0 のため計算しません' : '自己資金に対する利回り', s.irr != null && s.irr < 0) +
    kpi('売却価格の見込み', `${fmt(s.price)}<small>万円</small>`, `購入価格の ${b.price ? f1(s.price / b.price * 100) : '—'}%（利回り ${f1(num(p.exitYield))}%）`) +
    kpi('IRRがいちばん高い売却時期', best.sale.irr == null ? '—' : `${best.t}<small>年目</small>`, best.sale.irr == null ? '' : `IRR ${f1(best.sale.irr)}%・最終損益 ${fmt(best.sale.profit)} 万円`);

  $('#saleTitle').textContent = `${hold}年目の末（${rows[hold - 1].year}年）に売却したときの手残り`;
  $('#saleDetail').innerHTML =
    kvRow('売却価格', fmt(s.price)) + kvRow(`売却費用（${f1(num(p.saleCostRate))}%）`, '−' + fmt(s.cost), 'minus') +
    kvRow('ローン残高の返済', '−' + fmt(s.bal), 'minus') +
    kvRow(`${s.label}（${s.taxRate}%）`, '−' + fmt(s.tax), 'minus') +
    kvRow('売却の手取り', fmt(s.net), 't') +
    `<tr><td colspan="2" class="hint" style="white-space:normal;text-align:left">税金の計算：売却価格 ${fmt(s.price)} − 売却費用 ${fmt(s.cost)} − 帳簿価額 ${fmt(s.book)}（購入総額 ${fmt(b.total)} − 減価償却累計 ${fmt(rows[hold - 1].accDep)}）＝ 譲渡益 ${fmt(s.gain)} 万円</td></tr>`;
  $('#saleTotal').innerHTML =
    kvRow('自己資金（購入時に出したお金）', '−' + fmt(num(p.own)), 'minus') +
    kvRow(`${hold}年間の手取りの合計（税引後）`, fmt(s.cfSum)) +
    kvRow('売却の手取り', fmt(s.net)) +
    kvRow('最終的な損益', fmt(s.profit), 't') +
    kvRow('自己資金に対する倍率', num(p.own) > 0 ? `${((s.profit + num(p.own)) / num(p.own)).toFixed(2)}倍` : '—');

  const z = v => fmt(v);
  let html = `<thead><tr><th class="sticky l">売却</th><th>売却価格</th><th>売却費用</th><th>ローン残高</th><th>譲渡益</th><th>譲渡税など</th><th>売却の手取り</th><th>手取りの合計</th><th>最終的な損益</th><th>IRR</th></tr></thead><tbody>`;
  rows.forEach(r => {
    const x = r.sale;
    html += `<tr${r.t === hold ? ' class="sel"' : ''}><td class="sticky l">${r.t}年目（${r.year}）</td><td>${z(x.price)}</td><td>${z(x.cost)}</td><td>${z(x.bal)}</td>
      <td class="${x.gain < 0 ? 'neg' : ''}">${z(x.gain)}</td><td>${z(x.tax)}</td><td class="${x.net < 0 ? 'neg' : ''}">${z(x.net)}</td><td>${z(x.cfSum)}</td>
      <td class="tot ${x.profit < 0 ? 'neg' : ''}">${z(x.profit)}</td><td class="${x.irr != null && x.irr < 0 ? 'neg' : ''}">${pctf(x.irr)}</td></tr>`;
  });
  $('#saleTable').innerHTML = html + '</tbody>';
}

function renderMilestones(p, b, rows) {
  const ms = MILESTONES.map(t => rows[t - 1]);
  const head = ms.map(r => `<th>${r.t === 1 ? '購入後' : `${r.t}年後`}<br><span class="hint">${r.t}年目・${r.year}年・築${num(p.age) + r.t}年</span></th>`).join('');
  const line = (label, get, opt = {}) => `<tr${opt.cls ? ` class="${opt.cls}"` : ''}><td class="sticky l">${label}</td>${ms.map(r => {
    const v = get(r); const neg = opt.neg && v < 0;
    return `<td class="${opt.tot ? 'tot ' : ''}${neg ? 'neg' : ''}">${v == null ? '—' : opt.f ? opt.f(v) : fmt(v)}</td>`; }).join('')}</tr>`;
  const sec = t => `<tr class="grp-row"><td class="sticky l" colspan="${ms.length + 1}">${t}</td></tr>`;
  $('#msTable').innerHTML = `<thead><tr><th class="sticky l"></th>${head}</tr></thead><tbody>` +
    sec('その年の収支（年額）') +
    line('満室時の家賃収入', r => r.gpi) +
    line('実際の家賃収入（空室を引いた後）', r => r.egi) +
    line('経費（修繕を除く）', r => r.mgmt + r.fixed) +
    line('日常の修繕・原状回復', r => r.repair) +
    line('修繕工事', r => r.big) +
    line('営業収益（NOI）', r => r.noi, { tot: 1, neg: 1 }) +
    line('ローン返済', r => r.ads) +
    line('税引前の手取り', r => r.btcf, { neg: 1 }) +
    line('減価償却', r => r.dep) +
    line('税金（マイナスは節税）', r => r.tax, { neg: 1 }) +
    line('税引後の手取り', r => r.atcf, { tot: 1, neg: 1 }) +
    line('　月あたり', r => r.atcf / 12, { neg: 1, f: v => f1(v) }) +
    line('その年の工事', r => r.works.length ? r.works.join('・') : '', { f: v => `<span class="hint">${esc(v)}</span>` }) +
    sec('その時点までの合計') +
    line('手取りの合計（税引後）', r => r.sale.cfSum, { neg: 1 }) +
    line('修繕費の合計', r => r.repairCum) +
    line('ローン残高', r => r.bal) +
    sec('その時点で売却した場合') +
    line('売却価格の見込み', r => r.sale.price) +
    line('売却の手取り', r => r.sale.net, { neg: 1 }) +
    line('最終的な損益', r => r.sale.profit, { tot: 1, neg: 1 }) +
    line('IRR（税引後）', r => r.sale.irr, { f: pctf, neg: 1 }) + '</tbody>';

  const periods = [[1, 10], [11, 20], [21, 30], [1, 30]];
  const sum = (a, z, k) => rows.slice(a - 1, z).reduce((s, r) => s + r[k], 0);
  const pl = (label, k, opt = {}) => `<tr${opt.cls ? ` class="${opt.cls}"` : ''}><td class="sticky l">${label}</td>${periods.map(([a, z]) => {
    const v = typeof k === 'function' ? k(a, z) : sum(a, z, k);
    return `<td class="${opt.tot ? 'tot ' : ''}${opt.neg && v < 0 ? 'neg' : ''}">${fmt(v)}</td>`; }).join('')}</tr>`;
  $('#periodTable').innerHTML = `<thead><tr><th class="sticky l"></th>${periods.map(([a, z]) => `<th>${a === 1 && z === 30 ? '30年間の合計' : `${a}〜${z}年目`}<br><span class="hint">${rows[a - 1].year}〜${rows[z - 1].year}年</span></th>`).join('')}</tr></thead><tbody>` +
    pl('実際の家賃収入', 'egi') + pl('経費（修繕を除く）', (a, z) => sum(a, z, 'mgmt') + sum(a, z, 'fixed')) +
    pl('日常の修繕・原状回復', 'repair') + pl('修繕工事', 'big') +
    pl('修繕費の合計', (a, z) => sum(a, z, 'repair') + sum(a, z, 'big'), { tot: 1 }) +
    pl('ローン返済', 'ads') + pl('税金', 'tax', { neg: 1 }) + pl('税引後の手取り', 'atcf', { tot: 1, neg: 1 }) + '</tbody>';

  const r30 = rows[29], r10 = rows[9], r20 = rows[19];
  const repTot = r30.repairCum, egiTot = sum(1, 30, 'egi');
  $('#msKpis').innerHTML =
    kpi('10年後までの手取り', `${fmt(r10.sale.cfSum)}<small>万円</small>`, `その時点で売ると最終損益 ${fmt(r10.sale.profit)} 万円`, r10.sale.cfSum < 0) +
    kpi('20年後までの手取り', `${fmt(r20.sale.cfSum)}<small>万円</small>`, `その時点で売ると最終損益 ${fmt(r20.sale.profit)} 万円`, r20.sale.cfSum < 0) +
    kpi('30年後までの手取り', `${fmt(r30.sale.cfSum)}<small>万円</small>`, `その時点で売ると最終損益 ${fmt(r30.sale.profit)} 万円`, r30.sale.cfSum < 0) +
    kpi('30年間の修繕費', `${fmt(repTot)}<small>万円</small>`, `家賃収入の ${egiTot ? f1(repTot / egiTot * 100) : '—'}%・年平均 ${fmt(repTot / 30)} 万円`);
  drawRepairs(rows.slice(0, 30));
}

function drawRepairs(rows) {
  const el = $('#chRepair');
  const sc = niceScale(0, Math.max(1, ...rows.map(r => r.repair + r.big)));
  const f = chartFrame(rows, sc.lo, sc.hi);
  const bw = Math.max(1, f.step * 0.62), off = (f.step - bw) / 2;
  let bars = '';
  rows.forEach((r, i) => {
    const x = f.x(i) + off;
    bars += `<rect x="${x}" y="${f.y(r.repair)}" width="${bw}" height="${Math.max(0, f.y(0) - f.y(r.repair))}" fill="var(--s-income)"/>`;
    if (r.big > 0) bars += `<path d="${roundedBar(x, f.y(r.repair), f.y(r.repair + r.big), bw, 3)}" fill="var(--s-expense)"/>`;
  });
  const marks = MILESTONES.filter(t => t > 1 && t <= rows.length).map(t => {
    const x = f.x(t - 1) + f.step; return `<line x1="${x}" x2="${x}" y1="${PT}" y2="${H - PB}" stroke="var(--axis)" stroke-dasharray="3 3"/>`; }).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="毎年の修繕費">${axes(rows, sc, f)}${marks}${bars}${overlay()}</svg><div class="tip"></div>`;
  hover(el, rows, f, [
    { label: '日常の修繕・原状回復', color: 'var(--s-income)', get: r => r.repair },
    { label: '修繕工事', color: 'var(--s-expense)', get: r => r.big },
    { label: '修繕費の累計', color: 'transparent', get: r => r.repairCum },
  ]);
}

function renderResults() {
  const p = plan();
  const { b, rows } = simulate(p);
  renderCF(p, b, rows);
  renderMilestones(p, b, rows);
  renderSale(p, b, rows);
  $('#phTitle').textContent = `${p.name || ''} 収益シミュレーション`;
  $('#phSub').textContent = [p.client && `お客様 ${p.client}`, `作成日 ${p.createdOn || ''}`, p.staff && `担当 ${p.staff}`,
    `${p.kind}・${p.structure}・築${num(p.age)}年${num(p.units) ? '・' + num(p.units) + '戸' : ''}`, p.address,
    `価格 ${fmt(b.price)}万円・自己資金 ${fmt(num(p.own))}万円・借入 ${fmt(b.loan)}万円（${f1(num(p.rate))}%・${num(p.years)}年）`, '（金額は万円）', p.memo]
    .filter(Boolean).join('　');
}

function renderAll() {
  const sOpts = Object.keys(LIFE);
  $('[data-k="structure"]').innerHTML = sOpts.map(o => `<option>${o}</option>`).join('');
  renderPlanSelect(); bindValues(); renderRepairs(); updateDerived(); renderResults();
}

/* ===== 操作 ===== */
let timer;
function onEdit(e) {
  const el = e.target; if (!el.dataset || !el.dataset.k) return;
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'number') v = el.value === '' ? '' : +el.value;
  else v = el.value;
  setPath(plan(), el.dataset.k, v);
  updateDerived();
  if (['name', 'client', 'createdOn'].includes(el.dataset.k)) renderPlanSelect();
  clearTimeout(timer);
  timer = setTimeout(() => { renderResults(); save(); }, 150);
}
document.addEventListener('input', onEdit);
document.addEventListener('change', onEdit);

document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.tab) { store.tab = t.dataset.tab; showTab(); save(); }
  else if (t.dataset.delRep != null) { plan().repairs.splice(+t.dataset.delRep, 1); renderRepairs(); updateDerived(); renderResults(); save(); }
});
$('#bAddRep').onclick = () => {
  plan().repairs.push({ name: '', cost: 100, cycle: 15, first: 10 });
  renderRepairs(); updateDerived(); renderResults(); save();
};
$('#bGuideRep').onclick = () => {
  const p = plan();
  if (p.repairs.length && !confirm('今の修繕計画を、構造・戸数・築年数からの目安で置きかえます。よろしいですか？')) return;
  p.repairs = repairGuide(p); renderRepairs(); updateDerived(); renderResults(); save();
};
function showTab() {
  $$('nav.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === store.tab));
  $$('section.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + store.tab));
}

$('#planSel').onchange = e => { store.current = e.target.value; save(); renderAll(); };
$('#bNew').onclick = () => { const p = newPlan(false); store.plans.push(p); store.current = p.id; store.tab = 'prop'; save(); renderAll(); showTab(); };
$('#bDup').onclick = () => {
  const p = JSON.parse(JSON.stringify(plan())); p.id = uid(); p.name = (p.name || '') + '（コピー）'; p.createdOn = today();
  store.plans.push(p); store.current = p.id; save(); renderAll();
};
$('#bDel').onclick = () => {
  const p = plan();
  if (!confirm(`「${p.name}」を削除します。元に戻せません。よろしいですか？`)) return;
  store.plans = store.plans.filter(x => x.id !== p.id);
  if (!store.plans.length) store.plans.push(newPlan(false));
  store.current = store.plans[0].id; save(); renderAll();
};
$('#bExport').onclick = () => {
  const p = plan();
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `収益物件_${(p.name || '').replace(/[\\/:*?"<>|\s]/g, '')}_${today()}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('#fImport').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    const list = Array.isArray(d) ? d : d.plans ? d.plans : [d];
    list.forEach(x => { const p = migrate(Object.assign(newPlan(false), x)); p.id = uid(); store.plans.push(p); store.current = p.id; });
    save(); renderAll(); alert(`${list.length}件の物件を読み込みました。`);
  } catch (err) { alert('読み込めませんでした。書き出したファイル（.json）を選んでください。'); }
  e.target.value = '';
};
$('#bPrint').onclick = () => { renderResults(); window.print(); };

load(); renderAll(); showTab();
