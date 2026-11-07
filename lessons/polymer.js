/* Chapter 11 polymer lab: addition vs condensation, chain structure under heat, recycling codes */
(() => {
  const { $, svg, sci, mix, reduce, loop } = window.Lab;
  const later = fn => requestAnimationFrame(() => requestAnimationFrame(fn)); // paint the start position so moves transition

  /* ---------- 1. polymerisation ---------- */
  // masses with the sheet's values (H 1, C 12, N 14, O 16, F 19, Cl 35.5)
  const POLY = [
    { id: 'pe', kind: 'add', name: 'พอลิเอทิลีน (PE)', mono: 'ethene (เอทิลีน)', mf: 'CH₂=CH₂', unit: 'CH₂−CH₂', M: 28, use: 'ถุงพลาสติก ขวดนม ฟิล์มห่อของ' },
    { id: 'pp', kind: 'add', name: 'พอลิโพรพิลีน (PP)', mono: 'propene (โพรพิลีน)', mf: 'CH₂=CHCH₃', unit: 'CH₂−CH(CH₃)', M: 42, use: 'กล่องอาหารเข้าไมโครเวฟ หลอดดูด เชือก' },
    { id: 'pvc', kind: 'add', name: 'พอลิไวนิลคลอไรด์ (PVC)', mono: 'chloroethene (ไวนิลคลอไรด์)', mf: 'CH₂=CHCl', unit: 'CH₂−CHCl', M: 62.5, use: 'ท่อประปา ฉนวนหุ้มสายไฟ' },
    { id: 'ps', kind: 'add', name: 'พอลิสไตรีน (PS)', mono: 'phenylethene (สไตรีน)', mf: 'CH₂=CHC₆H₅', unit: 'CH₂−CH(C₆H₅)', M: 104, use: 'โฟมกล่องอาหาร ช้อนพลาสติกใสแข็ง' },
    { id: 'ptfe', kind: 'add', name: 'พอลิเตตระฟลูออโรเอทิลีน (PTFE, เทฟลอน)', mono: 'tetrafluoroethene', mf: 'CF₂=CF₂', unit: 'CF₂−CF₂', M: 100, use: 'เคลือบกระทะไม่ติด ทนความร้อนและสารเคมี' },
    { id: 'pvac', kind: 'add', name: 'พอลิไวนิลแอซีเทต (PVAc)', mono: 'vinyl acetate (ไวนิลแอซีเทต)', mf: 'CH₂=CHOCOCH₃', unit: 'CH₂−CH(OCOCH₃)', M: 86, use: 'กาวลาเท็กซ์ (กาวขาว)' },
    { id: 'n66', kind: 'cond', name: 'ไนลอน-6,6', bond: 'เอไมด์ (−CO−NH−)', use: 'เส้นใยผ้า ร่ม เชือก',
      A: { name: 'hexanedioic acid', f: 'HOOC(CH₂)₄COOH', M: 146, body: '(CH₂)₄' }, B: { name: 'hexane-1,6-diamine', f: 'H₂N(CH₂)₆NH₂', M: 116, body: '(CH₂)₆', end: 'NH' },
      unit: 'CO(CH₂)₄CO−NH(CH₂)₆NH' },
    { id: 'n610', kind: 'cond', name: 'ไนลอน-6,10', bond: 'เอไมด์ (−CO−NH−)', use: 'ขนแปรงสีฟัน เส้นใย',
      A: { name: 'decanedioic acid', f: 'HOOC(CH₂)₈COOH', M: 202, body: '(CH₂)₈' }, B: { name: 'hexane-1,6-diamine', f: 'H₂N(CH₂)₆NH₂', M: 116, body: '(CH₂)₆', end: 'NH' },
      unit: 'CO(CH₂)₈CO−NH(CH₂)₆NH' },
    { id: 'pet', kind: 'cond', name: 'พอลิเอทิลีนเทเรฟทาเลต (PET)', bond: 'เอสเทอร์ (−CO−O−)', use: 'ขวดน้ำดื่ม เส้นใยพอลิเอสเทอร์',
      A: { name: 'benzene-1,4-dicarboxylic acid (กรดเทเรฟทาลิก)', f: 'HOOC−C₆H₄−COOH', M: 166, body: 'C₆H₄' }, B: { name: 'ethane-1,2-diol (เอทิลีนไกลคอล)', f: 'HOCH₂CH₂OH', M: 62, body: 'CH₂CH₂', end: 'O' },
      unit: 'CO−C₆H₄−CO−O−CH₂CH₂−O' },
  ];
  $('cPoly').innerHTML = `<optgroup label="แบบเติม">${POLY.filter(p => p.kind === 'add').map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</optgroup>` +
    `<optgroup label="แบบควบแน่น">${POLY.filter(p => p.kind === 'cond').map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</optgroup>`;
  let linked = false;
  const nOf = () => Number((10 ** +$('cN').value).toPrecision(2));
  function renderChain() {
    const P = POLY.find(p => p.id === $('cPoly').value), n = nOf(), unitM = P.kind === 'add' ? P.M : P.A.M + P.B.M - 36;
    $('cNOut').value = n.toLocaleString('en-US');
    $('cName').textContent = P.name;
    const rows = P.kind === 'add'
      ? [['ประเภท', 'แบบเติม'], ['มอนอเมอร์', `${P.mono}<br>${P.mf} (${P.M} g/mol)`], ['หน่วยซ้ำ', `−[${P.unit}]−ₙ`], ['สิ่งที่หลุดออก', 'ไม่มี มวลหน่วยซ้ำ = มวลมอนอเมอร์']]
      : [['ประเภท', 'แบบควบแน่น'], ['มอนอเมอร์ 1', `${P.A.name}<br>${P.A.f} (${P.A.M})`], ['มอนอเมอร์ 2', `${P.B.name}<br>${P.B.f} (${P.B.M})`], ['หน่วยซ้ำ', `−[${P.unit}]−ₙ`],
         ['มวลหน่วยซ้ำ', `${P.A.M} + ${P.B.M} − 2(18) = ${unitM} g/mol`], ['สิ่งที่หลุดออก', `H₂O ${(2 * n - 1).toLocaleString('en-US')} โมเลกุลต่อสาย`], ['พันธะที่เกิด', P.bond]];
    rows.push(['มวลโมเลกุลของสาย', `${n.toLocaleString('en-US')} × ${unitM} ≈ ${sci(n * unitM, 2)} g/mol`], ['ใช้ทำ', P.use]);
    $('cDl').innerHTML = rows.map(([a, b]) => `<dt>${a}</dt><dd style="font-family:${/[ก-๙]/.test(b) && !/[=−]/.test(b) ? 'var(--font-body)' : 'var(--font-mono)'}">${b}</dd>`).join('');
    $('cWhy').textContent = P.kind === 'add'
      ? 'มอนอเมอร์ต้องมีพันธะคู่ C=C พันธะ π เปิดออกแล้วต่อกับมอนอเมอร์ตัวถัดไป สายหลักจึงมีแต่คาร์บอน'
      : 'มอนอเมอร์แต่ละตัวมีหมู่ฟังก์ชัน 2 ปลาย OH ของกรดรวมกับ H ของ' + (P.B.end === 'NH' ? 'เอมีน' : 'แอลกอฮอล์') + 'ออกมาเป็นน้ำทุกจุดที่ต่อ หน่วยซ้ำ 1 หน่วยมีน้ำหลุดออก 2 โมเลกุล';
    $('cCap').textContent = P.kind === 'add' ? 'สีแดงคือพันธะคู่ที่เปิดออก กรอบประคือหน่วยซ้ำ' : 'สีเขียว = มอนอเมอร์ที่เป็นกรด สีส้ม = มอนอเมอร์อีกชนิด สีแดง = ส่วนที่หลุดออกเป็นน้ำ';
    $('cGo').textContent = linked ? 'ต่อกันแล้ว' : 'ต่อกันเป็นสาย';
    drawChain(P);
  }
  function drawChain(P) {
    const g = $('cSvg'); g.innerHTML = '';
    const ink = 'currentColor', red = '#c4432b', ac = '#2f8a74', al = '#d9822b';
    const piece = (t, x, y, c, size) => { const e = svg('g', { class: 'mv' }), tx = svg('text', { x, y }, t); tx.style.fill = c; if (size) tx.style.fontSize = size + 'px'; e.append(tx); g.append(e); e.w = tx.getComputedTextLength() || t.length * 10; e.x = x; return e; };
    const move = (e, dx, dy, op) => later(() => { e.style.transform = `translate(${dx}px,${dy}px)`; if (op != null) e.style.opacity = op; });
    const appear = e => { e.style.opacity = 0; if (linked) later(() => { e.style.opacity = 1; }); };
    if (P.kind === 'add') {
      g.setAttribute('viewBox', '0 0 680 300');
      const [l, r] = P.mf.split('='), Y = 110;
      let x = 24; const mons = [];
      for (let i = 0; i < 4; i++) {
        const a = piece(l, x, Y, ink), eq = piece('=', x + a.w, Y, red), b = piece(r, x + a.w + eq.w, Y, ink);
        mons.push([a, eq, b]); x += a.w + eq.w + b.w + 6;
        if (i < 3) { const p = piece('+', x + 6, Y, ink); mons.push([p]); x += 30; }
      }
      // the chain: the double bonds open and the units join along one line
      const chain = '−' + Array(4).fill(P.unit).join('−') + '−', ch = piece(chain, 24, 200, ink, 16);
      if (ch.w > 640) ch.firstChild.setAttribute('textLength', 632);
      const unitW = Math.min(ch.w, 632) * P.unit.length / chain.length;
      const box = svg('rect', { x: 24 + Math.min(ch.w, 632) / chain.length - 3, y: 178, width: unitW + 6, height: 32, rx: 6, fill: 'none', stroke: red, 'stroke-dasharray': '5 4' });
      const bg = svg('g', { class: 'mv' }); bg.append(box); g.append(bg);
      const lab = piece('หน่วยซ้ำ', 24, 250, red, 15), nlab = piece('× n', 24 + Math.min(ch.w, 632) + 6, 200, red, 16);
      [ch, bg, lab, nlab].forEach(appear);
      if (linked) mons.flat().forEach(e => move(e, 0, 60, 0));
    } else {
      g.setAttribute('viewBox', '0 0 700 300');
      const Y = 140, BW = 74, G = 34, keepA = ['OC−', '−CO'], leaveA = ['HO', 'OH'], keepB = [P.B.end + '−', '−' + P.B.end], leaveB = ['H', 'H'];
      // A B A in a row; every piece remembers its x before and after joining
      const seq = [];
      const body = (label, col) => ({ body: true, label, col });
      seq.push({ t: 'HOOC−', c: ac, keep: true }, body(P.A.body, ac), { t: keepA[1], c: ac, keep: true }, { t: leaveA[1], c: red, leave: 0 }, { gap: true },
        { t: leaveB[0], c: red, leave: 0 }, { t: keepB[0], c: al, keep: true }, body(P.B.body, al), { t: keepB[1], c: al, keep: true }, { t: leaveB[1], c: red, leave: 1 }, { gap: true },
        { t: leaveA[0], c: red, leave: 1 }, { t: keepA[0], c: ac, keep: true }, body(P.A.body, ac), { t: '−COOH', c: ac, keep: true });
      let x = 20, xa = 20 + G; const waterX = [];
      seq.forEach(s => {
        if (s.gap) { x += G; return; }
        if (s.body) {
          const e = svg('g', { class: 'mv' }), r = svg('rect', { x, y: Y - 28, width: BW, height: 40, rx: 12, fill: s.col, opacity: .18, stroke: s.col }), t = svg('text', { x: x + BW / 2, y: Y - 2, 'text-anchor': 'middle' }, s.label);
          t.style.fill = 'currentColor'; t.style.fontSize = '15px'; e.append(r, t); g.append(e);
          if (linked) move(e, xa - x, 0); x += BW; xa += BW; return;
        }
        const e = piece(s.t, x, Y, s.c);
        if (s.leave != null) { waterX[s.leave] = (waterX[s.leave] ?? 0) + x / 2; if (linked) move(e, 0, -70, 0); }
        else { if (linked) move(e, xa - x, 0); xa += e.w; }
        x += e.w;
      });
      waterX.forEach(wx => appear(piece('H₂O', wx - 10, 60, red, 16)));
      const lab = piece(`พันธะ${P.bond}`, 20 + G, 230, ink, 15), rep = piece(`หน่วยซ้ำ −[${P.unit}]−ₙ`, 20 + G, 262, red, 15);
      [lab, rep].forEach(appear);
    }
  }
  $('cGo').onclick = () => { linked = true; renderChain(); };
  $('cReset').onclick = () => { linked = false; renderChain(); };
  $('cPoly').onchange = () => { linked = false; renderChain(); };
  $('cN').oninput = renderChain;

  /* ---------- 2. structure and heat ---------- */
  const TYPES = {
    linear: { tm: 130, thermo: true, name: 'แบบเส้น', ex: 'HDPE (ขวดนม แกลลอน)', dens: '0.94–0.97 g/cm³',
      why: 'สายตรงเรียงชิดกันได้มาก แรงลอนดอนระหว่างสายสูง จึงแข็ง ทึบแสง หนาแน่นและหลอมเหลวที่อุณหภูมิสูงกว่าแบบกิ่ง' },
    branch: { tm: 110, thermo: true, name: 'แบบกิ่ง', ex: 'LDPE (ถุงพลาสติก ฟิล์มห่อ)', dens: '0.91–0.93 g/cm³',
      why: 'กิ่งทำให้สายเรียงชิดกันไม่ได้ แรงระหว่างสายน้อย จึงนิ่ม ยืดหยุ่น โปร่งแสง ความหนาแน่นต่ำ และหลอมเหลวง่ายกว่า' },
    cross: { tm: null, thermo: false, name: 'แบบร่างแห', ex: 'เมลามีน เบกะไลต์ ยางที่ผ่านการวัลคาไนซ์', dens: '',
      why: 'สายเชื่อมกันด้วยพันธะโคเวเลนต์ ให้ความร้อนแล้วสายเลื่อนผ่านกันไม่ได้ จึงไม่หลอม ถ้าร้อนมากพันธะจะแตกและไหม้ นำกลับมาหลอมขึ้นรูปใหม่ไม่ได้' },
  };
  const cv = $('sCanvas'), cx = cv.getContext('2d');
  const noise = (i, k, t) => Math.sin(i * 1.7 + k * 3.1 + t * (1.3 + (i % 5) * .23)) + Math.sin(i * .9 - k * 2.3 + t * (2.1 + (k % 3) * .3)) * .6;
  function chains(type) {
    const L = [], links = [];
    if (type === 'linear') for (let c = 0; c < 9; c++) L.push(Array.from({ length: 20 }, (_, i) => ({ x: 110 + i * 30, y: 70 + c * 45 + (i % 2) * 8 })));
    if (type === 'branch') for (let c = 0; c < 6; c++) {
      const y0 = 75 + c * 68, main = Array.from({ length: 18 }, (_, i) => ({ x: 120 + i * 32 + (c % 2) * 14, y: y0 + (i % 2) * 8 }));
      L.push(main); [3, 9, 14].forEach((j, k) => L.push(Array.from({ length: 4 }, (_, i) => ({ x: main[j].x + i * 18, y: main[j].y + (k % 2 ? 1 : -1) * (12 + i * 12) }))));
    }
    if (type === 'cross') {
      for (let c = 0; c < 8; c++) L.push(Array.from({ length: 20 }, (_, i) => ({ x: 110 + i * 30, y: 70 + c * 50 + (i % 2) * 8 })));
      for (let c = 0; c < 7; c++) for (let i = (c * 3) % 5 + 1; i < 20; i += 5) links.push([c, i, c + 1, i]);
    }
    return { L, links };
  }
  let sType = 'linear', S = chains('linear');
  function drawStruct(t) {
    const T = +$('sTemp').value, info = TYPES[sType], W = cv.width, H = cv.height;
    const dark = document.documentElement.dataset.theme === 'dark', ink = dark ? '#e8e4da' : '#1d2433';
    cx.clearRect(0, 0, W, H);
    const melt = info.thermo ? Math.max(0, Math.min(1, (T - info.tm) / 50)) : 0;
    const soft = info.thermo ? Math.max(0, Math.min(1, (T - info.tm + 30) / 30)) : 0;
    const burn = info.thermo ? 0 : Math.max(0, Math.min(1, (T - 240) / 60));
    const amp = (1.2 + (T - 25) / 40) * (info.thermo ? 1 + soft * 1.2 + melt * 2.5 : .8);
    const tt = reduce ? 0 : t, bottom = 470;
    const pos = (c, i, p) => {
      let x = p.x + noise(c, i, tt) * amp, y = p.y + noise(i + 7, c, tt * 1.1) * amp;
      if (melt) { y = bottom - (bottom - y) * (1 - .55 * melt) + 30 * melt; x = 400 + (x - 400) * (1 + .3 * melt); }
      return { x, y };
    };
    const col = burn ? mix(ink === '#1d2433' ? '#1d2433' : '#e8e4da', '#3a2410', burn) : ink;
    cx.lineWidth = 3; cx.lineJoin = 'round'; cx.strokeStyle = col;
    const P = S.L.map((ch, c) => ch.map((p, i) => pos(c, i, p)));
    P.forEach(ch => { cx.beginPath(); ch.forEach((p, i) => i ? cx.lineTo(p.x, p.y) : cx.moveTo(p.x, p.y)); cx.stroke(); });
    cx.strokeStyle = burn ? mix('#c4432b', '#3a2410', burn) : '#c4432b'; cx.lineWidth = 3;
    S.links.forEach(([a, i, b, j]) => { cx.beginPath(); cx.moveTo(P[a][i].x, P[a][i].y); cx.lineTo(P[b][j].x, P[b][j].y); cx.stroke(); });
    if (burn > .3) { cx.fillStyle = `rgba(90,80,70,${(burn - .3) * .5})`; for (let k = 0; k < 6; k++) { cx.beginPath(); cx.arc(250 + k * 60 + Math.sin(tt + k) * 10, 40 - ((tt * 20 + k * 13) % 30), 14 + k % 3 * 4, 0, 7); cx.fill(); } }
  }
  function readStruct() {
    const T = +$('sTemp').value, info = TYPES[sType];
    $('sTempOut').value = T + ' °C';
    let state;
    if (info.thermo) state = T >= info.tm ? 'หลอมเหลว สายเลื่อนผ่านกันได้ ไหลได้' : T >= info.tm - 30 ? 'เริ่มอ่อนตัว' : 'ของแข็ง';
    else state = T >= 270 ? 'ไหม้ พันธะในสายแตก ไม่หลอมเหลว' : T >= 240 ? 'เริ่มไหม้ เปลี่ยนเป็นสีเข้ม' : 'ของแข็ง คงรูป';
    $('sRead').innerHTML = `<p class="big">${state}</p><dl><dt>โครงสร้าง</dt><dd style="font-family:var(--font-body)">${info.name}</dd><dt>ตัวอย่าง</dt><dd style="font-family:var(--font-body)">${info.ex}</dd>` +
      (info.tm ? `<dt>หลอมเหลวที่ประมาณ</dt><dd>${info.tm} °C</dd><dt>ความหนาแน่น</dt><dd>${info.dens}</dd>` : '') +
      `<dt>ประเภท</dt><dd style="font-family:var(--font-body)">${info.thermo ? 'เทอร์มอพลาสติก (หลอมขึ้นรูปใหม่ได้)' : 'เทอร์มอเซต (หลอมขึ้นรูปใหม่ไม่ได้)'}</dd></dl><p class="muted" style="margin-top:14px">${info.why}</p>`;
  }
  $('sType').onchange = e => { sType = e.target.value; S = chains(sType); readStruct(); };
  $('sTemp').oninput = readStruct;
  loop((dt, t) => drawStruct(t), document.querySelector('[data-panel=structure]'));

  /* ---------- 3. recycling codes ---------- */
  const CODES = [[1, 'PET'], [2, 'HDPE'], [3, 'PVC'], [4, 'LDPE'], [5, 'PP'], [6, 'PS'], [7, 'OTHER']];
  const ITEMS = [
    ['ขวดน้ำดื่มพลาสติกใส', 1, 'PET ใส เหนียว กันแก๊สได้ดี เป็นพอลิเอสเทอร์ที่เกิดจากปฏิกิริยาแบบควบแน่น'],
    ['แกลลอนนมสีขาวขุ่น', 2, 'HDPE สายแบบเส้นเรียงตัวชิด จึงแข็งและทึบแสง'],
    ['ท่อน้ำประปาสีฟ้า', 3, 'PVC แข็ง ทนสารเคมี มีคลอรีนในโครงสร้าง เผาแล้วได้แก๊สที่เป็นพิษ จึงห้ามเผา'],
    ['ถุงใส่ขนมปังแบบนิ่ม', 4, 'LDPE สายแบบกิ่งเรียงตัวหลวม จึงนิ่ม ยืดได้ และโปร่งแสง'],
    ['กล่องข้าวที่เข้าไมโครเวฟได้', 5, 'PP ทนความร้อนได้สูงกว่า PE'],
    ['กล่องโฟมใส่อาหาร', 6, 'PS ที่ฟูด้วยแก๊ส น้ำหนักเบา ย่อยสลายยากมาก'],
    ['ถังน้ำดื่มใสแข็งขนาด 20 ลิตร', 7, 'มักทำจากพอลิคาร์บอเนต (PC) จัดอยู่ในกลุ่มอื่นๆ'],
    ['ขวดแชมพูทึบแสง', 2, 'HDPE แข็งแรง ทนสารเคมีในครัวเรือน'],
    ['ฝาขวดน้ำและหลอดดูด', 5, 'PP เหนียว ทนการบิดงอ'],
    ['ฉนวนหุ้มสายไฟ', 3, 'PVC เป็นฉนวนไฟฟ้าและไม่ลามไฟง่าย'],
  ];
  const tri = n => `<svg viewBox="0 0 40 36" aria-hidden="true"><path d="M20 3 L37 32 H3 Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><text x="20" y="27" text-anchor="middle" font-size="15" font-weight="600" fill="currentColor">${n}</text></svg>`;
  let order = ITEMS.map((_, i) => i), idx = 0, score = 0, answered = false;
  $('rCodes').innerHTML = CODES.map(([n, s]) => `<button data-code="${n}" aria-label="รหัส ${n} ${s}">${tri(n)}<small>${s}</small></button>`).join('');
  function showItem() {
    const it = ITEMS[order[idx]]; answered = false;
    $('rCount').textContent = `ชิ้นที่ ${idx + 1} จาก ${ITEMS.length} · ตอบถูก ${score}`;
    $('rItem').textContent = it[0]; $('rHint').textContent = 'แตะรหัสที่คิดว่าใช่';
    $('rCodes').querySelectorAll('button').forEach(b => b.className = '');
    $('rRead').innerHTML = ''; $('rNext').hidden = true;
  }
  $('rCodes').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || answered) return;
    const it = ITEMS[order[idx]], ok = +b.dataset.code === it[1]; answered = true; if (ok) score++;
    $('rCodes').querySelector(`[data-code="${it[1]}"]`).classList.add('right'); if (!ok) b.classList.add('wrong');
    $('rRead').innerHTML = `<p class="${ok ? 'ok' : 'bad'}">${ok ? 'ถูกต้อง' : 'ยังไม่ใช่'}: รหัส ${it[1]} ${CODES[it[1] - 1][1]}</p><p class="muted">${it[2]}</p>`;
    $('rCount').textContent = `ชิ้นที่ ${idx + 1} จาก ${ITEMS.length} · ตอบถูก ${score}`;
    $('rNext').hidden = false; $('rNext').textContent = idx + 1 < ITEMS.length ? 'ชิ้นต่อไป' : 'เริ่มใหม่';
  });
  $('rNext').onclick = () => { if (++idx >= ITEMS.length) { idx = 0; score = 0; order = order.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]); } showItem(); };

  renderChain(); readStruct(); showItem();
  document.addEventListener('labtab', e => { if (e.detail === 'chain') renderChain(); });
})();
