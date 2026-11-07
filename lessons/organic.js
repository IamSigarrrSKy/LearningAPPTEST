/* Chapter 10 organic chemistry lab: build-and-name, boiling points, functional-group tests, esterification */
(() => {
  const { $, svg, mix, reduce, loop } = window.Lab;
  const SUB = '₀₁₂₃₄₅₆₇₈₉', sub = n => String(n).split('').map(d => SUB[d]).join('');
  const ROOT = ['', 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct'];

  /* ---------- 1. build and name ---------- */
  const FAM = {
    alkane: { th: 'แอลเคน', min: 1, gen: 'CₙH₂ₙ₊₂' },
    alkene: { th: 'แอลคีน (C=C)', min: 2, gen: 'CₙH₂ₙ' },
    alkyne: { th: 'แอลไคน์ (C≡C)', min: 2, gen: 'CₙH₂ₙ₋₂' },
    alcohol: { th: 'แอลกอฮอล์ (−OH)', min: 1, gen: 'CₙH₂ₙ₊₁OH' },
    aldehyde: { th: 'แอลดีไฮด์ (−CHO)', min: 1, gen: 'CₙH₂ₙO (R−CHO)' },
    ketone: { th: 'คีโตน (C=O กลางโซ่)', min: 3, gen: 'CₙH₂ₙO (R−CO−R′)' },
    acid: { th: 'กรดคาร์บอกซิลิก (−COOH)', min: 1, gen: 'CₙH₂ₙO₂ (R−COOH)' },
  };
  const COMMON = { methanal: 'ฟอร์มาลดีไฮด์ (formaldehyde)', ethanal: 'แอซีทัลดีไฮด์', propanone: 'แอซีโทน (acetone) ใช้ในน้ำยาล้างเล็บ',
    'methanoic acid': 'กรดฟอร์มิก พบในพิษมด', 'ethanoic acid': 'กรดแอซีติก ในน้ำส้มสายชู', ethanol: 'เอทิลแอลกอฮอล์ ในเครื่องดื่มและแอลกอฮอล์ล้างแผล',
    methanol: 'เมทิลแอลกอฮอล์ เป็นพิษ', ethene: 'เอทิลีน แก๊สเร่งการสุกของผลไม้', ethyne: 'แอซีทิลีน แก๊สในการเชื่อมโลหะ', methane: 'แก๊สธรรมชาติ แก๊สชีวภาพ',
    propane: 'แก๊สหุงต้ม (LPG) ผสมกับบิวเทน', butane: 'แก๊สในไฟแช็กและ LPG', 'propan-2-ol': 'ไอโซโพรพิลแอลกอฮอล์ ใช้ทำความสะอาด', 'butanoic acid': 'กรดบิวทิริก กลิ่นเนยหืน' };
  const posOpts = (f, n) => f === 'alkene' || f === 'alkyne' ? range(1, n - 1) : f === 'alcohol' ? range(1, n) : f === 'ketone' ? range(2, n - 1) : f === 'aldehyde' || f === 'acid' ? [n] : [];
  const brOpts = (f, n, p) => range(2, n - 1).filter(b => !(f === 'ketone' && b === p) && !(f === 'alkyne' && (b === p || b === p + 1)));
  function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
  const multi = f => f === 'alkene' || f === 'alkyne';

  // numbering: try both ends; the functional group gets the lowest number, then the branch
  function analyse({ f, n, p, b }) {
    const loc = (i, dir) => dir ? n + 1 - i : i, bondLoc = (i, dir) => dir ? n - i : i;
    const keyOf = dir => { const k = []; if (f !== 'alkane') k.push(multi(f) ? bondLoc(p, dir) : loc(p, dir)); if (b) k.push(loc(b, dir)); return k; };
    const kL = keyOf(0), kR = keyOf(1);
    let dir = 0; for (let i = 0; i < kL.length; i++) { if (kR[i] < kL[i]) { dir = 1; break; } if (kR[i] > kL[i]) break; }
    const fl = f === 'alkane' ? 0 : multi(f) ? bondLoc(p, dir) : loc(p, dir), bl = b ? loc(b, dir) : 0;
    const r = ROOT[n], pre = b ? `${bl}-methyl` : '';
    let name;
    if (f === 'alkane') name = pre + r + 'ane';
    else if (multi(f)) name = pre + r + (n <= 3 && !b ? '' : `-${fl}-`) + (f === 'alkene' ? 'ene' : 'yne');
    else if (f === 'alcohol') name = pre + r + (n <= 2 ? 'anol' : `an-${fl}-ol`);
    else if (f === 'ketone') name = pre + r + (n === 3 ? 'anone' : `an-${fl}-one`);
    else if (f === 'aldehyde') name = pre + r + 'anal';
    else name = pre + r + 'anoic acid';
    const C = n + (b ? 1 : 0), H = { alkane: 2 * C + 2, alkene: 2 * C, alkyne: 2 * C - 2, alcohol: 2 * C + 2, aldehyde: 2 * C, ketone: 2 * C, acid: 2 * C }[f];
    const O = { alcohol: 1, aldehyde: 1, ketone: 1, acid: 2 }[f] || 0;
    const mol = `C${C > 1 ? sub(C) : ''}H${sub(H)}${O ? 'O' + (O > 1 ? sub(O) : '') : ''}`;
    return { dir, fl, bl, name, mol, C, H, O };
  }

  function condensed({ f, n, p, b }) {
    let s = '';
    for (let i = 1; i <= n; i++) {
      let used = (i > 1) + (i < n) + (b === i);
      if (f === 'alkene' && (i === p || i === p + 1)) used += 1;
      if (f === 'alkyne' && (i === p || i === p + 1)) used += 2;
      if (f === 'alcohol' && i === p) used += 1;
      if (f === 'ketone' && i === p) used += 2;
      let g;
      if (f === 'aldehyde' && i === n) g = n === 1 ? 'HCHO' : 'CHO';
      else if (f === 'acid' && i === n) g = n === 1 ? 'HCOOH' : 'COOH';
      else if (f === 'ketone' && i === p) g = 'CO';
      else {
        const h = 4 - used; g = 'C' + (h ? 'H' + (h > 1 ? sub(h) : '') : '') + (b === i ? '(CH₃)' : '');
        if (f === 'alcohol' && i === p) g = n === 1 ? g + 'OH' : i === 1 ? 'HO' + g : i === n ? g + 'OH' : g + '(OH)';
      }
      s += g;
      if (i < n) s += multi(f) && i === p ? (f === 'alkene' ? '=' : '≡') : '';
    }
    return s;
  }

  // skeletal formula: zigzag chain (straight through a triple bond), substituents pointing outward
  function skeletal(st, info) {
    const { f, n, p, b } = st, out = $('bSvg'); out.innerHTML = '';
    if (n === 1) { out.setAttribute('viewBox', '0 0 600 200'); out.append(svg('text', { x: 300, y: 112, 'text-anchor': 'middle', class: 'big' }, condensed(st)));
      out.append(svg('text', { x: 300, y: 160, 'text-anchor': 'middle', class: 'loc' }, 'คาร์บอนอะตอมเดียว จึงเขียนเป็นสูตรแบบย่อ')); return; }
    const ang = k => (k % 2 ? -30 : 30) * Math.PI / 180, A = [];
    for (let k = 0; k <= n; k++) A[k] = ang(k);
    if (f === 'alkyne') [p - 1, p, p + 1].forEach(k => { if (k >= 0 && k <= n) A[k] = 0; });
    const L = 78, P = [null, { x: 0, y: 0 }];
    for (let i = 2; i <= n; i++) P[i] = { x: P[i - 1].x + L * Math.cos(A[i - 1]), y: P[i - 1].y + L * Math.sin(A[i - 1]) };
    const unit = (a, c) => { const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy); return { x: dx / d, y: dy / d }; };
    const rot = (v, deg) => { const t = deg * Math.PI / 180; return { x: v.x * Math.cos(t) - v.y * Math.sin(t), y: v.x * Math.sin(t) + v.y * Math.cos(t) }; };
    const outward = i => {
      if (i > 1 && i < n) { const u1 = unit(P[i], P[i - 1]), u2 = unit(P[i], P[i + 1]); let v = { x: -(u1.x + u2.x), y: -(u1.y + u2.y) }; const d = Math.hypot(v.x, v.y); return d < .1 ? { x: 0, y: -1 } : { x: v.x / d, y: v.y / d }; }
      const k = i === 1 ? 0 : n, a = A[k], v = { x: Math.cos(a), y: Math.sin(a) }; return i === 1 ? { x: -v.x, y: -v.y } : v; // continue the zigzag
    };
    const parts = [], labels = [];
    const line = (a, c, cls = 'bond') => parts.push(svg('line', { x1: a.x, y1: a.y, x2: c.x, y2: c.y, class: cls }));
    for (let i = 1; i < n; i++) {
      line(P[i], P[i + 1]);
      const order = multi(f) && i === p ? (f === 'alkene' ? 2 : 3) : 1;
      if (order > 1) {
        const u = unit(P[i], P[i + 1]), nrm = { x: -u.y, y: u.x };
        let side = 1; const mid = { x: (P[i].x + P[i + 1].x) / 2, y: (P[i].y + P[i + 1].y) / 2 }, cy = P.slice(1).reduce((s, q) => s + q.y, 0) / n;
        if ((mid.y + nrm.y * 8 - cy) * (mid.y - cy) > 0 && Math.abs(mid.y - cy) > 1) side = -1;
        const offs = order === 2 ? [7 * side] : [7, -7];
        offs.forEach(o => { const s = .14; line({ x: P[i].x + nrm.x * o + u.x * L * s, y: P[i].y + nrm.y * o + u.y * L * s }, { x: P[i + 1].x + nrm.x * o - u.x * L * s, y: P[i + 1].y + nrm.y * o - u.y * L * s }); });
      }
    }
    const subAt = (i, dirv, text, dbl) => {
      const end = { x: P[i].x + dirv.x * 60, y: P[i].y + dirv.y * 60 };
      if (dbl) { const nr = { x: -dirv.y * 4, y: dirv.x * 4 }; line({ x: P[i].x + nr.x, y: P[i].y + nr.y }, { x: end.x + nr.x, y: end.y + nr.y }); line({ x: P[i].x - nr.x, y: P[i].y - nr.y }, { x: end.x - nr.x, y: end.y - nr.y }); }
      else if (text) line(P[i], { x: P[i].x + dirv.x * 52, y: P[i].y + dirv.y * 52 });
      else line(P[i], end);
      if (text) labels.push(svg('text', { x: end.x + dirv.x * 14, y: end.y + dirv.y * 14 + 8, 'text-anchor': 'middle', class: 'hetero' }, text));
    };
    for (let i = 1; i <= n; i++) {
      const subs = [];
      if (b === i) subs.push(['', false]);
      if (f === 'alcohol' && i === p) subs.push(['OH', false]);
      if (f === 'ketone' && i === p) subs.push(['O', true]);
      const o = outward(i);
      if ((f === 'aldehyde' || f === 'acid') && i === n) {
        const u = unit(P[n], P[n - 1]), d1 = rot({ x: -u.x, y: -u.y }, -60), d2 = rot({ x: -u.x, y: -u.y }, 60), up = d1.y < d2.y ? d1 : d2, dn = up === d1 ? d2 : d1;
        subAt(n, up, 'O', true); subAt(n, dn, f === 'acid' ? 'OH' : 'H', false);
      } else if (subs.length === 1) subAt(i, o, subs[0][0], subs[0][1]);
      else if (subs.length === 2) { subAt(i, rot(o, -38), subs[0][0], subs[0][1]); subAt(i, rot(o, 38), subs[1][0], subs[1][1]); }
      // carbon number on the inner side
      let inn = { x: -o.x, y: -o.y };
      if (i === 1 || i === n) { // chain end: past the end, or beside an end substituent
        const u = unit(P[i], P[i === 1 ? 2 : n - 1]), base = { x: -u.x, y: -u.y };
        inn = base;
        if (subs.length) { const c1 = rot(base, 60), c2 = rot(base, -60); inn = c1.x * o.x + c1.y * o.y < c2.x * o.x + c2.y * o.y ? c1 : c2; }
      }
      const num = info.dir ? n + 1 - i : i;
      labels.push(svg('text', { x: P[i].x + inn.x * 26, y: P[i].y + inn.y * 26 + 5, 'text-anchor': 'middle', class: 'loc' }, num));
    }
    parts.concat(labels).forEach(e => out.append(e));
    const bb = out.getBBox(), pad = 30;
    out.setAttribute('viewBox', `${bb.x - pad} ${bb.y - pad} ${Math.max(bb.width + 2 * pad, 320)} ${Math.max(bb.height + 2 * pad, 170)}`);
  }

  const st = { f: 'alcohol', n: 4, p: 2, b: 0 };
  const fill = (sel, opts, cur, label) => { sel.innerHTML = opts.map(v => `<option value="${v}"${v === cur ? ' selected' : ''}>${label(v)}</option>`).join(''); };
  function clamp() {
    st.n = Math.max(st.n, FAM[st.f].min);
    const po = posOpts(st.f, st.n); if (po.length && !po.includes(st.p)) st.p = po[0];
    if (st.b && !brOpts(st.f, st.n, st.p).includes(st.b)) st.b = 0;
  }
  function allStates() {
    const res = [];
    for (const f of Object.keys(FAM)) for (let n = FAM[f].min; n <= 6; n++) { const po = posOpts(f, n); for (const p of po.length ? po : [0]) for (const b of [0, ...brOpts(f, n, p)]) res.push({ f, n, p, b }); }
    return res;
  }
  const ALL = allStates().map(s => ({ s, a: analyse(s) }));
  function renderBuild() {
    clamp();
    $('bN').value = st.n; $('bNOut').value = st.n;
    fill($('bFam'), Object.keys(FAM), st.f, k => FAM[k].th);
    const po = posOpts(st.f, st.n);
    fill($('bPos'), po.length ? po : [0], po.length ? st.p : 0, v => !v ? 'ไม่มี (แอลเคน)' : multi(st.f) ? `ระหว่างคาร์บอนตัวที่ ${v} กับ ${v + 1} (นับจากซ้าย)` : `คาร์บอนตัวที่ ${v} (นับจากซ้าย)`);
    $('bPos').disabled = po.length <= 1;
    const bo = brOpts(st.f, st.n, st.p);
    fill($('bBr'), [0, ...bo], st.b, v => v ? `ที่คาร์บอนตัวที่ ${v} (นับจากซ้าย)` : 'ไม่มี');
    $('bBr').disabled = !bo.length;
    const a = analyse(st);
    $('bName').textContent = a.name; $('bCommon').textContent = COMMON[a.name] || FAM[st.f].th;
    $('bMol').textContent = a.mol; $('bCond').textContent = condensed(st); $('bGen').textContent = FAM[st.f].gen;
    const why = [];
    if (st.f === 'alkane' && st.b) why.push(`นับจากปลายที่ทำให้หมู่เมทิลได้เลขต่ำสุด จึงเป็นตำแหน่ง ${a.bl}`);
    if (st.f !== 'alkane' && posOpts(st.f, st.n).length > 1) why.push(`นับจากปลายที่ใกล้${multi(st.f) ? 'พันธะ' + (st.f === 'alkene' ? 'คู่' : 'สาม') : 'หมู่ฟังก์ชัน'}ที่สุด จึงได้ตำแหน่ง ${a.fl}${st.b ? ` แล้วหมู่เมทิลอยู่ที่ ${a.bl}` : ''}`);
    if (st.f === 'aldehyde' || st.f === 'acid') why.push('คาร์บอนของหมู่ −CHO หรือ −COOH เป็นคาร์บอนตัวที่ 1 เสมอ จึงไม่ต้องบอกตำแหน่ง');
    if (st.f === 'alkyne') why.push('คาร์บอนที่มีพันธะสามและอะตอมที่ต่อกับมันอยู่ในแนวเส้นตรง (มุม 180°)');
    $('bWhy').textContent = why.join(' ');
    skeletal(st, a);
    const iso = ALL.filter(x => x.a.mol === a.mol && x.a.name !== a.name), seen = new Set();
    $('bIso').innerHTML = '';
    iso.forEach(x => { if (seen.has(x.a.name)) return; seen.add(x.a.name); const btn = document.createElement('button'); btn.textContent = x.a.name; btn.onclick = () => { Object.assign(st, x.s); renderBuild(); }; $('bIso').append(btn); });
    $('bIsoNote').textContent = seen.size ? `${seen.size} แบบ แตะเพื่อดูโครงสร้าง` + (st.f === 'alcohol' ? ' (ยังมีอีเทอร์ที่สูตรโมเลกุลเดียวกันด้วย)' : st.f === 'acid' ? ' (ยังมีเอสเทอร์ที่สูตรโมเลกุลเดียวกันด้วย)' : '') : 'ไม่มีไอโซเมอร์อื่นที่สร้างได้ในห้องนี้';
  }
  $('bFam').onchange = e => { st.f = e.target.value; renderBuild(); };
  $('bN').oninput = e => { st.n = +e.target.value; renderBuild(); };
  $('bPos').onchange = e => { st.p = +e.target.value; renderBuild(); };
  $('bBr').onchange = e => { st.b = +e.target.value; renderBuild(); };

  /* ---------- 2. boiling points ---------- */
  const FORCE = { disp: ['แรงลอนดอนอย่างเดียว', '#9aa1b1'], dip: ['แรงระหว่างขั้ว (ไดโพล-ไดโพล)', '#d9822b'], hb: ['พันธะไฮโดรเจน', '#2f8a74'], hb2: ['พันธะไฮโดรเจน 2 จุด (จับคู่เป็นไดเมอร์)', '#1f5f8b'] };
  const MASS = [
    ['butane', 'แอลเคน', 'CH₃CH₂CH₂CH₃', 58, -0.5, 'disp', 'ไม่ละลาย'],
    ['methoxyethane', 'อีเทอร์', 'CH₃OCH₂CH₃', 60, 7.4, 'dip', 'ละลายได้เล็กน้อย'],
    ['methyl methanoate', 'เอสเทอร์', 'HCOOCH₃', 60, 32, 'dip', 'ละลายได้'],
    ['propanal', 'แอลดีไฮด์', 'CH₃CH₂CHO', 58, 48, 'dip', 'ละลายได้ดี'],
    ['propan-1-amine', 'เอมีน', 'CH₃CH₂CH₂NH₂', 59, 48, 'hb', 'ละลายได้ทุกอัตราส่วน'],
    ['propanone', 'คีโตน', 'CH₃COCH₃', 58, 56, 'dip', 'ละลายได้ทุกอัตราส่วน'],
    ['propan-1-ol', 'แอลกอฮอล์', 'CH₃CH₂CH₂OH', 60, 97, 'hb', 'ละลายได้ทุกอัตราส่วน'],
    ['ethanoic acid', 'กรดคาร์บอกซิลิก', 'CH₃COOH', 60, 118, 'hb2', 'ละลายได้ทุกอัตราส่วน'],
  ];
  const ALKANE_BP = [-162, -89, -42, -0.5, 36, 69, 98, 126], ALC_BP = [65, 78, 97, 118, 138, 157, 176, 195];
  const ALC_SOL = [null, null, null, 7.7, 2.2, 0.59, 0.17, 0.054]; // g per 100 g water at 20–25 °C; null = mixes in all proportions
  let pSel = 6;
  function renderProps() {
    const mode = $('pMode').value, g = $('pSvg'); g.innerHTML = ''; $('pNWrap').hidden = mode !== 'chain';
    if (mode === 'mass') {
      g.setAttribute('viewBox', '0 0 640 420');
      const x0 = 190, x1 = 600, lo = -20, hi = 130, X = v => x0 + (x1 - x0) * (v - lo) / (hi - lo);
      g.append(svg('line', { x1: X(0), y1: 14, x2: X(0), y2: 392, stroke: 'currentColor', 'stroke-opacity': .35 }));
      [0, 50, 100].forEach(v => g.append(svg('text', { x: X(v), y: 412, 'text-anchor': 'middle', 'font-size': 12 }, v + ' °C')));
      MASS.forEach((m, i) => {
        const y = 20 + i * 47, col = FORCE[m[5]][1], cur = i === pSel;
        const r = svg('rect', { x: Math.min(X(0), X(m[4])), y, width: Math.max(2, Math.abs(X(m[4]) - X(0))), height: 30, rx: 5, fill: col, opacity: cur ? 1 : .7, style: 'cursor:pointer' });
        r.addEventListener('click', () => { pSel = i; renderProps(); });
        g.append(r);
        g.append(svg('text', { x: x0 - 10, y: y + 14, 'text-anchor': 'end', 'font-weight': cur ? 600 : 400 }, m[0]));
        g.append(svg('text', { x: x0 - 10, y: y + 30, 'text-anchor': 'end', 'font-size': 11, opacity: .7 }, m[1]));
        g.append(svg('text', { x: Math.max(X(m[4]), X(0)) + 8, y: y + 20, 'font-size': 13 }, m[4] + ' °C'));
      });
      $('pCap').textContent = 'แตะแท่งเพื่อดูรายละเอียด สีของแท่งบอกแรงยึดเหนี่ยวระหว่างโมเลกุลที่แรงที่สุดของสารนั้น';
      const m = MASS[pSel];
      $('pRead').innerHTML = `<p class="big">${m[0]} <span class="muted">(${m[1]})</span></p><dl><dt>สูตร</dt><dd>${m[2]}</dd><dt>มวลโมเลกุล</dt><dd>${m[3]} g/mol</dd><dt>จุดเดือด</dt><dd>${m[4]} °C</dd><dt>แรงที่แรงที่สุด</dt><dd style="font-family:var(--font-body)">${FORCE[m[5]][0]}</dd><dt>ละลายน้ำ</dt><dd style="font-family:var(--font-body)">${m[6]}</dd></dl>` +
        `<p class="muted" style="margin-top:14px">มวลใกล้กัน แรงลอนดอนจึงพอๆ กัน จุดเดือดต่างกันเพราะแรงอื่น: ไม่มีขั้ว &lt; มีขั้ว &lt; พันธะไฮโดรเจน กรดคาร์บอกซิลิกจับคู่กันด้วยพันธะไฮโดรเจน 2 จุด จึงเดือดสูงสุด เอมีน (N−H) สร้างพันธะไฮโดรเจนได้อ่อนกว่าแอลกอฮอล์ (O−H)</p>` +
        `<ul class="muted" style="padding-left:18px;margin:8px 0 0">${Object.values(FORCE).map(([t, c]) => `<li><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${c};margin-right:6px"></span>${t}</li>`).join('')}</ul>`;
    } else {
      g.setAttribute('viewBox', '0 0 640 400');
      const n = +$('pN').value; $('pNOut').value = n;
      const x0 = 70, x1 = 610, y0 = 350, y1 = 30, lo = -180, hi = 210, X = k => x0 + (x1 - x0) * (k - 1) / 7, Y = v => y0 - (y0 - y1) * (v - lo) / (hi - lo);
      [-150, -100, -50, 0, 50, 100, 150, 200].forEach(v => { g.append(svg('line', { x1: x0, y1: Y(v), x2: x1, y2: Y(v), stroke: 'currentColor', 'stroke-opacity': v === 0 ? .4 : .1 })); g.append(svg('text', { x: x0 - 8, y: Y(v) + 4, 'text-anchor': 'end', 'font-size': 12 }, v)); });
      for (let k = 1; k <= 8; k++) g.append(svg('text', { x: X(k), y: y0 + 24, 'text-anchor': 'middle', 'font-size': 13 }, 'C' + k));
      g.append(svg('text', { x: x0 - 8, y: 18, 'font-size': 12, 'text-anchor': 'start' }, 'จุดเดือด (°C)'));
      g.append(svg('rect', { x: X(n) - 22, y: y1 - 10, width: 44, height: y0 - y1 + 20, rx: 8, fill: '#c4432b', opacity: .08 }));
      [[ALKANE_BP, '#9aa1b1', 'แอลเคน'], [ALC_BP, '#2f8a74', 'แอลกอฮอล์ (-1-ol)']].forEach(([d, c, t]) => {
        g.append(svg('polyline', { points: d.map((v, k) => `${X(k + 1)},${Y(v)}`).join(' '), fill: 'none', stroke: c, 'stroke-width': 3 }));
        d.forEach((v, k) => g.append(svg('circle', { cx: X(k + 1), cy: Y(v), r: k + 1 === n ? 7 : 4, fill: c })));
        g.append(svg('text', { x: X(8) - 4, y: Y(d[7]) - 12, 'text-anchor': 'end', fill: c, 'font-weight': 600 }, t));
      });
      $('pCap').textContent = 'จุดเดือดเพิ่มขึ้นเมื่อโซ่ยาวขึ้น (แรงลอนดอนมากขึ้น) แอลกอฮอล์เดือดสูงกว่าแอลเคนที่จำนวนคาร์บอนเท่ากันเสมอ';
      const alk = ROOT[n] + 'ane', alc = n <= 2 ? ROOT[n] + 'anol' : ROOT[n] + 'an-1-ol', sol = ALC_SOL[n - 1];
      $('pRead').innerHTML = `<dl><dt>${alk}</dt><dd>${ALKANE_BP[n - 1]} °C</dd><dt>${alc}</dt><dd>${ALC_BP[n - 1]} °C</dd><dt>ต่างกัน</dt><dd>${Math.round(ALC_BP[n - 1] - ALKANE_BP[n - 1])} °C</dd><dt>${alc} ละลายน้ำ</dt><dd>${sol == null ? 'ทุกอัตราส่วน' : sol + ' g ในน้ำ 100 g'}</dd></dl>` +
        `<p class="muted" style="margin-top:14px">${sol == null ? 'โซ่สั้น ส่วน −OH ที่มีขั้วมีผลมาก จึงสร้างพันธะไฮโดรเจนกับน้ำและผสมกันได้ทุกอัตราส่วน' : 'โซ่คาร์บอนยาวขึ้น ส่วนที่ไม่มีขั้วมากขึ้น การละลายน้ำจึงลดลง แม้ยังมี −OH อยู่'} แอลเคนไม่ละลายน้ำทุกขนาด</p>`;
    }
    paint(g);
  }
  $('pMode').onchange = renderProps; $('pN').oninput = renderProps;

  /* ---------- 3. tests ---------- */
  const SUBS = [
    { id: 'hexane', name: 'hexane', fam: 'แอลเคน', f: 'C₆H₁₄', aq: false },
    { id: 'hexene', name: 'hex-1-ene', fam: 'แอลคีน', f: 'CH₂=CH(CH₂)₃CH₃', aq: false },
    { id: 'benzene', name: 'benzene', fam: 'อะโรมาติก', f: 'C₆H₆', aq: false },
    { id: 'ethanol', name: 'ethanol', fam: 'แอลกอฮอล์', f: 'CH₃CH₂OH', aq: true },
    { id: 'acid', name: 'ethanoic acid', fam: 'กรดคาร์บอกซิลิก', f: 'CH₃COOH', aq: true },
    { id: 'ester', name: 'ethyl ethanoate', fam: 'เอสเทอร์', f: 'CH₃COOCH₂CH₃', aq: false },
  ];
  const REAS = [
    { id: 'br2d', name: 'สารละลาย Br₂ (ในที่มืด)', short: 'Br₂ มืด' },
    { id: 'br2l', name: 'สารละลาย Br₂ (ในที่สว่าง)', short: 'Br₂ สว่าง' },
    { id: 'kmno4', name: 'สารละลาย KMnO₄', short: 'KMnO₄' },
    { id: 'na', name: 'โลหะ Na ชิ้นเล็ก', short: 'Na' },
    { id: 'nahco3', name: 'NaHCO₃ (โซเดียมไฮโดรเจนคาร์บอเนต)', short: 'NaHCO₃' },
  ];
  const paint = root => root.querySelectorAll('text[fill]').forEach(t => { t.style.fill = t.getAttribute('fill'); });
  const BR = '#c8641e', CLEAR = '#e9eef2', PURPLE = '#7b2d8e', BROWN = '#7a4a1e';
  function outcome(s, r) {
    const R = { yes: false, from: CLEAR, to: CLEAR, time: 1, ppt: false, gas: 0, litmus: false, solid: null, obs: 'ไม่เปลี่ยนแปลง', eq: '', why: '' };
    if (r === 'br2d' || r === 'br2l') {
      R.from = R.to = BR; R.obs = 'สีส้มของ Br₂ ยังอยู่ ไม่เกิดปฏิกิริยา';
      if (s === 'hexene') Object.assign(R, { yes: true, to: CLEAR, time: 1.2, obs: 'สีส้มของ Br₂ จางหายทันที', eq: 'CH₂=CH(CH₂)₃CH₃ + Br₂ → CH₂BrCHBr(CH₂)₃CH₃', why: 'ปฏิกิริยาการเติม: Br₂ เข้าไปที่พันธะคู่ เกิดได้ทั้งในที่มืดและที่สว่าง' });
      else if (s === 'hexane' && r === 'br2l') Object.assign(R, { yes: true, to: CLEAR, time: 6, litmus: true, obs: 'สีส้มค่อยๆ จางลงช้าๆ มีแก๊สทำให้กระดาษลิตมัสสีน้ำเงินชื้นเป็นสีแดง', eq: 'C₆H₁₄ + Br₂ → C₆H₁₃Br + HBr', why: 'ปฏิกิริยาการแทนที่: ต้องมีแสง จึงเกิดช้า ได้แก๊ส HBr ที่เป็นกรด' });
      else if (s === 'hexane') R.why = 'แอลเคนไม่ทำปฏิกิริยากับ Br₂ ในที่มืด ใช้แยกแอลเคนออกจากแอลคีนได้';
      else if (s === 'benzene') R.why = 'เบนซีนไม่ฟอกจางสี Br₂ แม้มีพันธะคู่ในสูตร เพราะอิเล็กตรอนในวงเสถียร การแทนที่บนวงต้องใช้ FeBr₃ เป็นตัวเร่ง';
      else R.why = 'ไม่มีพันธะคู่หรือพันธะสามระหว่างคาร์บอน';
    } else if (r === 'kmno4') {
      R.from = R.to = PURPLE; R.layers = !SUBS.find(x => x.id === s).aq; R.obs = 'สีม่วงของ KMnO₄ ยังอยู่';
      if (s === 'hexene') Object.assign(R, { yes: true, to: '#d8c8a8', time: 2.2, ppt: true, obs: 'สีม่วงจางหาย เกิดตะกอนสีน้ำตาล MnO₂', eq: 'แอลคีน + MnO₄⁻ → ไดออล (−OH 2 หมู่) + MnO₂ (ตะกอนน้ำตาล)', why: 'KMnO₄ ออกซิไดซ์พันธะคู่ ใช้ทดสอบความไม่อิ่มตัวเหมือน Br₂' });
      else R.why = s === 'benzene' ? 'เบนซีนไม่ทำปฏิกิริยากับ KMnO₄' : 'ไม่มีพันธะคู่ระหว่างคาร์บอน (ตามตารางสรุปในชีท)';
    } else if (r === 'na') {
      R.solid = 'na';
      if (s === 'ethanol') Object.assign(R, { yes: true, gas: .5, obs: 'มีฟองแก๊ส H₂ เกิดขึ้น', eq: '2CH₃CH₂OH + 2Na → 2CH₃CH₂ONa + H₂', why: 'H ของหมู่ −OH ถูกแทนที่ด้วย Na' });
      else if (s === 'acid') Object.assign(R, { yes: true, gas: 1, obs: 'มีฟองแก๊ส H₂ เกิดขึ้นมาก', eq: '2CH₃COOH + 2Na → 2CH₃COONa + H₂', why: 'กรดคาร์บอกซิลิกทำปฏิกิริยากับ Na ได้เร็วกว่าแอลกอฮอล์' });
      else R.why = 'ไม่มีหมู่ −OH ให้ทำปฏิกิริยา';
    } else if (r === 'nahco3') {
      R.solid = 'powder';
      if (s === 'acid') Object.assign(R, { yes: true, gas: 1, obs: 'มีฟองแก๊ส CO₂ ผ่านน้ำปูนใสแล้วขุ่น', eq: 'CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂', why: 'เฉพาะกรดคาร์บอกซิลิกเท่านั้นที่แรงพอจะไล่ CO₂ ออกจาก NaHCO₃ ใช้แยกกรดออกจากแอลกอฮอล์' });
      else R.why = s === 'ethanol' ? 'แอลกอฮอล์ไม่เป็นกรดพอจะทำปฏิกิริยากับ NaHCO₃' : 'ไม่มีหมู่ที่เป็นกรด';
    }
    return R;
  }
  const done = {};
  let anim = null;
  const fillSel = (el, list) => { el.innerHTML = list.map(x => `<option value="${x.id}">${x.name}${x.fam ? ' (' + x.fam + ')' : ''}</option>`).join(''); };
  fillSel($('tSub'), SUBS); fillSel($('tRea'), REAS);
  function drawTube(t) {
    const g = $('tSvg'); g.innerHTML = '';
    const s = $('tSub').value, r = $('tRea').value, o = anim ? anim.o : null, k = o ? Math.min(1, t / o.time) : 0;
    const cx = 200, top = 70, bot = 330, w = 90, liq = 170;
    // liquid
    const col = o ? mix(o.from, o.to, k) : CLEAR;
    if (o && o.layers) {
      g.append(svg('rect', { x: cx - w / 2 + 4, y: liq, width: w - 8, height: 70, fill: o.yes ? mix(CLEAR, '#e2d6c0', k) : CLEAR }));
      g.append(svg('path', { d: `M${cx - w / 2 + 4} ${liq + 70} H${cx + w / 2 - 4} V${bot - 45} a${w / 2 - 4} ${w / 2 - 4} 0 0 1 ${-(w - 8)} 0 Z`, fill: col }));
    } else g.append(svg('path', { d: `M${cx - w / 2 + 4} ${liq} H${cx + w / 2 - 4} V${bot - 45} a${w / 2 - 4} ${w / 2 - 4} 0 0 1 ${-(w - 8)} 0 Z`, fill: col }));
    if (o && o.ppt && k > .2) for (let i = 0; i < 26; i++) { const a = (i * 137.5) % 360 * Math.PI / 180, rr = 6 + (i * 7) % 30; g.append(svg('circle', { cx: cx + Math.cos(a) * rr * .9, cy: bot - 30 + Math.sin(a) * 8 - (i % 4) * 3, r: 3.2, fill: BROWN, opacity: Math.min(1, (k - .2) * 1.6) })); }
    if (o && o.solid === 'na') g.append(svg('rect', { x: cx - 12, y: bot - 40, width: 24, height: 16, rx: 4, fill: '#b9bec7', stroke: '#6b7280' }));
    if (o && o.solid === 'powder') for (let i = 0; i < 18; i++) g.append(svg('circle', { cx: cx - 26 + (i * 11) % 52, cy: bot - 22 - (i % 3) * 4, r: 3, fill: '#fffdf8', stroke: '#c9ccd2' }));
    if (o && o.gas && anim.t < 7) for (let i = 0; i < Math.round(14 * o.gas); i++) { const ph = ((t * (0.6 + (i % 5) * .15) + i * .37) % 1); g.append(svg('circle', { cx: cx - 30 + ((i * 23) % 60), cy: bot - 40 - ph * (bot - 40 - liq), r: 3 + (i % 3), fill: 'none', stroke: '#6b7280', 'stroke-width': 1.5, opacity: 1 - ph * .6 })); }
    // tube outline
    g.append(svg('path', { d: `M${cx - w / 2} ${top} V${bot - w / 2} a${w / 2} ${w / 2} 0 0 0 ${w} 0 V${top}`, fill: 'none', stroke: 'currentColor', 'stroke-width': 3 }));
    g.append(svg('text', { x: cx, y: bot + 36, 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 600 }, SUBS.find(x => x.id === s).name));
    // litmus paper at the mouth
    if (o && o.litmus) { const lk = Math.max(0, Math.min(1, (t - 2) / 2)); g.append(svg('rect', { x: cx + 10, y: top - 50, width: 18, height: 80, rx: 2, fill: mix('#4a7fd0', '#d0453a', lk) })); g.append(svg('text', { x: cx + 38, y: top - 20, 'font-size': 18 }, 'ลิตมัสชื้น')); }
    // label panel
    g.append(svg('text', { x: 360, y: 150, 'font-size': 18, opacity: .7 }, 'รีเอเจนต์'));
    g.append(svg('text', { x: 360, y: 182, 'font-size': 24, 'font-weight': 600 }, REAS.find(x => x.id === r).short));
    if (o) { g.append(svg('text', { x: 360, y: 240, 'font-size': 18, opacity: .7 }, 'ผล')); g.append(svg('text', { x: 360, y: 272, 'font-size': 24, 'font-weight': 600, fill: o.yes ? '#1f6f61' : 'currentColor' }, o.yes ? '✓ เปลี่ยนแปลง' : '✗ ไม่เกิดปฏิกิริยา')); }
    paint(g);
  }
  function grid() {
    const cur = $('tSub').value;
    $('tGrid').innerHTML = `<thead><tr><th>สาร</th>${REAS.map(r => `<th>${r.short}</th>`).join('')}</tr></thead><tbody>` +
      SUBS.map(s => `<tr class="${s.id === cur ? 'cur' : ''}"><td>${s.name} <span class="muted">(${s.fam})</span></td>${REAS.map(r => { const v = done[s.id + r.id]; return v == null ? '<td class="n">·</td>' : `<td class="${v ? 'y' : 'n'}">${v ? '✓' : '✗'}</td>`; }).join('')}</tr>`).join('') + '</tbody>';
  }
  function go() {
    const s = $('tSub').value, r = $('tRea').value, o = outcome(s, r);
    anim = { o, t: 0 }; done[s + r] = o.yes; grid();
    $('tObs').textContent = o.obs; $('tEq').textContent = o.eq; $('tWhy').textContent = o.why;
    if (reduce) anim.t = 99;
  }
  const resetTest = () => { anim = null; $('tObs').textContent = 'เลือกสารแล้วกดหยด'; $('tEq').textContent = ''; $('tWhy').textContent = ''; drawTube(0); grid(); };
  $('tGo').onclick = go; $('tSub').onchange = resetTest; $('tRea').onchange = resetTest;
  $('tClear').onclick = () => { Object.keys(done).forEach(k => delete done[k]); resetTest(); };
  loop(dt => { if (!anim) return; anim.t += dt; drawTube(anim.t); }, document.querySelector('[data-panel=tests]'));

  /* ---------- 4. esterification ---------- */
  const ACIDS = [[1, 'methanoic acid', 'H'], [2, 'ethanoic acid', 'CH₃'], [3, 'propanoic acid', 'CH₃CH₂'], [4, 'butanoic acid', 'CH₃CH₂CH₂']];
  const ALCS = [[1, 'methanol', 'CH₃', 'methyl'], [2, 'ethanol', 'CH₃CH₂', 'ethyl'], [3, 'propan-1-ol', 'CH₃CH₂CH₂', 'propyl'], [5, 'pentan-1-ol', 'CH₃(CH₂)₄', 'pentyl'], [8, 'octan-1-ol', 'CH₃(CH₂)₇', 'octyl']];
  const SMELL = { '1-2': 'กลิ่นคล้ายเหล้ารัม', '2-1': 'กลิ่นคล้ายกาว ใช้เป็นตัวทำละลาย', '2-2': 'กลิ่นน้ำยาล้างเล็บ ใช้เป็นตัวทำละลาย', '2-3': 'กลิ่นลูกแพร์', '2-5': 'กลิ่นกล้วย', '2-8': 'กลิ่นส้ม', '4-1': 'กลิ่นแอปเปิล', '4-2': 'กลิ่นสับปะรด', '4-5': 'กลิ่นแอปริคอต' };
  $('eAcid').innerHTML = ACIDS.map((a, i) => `<option value="${i}"${i === 1 ? ' selected' : ''}>${a[1]}</option>`).join('');
  $('eAlc').innerHTML = ALCS.map((a, i) => `<option value="${i}"${i === 1 ? ' selected' : ''}>${a[1]}</option>`).join('');
  let reacted = false;
  const later = fn => requestAnimationFrame(() => requestAnimationFrame(fn)); // let the start position paint so the move transitions
  function renderEster() {
    const A = ACIDS[$('eAcid').value], B = ALCS[$('eAlc').value], mode = $('eMode').value;
    const root = ROOT[A[0]] + 'anoate', ester = `${B[3]} ${root}`, ef = `${A[2]}COO${B[2]}`, C = A[0] + B[0];
    const M = (14 * A[0] + 32) + (14 * B[0] + 18) - 18;
    const acidF = `<span class="acid">${A[2]}CO<span class="w">OH</span></span>`, alcF = `<span class="alc"><span class="w">H</span>O${B[2]}</span>`;
    const esterF = `<span class="acid">${A[2]}COO</span><span class="alc">${B[2]}</span>`;
    $('eGo').textContent = mode === 'make' ? 'ให้ความร้อน' : 'ต้มกับ ' + (mode === 'acid' ? 'กรด (H⁺)' : 'NaOH');
    if (mode === 'make') $('eEq').innerHTML = `${acidF} + ${alcF} <span title="H₂SO₄ เข้มข้น">⇌</span> ${esterF} + <span class="w">H₂O</span>`;
    else if (mode === 'acid') $('eEq').innerHTML = `${esterF} + H₂O <span>⇌</span> <span class="acid">${A[2]}COOH</span> + <span class="alc">HO${B[2]}</span>`;
    else $('eEq').innerHTML = `${esterF} + NaOH → <span class="acid">${A[2]}COO⁻Na⁺</span> + <span class="alc">HO${B[2]}</span>`;
    $('eDl').innerHTML = `<dt>เอสเทอร์</dt><dd>${ester}</dd><dt>สูตรโมเลกุล</dt><dd>C${sub(C + 1)}H${sub(2 * (C + 1))}O₂</dd><dt>มวลโมเลกุล</dt><dd>${M} g/mol</dd>` +
      (mode === 'base' ? `<dt>เกลือที่ได้</dt><dd>sodium ${root}</dd>` : '');
    $('eSmell').innerHTML = mode === 'make' ? `<span class="smell">${SMELL[A[0] + '-' + B[0]] || 'กลิ่นหอมแบบผลไม้'}</span>` : '';
    $('eWhy').textContent = mode === 'make' ? `อ่านชื่อ: หมู่แอลคิลจากแอลกอฮอล์ (${B[3]}) ขึ้นก่อน ตามด้วยส่วนจากกรด เปลี่ยน -oic acid เป็น -oate (${root}) ปฏิกิริยาผันกลับได้ จึงใช้ H₂SO₄ เข้มข้นช่วยดึงน้ำออก`
      : mode === 'acid' ? 'ไฮโดรลิซิสในกรดเป็นปฏิกิริยาย้อนกลับของเอสเทอริฟิเคชัน น้ำแยกพันธะ C−O ระหว่างสองส่วน ได้กรดและแอลกอฮอล์กลับคืน เกิดไม่สมบูรณ์เพราะผันกลับได้'
      : 'ใน NaOH ได้เกลือของกรดแทนกรด ปฏิกิริยาไปทางเดียวจนสมบูรณ์ ถ้าเอสเทอร์เป็นไขมัน (ไตรกลีเซอไรด์) เกลือที่ได้คือสบู่ จึงเรียกว่าสะพอนิฟิเคชัน';
    drawEster(A, B, mode);
  }
  function drawEster(A, B, mode) {
    const g = $('eSvg'); g.innerHTML = '';
    const ac = '#2f8a74', al = '#d9822b', red = '#c4432b', ink = 'currentColor', Y = 110, Y2 = 220;
    // each piece is its own <g> so it can slide or fade; widths are measured so pieces join exactly
    const piece = (t, x, y, c, size) => { const e = svg('g', { class: 'mv' }), tx = svg('text', { x, y }, t); tx.style.fill = c; if (size) tx.style.fontSize = size + 'px'; e.append(tx); g.append(e); e.w = tx.getComputedTextLength() || t.length * 13.2; return e; };
    const move = (e, dx, dy) => later(() => { e.style.transform = `translate(${dx}px,${dy}px)`; });
    const appear = e => { e.style.opacity = 0; if (reacted) later(() => { e.style.opacity = 1; }); };
    const vanish = e => { if (reacted) later(() => { e.style.opacity = 0; }); };
    if (mode === 'make') {
      const a = piece(A[2] + 'CO', 40, Y, ac), oh = piece('OH', 40 + a.w, Y, red);
      const plus = piece('+', 40 + a.w + oh.w + 24, Y, ink), h = piece('H', 40 + a.w + oh.w + 64, Y, red), o = piece('O' + B[2], 40 + a.w + oh.w + 64 + h.w, Y, al);
      const lab = piece('เอสเทอร์ ' + B[3] + ' ' + ROOT[A[0]] + 'anoate', 40, 56, ink, 17), wat = piece('รวมเป็นน้ำ H₂O', 52 + h.w + oh.w, Y2, red, 17);
      [lab, wat].forEach(appear);
      if (reacted) { vanish(plus); move(o, -(oh.w + 64 + h.w), 0); move(h, -(a.w + oh.w + 64) , Y2 - Y); move(oh, -a.w + h.w, Y2 - Y); }
    } else {
      const e1 = piece(A[2] + 'COO', 40, Y, ac), e2 = piece(B[2], 40 + e1.w, Y, al);
      const plus = piece('+', 40 + e1.w + e2.w + 24, Y, ink), rg = piece(mode === 'acid' ? 'H₂O' : 'NaOH', 40 + e1.w + e2.w + 64, Y, mode === 'acid' ? red : ink);
      const ho = piece('HO', 40, Y2, al), tip = piece(mode === 'acid' ? 'H' : '⁻Na⁺', 40 + e1.w, Y, mode === 'acid' ? red : ink);
      const lab = piece(mode === 'acid' ? 'ได้กรดคาร์บอกซิลิก + แอลกอฮอล์' : 'ได้เกลือโซเดียมของกรด + แอลกอฮอล์', 40, 56, ink, 17);
      [ho, tip, lab].forEach(appear);
      if (reacted) { vanish(plus); vanish(rg); move(e2, ho.w - e1.w, Y2 - Y); }
    }
  }
  $('eGo').onclick = () => { reacted = true; renderEster(); };
  $('eReset').onclick = () => { reacted = false; renderEster(); };
  ['eAcid', 'eAlc', 'eMode'].forEach(id => $(id).onchange = () => { reacted = false; renderEster(); });

  renderBuild(); renderProps(); resetTest(); renderEster();
  document.addEventListener('labtab', e => { if (e.detail === 'build') renderBuild(); if (e.detail === 'ester') renderEster(); });
})();
