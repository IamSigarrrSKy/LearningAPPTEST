/* Chapter 1 lab: GHS pictograms, reading a volume scale with parallax, significant figures */
(() => {
  const { $, svg } = window.Lab;
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sup = n => [...String(n)].map(c => SUP[c]).join('');

  /* ---------- 1. GHS ---------- */
  const B = '#111', W = '#fff';
  const flame = (tx = 0, ty = 0, s = 1) => `<g transform="translate(${tx} ${ty}) scale(${s})"><path d="M50 22 C60 36 67 43 63 57 C70 52 70 46 68 41 C77 52 75 70 60 75 H40 C27 71 25 56 33 45 C33 53 37 58 42 58 C37 46 43 35 50 22Z" fill="${B}"/></g>`;
  const GLYPH = {
    flame: flame() + `<rect x="31" y="77" width="38" height="5" fill="${B}"/>`,
    oxid: flame(19, 6, .62) + `<circle cx="50" cy="64" r="12" fill="none" stroke="${B}" stroke-width="5"/><rect x="31" y="79" width="38" height="4" fill="${B}"/>`,
    explode: `<circle cx="42" cy="62" r="12" fill="${B}"/><path d="M50 50 L56 42" stroke="${B}" stroke-width="3"/>` +
      [[58, 34, 66, 26], [62, 44, 74, 40], [60, 54, 74, 58], [50, 34, 52, 24], [40, 40, 34, 30], [64, 64, 72, 70]].map(([a, b, c, d]) => `<path d="M${a} ${b} L${c} ${d}" stroke="${B}" stroke-width="3.5" stroke-linecap="round"/>`).join('') +
      `<path d="M30 76 L34 70 L40 76 L46 70 L52 76 L58 72 L64 78" fill="none" stroke="${B}" stroke-width="3"/>`,
    gas: `<g transform="rotate(-25 50 55)"><rect x="24" y="46" width="48" height="20" rx="10" fill="${B}"/><rect x="72" y="51" width="7" height="10" fill="${B}"/><rect x="79" y="48" width="4" height="16" fill="${B}"/></g>`,
    corr: `<g transform="rotate(-35 34 32)"><rect x="28" y="20" width="10" height="24" rx="3" fill="none" stroke="${B}" stroke-width="3"/></g><g transform="rotate(35 66 32)"><rect x="61" y="20" width="10" height="24" rx="3" fill="none" stroke="${B}" stroke-width="3"/></g>` +
      `<circle cx="40" cy="52" r="3" fill="${B}"/><circle cx="60" cy="52" r="3" fill="${B}"/><path d="M24 70 H44 V64 H40 V60 H34 V64 H24Z" fill="${B}"/><path d="M56 64 H64 L66 60 L70 64 H78 V72 H56Z" fill="${B}"/><rect x="22" y="76" width="58" height="4" fill="${B}"/>`,
    skull: `<circle cx="50" cy="42" r="14" fill="${B}"/><rect x="43" y="50" width="14" height="10" rx="2" fill="${B}"/><circle cx="44" cy="41" r="4" fill="${W}"/><circle cx="56" cy="41" r="4" fill="${W}"/>` +
      `<path d="M30 62 L70 80 M70 62 L30 80" stroke="${B}" stroke-width="6" stroke-linecap="round"/>`,
    excl: `<rect x="45" y="24" width="10" height="36" rx="4" fill="${B}"/><circle cx="50" cy="70" r="6" fill="${B}"/>`,
    health: `<circle cx="50" cy="30" r="9" fill="${B}"/><path d="M30 78 C30 54 36 42 50 42 C64 42 70 54 70 78Z" fill="${B}"/><path d="M50 50 L53 58 L61 58 L55 63 L57 71 L50 66 L43 71 L45 63 L39 58 L47 58Z" fill="${W}"/>`,
    env: `<path d="M34 72 V40 M34 50 L24 40 M34 46 L44 34 M34 58 L42 52" stroke="${B}" stroke-width="4" stroke-linecap="round" fill="none"/><path d="M20 74 H80" stroke="${B}" stroke-width="3"/>` +
      `<ellipse cx="62" cy="64" rx="11" ry="6" fill="${B}"/><path d="M73 64 L81 58 V70Z" fill="${B}"/><circle cx="57" cy="62" r="1.6" fill="${W}"/>`,
  };
  const pict = id => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4 L96 50 L50 96 L4 50Z" fill="#fff" stroke="#d62b1f" stroke-width="6" stroke-linejoin="round"/>${GLYPH[id]}</svg>`;
  const GHS = [
    { id: 'flame', th: 'เปลวไฟ', mean: 'สารไวไฟ ลุกติดไฟง่าย', ex: ['เอทานอล', 'อะซีโตน', 'แก๊สหุงต้ม'] },
    { id: 'oxid', th: 'เปลวไฟเหนือวงกลม', mean: 'สารออกซิไดซ์ ช่วยให้ไฟลุกรุนแรงขึ้น', ex: ['KMnO₄', 'H₂O₂ เข้มข้น', 'KNO₃'] },
    { id: 'explode', th: 'ระเบิด', mean: 'วัตถุระเบิด สารที่ไม่เสถียร', ex: ['ไนโตรกลีเซอรีน', 'TNT'] },
    { id: 'gas', th: 'ถังแก๊ส', mean: 'แก๊สภายใต้ความดัน', ex: ['ถัง O₂', 'ถัง CO₂', 'แก๊สเหลวในถัง'] },
    { id: 'corr', th: 'การกัดกร่อน', mean: 'กัดกร่อนผิวหนัง ดวงตา และโลหะ', ex: ['HCl เข้มข้น', 'H₂SO₄ เข้มข้น', 'NaOH เข้มข้น'] },
    { id: 'skull', th: 'หัวกะโหลกไขว้', mean: 'พิษเฉียบพลันรุนแรง อาจถึงตาย', ex: ['ไซยาไนด์', 'ปรอท', 'เมทานอล'] },
    { id: 'excl', th: 'เครื่องหมายอัศเจรีย์ (!)', mean: 'ระคายเคือง เป็นพิษเมื่อได้รับปริมาณมาก', ex: ['แอมโมเนียเจือจาง', 'ไอโอดีน'] },
    { id: 'health', th: 'อันตรายต่อสุขภาพ', mean: 'ก่อมะเร็ง ก่อการกลายพันธุ์ อันตรายต่ออวัยวะระยะยาว', ex: ['เบนซีน', 'ฟอร์มาลดีไฮด์'] },
    { id: 'env', th: 'สิ่งแวดล้อม', mean: 'เป็นพิษต่อสิ่งมีชีวิตในน้ำ', ex: ['CuSO₄', 'สารฆ่าแมลง'] },
  ];
  const PAIRS = {
    'flame|oxid': 'เปลวไฟ = ตัวสารติดไฟเอง ส่วนเปลวไฟเหนือวงกลม = ตัวสารไม่จำเป็นต้องติดไฟ แต่ให้ออกซิเจนช่วยให้สิ่งอื่นลุกไหม้รุนแรง',
    'excl|skull': 'หัวกะโหลก = พิษร้ายแรงเฉียบพลัน ได้รับเล็กน้อยก็อันตรายถึงชีวิต ส่วนอัศเจรีย์ = อันตรายระดับต่ำกว่า เช่น ระคายเคือง',
    'health|skull': 'หัวกะโหลก = พิษเฉียบพลัน ส่วนรูปคนมีดาวที่อก = อันตรายเรื้อรังระยะยาว เช่น ก่อมะเร็ง',
  };
  const pairNote = (a, b) => PAIRS[[a, b].sort().join('|')] || '';
  let qs = [], qi = 0, gScore = 0, gDone = false;
  const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const newRound = () => { qs = shuffle(GHS.flatMap(g => g.ex.map(ex => ({ ex, id: g.id })))).slice(0, 10); qi = 0; gScore = 0; };
  $('gGrid').innerHTML = GHS.map(g => `<button data-id="${g.id}" aria-label="${g.th}">${pict(g.id)}<small>${g.th}</small></button>`).join('');
  function askG() {
    const q = qs[qi]; gDone = false;
    $('gCount').textContent = `ข้อ ${qi + 1} จาก ${qs.length} · ตอบถูก ${gScore}`;
    $('gQ').textContent = `${q.ex}: ควรมีสัญลักษณ์ใด?`;
    $('gGrid').querySelectorAll('button').forEach(b => b.className = '');
    $('gRead').innerHTML = ''; $('gNext').hidden = true;
  }
  $('gGrid').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || gDone) return;
    const q = qs[qi], g = GHS.find(x => x.id === q.id), ok = b.dataset.id === q.id; gDone = true; if (ok) gScore++;
    $('gGrid').querySelector(`[data-id="${q.id}"]`).classList.add('right'); if (!ok) b.classList.add('wrong');
    const note = ok ? '' : pairNote(b.dataset.id, q.id);
    $('gRead').innerHTML = `<p class="${ok ? 'ok' : 'bad'}">${ok ? 'ถูกต้อง' : 'ยังไม่ใช่'}: ${g.th}</p><p class="muted">${g.mean} ตัวอย่าง: ${g.ex.join(' ')}</p>${note ? `<p class="muted">จุดที่มักสับสน: ${note}</p>` : ''}`;
    $('gCount').textContent = `ข้อ ${qi + 1} จาก ${qs.length} · ตอบถูก ${gScore}`;
    $('gNext').hidden = false; $('gNext').textContent = qi + 1 < qs.length ? 'ข้อต่อไป' : `ได้ ${gScore}/${qs.length} เล่นอีกรอบ`;
  });
  $('gNext').onclick = () => { if (++qi >= qs.length) newRound(); askG(); };
  $('gHide').onchange = e => $('gGrid').classList.toggle('hide-names', e.target.checked);

  /* ---------- 2. reading a scale ---------- */
  const INST = {
    cyl50: { div: 1, dec: 1, dir: 1, label: 10, mid: 5, win: 10, lo: 5, hi: 48, name: 'กระบอกตวง' },
    cyl10: { div: .1, dec: 2, dir: 1, label: 1, mid: .5, win: 1.6, lo: 1, hi: 9.6, name: 'กระบอกตวง' },
    bur: { div: .1, dec: 2, dir: -1, label: 1, mid: .5, win: 1.6, lo: .6, hi: 49, name: 'บิวเรต' },
  };
  let T = 0;
  const cfg = () => INST[$('rInst').value];
  const newT = () => { const c = cfg(), step = 10 ** -c.dec; T = Math.round((c.lo + Math.random() * (c.hi - c.lo)) / step) * step; T = +T.toFixed(c.dec); $('rIn').value = ''; $('rFb').textContent = ''; $('rWhy').textContent = ''; drawScale(); };
  function drawScale() {
    const c = cfg(), g = $('rSvg'), e = +$('rEye').value; g.innerHTML = '';
    const X0 = 200, X1 = 380, MID = 210, ppu = 330 / c.win, y = v => MID - c.dir * (v - T) * ppu, yT = MID;
    // liquid under the meniscus
    g.append(svg('path', { d: `M${X0} ${yT - 14} Q${(X0 + X1) / 2} ${yT + 14} ${X1} ${yT - 14} V420 H${X0} Z`, fill: '#9cc7e8', opacity: .55 }));
    g.append(svg('path', { d: `M${X0} ${yT - 14} Q${(X0 + X1) / 2} ${yT + 14} ${X1} ${yT - 14}`, fill: 'none', stroke: '#4a7fb0', 'stroke-width': 3 }));
    // glass walls
    g.append(svg('path', { d: `M${X0} 0 V420 M${X1} 0 V420`, stroke: 'currentColor', 'stroke-width': 3 }));
    // ticks on the wall facing the eye
    const n0 = Math.ceil((T - c.win / 2 - c.div) / c.div), n1 = Math.floor((T + c.win / 2 + c.div) / c.div);
    for (let k = n0; k <= n1; k++) {
      const v = +(k * c.div).toFixed(4); if (v < 0) continue;
      const major = Math.abs(v / c.label - Math.round(v / c.label)) < 1e-6, half = Math.abs(v / c.mid - Math.round(v / c.mid)) < 1e-6, L = major ? 70 : half ? 46 : 26, yy = y(v);
      if (yy < 4 || yy > 416) continue;
      g.append(svg('line', { x1: X1, y1: yy, x2: X1 - L, y2: yy, stroke: 'currentColor', 'stroke-width': major ? 2.5 : 1.5 }));
      if (major) g.append(svg('text', { x: X1 - L - 8, y: yy + 5, 'text-anchor': 'end' }, String(+v.toFixed(2))));
    }
    // the eye and the sight line to the bottom of the meniscus
    const ex = 600, ey = yT - e * 170, mx = (X0 + X1) / 2;
    const yc = ey + (yT - ey) * (ex - X1) / (ex - mx), app = T + c.dir * (yT - yc) / ppu;
    g.append(svg('line', { x1: ex - 14, y1: ey, x2: mx, y2: yT, stroke: Math.abs(e) < .03 ? '#1f6f61' : '#c4432b', 'stroke-width': 2.5, 'stroke-dasharray': '7 6' }));
    g.append(svg('path', { d: `M${ex - 18} ${ey} Q${ex} ${ey - 13} ${ex + 18} ${ey} Q${ex} ${ey + 13} ${ex - 18} ${ey}Z`, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5 }));
    g.append(svg('circle', { cx: ex - 6, cy: ey, r: 5, fill: 'currentColor' }));
    g.append(svg('circle', { cx: X1, cy: yc, r: 5, fill: Math.abs(e) < .03 ? '#1f6f61' : '#c4432b' }));
    $('rEyeOut').value = Math.abs(e) < .03 ? 'ระดับเดียวกับท้องโค้ง' : e > 0 ? 'สูงกว่า (มองลง)' : 'ต่ำกว่า (มองขึ้น)';
    $('rSvg').dataset.app = app.toFixed(c.dec);
    if (Math.abs(e) >= .03) $('rWhy').textContent = `แนวสายตาผ่านสเกลที่ประมาณ ${app.toFixed(c.dec)} mL จึงอ่านได้${app > T ? 'มาก' : 'น้อย'}กว่าค่าจริง` + (c.dir < 0 ? ' (บิวเรตมีเลขเพิ่มลงด้านล่าง ผลจึงกลับกับกระบอกตวง)' : '');
    else if (!$('rFb').textContent) $('rWhy').textContent = '';
  }
  $('rCheck').onclick = () => {
    const c = cfg(), raw = $('rIn').value.trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(raw)) { $('rFb').className = 'bad'; $('rFb').textContent = 'พิมพ์เป็นตัวเลข เช่น 23.45'; return; }
    const dec = (raw.split('.')[1] || '').length, v = +raw, diff = Math.round(Math.abs(v - T) * 10 ** c.dec);
    const fmt = T.toFixed(c.dec);
    if (dec !== c.dec) { $('rFb').className = 'bad'; $('rFb').textContent = `ต้องบันทึกทศนิยม ${c.dec} ตำแหน่ง`; $('rWhy').textContent = `ขีดเล็กสุดห่างกัน ${c.div} mL จึงประมาณเพิ่มได้อีก 1 ตำแหน่ง เช่น ${fmt} mL`; return; }
    if (diff <= 1) { $('rFb').className = 'ok'; $('rFb').textContent = `ถูกต้อง ค่าจริงในแบบจำลองคือ ${fmt} mL`; $('rWhy').textContent = 'ตัวเลขตัวสุดท้ายเป็นค่าประมาณ คลาดได้ ±1 ในหลักนั้น'; }
    else { $('rFb').className = 'bad'; $('rFb').textContent = `ยังไม่ตรง ค่าที่ถูกคือประมาณ ${fmt} mL`; $('rWhy').textContent = c.dir < 0 ? 'บิวเรตมีเลข 0 อยู่บน และเลขเพิ่มลงด้านล่าง อ่านที่ท้องโค้ง' : 'อ่านที่ท้องโค้งต่ำสุดของเมนิสคัส โดยให้สายตาอยู่ระดับเดียวกัน'; }
  };
  $('rIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('rCheck').click(); });
  $('rNew').onclick = newT; $('rInst').onchange = newT; $('rEye').oninput = drawScale;

  /* ---------- 3. significant figures ---------- */
  const SUPIN = { '⁻': '-', '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
  function parse(str) {
    let s = String(str).replace(/[\s,]/g, '').replace(/−/g, '-').replace(/[⁻⁰¹²³⁴⁵⁶⁷⁸⁹]/g, c => SUPIN[c]);
    s = s.replace(/[×xX*]10\^?/, 'e').replace(/E/, 'e');
    const m = s.match(/^([+-]?)(\d*\.?\d*)(?:e([+-]?\d+))?$/);
    if (!m || !/\d/.test(m[2])) return null;
    const mant = m[2].startsWith('.') ? '0' + m[2] : m[2], dot = mant.indexOf('.');
    return { sign: m[1] === '-' ? -1 : 1, mant, e: +(m[3] || 0), D: mant.replace('.', ''), intLen: dot < 0 ? mant.length : dot, hasDot: dot >= 0 };
  }
  function classify(p) {
    const D = p.D, f = D.search(/[1-9]/), l = D.length - 1 - [...D].reverse().join('').search(/[1-9]/);
    if (f < 0) return null;
    return [...D].map((d, i) => i < f ? 'n' : i <= l ? 's' : p.hasDot ? 's' : 'q');
  }
  // keep the first `keep` digits; an exact 5 is rounded to make the kept digit even (the sheet's rule)
  function roundKeep(p, keep) {
    const pad = Math.max(0, 1 - keep), D = '0'.repeat(pad) + p.D, k = keep + pad, intLen = p.intLen + pad;
    const kept = D.slice(0, k).padEnd(k, '0'), rest = D.slice(k);
    let up = false;
    if (rest[0] > '5') up = true; else if (rest[0] === '5') up = /[1-9]/.test(rest.slice(1)) || (+kept[kept.length - 1]) % 2 === 1;
    return { K: BigInt(kept) + (up ? 1n : 0n), last: intLen - k + p.e, sign: p.sign, dropped: rest[0] || '' , up };
  }
  function show(r, sf) {
    let ks = r.K.toString(), last = r.last;
    if (ks === '0') return '0';
    if (sf && ks.length > sf) { ks = ks.slice(0, sf); last++; }
    const first = last + ks.length - 1, sg = r.sign < 0 ? '−' : '';
    if (last > 0 || first < -4 || first > 6 || (sf && last === 0 && ks.length > 1 && ks.endsWith('0'))) return `${sg}${ks[0]}${ks.length > 1 ? '.' + ks.slice(1) : ''} × 10${sup(first)}`;
    if (last === 0) return sg + ks;
    const d = -last; ks = ks.padStart(d + 1, '0'); return `${sg}${ks.slice(0, -d)}.${ks.slice(-d)}`;
  }
  const sfCount = p => { const c = classify(p); return c ? c.filter(x => x === 's').length : 0; };
  const decOf = p => (p.mant.split('.')[1] || '').length - p.e; // decimal places in plain form
  function renderSF() {
    const p = parse($('sNum').value), k = +$('sRound').value; $('sRoundOut').value = k;
    if (!p) { $('sDigits').textContent = ''; $('sCount').textContent = 'พิมพ์ตัวเลข เช่น 0.004050 หรือ 6.022e23'; $('sWhy').textContent = ''; $('sRounded').textContent = ''; return; }
    const c = classify(p);
    if (!c) { $('sDigits').textContent = p.mant; $('sCount').textContent = 'ศูนย์ล้วน ไม่มีเลขนัยสำคัญที่ชัดเจน'; $('sWhy').textContent = ''; $('sRounded').textContent = ''; return; }
    let i = 0;
    const html = [...p.mant].map(ch => ch === '.' ? '.' : `<span class="${c[i++]}">${ch}</span>`).join('');
    $('sDigits').innerHTML = (p.sign < 0 ? '−' : '') + html + (p.e ? ` × 10${sup(p.e)}` : '');
    const s = c.filter(x => x === 's').length, q = c.filter(x => x === 'q').length;
    $('sCount').textContent = q ? `${s} ถึง ${s + q} ตัว (ไม่ชัดเจน)` : `${s} ตัว`;
    const why = [];
    if (c.includes('n')) why.push('ศูนย์ที่อยู่หน้าเลขตัวแรกที่ไม่ใช่ศูนย์ไม่นับ เพราะบอกแค่ตำแหน่งทศนิยม');
    if (/[1-9]0+[1-9]/.test(p.D)) why.push('ศูนย์ที่อยู่ระหว่างเลขอื่นนับ');
    if (p.hasDot && /[1-9]0+$/.test(p.D)) why.push('ศูนย์ท้ายที่มีจุดทศนิยมนับ เพราะผู้วัดตั้งใจบอกความละเอียด');
    if (q) why.push(`ศูนย์ท้ายของจำนวนเต็มที่ไม่มีจุดทศนิยมไม่ชัดเจน ถ้าต้องการให้นับควรเขียนเป็น ${show(roundKeep(p, c.indexOf('s') + s + q), s + q)}`);
    if (p.e) why.push('ส่วน × 10 ยกกำลัง ไม่นับเป็นเลขนัยสำคัญ');
    $('sWhy').textContent = why.join(' ');
    const r = roundKeep(p, c.indexOf('s') + k);
    $('sRounded').textContent = `ปัดให้เหลือ ${k} ตัว: ${show(r, k)}` + (r.dropped === '5' && !/[1-9]/.test(p.D.slice(c.indexOf('s') + k + 1)) ? ` (ตัดทิ้ง 5 พอดี ตัวหน้าเป็นเลข${r.up ? 'คี่ จึงปัดขึ้น' : 'คู่ จึงตัดทิ้ง'})` : '');
  }
  function renderCalc() {
    const a = parse($('cA').value), b = parse($('cB').value), op = $('cOp').value;
    if (!a || !b || !classify(a) || !classify(b)) { $('cRead').innerHTML = '<p class="muted">พิมพ์ตัวเลขทั้งสองช่อง</p>'; return; }
    const va = a.sign * parseFloat(a.mant) * 10 ** a.e, vb = b.sign * parseFloat(b.mant) * 10 ** b.e;
    if (op === '/' && vb === 0) { $('cRead').innerHTML = '<p class="bad">หารด้วยศูนย์ไม่ได้</p>'; return; }
    const raw = op === '+' ? va + vb : op === '-' ? va - vb : op === '*' ? va * vb : va / vb, rp = parse(raw.toPrecision(14));
    const sym = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op];
    let out, rule; const exact = $('cExact').checked;
    if (op === '+' || op === '-') {
      const d = exact ? decOf(b) : Math.min(decOf(a), decOf(b)), r = roundKeep(rp, rp.intLen + rp.e + d);
      out = show(r); rule = `บวกและลบ: ตอบตามทศนิยมน้อยที่สุด (${$('cA').value.trim()} มี ${Math.max(0, decOf(a))} ตำแหน่ง, ${$('cB').value.trim()} มี ${Math.max(0, decOf(b))} ตำแหน่ง) จึงเหลือ ${Math.max(0, d)} ตำแหน่ง`;
    } else {
      const k = exact ? sfCount(b) : Math.min(sfCount(a), sfCount(b)), c = classify(rp);
      out = c ? show(roundKeep(rp, c.indexOf('s') + k), k) : '0';
      rule = exact ? `ค่าที่ 1 เป็นจำนวนนับหรือค่านิยาม ไม่จำกัดเลขนัยสำคัญ จึงตอบตามค่าที่ 2 (${k} ตัว)` : `คูณและหาร: ตอบตามเลขนัยสำคัญน้อยที่สุด (${sfCount(a)} ตัว กับ ${sfCount(b)} ตัว) จึงเหลือ ${k} ตัว`;
    }
    $('cRead').innerHTML = `<p class="eq">${$('cA').value.trim()} ${sym} ${$('cB').value.trim()} = ${+raw.toPrecision(12)}</p><p class="big">→ ${out}</p><p class="muted">${rule} ถ้าคำนวณหลายขั้น เก็บตัวเลขไว้ครบแล้วปัดครั้งเดียวตอนจบ</p>`;
  }
  ['sNum', 'sRound'].forEach(id => $(id).addEventListener('input', renderSF));
  ['cA', 'cB'].forEach(id => $(id).addEventListener('input', renderCalc)); $('cOp').onchange = renderCalc; $('cExact').onchange = renderCalc;

  newRound(); askG(); newT(); renderSF(); renderCalc();
})();
