/* Chapter 9 electrochemistry lab: a galvanic cell, electrolysis, and a metal dipped in another metal's ions.
   Standard reduction potentials E° (V, 25 °C) decide everything: the lower E° gives electrons (anode in a
   galvanic cell), and E°cell = E°cathode − E°anode. Mass changes and colours are illustrative. */
(() => {
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const M = {   // metal, its ion, E° of Mⁿ⁺ + ne⁻ → M, colours of the metal and of its ion in water (null = colourless)
    Mg: { name: 'แมกนีเซียม', ion: 'Mg²⁺', z: 2, E: -2.37, metal: '#b9bec6', sol: null },
    Al: { name: 'อะลูมิเนียม', ion: 'Al³⁺', z: 3, E: -1.66, metal: '#c6cbd2', sol: null },
    Zn: { name: 'สังกะสี', ion: 'Zn²⁺', z: 2, E: -0.76, metal: '#9ea7b1', sol: null },
    Fe: { name: 'เหล็ก', ion: 'Fe²⁺', z: 2, E: -0.44, metal: '#7f7b77', sol: '#d9e6c8' },
    Ni: { name: 'นิกเกิล', ion: 'Ni²⁺', z: 2, E: -0.25, metal: '#aaa591', sol: '#b4dcbc' },
    Pb: { name: 'ตะกั่ว', ion: 'Pb²⁺', z: 2, E: -0.13, metal: '#7d838e', sol: null },
    Cu: { name: 'ทองแดง', ion: 'Cu²⁺', z: 2, E: 0.34, metal: '#c47a45', sol: '#86bfe6' },
    Ag: { name: 'เงิน', ion: 'Ag⁺', z: 1, E: 0.80, metal: '#d9d9d9', sol: null },
  };
  const WATER = '#e4eef2';
  const sign = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2);
  const sup = z => ({ 1: '', 2: '2', 3: '3' })[z];
  const gcd = (a, b) => b ? gcd(b, a % b) : a, lcm = (a, b) => a * b / gcd(a, b);
  const mix = (a, b, t) => { const p = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)), A = p(a), B = p(b);
    return '#' + A.map((x, k) => Math.round(x + (B[k] - x) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join(''); };
  const solColor = (m, k) => M[m].sol ? mix(WATER, M[m].sol, k) : WATER;
  const coef = n => n === 1 ? '' : n;

  // ---------- tabs (with #hash, like the other labs) ----------
  const panels = ['galvanic', 'electrolysis', 'displace'];
  function select(key) {
    const k = panels.includes(key) ? key : 'galvanic';
    panels.forEach(p => $(p + 'Panel').hidden = p !== k);
    document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-current', b.dataset.tab === k));
  }
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { history.replaceState(null, '', location.search + '#' + b.dataset.tab); select(b.dataset.tab); });
  select(location.hash.slice(1));

  // ---------- shared drawing pieces ----------
  const beaker = (x, y, w, h, fill, level = .8) => `<rect x="${x}" y="${y + h * (1 - level)}" width="${w}" height="${h * level}" fill="${fill}"/>` +
    `<path d="M${x} ${y} V${y + h} H${x + w} V${y}" fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round"/>`;
  const label = (x, y, t, cls = '') => `<text x="${x}" y="${y}" class="lbl ${cls}" text-anchor="middle">${t}</text>`;
  function flowDots(path, n, phase, cls) {   // n dots spaced along a polyline, shifted by phase (0..1)
    const seg = [], tot = path.slice(1).reduce((s, p, i) => { const l = Math.hypot(p[0] - path[i][0], p[1] - path[i][1]); seg.push(l); return s + l; }, 0);
    let out = '';
    for (let k = 0; k < n; k++) {
      let d = ((k / n + phase) % 1) * tot, i = 0;
      while (d > seg[i] && i < seg.length - 1) d -= seg[i++];
      const a = path[i], b = path[i + 1], u = d / seg[i];
      out += `<circle cx="${a[0] + (b[0] - a[0]) * u}" cy="${a[1] + (b[1] - a[1]) * u}" r="5" class="${cls}"/>`;
    }
    return out;
  }
  let phase = 0, last = 0;
  const loops = [];
  function frame(now) { phase = (phase + (now - last) / 4000) % 1; last = now; loops.forEach(f => f()); if (!reduce) requestAnimationFrame(frame); }

  // ================= 1. galvanic cell =================
  const opts = Object.entries(M).map(([k, m]) => `<option value="${k}">${m.ion}/${k} (${m.name}) E° = ${sign(m.E)} V</option>`).join('');
  $('gLeft').innerHTML = opts; $('gRight').innerHTML = opts; $('gLeft').value = 'Zn'; $('gRight').value = 'Cu';
  function galvanic() {
    const L = $('gLeft').value, R = $('gRight').value, t = +$('gTime').value / 30;
    $('gTimeOut').textContent = $('gTime').value + ' นาที';
    const same = L === R, anode = M[L].E <= M[R].E ? L : R, cathode = anode === L ? R : L, Ecell = M[cathode].E - M[anode].E;
    const leftIsAnode = anode === L, run = same ? 0 : t;
    const thin = 26 * (1 - .45 * run), thick = 26 * (1 + .5 * run);
    const wL = leftIsAnode ? thin : thick, wR = leftIsAnode ? thick : thin;
    const solL = leftIsAnode ? solColor(L, .35 + .5 * run) : solColor(L, .85 - .6 * run), solR = leftIsAnode ? solColor(R, .85 - .6 * run) : solColor(R, .35 + .5 * run);
    const electrode = (cx, w, m, isCathode) => `<rect x="${cx - w / 2}" y="110" width="${w}" height="250" rx="3" fill="${M[m].metal}" stroke="var(--ink)" stroke-width="2"/>` +
      (isCathode && run > 0 ? `<rect x="${cx - w / 2}" y="230" width="${w}" height="130" rx="3" fill="${M[cathode].metal}" opacity="${.4 + .6 * run}"/>` : '');
    let s = beaker(60, 200, 200, 200, same ? WATER : solL) + beaker(380, 200, 200, 200, same ? WATER : solR);
    s += `<path d="M215 300 V170 H425 V300" fill="none" stroke="#d8cfbd" stroke-width="30" stroke-linejoin="round"/><path d="M215 300 V170 H425 V300" fill="none" stroke="var(--line)" stroke-width="2" stroke-linejoin="round" stroke-dasharray="2 0"/>`;
    s += electrode(160, wL, L, !leftIsAnode && !same) + electrode(480, wR, R, leftIsAnode && !same);
    s += `<path d="M160 110 V60 H285 M355 60 H480 V110" fill="none" stroke="var(--ink)" stroke-width="3"/><circle cx="320" cy="60" r="34" fill="var(--surface)" stroke="var(--ink)" stroke-width="3"/>`;
    s += `<text x="320" y="56" class="meter" text-anchor="middle">${same ? '0.00' : Ecell.toFixed(2)}</text><text x="320" y="76" class="meterU" text-anchor="middle">V</text>`;
    s += label(160, 422, (leftIsAnode ? 'แอโนด (−)' : 'แคโทด (+)') + ` ${L}`) + label(480, 422, (leftIsAnode ? 'แคโทด (+)' : 'แอโนด (−)') + ` ${R}`);
    s += label(320, 160, 'สะพานเกลือ KNO₃', 'small');
    s += `<g id="gFlow"></g>`;
    $('gScene').innerHTML = s;
    const toRight = leftIsAnode;
    loops[0] = () => {
      if (same || $('galvanicPanel').hidden) { const g = $('gFlow'); if (g) g.innerHTML = ''; return; }
      const wire = toRight ? [[160, 110], [160, 60], [285, 60], [355, 60], [480, 60], [480, 110]] : [[480, 110], [480, 60], [355, 60], [285, 60], [160, 60], [160, 110]];
      const anodeX = toRight ? 215 : 425, cathX = toRight ? 425 : 215;
      $('gFlow').innerHTML = flowDots(wire, 7, phase, 'eDot') +
        flowDots([[cathX, 250], [cathX, 170], [anodeX, 170], [anodeX, 250]], 3, phase * .5, 'anDot') +
        flowDots([[anodeX, 250], [anodeX, 170], [cathX, 170], [cathX, 250]], 3, (phase * .5 + .17) % 1, 'catDot');
    };
    loops[0]();
    if (same) { $('gRead').innerHTML = '<p><b>โลหะชนิดเดียวกันทั้งสองฝั่ง</b></p><p class="eq">E°cell = 0.00 V</p><p class="muted">ไม่มีฝั่งไหนให้อิเล็กตรอนง่ายกว่า จึงไม่มีกระแส</p>'; return; }
    const a = M[anode], c = M[cathode], n = lcm(a.z, c.z), ka = n / a.z, kc = n / c.z;
    $('gRead').innerHTML = `
      <p class="eq big">E°cell = ${sign(c.E)} − (${sign(a.E)}) = <b>${Ecell.toFixed(2)} V</b></p>
      <dl><dt>แอโนด (ขั้วลบ) เกิดออกซิเดชัน</dt><dd class="eq">${anode}(s) → ${a.ion}(aq) + ${coef(a.z)}e⁻</dd>
      <dd class="muted">${a.name} ให้อิเล็กตรอนง่ายกว่า (E° ต่ำกว่า) จึงสึกบางลง</dd>
      <dt>แคโทด (ขั้วบวก) เกิดรีดักชัน</dt><dd class="eq">${c.ion}(aq) + ${coef(c.z)}e⁻ → ${cathode}(s)</dd>
      <dd class="muted">${c.ion} รับอิเล็กตรอนกลายเป็นโลหะ${c.name}มาพอกที่ขั้ว${c.sol ? ' สีของสารละลายจึงจางลง' : ''}</dd>
      <dt>ปฏิกิริยารวม (อิเล็กตรอน ${n} ตัวเท่ากันทั้งสองฝั่ง)</dt><dd class="eq">${coef(ka)}${anode}(s) + ${coef(kc)}${c.ion}(aq) → ${coef(ka)}${a.ion}(aq) + ${coef(kc)}${cathode}(s)</dd>
      <dt>แผนภาพเซลล์</dt><dd class="eq">${anode}(s) | ${a.ion}(aq) || ${c.ion}(aq) | ${cathode}(s)</dd></dl>
      <p class="muted">E° เป็นค่าคงที่ของครึ่งเซลล์ จึงไม่คูณตามเลขสัมประสิทธิ์</p>`;
  }
  ['gLeft', 'gRight', 'gTime'].forEach(id => $(id).addEventListener('input', galvanic));

  // ================= 2. electrolysis =================
  function electrolysis() {
    const mode = $('eMode').value, t = +$('eTime').value / 30;
    $('eTimeOut').textContent = $('eTime').value + ' นาที';
    let s = `<rect x="270" y="20" width="100" height="40" rx="6" fill="var(--surface)" stroke="var(--ink)" stroke-width="3"/><text x="290" y="46" class="lbl">+</text><text x="350" y="46" class="lbl">−</text><text x="320" y="47" class="meterU" text-anchor="middle">แบตเตอรี่</text>`;
    if (mode === 'water') {
      $('eHint').textContent = 'แก๊สที่แคโทดเกิดเป็น 2 เท่าของแก๊สที่แอโนดเสมอ เพราะน้ำ 2 โมเลกุลให้ H₂ 2 โมเลกุลกับ O₂ 1 โมเลกุล';
      s += beaker(120, 200, 400, 200, '#e9f1f4', .85);
      const tube = (cx, gas, full) => `<rect x="${cx - 32}" y="90" width="64" height="250" fill="#e9f1f4" stroke="var(--ink)" stroke-width="2.5"/><rect x="${cx - 30}" y="92" width="60" height="${246 * full}" fill="var(--surface)"/>` +
        `<text x="${cx}" y="${92 + 246 * full / 2 + 5}" class="lbl" text-anchor="middle">${full > .12 ? gas : ''}</text>`;
      s += tube(220, 'O₂', .35 * t) + tube(420, 'H₂', .7 * t);
      s += `<rect x="212" y="300" width="16" height="70" fill="#8d8d8d"/><rect x="412" y="300" width="16" height="70" fill="#8d8d8d"/>`;
      s += `<path d="M290 60 V75 H160 V385 H212 M350 60 V75 H480 V385 H428" fill="none" stroke="var(--ink)" stroke-width="2.5"/>`;
      s += label(220, 422, 'แอโนด (+) ได้ O₂') + label(420, 422, 'แคโทด (−) ได้ H₂') + `<g id="eFlow"></g>`;
      $('eRead').innerHTML = `<p class="eq big">ปริมาตร H₂ : O₂ = 2 : 1</p><dl>
        <dt>แคโทด (ขั้วลบ) รีดักชัน</dt><dd class="eq">4H⁺(aq) + 4e⁻ → 2H₂(g)</dd>
        <dt>แอโนด (ขั้วบวก) ออกซิเดชัน</dt><dd class="eq">2H₂O(l) → O₂(g) + 4H⁺(aq) + 4e⁻</dd>
        <dt>ปฏิกิริยารวม</dt><dd class="eq">2H₂O(l) → 2H₂(g) + O₂(g)</dd></dl>
        <p class="muted">น้ำบริสุทธิ์นำไฟฟ้าน้อยมาก จึงเติมกรดเจือจางให้มีไอออน กรดไม่ถูกใช้ไป ปฏิกิริยานี้ต้องใช้แบตเตอรี่เพราะ E°cell ติดลบ เกิดเองไม่ได้</p>`;
      loops[1] = () => {
        const g = $('eFlow'); if (!g || $('electrolysisPanel').hidden || t === 0) { if (g) g.innerHTML = ''; return; }
        let b = '';
        for (let k = 0; k < 6; k++) { const u = (phase * 2 + k / 6) % 1; b += `<circle cx="${420 + (k % 3 - 1) * 8}" cy="${330 - u * 30}" r="4" class="bubble"/>`; if (k < 3) b += `<circle cx="${220 + (k - 1) * 8}" cy="${330 - ((phase * 2 + k / 3) % 1) * 30}" r="4" class="bubble"/>`; }
        g.innerHTML = b;
      };
    } else {
      $('eHint').textContent = 'ช้อนต่อขั้วลบเป็นแคโทด ทองแดงจากสารละลายมาพอกที่ช้อน แท่งทองแดงที่ขั้วบวกค่อยๆ สึก';
      s += beaker(120, 200, 400, 200, mix(WATER, M.Cu.sol, .8), .85);
      const bar = 30 * (1 - .4 * t);
      s += `<rect x="${220 - bar / 2}" y="120" width="${bar}" height="250" rx="3" fill="${M.Cu.metal}" stroke="var(--ink)" stroke-width="2"/>`;
      s += `<path d="M420 120 V300" stroke="var(--ink)" stroke-width="10" stroke-linecap="round"/><ellipse cx="420" cy="335" rx="34" ry="46" fill="#cfd3d8" stroke="var(--ink)" stroke-width="2.5"/>` +
        `<ellipse cx="420" cy="335" rx="34" ry="46" fill="${M.Cu.metal}" opacity="${.9 * t}"/><path d="M420 290 V300" stroke="${M.Cu.metal}" stroke-width="10" opacity="${.9 * t}"/>`;
      s += `<path d="M290 60 V75 H220 V120 M350 60 V75 H420 V120" fill="none" stroke="var(--ink)" stroke-width="2.5"/>`;
      s += label(220, 422, 'แอโนด (+) แท่ง Cu') + label(420, 422, 'แคโทด (−) ช้อน');
      $('eRead').innerHTML = `<p class="eq big">ทองแดงย้ายจากแท่ง Cu ไปพอกที่ช้อน</p><dl>
        <dt>แอโนด (ขั้วบวก) ออกซิเดชัน</dt><dd class="eq">Cu(s) → Cu²⁺(aq) + 2e⁻</dd>
        <dt>แคโทด (ขั้วลบ) รีดักชัน</dt><dd class="eq">Cu²⁺(aq) + 2e⁻ → Cu(s)</dd></dl>
        <p class="muted">สีน้ำเงินของสารละลายคงที่ เพราะ Cu²⁺ ที่ออกจากแอโนดเท่ากับที่ไปพอกที่แคโทด ชุบโลหะอื่นก็ทำแบบเดียวกัน ให้ชิ้นงานเป็นแคโทด โลหะที่ใช้ชุบเป็นแอโนด และสารละลายมีไอออนของโลหะนั้น</p>`;
      loops[1] = () => {};
    }
    $('eScene').innerHTML = s;
    loops[1]();
  }
  ['eMode', 'eTime'].forEach(id => $(id).addEventListener('input', electrolysis));

  // ================= 3. metal dipped in another metal's ions =================
  $('dMetal').innerHTML = Object.entries(M).map(([k, m]) => `<option value="${k}">${k} ${m.name}</option>`).join('');
  $('dIon').innerHTML = Object.entries(M).map(([k, m]) => `<option value="${k}">${m.ion} (สารละลายของ${m.name})</option>`).join('');
  $('dMetal').value = 'Zn'; $('dIon').value = 'Cu';
  let dip = 0, guess = null, dipAnim = 0;
  function displace() {
    const mt = $('dMetal').value, io = $('dIon').value, react = M[io].E > M[mt].E && mt !== io, k = dip * (react ? 1 : 0);
    const sol = M[io].sol ? mix(solColor(io, .85), solColor(mt, .5), k * .8) : (M[mt].sol ? mix(WATER, M[mt].sol, k * .5) : WATER);
    const y = 40 + 120 * dip;
    let s = beaker(170, 170, 300, 210, sol, .8);
    s += `<rect x="300" y="${y}" width="40" height="220" rx="4" fill="${M[mt].metal}" stroke="var(--ink)" stroke-width="2"/>`;
    if (k > 0) {   // the new metal grows as a rough coat on the part under the surface
      let c = ''; for (let i = 0; i < 18; i++) { const yy = Math.max(y, 212) + (i * 37 % 150) * Math.min(1, (y + 220 - 212) / 150), xx = 298 + (i * 23 % 44); c += `<circle cx="${xx}" cy="${Math.min(yy, y + 215)}" r="${3 + (i % 3)}" fill="${M[io].metal}" opacity="${k}"/>`; }
      s += c;
    }
    s += label(320, 22, `${mt} (${M[mt].name})`) + label(320, 400, `สารละลาย ${M[io].ion}`);
    $('dScene').innerHTML = s;
    const read = $('dRead');
    if (dip < 1) {
      read.innerHTML = `<p>${M[io].ion}: E° = ${sign(M[io].E)} V</p><p>${M[mt].ion}: E° = ${sign(M[mt].E)} V</p><p class="muted">${guess == null ? 'ทายก่อนว่าจะเกิดปฏิกิริยาไหม แล้วกดจุ่ม' : 'ทายแล้ว กดจุ่มเพื่อดูผล'}</p>`;
      return;
    }
    const verdict = guess == null ? '' : guess === react ? '<p class="ok">ทายถูก</p>' : '<p class="bad">ทายผิด ลองดูเหตุผลด้านล่าง</p>';
    if (mt === io) { read.innerHTML = verdict + '<p><b>ไม่เกิดปฏิกิริยา</b></p><p class="muted">โลหะกับไอออนของตัวเอง ไม่มีอะไรเปลี่ยน</p>'; return; }
    const a = M[mt], c = M[io], n = lcm(a.z, c.z), ka = n / a.z, kc = n / c.z;
    read.innerHTML = verdict + (react
      ? `<p><b>เกิดปฏิกิริยา</b> ${c.name}มาเกาะที่แผ่น${a.name}${c.sol ? ' และสีของสารละลายจางลง' : ''}</p>
         <p>${c.ion} มี E° (${sign(c.E)} V) สูงกว่า ${a.ion} (${sign(a.E)} V) จึงรับอิเล็กตรอนจาก${a.name}ได้</p>
         <p class="eq">${coef(ka)}${mt}(s) + ${coef(kc)}${c.ion}(aq) → ${coef(ka)}${a.ion}(aq) + ${coef(kc)}${io}(s)</p>
         <p class="eq">E°cell = ${sign(c.E)} − (${sign(a.E)}) = ${sign(c.E - a.E)} V (เป็นบวก เกิดได้เอง)</p>`
      : `<p><b>ไม่เกิดปฏิกิริยา</b></p><p>${c.ion} มี E° (${sign(c.E)} V) ต่ำกว่า ${a.ion} (${sign(a.E)} V) จึงดึงอิเล็กตรอนจาก${a.name}ไม่ได้</p>
         <p class="eq">E°cell = ${sign(c.E)} − (${sign(a.E)}) = ${sign(c.E - a.E)} V (ติดลบ เกิดเองไม่ได้)</p>`);
  }
  const resetDip = () => { dip = 0; guess = null; root3(); displace(); };
  const root3 = () => ['dGuessYes', 'dGuessNo'].forEach(id => $(id).removeAttribute('aria-pressed'));
  ['dMetal', 'dIon'].forEach(id => $(id).addEventListener('input', resetDip));
  $('dGuessYes').onclick = () => { guess = true; root3(); $('dGuessYes').setAttribute('aria-pressed', 'true'); displace(); };
  $('dGuessNo').onclick = () => { guess = false; root3(); $('dGuessNo').setAttribute('aria-pressed', 'true'); displace(); };
  $('dDip').onclick = () => {
    if (reduce) { dip = 1; displace(); return; }
    const t0 = performance.now(); cancelAnimationFrame(dipAnim);
    const go = now => { dip = Math.min(1, (now - t0) / 1600); displace(); if (dip < 1) dipAnim = requestAnimationFrame(go); };
    dipAnim = requestAnimationFrame(go);
  };

  galvanic(); electrolysis(); displace();
  if (!reduce) requestAnimationFrame(t => { last = t; frame(t); });
})();
