/* Livii ライフプラン — 計算と画面。金額の単位はすべて「万円」。 */
'use strict';

/* ===== 目安の数字（制度や統計が変わったらここを直す） ===== */
// 教育費（年額・万円）。文部科学省「子供の学習費調査」(令和5年度) / 日本政策金融公庫「教育費負担の実態調査」などをもとにした目安
const EDU = {
  k: { ages: [3, 5],  公立: 18.5, 私立: 34.7 },   // 幼稚園
  e: { ages: [6, 11], 公立: 33.6, 私立: 182.8 },  // 小学校
  j: { ages: [12, 14], 公立: 54.2, 私立: 156.0 }, // 中学校
  h: { ages: [15, 17], 公立: 59.8, 私立: 103.0 }, // 高校
};
const UNIV = { // 大学など: 年数・毎年の学費・入学時の費用
  '進学しない':  { years: 0, yearly: 0,   entry: 0 },
  '国公立大学':  { years: 4, yearly: 54,  entry: 28 },
  '私立大学文系': { years: 4, yearly: 82,  entry: 23 },
  '私立大学理系': { years: 4, yearly: 116, entry: 25 },
  '短大・専門':  { years: 2, yearly: 100, entry: 20 },
};
const AWAY_YEARLY = 100;          // 自宅外通学の仕送り・家賃（年額）
const IZOKU_KISO = 83.17;         // 遺族基礎年金（2025年度・年額）
const IZOKU_KID12 = 23.93;        // 子の加算 第1子・第2子
const IZOKU_KID3 = 7.98;          // 子の加算 第3子以降
const CHUKOREI = 62.38;           // 中高齢寡婦加算
const NET_TO_GROSS = 0.78;        // 手取り ÷ 0.78 ≒ 額面年収
const RESIDENT_TAX = 0.10;        // 住民税（所得割）
const FUKKO = 1.021;              // 所得税 × 1.021（復興特別所得税）
// 生命保険料控除（2012年以降の契約・年間保険料 円 → 控除額 円）
const dedIT = P => P <= 20000 ? P : P <= 40000 ? P / 2 + 10000 : P <= 80000 ? P / 4 + 20000 : 40000;
const dedRes = P => P <= 12000 ? P : P <= 32000 ? P / 2 + 6000 : P <= 56000 ? P / 4 + 14000 : 28000;
// 生活費の内訳の初期値（円）
const LIV_ITEMS = [['食費', 70000], ['外食', 15000], ['日用品', 10000], ['水道光熱費', 25000], ['携帯電話', 12000],
  ['インターネット', 5000], ['交通費', 5000], ['被服・美容', 12000], ['医療費', 5000], ['こづかい（本人）', 25000],
  ['こづかい（配偶者）', 15000], ['趣味・娯楽', 10000], ['交際費', 5000], ['サブスク', 3000]];
const LIV_YEARLY = [['冠婚葬祭', 50000], ['家電・家具の買い替え', 100000], ['帰省', 50000]];

/* ===== データ ===== */
const KEY = 'livii-lifeplan-v1';
const Y0 = new Date().getFullYear();
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const num = v => (v === '' || v == null || isNaN(+v)) ? 0 : +v;

function newPlan(sample) {
  const p = {
    id: uid(), name: sample ? 'サンプル 様' : '新しいお客様', staff: '', createdOn: today(), memo: '',
    startYear: Y0, endAge: 95,
    self: { name: 'ご主人', birthYear: Y0 - 35, sex: '男', net: 520, raise: 1.0, retireAge: 65, severance: 1500,
            afterNet: 200, afterUntil: 70, pension: 200, pensionAge: 65, kosei: '1' },
    spouse: { enabled: true, name: '奥様', birthYear: Y0 - 33, sex: '女', net: 180, raise: 0.5, retireAge: 60, severance: 0,
              afterNet: 0, afterUntil: 65, pension: 90, pensionAge: 65 },
    kids: [
      { name: '長男', birthYear: Y0 - 4, k: '私立', e: '公立', j: '公立', h: '公立', u: '私立大学文系', away: false },
      { name: '長女', birthYear: Y0 - 1, k: '公立', e: '公立', j: '公立', h: '私立', u: '国公立大学', away: true },
    ],
    childAllowance: true,
    save: { current: 800, rate: 1.0 }, otherIncome: 0,
    living: { current: 280, retired: 230, other: 10, inflation: 1.0, detail: true,
              items: LIV_ITEMS.map(([name, amount]) => ({ name, amount })), yearly: LIV_YEARLY.map(([name, amount]) => ({ name, amount })) },
    tax: { income: '10', compareRate: 3.0 },
    policies: [
      { ...newPolicy(), name: '終身保険（加入中）', status: '加入中', type: '終身保険', monthly: 15000, startYear: Y0 - 5, payYears: 25,
        rate: 0.8, death: 500, action: '持ち続ける', actionYear: Y0 + 30 },
      { ...newPolicy(), name: '個人年金保険（検討中）', status: '新規検討', type: '個人年金保険', monthly: 10000, startYear: Y0, payYears: 25,
        rate: 1.2, death: 0, deduct: '個人年金', action: '年金で受け取る', actionYear: Y0 + 30, annYears: 10 },
    ],
    house: { type: '賃貸', rent: 7.5, loanMonthly: 0, loanEnd: Y0, upkeep: 0,
             buy: true, buyYear: Y0 + 2, price: 3200, down: 300, costRate: 7, rate: 0.9, years: 35, upkeepBuy: 25 },
    ins: { monthly: 2.5, untilAge: 65 },
    car: { price: 300, cycle: 8, nextYear: Y0 + 3, upkeep: 40, lastAge: 75 },
    events: [
      { year: Y0 + 6, name: '家族旅行', amount: -50, repeat: false, count: 1 },
      { year: Y0 + 22, name: '外壁塗装・リフォーム', amount: -250, repeat: false, count: 1 },
    ],
    prot: { age: 35, rate1: 70, rate2: 50, spouseUntil: 90, funeral: 200, cover: 1000, deathSeverance: 0, koseiOverride: '', dansin: true },
  };
  if (!sample) {
    p.self.name = '本人'; p.spouse.name = '配偶者'; p.kids = []; p.events = [];
    p.house.buy = false; p.prot.cover = 0; p.policies = []; p.living.detail = false; p.living.current = 300;
  }
  p.prot.age = Y0 - p.self.birthYear;
  if (p.living.detail) syncLiving(p);
  return p;
}
function newPolicy() {
  return { name: '', status: '新規検討', type: '終身保険', insured: '本人', monthly: 10000, startYear: Y0, payYears: 20,
    rate: 1.0, chargeYears: 10, chargeRate: 30, table: '', death: 300, deduct: '一般', action: '一括で受け取る',
    actionYear: Y0 + 20, annYears: 10, inCF: true };
}
// 前のバージョンで保存したプランに、新しい項目を足す
function migrate(p) {
  const d = newPlan(false);
  for (const k of Object.keys(d)) if (p[k] == null) p[k] = d[k];
  for (const k of Object.keys(d.living)) if (p.living[k] == null) p.living[k] = d.living[k];
  for (const k of Object.keys(d.tax)) if (p.tax[k] == null) p.tax[k] = d.tax[k];
  p.policies.forEach(x => { const n = newPolicy(); for (const k of Object.keys(n)) if (x[k] == null) x[k] = n[k]; });
  return p;
}
function syncLiving(p) {
  const L = p.living;
  if (!L.detail) return;
  const m = L.items.reduce((s, x) => s + num(x.amount), 0), y = L.yearly.reduce((s, x) => s + num(x.amount), 0);
  L.current = Math.round((m * 12 + y) / 1000) / 10;
}

let store = { plans: [], current: null, tab: 'basic' };
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.plans && s.plans.length) store = s; } catch (e) {}
  if (!store.plans.length) { const p = newPlan(true); store.plans = [p]; store.current = p.id; }
  store.plans.forEach(migrate);
  if (!store.plans.find(p => p.id === store.current)) store.current = store.plans[0].id;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
const plan = () => store.plans.find(p => p.id === store.current);

/* ===== 計算 ===== */
function pmtYear(principal, ratePct, years) {
  if (principal <= 0 || years <= 0) return 0;
  const r = ratePct / 100 / 12, n = years * 12;
  const m = r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n));
  return m * 12;
}

function eduCost(kid, year) {
  const age = year - num(kid.birthYear);
  let c = 0;
  for (const k of ['k', 'e', 'j', 'h']) {
    const t = EDU[k];
    if (age >= t.ages[0] && age <= t.ages[1]) c += t[kid[k]] || 0;
  }
  const u = UNIV[kid.u] || UNIV['進学しない'];
  if (u.years && age >= 18 && age < 18 + u.years) {
    c += u.yearly + (age === 18 ? u.entry : 0) + (kid.away ? AWAY_YEARLY : 0);
  }
  return c;
}

function workIncome(m, age, t) {
  let salary = 0, sev = 0, pen = 0;
  if (age < num(m.retireAge)) salary = num(m.net) * Math.pow(1 + num(m.raise) / 100, t);
  else if (age < num(m.afterUntil)) salary = num(m.afterNet);
  if (age === num(m.retireAge)) sev = num(m.severance);
  if (age >= num(m.pensionAge)) pen = num(m.pension);
  return { salary, sev, pen };
}

/* ===== 積立保険 ===== */
const taxRate = p => num(p.tax.income) / 100 * FUKKO + RESIDENT_TAX;
function parsePoints(str) {
  return String(str || '').split(/[,、\s]+/).map(x => x.split(/[:：]/))
    .filter(a => a.length === 2 && a[0] !== '' && a[1] !== '' && !isNaN(+a[0]) && !isNaN(+a[1]))
    .map(a => [+a[0], +a[1]]).sort((a, b) => a[0] - b[0]);
}
function irr(flows) {
  const npv = r => flows.reduce((s, f, i) => s + f / Math.pow(1 + r, i), 0);
  let lo = -0.9, hi = 0.5;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (npv(lo) * npv(m) <= 0) hi = m; else lo = m; }
  return (lo + hi) / 2;
}
function deductSaving(p, pol) {
  if (pol.deduct === '対象外') return 0;
  const P = num(pol.monthly) * 12;
  return (dedIT(P) * num(p.tax.income) / 100 * FUKKO + dedRes(P) * RESIDENT_TAX) / 10000;
}
// 1つの保険を、契約した年から年ごとに計算する（金額は万円）
function policyCalc(p, pol) {
  const start = num(pol.startYear) || Y0, A = num(pol.monthly) * 12 / 10000;
  const r = num(pol.rate) / 100, cr = num(p.tax.compareRate) / 100, tr = taxRate(p);
  const payYears = num(pol.payYears), Y = Math.max(num(pol.actionYear) || start, start);
  const ann = pol.action === '年金で受け取る', hold = pol.action === '持ち続ける';
  const ins = pol.insured === '配偶者' && p.spouse.enabled ? p.spouse : p.self;
  const who = pol.insured === '配偶者' && p.spouse.enabled ? (p.spouse.name || '配偶者') : (p.self.name || '本人');
  const lastY = ann ? Math.max(start, Y - 1) : hold ? Math.max(Y, start + payYears - 1) : Y;
  const pts = parsePoints(pol.table), lastPt = pts.length ? pts[pts.length - 1][0] : 0;
  const rows = [];
  let F = 0, paid = 0, C = 0, cvPrev = 0;
  for (let y = start; y <= lastY && rows.length < 100; y++) {
    const t = y - start + 1;
    const prem = t <= payYears ? A : 0;
    paid += prem;
    F = (F + prem) * (1 + r);
    let cv;
    if (pts.length && t <= lastPt) {
      let a = [0, 0], b = pts[0];
      for (const q of pts) { if (q[0] >= t) { b = q; break; } a = q; }
      const ratio = b[0] === a[0] ? b[1] : a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]);
      cv = paid * ratio / 100;
    } else if (pts.length) {
      cv = (cvPrev + prem) * (1 + r);
    } else {
      const cy = num(pol.chargeYears);
      cv = F - (cy > 0 && t <= cy ? F * num(pol.chargeRate) / 100 * (1 - (t - 1) / cy) : 0);
    }
    cvPrev = cv;
    C = (C + prem) * (1 + cr);
    const tax = Math.max(0, cv - paid - 50) / 2 * tr;
    rows.push({ year: y, t, age: y - num(ins.birthYear), who, prem, paid, cv, tax, net: cv - tax, compare: C, notes: [] });
  }
  const ev = ann ? rows[rows.length - 1] : (rows.find(x => x.year === Y) || rows[rows.length - 1]);
  const res = { rows, ev, Y, ann, hold, who, A, payYears, paid: ev.paid, saving: deductSaving(p, pol) };
  if (ann) {
    const N = Math.max(1, num(pol.annYears)), fund = ev.cv;
    res.N = N;
    res.annual = r ? fund * r / (1 - Math.pow(1 + r, -N)) : fund / N;
    res.gross = res.annual * N;
    const annTax = Math.max(0, res.annual * (1 - (res.gross > 0 ? ev.paid / res.gross : 0))) * tr;
    res.annNet = res.annual - annTax; res.tax = annTax * N; res.net = res.annNet * N;
  } else {
    res.gross = ev.cv; res.tax = ev.tax; res.net = ev.net;
  }
  // 税引後の実質利回り（生命保険料控除の減税も含む）
  const flows = [];
  const add = (i, v) => { while (flows.length <= i) flows.push(0); flows[i] += v; };
  rows.filter(x => x.year <= ev.year).forEach(x => { if (x.prem) { add(x.t - 1, -x.prem); add(x.t, res.saving); } });
  if (ann) for (let k = 0; k < res.N; k++) add(Y - start + 1 + k, res.annNet);
  else add(ev.t, res.net);
  res.irr = irr(flows);
  res.breakEven = rows.find(x => x.paid > 0 && x.cv >= x.paid);
  return res;
}

function simulate(p, opt = {}) {
  const rows = [];
  const start = num(p.startYear) || Y0;
  const sb = num(p.self.birthYear);
  const end = sb + num(p.endAge);
  const kidsByAge = [...p.kids].sort((a, b) => num(a.birthYear) - num(b.birthYear));
  const h = p.house;
  const buying = h.type === '賃貸' && h.buy;
  const buyPay = buying ? pmtYear(Math.max(0, num(h.price) - num(h.down)), num(h.rate), num(h.years)) : 0;
  let s = num(p.save.current);
  const pcs = p.policies.map((pol, i) => ({ pol, i }))
    .filter(({ pol, i }) => i === opt.include || (pol.inCF && i !== opt.exclude))
    .map(({ pol }) => ({ pol, c: policyCalc(p, pol) }));

  for (let y = start; y <= end && rows.length < 120; y++) {
    const t = y - start, inf = Math.pow(1 + num(p.living.inflation) / 100, t);
    const age = y - sb;
    const spAge = p.spouse.enabled ? y - num(p.spouse.birthYear) : null;
    const notes = [];
    const r = { year: y, age, spAge, kidAges: p.kids.map(k => y - num(k.birthYear)) };

    // 収入
    const a = workIncome(p.self, age, t);
    const b = p.spouse.enabled ? workIncome(p.spouse, spAge, t) : { salary: 0, sev: 0, pen: 0 };
    r.incSelf = a.salary; r.incSpouse = b.salary;
    r.pension = a.pen + b.pen; r.severance = a.sev + b.sev;
    if (a.sev) notes.push('本人退職'); if (b.sev) notes.push('配偶者退職');
    r.allowance = 0;
    if (p.childAllowance) kidsByAge.forEach((k, i) => {
      const ka = y - num(k.birthYear);
      if (ka < 0 || ka > 18) return;
      r.allowance += i >= 2 ? 36 : ka < 3 ? 18 : 12;
    });
    r.otherInc = num(p.otherIncome);
    r.polIn = 0; r.polPrem = 0;
    for (const { pol, c } of pcs) {
      const row = c.rows.find(x => x.year === y);
      if (row && (c.hold || y <= c.ev.year)) r.polPrem += row.prem;
      const nm = pol.name || pol.type;
      if (pol.action === '一括で受け取る' && y === c.ev.year) { r.polIn += c.net; notes.push(`${nm} 受取`); }
      if (c.ann && y >= c.Y && y < c.Y + c.N) { r.polIn += c.annNet; if (y === c.Y) notes.push(`${nm} 年金開始`); }
    }

    // 支出
    r.living = (age < num(p.self.retireAge) ? num(p.living.current) : num(p.living.retired)) * inf;
    r.housing = 0;
    if (h.type === '賃貸') {
      if (!(buying && y >= num(h.buyYear))) r.housing += num(h.rent) * 12;
      if (buying) {
        if (y === num(h.buyYear)) { r.housing += num(h.down) + num(h.price) * num(h.costRate) / 100; notes.push('住宅購入'); }
        if (y >= num(h.buyYear) && y < num(h.buyYear) + num(h.years)) r.housing += buyPay;
        if (y >= num(h.buyYear)) r.housing += num(h.upkeepBuy);
      }
    } else {
      if (y <= num(h.loanEnd)) r.housing += num(h.loanMonthly) * 12;
      r.housing += num(h.upkeep);
    }
    r.edu = p.kids.reduce((sum, k) => sum + eduCost(k, y), 0);
    p.kids.forEach(k => { if (y - num(k.birthYear) === 18 && (UNIV[k.u] || {}).years) notes.push(`${k.name || '子'}進学`); });
    r.ins = age < num(p.ins.untilAge) ? num(p.ins.monthly) * 12 : 0;
    r.car = 0;
    const c = p.car, cyc = Math.max(1, num(c.cycle));
    if (age < num(c.lastAge)) {
      r.car += num(c.upkeep) * inf;
      if (y >= num(c.nextYear) && (y - num(c.nextYear)) % cyc === 0 && num(c.price) > 0) { r.car += num(c.price) * inf; notes.push('車買い替え'); }
    }
    r.other = num(p.living.other) * inf;

    // イベント
    for (const e of p.events) {
      const ey = num(e.year), cnt = e.repeat ? Math.max(1, num(e.count)) : 1;
      if (y >= ey && y < ey + cnt) {
        const v = num(e.amount);
        if (v >= 0) r.otherInc += v; else r.other += -v;
        if (e.name && (y === ey || !e.repeat)) notes.push(e.name);
      }
    }

    r.incTotal = r.incSelf + r.incSpouse + r.pension + r.severance + r.allowance + r.otherInc + r.polIn;
    r.expTotal = r.living + r.housing + r.edu + r.ins + r.polPrem + r.car + r.other;
    r.balance = r.incTotal - r.expTotal;
    s = s + (s > 0 ? s * num(p.save.rate) / 100 : 0) + r.balance;
    r.savings = s;
    r.notes = notes;
    rows.push(r);
  }
  return rows;
}

function protection(p, rows) {
  const start = rows.length ? rows[0].year : Y0;
  const sb = num(p.self.birthYear);
  const D = Math.max(start, sb + num(p.prot.age));
  const idx = rows.findIndex(r => r.year === D);
  const savingsAtD = D === start || idx <= 0 ? num(p.save.current) : rows[idx - 1].savings;
  const sp = p.spouse.enabled ? p.spouse : null;
  const lastIndep = p.kids.reduce((m, k) => Math.max(m, num(k.birthYear) + 22), 0);
  const endY = sp ? num(sp.birthYear) + num(p.prot.spouseUntil) : Math.max(D, lastIndep - 1);
  const h = p.house, dansin = p.prot.dansin;
  const purchased = h.type === '賃貸' && h.buy && D >= num(h.buyYear);
  const buyPay = purchased ? pmtYear(Math.max(0, num(h.price) - num(h.down)), num(h.rate), num(h.years)) : 0;
  const kosei = p.self.kosei === '0' ? 0
    : (p.prot.koseiOverride !== '' && p.prot.koseiOverride != null) ? num(p.prot.koseiOverride)
    : Math.min(num(p.self.net) / NET_TO_GROSS / 12, 65) * 5.481 / 1000 * 300 * 0.75;
  const kidsByAge = [...p.kids].sort((a, b) => num(a.birthYear) - num(b.birthYear));

  const o = { living: 0, housing: 0, edu: 0, funeral: num(p.prot.funeral) };
  const i = { spouseWork: 0, spousePension: 0, kiso: 0, kosei: 0, chukorei: 0 };
  for (let y = D; y <= endY; y++) {
    const rate = (y < lastIndep ? num(p.prot.rate1) : num(p.prot.rate2)) / 100;
    o.living += (num(p.living.current) + num(p.living.other)) * rate;
    if (h.type === '賃貸') {
      if (!purchased) o.housing += num(h.rent) * 12;
      else {
        if (!dansin && y < num(h.buyYear) + num(h.years)) o.housing += buyPay;
        o.housing += num(h.upkeepBuy);
      }
    } else {
      if (!dansin && y <= num(h.loanEnd)) o.housing += num(h.loanMonthly) * 12;
      o.housing += num(h.upkeep);
    }
    o.edu += p.kids.reduce((s, k) => s + eduCost(k, y), 0);

    const minors = kidsByAge.filter(k => { const a = y - num(k.birthYear); return a >= 0 && a <= 18; });
    if (minors.length) i.kiso += IZOKU_KISO + minors.reduce((s, k, n) => s + (n < 2 ? IZOKU_KID12 : IZOKU_KID3), 0);
    if (sp) {
      const sa = y - num(sp.birthYear);
      const w = workIncome(sp, sa, 0);
      i.spouseWork += w.salary + w.sev;
      i.spousePension += w.pen;
      i.kosei += kosei;
      if (kosei && sp.sex === '女' && !minors.length && sa >= 40 && sa < 65) i.chukorei += CHUKOREI;
    } else if (minors.length) {
      i.kosei += kosei;
    }
  }
  const outTotal = o.living + o.housing + o.edu + o.funeral;
  const pubTotal = i.spouseWork + i.spousePension + i.kiso + i.kosei + i.chukorei;
  const assets = Math.max(0, savingsAtD) + num(p.prot.deathSeverance);
  const need = Math.max(0, outTotal - pubTotal - assets);
  const polDeath = p.policies.filter(pol => pol.inCF && pol.insured !== '配偶者' && num(pol.death) > 0 && num(pol.startYear) <= D
    && (pol.action === '持ち続ける' || (pol.action === '一括で受け取る' ? D <= num(pol.actionYear) : D < num(pol.actionYear))))
    .reduce((s, pol) => s + num(pol.death), 0);
  const cover = num(p.prot.cover) + polDeath;
  return { D, age: D - sb, endY, years: endY - D + 1, o, i, outTotal, pubTotal, savingsAtD, assets, need, cover,
           short: need - cover, koseiYear: kosei, polDeath };
}

/* ===== 表示用 ===== */
const fmt = v => Math.round(v).toLocaleString('ja-JP');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function getPath(o, path) { return path.split('.').reduce((x, k) => x == null ? x : x[k], o); }
function setPath(o, path, v) {
  const ks = path.split('.'); const last = ks.pop();
  const t = ks.reduce((x, k) => x[k], o); t[last] = v;
}

function bindValues(root = document) {
  const p = plan();
  root.querySelectorAll('[data-k]').forEach(el => {
    const v = getPath(p, el.dataset.k);
    if (el.type === 'checkbox') el.checked = !!v;
    else el.value = v ?? '';
  });
}

const sel = (k, opts, v) => `<select data-k="${k}">${opts.map(o => `<option${o === v ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
function renderKids() {
  const p = plan();
  $('#kids').innerHTML = p.kids.map((k, i) => `<tr>
    <td><input type="text" data-k="kids.${i}.name" style="width:80px"></td>
    <td><input type="number" data-k="kids.${i}.birthYear" style="width:80px"></td>
    <td>${sel(`kids.${i}.k`, ['公立', '私立'], k.k)}</td>
    <td>${sel(`kids.${i}.e`, ['公立', '私立'], k.e)}</td>
    <td>${sel(`kids.${i}.j`, ['公立', '私立'], k.j)}</td>
    <td>${sel(`kids.${i}.h`, ['公立', '私立'], k.h)}</td>
    <td>${sel(`kids.${i}.u`, Object.keys(UNIV), k.u)}</td>
    <td style="text-align:center"><input type="checkbox" data-k="kids.${i}.away"></td>
    <td><button class="btn sm danger" data-del-kid="${i}">削除</button></td></tr>`).join('')
    || '<tr><td colspan="9" class="hint">お子さまがいる場合は追加してください。</td></tr>';
  bindValues($('#kids'));
}
function renderEvents() {
  const p = plan();
  $('#events').innerHTML = p.events.map((e, i) => `<tr>
    <td><input type="number" data-k="events.${i}.year" style="width:80px"></td>
    <td class="num" data-ev-age="${i}"></td>
    <td><input type="text" data-k="events.${i}.name" style="min-width:140px"></td>
    <td><input type="number" data-k="events.${i}.amount" style="width:90px"></td>
    <td style="text-align:center"><input type="checkbox" data-k="events.${i}.repeat"></td>
    <td><input type="number" data-k="events.${i}.count" style="width:60px"></td>
    <td><button class="btn sm danger" data-del-ev="${i}">削除</button></td></tr>`).join('')
    || '<tr><td colspan="7" class="hint">イベントはまだありません。</td></tr>';
  bindValues($('#events'));
}

function renderLiving() {
  const L = plan().living;
  const rowsHtml = (key, list) => list.map((x, i) => `<tr>
    <td><input type="text" data-k="living.${key}.${i}.name"></td>
    <td><input type="number" step="1000" data-k="living.${key}.${i}.amount" style="width:110px"></td>
    <td><button class="btn sm danger" data-del-liv="${key}.${i}">削除</button></td></tr>`).join('');
  $('#livItems').innerHTML = rowsHtml('items', L.items);
  $('#livYearly').innerHTML = rowsHtml('yearly', L.yearly);
  bindValues($('#livItems')); bindValues($('#livYearly'));
}

const POL_TYPES = ['終身保険', '個人年金保険', '学資保険', '養老保険', '変額保険', '外貨建て保険', 'その他'];
const POL_ACTIONS = ['一括で受け取る', '年金で受け取る', '持ち続ける'];
function renderPolicies() {
  const p = plan();
  const opt = (k, list, v) => `<select data-k="${k}">${list.map(o => { const [val, lab] = Array.isArray(o) ? o : [o, o];
    return `<option value="${val}"${val === v ? ' selected' : ''}>${lab}</option>`; }).join('')}</select>`;
  $('#policies').innerHTML = p.policies.map((pol, i) => { const k = `policies.${i}`; return `
  <div class="card pol">
    <h2><input type="text" data-k="${k}.name" placeholder="保険の名前（例：〇〇生命 終身保険）" style="flex:1;min-width:180px;font-weight:700">
      <button class="btn sm danger" data-del-pol="${i}">削除</button></h2>
    <div class="grid">
      <label class="f">状況${opt(k + '.status', ['加入中', '新規検討'], pol.status)}</label>
      <label class="f">種類${opt(k + '.type', POL_TYPES, pol.type)}</label>
      <label class="f">被保険者${opt(k + '.insured', ['本人', '配偶者'], pol.insured)}</label>
      <label class="f">保険料<div class="u"><input type="number" step="1000" data-k="${k}.monthly"><span>円/月</span></div></label>
      <label class="f">契約した年（する年）<div class="u"><input type="number" data-k="${k}.startYear"><span>年</span></div></label>
      <label class="f">払込期間<div class="u"><input type="number" data-k="${k}.payYears"><span>年</span></div></label>
      <label class="f">積立の利回り（手数料・保障の費用を引いた後）<div class="u"><input type="number" step="0.1" data-k="${k}.rate"><span>%/年</span></div></label>
      <label class="f">解約控除がある期間<div class="u"><input type="number" data-k="${k}.chargeYears"><span>年</span></div></label>
      <label class="f">1年目に解約したときの控除<div class="u"><input type="number" data-k="${k}.chargeRate"><span>%</span></div></label>
      <label class="f">死亡保障額<div class="u"><input type="number" data-k="${k}.death"><span>万円</span></div></label>
      <label class="f">生命保険料控除${opt(k + '.deduct', [['一般', '一般生命保険料控除'], ['個人年金', '個人年金保険料控除'], ['対象外', '対象外']], pol.deduct)}</label>
      <label class="f">受け取り方${opt(k + '.action', POL_ACTIONS, pol.action)}</label>
      <label class="f"><span data-act-label="${i}">受け取る年</span><div class="u"><input type="number" data-k="${k}.actionYear"><span data-act-age="${i}"></span></div></label>
      <label class="f" data-ann="${i}">年金を受け取る年数<div class="u"><input type="number" data-k="${k}.annYears"><span>年</span></div></label>
    </div>
    <label class="f" style="margin-top:10px">設計書の解約返戻率（任意）<input type="text" data-k="${k}.table" placeholder="経過年数:返戻率%　例）5:70, 10:92, 20:104, 30:118"></label>
    <p class="hint">設計書（保険会社の提案書）の「解約返戻率」を入れると、利回り・解約控除の設定より優先して計算します。最後の年より先は、積立の利回りで増やします。</p>
    <label class="chk" style="margin-top:6px"><input type="checkbox" data-k="${k}.inCF"> キャッシュフロー表・必要保障額に入れる（新規検討の保険は「入った場合」の計算になります）</label>
    <div id="polRes-${i}" style="margin-top:14px"></div>
  </div>`; }).join('') || '<div class="card hint">積立保険はまだありません。「＋ 積立保険を追加」から入力してください。</div>';
  bindValues($('#policies'));
}

function renderPolicyResults(p, baseRows) {
  const pct = v => v == null ? '—' : (v * 100).toFixed(2) + '%';
  const endAge = baseRows.length ? baseRows[baseRows.length - 1].age : 0;
  p.policies.forEach((pol, i) => {
    const box = document.getElementById('polRes-' + i); if (!box) return;
    const c = policyCalc(p, pol);
    const ev = c.ev, nm = esc(pol.name || pol.type);
    const ratio = ev.paid > 0 ? c.net / ev.paid : 0;
    // 加入した場合・しない場合の比較（キャッシュフロー全体）
    const withRows = simulate(p, { include: i }), woRows = simulate(p, { exclude: i });
    const lastW = withRows[withRows.length - 1], lastWo = woRows[woRows.length - 1];
    const diff = lastW && lastWo ? lastW.savings - lastWo.savings : 0;
    const nowRow = c.rows.find(x => x.year === Y0);
    let k = kpi('払込総額', `${fmt(ev.paid)}<small>万円</small>`, `月 ${num(pol.monthly).toLocaleString('ja-JP')}円 × ${Math.min(c.payYears, ev.t)}年（${ev.year}年まで）`);
    if (c.ann) {
      k += kpi('年金（税引後）', `${(c.annNet).toFixed(1)}<small>万円/年</small>`, `${c.Y}年から${c.N}年間・税引前 ${c.annual.toFixed(1)}万円/年`);
      k += kpi('受取の手取り合計', `${fmt(c.net)}<small>万円</small>`, `税金 ${fmt(c.tax)}万円（雑所得）・手取り÷払込 ${(ratio * 100).toFixed(1)}%`, ratio < 1);
    } else {
      const lab = c.hold ? `${ev.year}年に解約した場合の手取り` : `${ev.year}年の受取（手取り）`;
      k += kpi(lab, `${fmt(c.net)}<small>万円</small>`, `税引前 ${fmt(c.gross)}万円・税金 ${fmt(c.tax)}万円（一時所得）`, ratio < 1);
      k += kpi('返戻率（手取り÷払込）', `${(ratio * 100).toFixed(1)}<small>%</small>`, ratio >= 1 ? `<span class="flag ok">✓ 増えて戻ります</span>` : `<span class="flag bad">⚠ 元本割れ</span>`, ratio < 1);
    }
    k += kpi('税引後の実質利回り', `${pct(c.irr)}<small>/年</small>`, '生命保険料控除による減税も含む');
    k += kpi('元本割れが終わる時期', c.breakEven ? `${c.breakEven.t}年目<small>${c.breakEven.year}年</small>` : 'この期間ではなし', c.breakEven ? `${c.who}${c.breakEven.age}歳` : '解約返戻金が払込額を下回ったまま', !c.breakEven);
    k += kpi(`同じ額を${num(p.tax.compareRate)}%で積み立てた場合`, `${fmt(ev.compare)}<small>万円</small>`,
      `${ev.year}年末・保険の返戻金より ${ev.compare >= ev.cv ? fmt(ev.compare - ev.cv) + '万円多い' : fmt(ev.cv - ev.compare) + '万円少ない'}（NISAなど非課税を想定）`);
    k += kpi('生命保険料控除の減税', `${c.saving.toFixed(1)}<small>万円/年</small>`, '払込中の所得税・住民税（他の保険と合わせて上限あり）');
    if (pol.status === '加入中' && nowRow) k += kpi(`今年（${Y0}年）解約した場合`, `${fmt(nowRow.net)}<small>万円</small>`, `払込済 ${fmt(nowRow.paid)}万円・返戻率 ${nowRow.paid ? (nowRow.cv / nowRow.paid * 100).toFixed(1) : 0}%`, nowRow.cv < nowRow.paid);
    if (pol.status === '新規検討') k += kpi(`入った場合・入らない場合の差`, `${diff >= 0 ? '+' : ''}${fmt(diff)}<small>万円</small>`, `本人${endAge}歳時点の貯蓄${c.hold ? '。持ち続ける保険の返戻金は貯蓄に入りません' : ''}（死亡保障は含まない）`);
    const tbl = `<table class="cf"><thead><tr><th class="l">年</th><th>経過年</th><th>${esc(c.who)}の年齢</th><th>払込累計</th><th>解約返戻金</th><th>返戻率</th><th>解約時の税金</th><th>解約時の手取り</th><th>同額の積立（${num(p.tax.compareRate)}%）</th></tr></thead><tbody>` +
      c.rows.map(x => `<tr${x === ev ? ' class="ret"' : ''}><td class="l">${x.year}</td><td>${x.t}</td><td>${x.age}</td><td>${fmt(x.paid)}</td><td>${fmt(x.cv)}</td>
        <td class="${x.cv < x.paid ? 'neg' : ''}">${x.paid ? (x.cv / x.paid * 100).toFixed(1) + '%' : ''}</td><td>${x.tax ? fmt(x.tax) : ''}</td><td class="tot">${fmt(x.net)}</td><td>${fmt(x.compare)}</td></tr>`).join('') + '</tbody></table>';
    box.innerHTML = `<div class="kpis">${k}</div>
      <div class="legend"><span><i style="background:var(--s-income)"></i>解約返戻金</span><span><i style="background:var(--s-expense)"></i>払込累計</span><span><i style="background:var(--s-compare)"></i>同額を${num(p.tax.compareRate)}%で積み立てた場合</span></div>
      <div class="chart" id="polChart-${i}"></div>
      <details style="margin-top:10px"><summary>年ごとの解約返戻金・手取りの表</summary><div class="cf-wrap" style="margin-top:8px">${tbl}</div></details>`;
    drawLines(document.getElementById('polChart-' + i), c.rows, [
      { label: '解約返戻金', color: 'var(--s-income)', get: r => r.cv, dot: true },
      { label: '払込累計', color: 'var(--s-expense)', get: r => r.paid, dot: true },
      { label: '同額の積立', color: 'var(--s-compare)', get: r => r.compare, dot: true },
    ], [{ label: '解約時の手取り', color: 'transparent', get: r => r.net }]);
  });
}

function renderPlanSelect() {
  $('#planSel').innerHTML = store.plans.map(p =>
    `<option value="${p.id}"${p.id === store.current ? ' selected' : ''}>${esc(p.name || '名前なし')}（${esc(p.createdOn || '')}）</option>`).join('');
}

function updateDerived() {
  const p = plan();
  const st = num(p.startYear) || Y0;
  $('#selfAge').textContent = `${st - num(p.self.birthYear)}歳`;
  $('#spouseAge').textContent = `${st - num(p.spouse.birthYear)}歳`;
  $$('#spouseFields input, #spouseFields select').forEach(el => el.disabled = !p.spouse.enabled);
  $('#spouseFields').style.opacity = p.spouse.enabled ? 1 : .45;
  $$('[data-show]').forEach(el => el.style.display = (el.dataset.show === 'rent') === (p.house.type === '賃貸') ? '' : 'none');
  $$('#buyFields input').forEach(el => el.disabled = !p.house.buy);
  $('#buyFields').style.opacity = p.house.buy ? 1 : .45;
  const h = p.house, loan = Math.max(0, num(h.price) - num(h.down));
  const yr = pmtYear(loan, num(h.rate), num(h.years));
  $('#loanCalc').style.display = h.buy ? '' : 'none';
  $('#loanCalc').innerHTML = `借入額 <b class="num">${fmt(loan)}</b> 万円 → 毎月の返済 <b class="num">${(yr / 12).toFixed(1)}</b> 万円（年 ${fmt(yr)} 万円・元利均等）／ 総返済額 ${fmt(yr * num(h.years))} 万円・購入時に必要な現金 ${fmt(num(h.down) + num(h.price) * num(h.costRate) / 100)} 万円`;
  const L = p.living;
  $('#livingDetail').style.display = L.detail ? '' : 'none';
  $('#livCurrent').disabled = !!L.detail;
  if (L.detail) {
    const m = L.items.reduce((s, x) => s + num(x.amount), 0), y = L.yearly.reduce((s, x) => s + num(x.amount), 0);
    $('#livCalc').innerHTML = `毎月 <b class="num">${m.toLocaleString('ja-JP')}</b> 円 × 12 ＋ 年に数回 <b class="num">${y.toLocaleString('ja-JP')}</b> 円 ＝ 年 <b class="num">${fmt(m * 12 + y)}</b> 円（<b class="num">${num(L.current)}</b> 万円）`;
    $('#livCurrent').value = L.current;
  }
  p.policies.forEach((pol, i) => {
    const lab = document.querySelector(`[data-act-label="${i}"]`); if (!lab) return;
    lab.textContent = pol.action === '年金で受け取る' ? '年金を受け取り始める年' : pol.action === '持ち続ける' ? '解約返戻金を見る年' : '受け取る年（解約・満期）';
    const ins = pol.insured === '配偶者' ? p.spouse : p.self;
    document.querySelector(`[data-act-age="${i}"]`).textContent = `${num(pol.actionYear) - num(ins.birthYear)}歳`;
    document.querySelector(`[data-ann="${i}"]`).style.display = pol.action === '年金で受け取る' ? '' : 'none';
  });
  p.events.forEach((e, i) => { const c = document.querySelector(`[data-ev-age="${i}"]`); if (c) c.textContent = `${num(e.year) - num(p.self.birthYear)}歳`; });
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
const W = 960, H = 280, PL = 58, PR = 12, PT = 12, PB = 30;

function chartFrame(rows, lo, hi) {
  const n = rows.length, step = (W - PL - PR) / n;
  const y = v => PT + (hi - v) / (hi - lo) * (H - PT - PB);
  const x = i => PL + i * step;
  return { n, step, x, y };
}
function axes(rows, sc, f) {
  let g = '';
  sc.ticks.forEach(t => {
    g += `<line x1="${PL}" x2="${W - PR}" y1="${f.y(t)}" y2="${f.y(t)}" stroke="var(--grid)" stroke-width="1"/>`;
    g += `<text x="${PL - 6}" y="${f.y(t) + 4}" text-anchor="end">${fmt(t)}</text>`;
  });
  g += `<line x1="${PL}" x2="${W - PR}" y1="${f.y(0)}" y2="${f.y(0)}" stroke="var(--axis)" stroke-width="1"/>`;
  rows.forEach((r, i) => {
    if (r.age % 5 === 0) g += `<text x="${f.x(i) + f.step / 2}" y="${H - 10}" text-anchor="middle">${r.age}歳</text>`;
  });
  return g;
}
function roundedBar(x, y0, y1, w, r) {
  const top = Math.min(y0, y1), h = Math.abs(y1 - y0); if (h < .5) return '';
  r = Math.min(r, w / 2, h);
  if (y1 <= y0) // 上向き: 上の角を丸める
    return `M${x},${y0}V${top + r}Q${x},${top} ${x + r},${top}H${x + w - r}Q${x + w},${top} ${x + w},${top + r}V${y0}Z`;
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + w - r}Q${x + w},${y1} ${x + w},${y1 - r}V${y0}Z`;
}

function hover(el, rows, f, lines) {
  const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), cross = svg.querySelector('.cross'), dots = svg.querySelector('.dots');
  const show = ev => {
    const b = svg.getBoundingClientRect();
    const sx = (ev.clientX - b.left) / b.width * W;
    const i = Math.floor((sx - PL) / f.step);
    if (i < 0 || i >= rows.length) return hide();
    const r = rows[i], cx = f.x(i) + f.step / 2;
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.style.display = '';
    dots.innerHTML = lines.filter(l => l.dot).map(l => `<circle cx="${cx}" cy="${f.y(l.get(r))}" r="4.5" fill="${l.color}" stroke="var(--surface)" stroke-width="2"/>`).join('');
    tip.innerHTML = `<b>${r.year}年（${esc(r.who || '本人')}${r.age}歳）</b>` + lines.map(l =>
      `<div class="r"><span><i style="background:${l.color}"></i>${l.label}</span><span class="num">${fmt(l.get(r))} 万円</span></div>`).join('')
      + (r.notes.length ? `<div class="hint">${esc(r.notes.join('・'))}</div>` : '');
    tip.style.display = 'block';
    const px = cx / W * b.width, tw = tip.offsetWidth;
    tip.style.left = Math.min(Math.max(0, px + 12), b.width - tw) + 'px';
    tip.style.top = '8px';
  };
  const hide = () => { tip.style.display = 'none'; cross.style.display = 'none'; dots.innerHTML = ''; };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerleave', hide);
}

function drawSavings(rows) {
  const el = $('#chSave');
  const vals = rows.map(r => r.savings);
  const sc = niceScale(Math.min(0, ...vals), Math.max(0, ...vals));
  const f = chartFrame(rows, sc.lo, sc.hi);
  const bw = Math.max(1, f.step - 2);
  let bars = '';
  rows.forEach((r, i) => {
    const d = roundedBar(f.x(i) + 1, f.y(0), f.y(r.savings), bw, 4);
    bars += `<path d="${d}" fill="${r.savings < 0 ? 'var(--critical)' : 'var(--s-save)'}"/>`;
  });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="貯蓄残高の推移">${axes(rows, sc, f)}${bars}
    <line class="cross" y1="${PT}" y2="${H - PB}" stroke="var(--ink-3)" stroke-width="1" style="display:none"/><g class="dots"></g></svg><div class="tip"></div>`;
  hover(el, rows, f, [{ label: '貯蓄残高', color: 'var(--s-save)', get: r => r.savings }]);
}

function drawFlow(rows) {
  drawLines($('#chFlow'), rows, [
    { label: '収入', color: 'var(--s-income)', get: r => r.incTotal, dot: true },
    { label: '支出', color: 'var(--s-expense)', get: r => r.expTotal, dot: true },
  ], [{ label: '年間収支', color: 'transparent', get: r => r.balance }]);
}
function drawLines(el, rows, lines, extra = []) {
  const vals = rows.flatMap(r => lines.map(l => l.get(r)));
  const sc = niceScale(0, Math.max(...vals));
  const f = chartFrame(rows, sc.lo, sc.hi);
  const path = get => rows.map((r, i) => `${i ? 'L' : 'M'}${(f.x(i) + f.step / 2).toFixed(1)},${f.y(get(r)).toFixed(1)}`).join('');
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img">${axes(rows, sc, f)}
    ${lines.map(l => `<path d="${path(l.get)}" fill="none" stroke="${l.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}
    <line class="cross" y1="${PT}" y2="${H - PB}" stroke="var(--ink-3)" stroke-width="1" style="display:none"/><g class="dots"></g></svg><div class="tip"></div>`;
  hover(el, rows, f, [...lines, ...extra]);
}

/* ===== 結果 ===== */
function kpi(label, value, detail, bad) {
  return `<div class="kpi${bad ? ' bad' : ''}"><div class="l">${label}</div><div class="v">${value}</div><div class="d">${detail || ''}</div></div>`;
}

function renderCF(p, rows) {
  if (!rows.length) { $('#kpis').innerHTML = ''; $('#cfTable').innerHTML = ''; return; }
  const min = rows.reduce((m, r) => r.savings < m.savings ? r : m, rows[0]);
  const neg = rows.find(r => r.savings < 0);
  const ret = rows.find(r => r.age === num(p.self.retireAge));
  const last = rows[rows.length - 1];
  $('#kpis').innerHTML =
    kpi('貯蓄が底をつく年', neg ? `${neg.year}年<small>本人${neg.age}歳</small>` : 'なし',
      neg ? '<span class="flag bad">⚠ 見直しが必要です</span>' : `<span class="flag ok">✓ ${last.age}歳まで貯蓄が残ります</span>`, !!neg) +
    kpi('貯蓄がいちばん少ない年', `${fmt(min.savings)}<small>万円</small>`, `${min.year}年（本人${min.age}歳）`, min.savings < 0) +
    kpi('本人の退職時の貯蓄', ret ? `${fmt(ret.savings)}<small>万円</small>` : '—', ret ? `${ret.year}年（${ret.age}歳）退職金を含む` : '', ret && ret.savings < 0) +
    kpi(`${last.age}歳時点の貯蓄`, `${fmt(last.savings)}<small>万円</small>`, `${last.year}年`, last.savings < 0);

  drawSavings(rows); drawFlow(rows);

  const kids = p.kids.map(k => esc(k.name || '子'));
  const sp = p.spouse.enabled;
  const inc = [['incSelf', '本人給与'], ...(sp ? [['incSpouse', '配偶者給与']] : []), ['pension', '年金'], ['severance', '退職金'], ['allowance', '児童手当'], ['polIn', '保険の受取'], ['otherInc', 'その他']];
  const exp = [['living', '生活費'], ['housing', '住居費'], ['edu', '教育費'], ['ins', '保険料'], ['polPrem', '積立保険'], ['car', '車'], ['other', 'その他']];
  const ages = 2 + (sp ? 1 : 0) + kids.length;
  let html = `<thead><tr class="grp"><th class="sticky l" colspan="1"></th><th colspan="${ages - 1}">年齢</th><th></th>
    <th colspan="${inc.length + 1}">収入</th><th colspan="${exp.length + 1}">支出</th><th colspan="2"></th></tr>
    <tr class="col"><th class="sticky l">年</th><th>本人</th>${sp ? '<th>配偶者</th>' : ''}${kids.map(k => `<th>${k}</th>`).join('')}<th class="l">できごと</th>
    ${inc.map(c => `<th>${c[1]}</th>`).join('')}<th>収入計</th>${exp.map(c => `<th>${c[1]}</th>`).join('')}<th>支出計</th><th>年間収支</th><th>貯蓄残高</th></tr></thead><tbody>`;
  const z = v => v ? fmt(v) : '';
  rows.forEach(r => {
    html += `<tr${r.age === num(p.self.retireAge) ? ' class="ret"' : ''}><td class="sticky l">${r.year}</td><td>${r.age}</td>${sp ? `<td>${r.spAge}</td>` : ''}
      ${r.kidAges.map(a => `<td>${a >= 0 && a <= 30 ? a : ''}</td>`).join('')}<td class="ev" title="${esc(r.notes.join('・'))}">${esc(r.notes.join('・'))}</td>
      ${inc.map(c => `<td>${z(r[c[0]])}</td>`).join('')}<td class="tot">${fmt(r.incTotal)}</td>
      ${exp.map(c => `<td>${z(r[c[0]])}</td>`).join('')}<td class="tot">${fmt(r.expTotal)}</td>
      <td class="${r.balance < 0 ? 'neg' : ''}">${fmt(r.balance)}</td><td class="tot ${r.savings < 0 ? 'neg' : ''}">${fmt(r.savings)}</td></tr>`;
  });
  $('#cfTable').innerHTML = html + '</tbody>';
}

function renderProt(p, rows) {
  const r = protection(p, rows);
  const spName = p.spouse.enabled ? (p.spouse.name || '配偶者') : 'お子さま';
  $('#protKpis').innerHTML =
    kpi('必要保障額', `${fmt(r.need)}<small>万円</small>`, `本人${r.age}歳（${r.D}年）で万一の場合`) +
    kpi('加入中の死亡保険', `${fmt(r.cover)}<small>万円</small>`, '') +
    kpi(r.short > 0 ? '不足している保障' : '保障の余裕', `${fmt(Math.abs(r.short))}<small>万円</small>`,
      r.short > 0 ? '<span class="flag bad">⚠ 保障が足りません</span>' : '<span class="flag ok">✓ 今の保障で足りています</span>', r.short > 0);

  const total = Math.max(r.outTotal, r.pubTotal + r.assets + r.cover, 1);
  const pct = v => (Math.max(0, v) / total * 100).toFixed(2) + '%';
  const seg = (v, color, label) => v > 0 ? `<div class="seg" style="width:${pct(v)};background:${color}" title="${label} ${fmt(v)}万円">${label}</div>` : '';
  const haveCover = Math.min(r.cover, r.need);
  $('#protBars').innerHTML = `
    <div class="pbar"><span>必要なお金<br><b class="num">${fmt(r.outTotal)} 万円</b></span><div class="track">${seg(r.outTotal, 'var(--s-expense)', '生活費・住居費・教育費など')}</div></div>
    <div class="pbar"><span>用意できるお金<br><b class="num">${fmt(r.pubTotal + r.assets + haveCover)} 万円</b></span><div class="track">
      ${seg(r.pubTotal + Math.min(r.assets, r.outTotal - r.pubTotal), 'var(--s-income)', '年金・収入・貯蓄')}${seg(haveCover, 'var(--s-save)', '加入中の保険')}${seg(Math.max(0, r.short), 'var(--critical)', '⚠ 不足')}</div></div>
    <div class="legend" style="margin-top:6px"><span><i class="bar" style="background:var(--s-expense)"></i>必要なお金</span><span><i class="bar" style="background:var(--s-income)"></i>年金・収入・貯蓄</span><span><i class="bar" style="background:var(--s-save)"></i>加入中の保険</span><span><i class="bar" style="background:var(--critical)"></i>不足（追加で必要な保障）</span></div>
    <p class="hint">${r.D}年〜${r.endY}年（${r.years}年間・${spName}${p.spouse.enabled ? `が${num(p.prot.spouseUntil)}歳になるまで` : 'が独立するまで'}）の合計です。物価の上昇は入れていません。</p>`;

  const row = (l, v, sw) => `<tr><td>${sw ? `<span class="swatch" style="background:${sw}"></span>` : ''}${l}</td><td>${fmt(v)} 万円</td></tr>`;
  $('#protOut').innerHTML =
    row(`生活費（末子独立まで${num(p.prot.rate1)}%・その後${num(p.prot.rate2)}%）`, r.o.living) +
    row(`住居費${p.prot.dansin ? '（ローンは団信で完済）' : ''}`, r.o.housing) +
    row('教育費', r.o.edu) + row('お葬式・整理資金', r.o.funeral) +
    `<tr class="t"><td><span class="swatch" style="background:var(--s-expense)"></span>合計</td><td>${fmt(r.outTotal)} 万円</td></tr>`;
  $('#protIn').innerHTML =
    (p.spouse.enabled ? row(`${esc(spName)}の給与・退職金`, r.i.spouseWork) + row(`${esc(spName)}の老齢年金`, r.i.spousePension) : '') +
    row('遺族基礎年金（18歳までの子がいる間）', r.i.kiso) +
    row(`遺族厚生年金（年 ${fmt(r.koseiYear)} 万円）`, r.i.kosei) +
    (r.i.chukorei ? row('中高齢寡婦加算', r.i.chukorei) : '') +
    row('今の貯蓄（万一の年の初め）', Math.max(0, r.savingsAtD)) +
    (num(p.prot.deathSeverance) ? row('死亡退職金・弔慰金', num(p.prot.deathSeverance)) : '') +
    `<tr class="t"><td><span class="swatch" style="background:var(--s-income)"></span>合計</td><td>${fmt(r.pubTotal + r.assets)} 万円</td></tr>` +
    row('加入中の死亡保険（④以外）', num(p.prot.cover), 'var(--s-save)') +
    (r.polDeath ? row('積立保険の死亡保障（④）', r.polDeath, 'var(--s-save)') : '');
}

function renderResults() {
  const p = plan();
  const rows = simulate(p);
  renderCF(p, rows);
  renderProt(p, rows);
  renderPolicyResults(p, rows);
  $('#phTitle').textContent = `${p.name || ''} ライフプラン`;
  $('#phSub').textContent = `作成日 ${p.createdOn || ''}${p.staff ? '　担当 ' + p.staff : ''}　（金額は万円）${p.memo ? '　' + p.memo : ''}`;
}

function renderAll() {
  renderPlanSelect(); bindValues(); renderKids(); renderEvents(); renderLiving(); renderPolicies(); updateDerived(); renderResults();
}

/* ===== 操作 ===== */
let timer;
function onEdit(e) {
  const el = e.target; if (!el.dataset || !el.dataset.k) return;
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'number') v = el.value === '' ? '' : +el.value;
  else v = el.value;
  const p = plan();
  setPath(p, el.dataset.k, v);
  if (el.dataset.k.startsWith('living.')) syncLiving(p);
  const m = el.dataset.k.match(/^policies\.(\d+)\.type$/);
  if (m) { // 種類を選んだら、よくある設定にそろえる
    const pol = p.policies[+m[1]];
    pol.deduct = v === '個人年金保険' ? '個人年金' : '一般';
    if (v === '個人年金保険') { pol.action = '年金で受け取る'; pol.death = 0; }
    if (v === '学資保険' || v === '養老保険') pol.action = '一括で受け取る';
    if (v === '学資保険') pol.death = 0;
    bindValues(el.closest('.pol'));
  }
  updateDerived();
  if (el.dataset.k === 'name' || el.dataset.k === 'createdOn') renderPlanSelect();
  clearTimeout(timer);
  timer = setTimeout(() => { renderResults(); save(); }, 150);
}
document.addEventListener('input', onEdit);
document.addEventListener('change', onEdit);

document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  const p = plan();
  if (t.dataset.tab) {
    store.tab = t.dataset.tab; showTab(); save();
  } else if (t.dataset.delKid != null) {
    p.kids.splice(+t.dataset.delKid, 1); renderKids(); renderResults(); save();
  } else if (t.dataset.delLiv != null) {
    const [key, i] = t.dataset.delLiv.split('.'); p.living[key].splice(+i, 1); syncLiving(p);
    renderLiving(); updateDerived(); renderResults(); save();
  } else if (t.dataset.delPol != null) {
    if (!confirm('この保険を削除しますか？')) return;
    p.policies.splice(+t.dataset.delPol, 1); renderPolicies(); updateDerived(); renderResults(); save();
  } else if (t.dataset.delEv != null) {
    p.events.splice(+t.dataset.delEv, 1); renderEvents(); updateDerived(); renderResults(); save();
  }
});
function showTab() {
  $$('nav.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === store.tab));
  $$('section.tab').forEach(s => s.classList.toggle('on', s.id === 'tab-' + store.tab));
}

$('#bAddKid').onclick = () => {
  plan().kids.push({ name: `第${plan().kids.length + 1}子`, birthYear: Y0, k: '公立', e: '公立', j: '公立', h: '公立', u: '国公立大学', away: false });
  renderKids(); renderResults(); save();
};
$('#bAddEv').onclick = () => {
  plan().events.push({ year: Y0 + 1, name: '', amount: -100, repeat: false, count: 1 });
  renderEvents(); updateDerived(); renderResults(); save();
};
$('#bAddLiv').onclick = () => { plan().living.items.push({ name: '', amount: 0 }); renderLiving(); save(); };
$('#bAddLivY').onclick = () => { plan().living.yearly.push({ name: '', amount: 0 }); renderLiving(); save(); };
$('#bRetired').onclick = () => { const p = plan(); p.living.retired = Math.round(num(p.living.current) * 0.8); bindValues(); renderResults(); save(); };
$('#bAddPol').onclick = () => { plan().policies.push(newPolicy()); renderPolicies(); updateDerived(); renderResults(); save(); };
$('#planSel').onchange = e => { store.current = e.target.value; save(); renderAll(); };
$('#bNew').onclick = () => { const p = newPlan(false); store.plans.push(p); store.current = p.id; store.tab = 'basic'; save(); renderAll(); showTab(); };
$('#bDup').onclick = () => {
  const p = JSON.parse(JSON.stringify(plan())); p.id = uid(); p.name = (p.name || '') + '（コピー）'; p.createdOn = today();
  store.plans.push(p); store.current = p.id; save(); renderAll();
};
$('#bDel').onclick = () => {
  const p = plan();
  if (!confirm(`「${p.name}」のプランを削除します。元に戻せません。よろしいですか？`)) return;
  store.plans = store.plans.filter(x => x.id !== p.id);
  if (!store.plans.length) store.plans.push(newPlan(false));
  store.current = store.plans[0].id; save(); renderAll();
};
$('#bExport').onclick = () => {
  const p = plan();
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ライフプラン_${(p.name || '').replace(/[\\/:*?"<>|\s]/g, '')}_${today()}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$('#fImport').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    const list = Array.isArray(d) ? d : d.plans ? d.plans : [d];
    list.forEach(x => { const base = newPlan(false); const p = Object.assign(base, x); ['self', 'spouse', 'save', 'living', 'house', 'ins', 'car', 'prot'].forEach(k => p[k] = Object.assign(newPlan(false)[k], x[k] || {})); migrate(p); p.id = uid(); store.plans.push(p); store.current = p.id; });
    save(); renderAll(); alert(`${list.length}件のプランを読み込みました。`);
  } catch (err) { alert('読み込めませんでした。書き出したファイル（.json）を選んでください。'); }
  e.target.value = '';
};
$('#bPrint').onclick = () => { renderResults(); window.print(); };

load(); renderAll(); showTab();
