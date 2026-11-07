/* Chapter 6 reaction rate lab: collision theory in a particle box, the energy distribution and Eₐ,
   the energy profile with a catalyst, and measuring the rate of Mg + HCl from the gas it gives off. */
(() => {
  const { $, svg, sci, loop, reduce } = window.Lab;
  const R = 8.314e-3;   // kJ/(mol·K)

  // ================= 1. collision box =================
  const cv = $('collideCanvas'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height, RAD = 12;
  const COL = { A: '#2f8a74', B: '#d9822b', C: '#7a62c4' };
  let parts = [], flashes = [], events = [], made = 0, paused = false, temp = 300;
  const sigma = T => 150 * Math.sqrt(T / 300);              // px/s per velocity component
  const gauss = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
  const threshold = () => 1.9 * sigma(300) ** 2 * ($('cCat').checked ? .5 : 1);   // energy needed along the line of centres
  function seed() {
    const n = +$('cConc').value; parts = []; flashes = []; events = []; made = 0; temp = +$('cTemp').value;
    for (const kind of ['A', 'B']) for (let i = 0; i < n; i++) {
      let p, tries = 0;
      do { p = { k: kind, x: RAD + Math.random() * (W - 2 * RAD), y: RAD + Math.random() * (H - 2 * RAD) }; tries++; } while (tries < 50 && parts.some(q => Math.hypot(q.x - p.x, q.y - p.y) < 2.4 * RAD));
      p.vx = gauss() * sigma(temp); p.vy = gauss() * sigma(temp); parts.push(p);
    }
    readout();
  }
  function step(dt) {
    for (const p of parts) {
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.x < RAD) { p.x = RAD; p.vx = Math.abs(p.vx); } if (p.x > W - RAD) { p.x = W - RAD; p.vx = -Math.abs(p.vx); }
      if (p.y < RAD) { p.y = RAD; p.vy = Math.abs(p.vy); } if (p.y > H - RAD) { p.y = H - RAD; p.vy = -Math.abs(p.vy); }
    }
    const now = performance.now() / 1000, gone = new Set();
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const a = parts[i], b = parts[j]; if (gone.has(a) || gone.has(b)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), r = (a.k === 'C' ? 1.3 : 1) * RAD + (b.k === 'C' ? 1.3 : 1) * RAD;
      if (d >= r || d === 0) continue;
      const nx = dx / d, ny = dy / d, vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
      if (vn <= 0) continue;   // already moving apart
      const pair = (a.k === 'A' && b.k === 'B') || (a.k === 'B' && b.k === 'A');
      if (pair) {
        const e = .25 * vn * vn;   // kinetic energy of the approach along the line of centres (reduced mass ½)
        events.push({ t: now, ok: e >= threshold() });
        if (e >= threshold()) {   // enough energy: A + B -> C
          gone.add(a); gone.add(b); made++;
          parts.push({ k: 'C', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2 });
          continue;
        }
        flashes.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: now });
      }
      a.vx -= vn * nx; a.vy -= vn * ny; b.vx += vn * nx; b.vy += vn * ny;   // elastic bounce (equal masses)
      const push = (r - d) / 2; a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
    }
    if (gone.size) parts = parts.filter(p => !gone.has(p));
    events = events.filter(e => now - e.t < 3); flashes = flashes.filter(f => now - f.t < .3);
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      ctx.beginPath(); ctx.fillStyle = COL[p.k];
      if (p.k === 'C') { ctx.arc(p.x - 6, p.y, RAD * .85, 0, 7); ctx.arc(p.x + 6, p.y, RAD * .85, 0, 7); } else ctx.arc(p.x, p.y, RAD, 0, 7);
      ctx.fill();
    }
    const now = performance.now() / 1000;
    for (const f of flashes) { const u = (now - f.t) / .3; ctx.beginPath(); ctx.strokeStyle = `rgba(196,67,43,${1 - u})`; ctx.lineWidth = 3; ctx.arc(f.x, f.y, 14 + 18 * u, 0, 7); ctx.stroke(); }
  }
  let tick = 0;
  function readout() {
    const span = Math.min(3, Math.max(.5, (performance.now() / 1000) - (events[0]?.t ?? performance.now() / 1000)));
    const hits = events.length / 3, good = events.filter(e => e.ok).length / 3;
    $('cHits').textContent = `${hits.toFixed(1)} ครั้ง/วินาที`; $('cGood').textContent = `${good.toFixed(1)} ครั้ง/วินาที`;
    $('cFrac').textContent = events.length ? `${Math.round(100 * good / hits)}%` : '–';
    $('cLeftA').textContent = parts.filter(p => p.k === 'A').length; $('cMadeC').textContent = made;
    $('cNote').textContent = $('cCat').checked
      ? 'ตัวเร่งลดพลังงานที่ต้องใช้ การชนจำนวนเท่าเดิมจึงได้ผลมากขึ้น และตัวเร่งไม่ถูกใช้หมดไป'
      : temp >= 400 ? 'อุณหภูมิสูง อนุภาคเร็วขึ้น ชนบ่อยขึ้นเล็กน้อย แต่ที่สำคัญกว่าคือชนแรงพอบ่อยขึ้นมาก'
      : 'สังเกตวงสีแดง: ชนกันแต่พลังงานไม่พอ จึงเด้งออกไปโดยไม่เกิดปฏิกิริยา เมื่อ A กับ B ลดลง การชนก็ลดลง อัตราจึงช้าลงตามเวลา';
    void span;
  }
  $('cTemp').addEventListener('input', () => {
    const T = +$('cTemp').value, k = Math.sqrt(T / temp); temp = T; $('cTempOut').textContent = T + ' K';
    parts.forEach(p => { p.vx *= k; p.vy *= k; }); readout();
  });
  $('cConc').addEventListener('input', () => { $('cConcOut').textContent = `${$('cConc').value} + ${$('cConc').value}`; seed(); });
  $('cCat').addEventListener('change', readout);
  $('cReset').onclick = seed;
  $('cPause').onclick = () => { paused = !paused; $('cPause').textContent = paused ? 'เล่นต่อ' : 'หยุดชั่วคราว'; $('cPause').setAttribute('aria-pressed', paused); };
  seed(); draw();
  if (!reduce) loop(dt => { if (!paused) { step(dt); draw(); if ((tick += dt) > .25) { tick = 0; readout(); } } }, document.querySelector('[data-panel=collide]'));
  else $('cNote').textContent = 'ปิดภาพเคลื่อนไหวไว้ตามการตั้งค่าของเครื่อง กด "เริ่มใหม่" เพื่อดูตำแหน่งใหม่';

  // ================= 2. energy distribution =================
  // fraction of molecules with E ≥ Ea in 3 D (Maxwell–Boltzmann): 2√(x/π)e^(−x) + erfc(√x), x = Ea/RT
  const erfc = x => { const t = 1 / (1 + .5 * x), y = t * Math.exp(-x * x - 1.26551223 + t * (1.00002368 + t * (.37409196 + t * (.09678418 + t * (-.18628806 + t * (.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-.82215223 + t * .17087277))))))))); return y; };
  const above = (Ea, T) => { const x = Ea / (R * T); return 2 * Math.sqrt(x / Math.PI) * Math.exp(-x) + erfc(Math.sqrt(x)); };
  function energy() {
    const T = +$('eTemp').value, Ea0 = +$('eEa').value, Ea = Ea0 * ($('eCat').checked ? .6 : 1);
    $('eTempOut').textContent = T + ' K'; $('eEaOut').textContent = Ea0 + ' kJ/mol';
    // the curve is drawn in stretched units so the tail past Eₐ can be seen; the numbers use the real values
    const g = $('eGraph'); g.replaceChildren();
    const X = e => 50 + e / 100 * 560, Y = v => 320 - v * 1800;
    const kv = T => T / 300 * 17, curve = T => { let d = ''; for (let e = 0; e <= 100; e += 1) { const k = kv(T), f = 2 * Math.sqrt(e / Math.PI) * k ** -1.5 * Math.exp(-e / k); d += (e ? 'L' : 'M') + X(e).toFixed(1) + ' ' + Y(f).toFixed(1); } return d; };
    const eaX = Ea / 1;   // Eₐ in kJ/mol plotted 1:1 on the 0–100 axis
    // shaded tail at T
    let tail = `M${X(eaX)} ${Y(0)}`; const k = kv(T);
    for (let e = Math.ceil(eaX); e <= 100; e++) tail += `L${X(e)} ${Y(2 * Math.sqrt(e / Math.PI) * k ** -1.5 * Math.exp(-e / k))}`;
    tail += `L${X(100)} ${Y(0)}Z`;
    g.append(svg('path', { d: `M50 40V320H610`, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.5 }),
      svg('path', { d: tail, fill: '#c4432b', opacity: .35 }));
    if ($('eRef').checked && T !== 300) g.append(svg('path', { d: curve(300), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '6 6' }), svg('text', { x: 140, y: 64 }, '300 K'));
    g.append(svg('path', { d: curve(T), fill: 'none', stroke: '#1f6f61', 'stroke-width': 3 }),
      svg('path', { d: `M${X(eaX)} 50V320`, stroke: '#c4432b', 'stroke-width': 2.5, 'stroke-dasharray': '4 4' }),
      svg('text', { x: X(eaX) + 6, y: 66, fill: '#c4432b' }, `Eₐ = ${Ea.toFixed(0)} kJ/mol`),
      svg('text', { x: 610, y: 344, 'text-anchor': 'end' }, 'พลังงานจลน์ของอนุภาค'), svg('text', { x: 50, y: 30 }, 'จำนวนอนุภาค'));
    const f = above(Ea, T), f300 = above(Ea, 300);
    $('eFrac').textContent = sci(f) + ` (${sci(100 * f)}%)`;
    $('eRatio').textContent = T === 300 ? '1 เท่า' : `${sci(f / f300)} เท่า`;
    $('eEaUsed').textContent = `${Ea.toFixed(0)} kJ/mol` + ($('eCat').checked ? ' (มีตัวเร่ง)' : '');
    const f10 = above(Ea, T + 10) / f;
    $('eNote').textContent = `อุณหภูมิเพิ่มเพียง 10 K อนุภาคที่มีพลังงานพอจะเพิ่มขึ้นราว ${f10.toFixed(1)} เท่า เพราะส่วนหางของกราฟขยายมาก แม้ยอดกราฟจะเลื่อนไปไม่มาก ` +
      ($('eCat').checked ? 'ตัวเร่งไม่ได้เปลี่ยนกราฟ แต่เลื่อนเส้น Eₐ มาทางซ้าย พื้นที่สีแดงจึงกว้างขึ้น' : 'ลองใส่ตัวเร่งเพื่อดูว่าเส้น Eₐ เลื่อนไปทางไหน');
  }
  ['eTemp', 'eEa', 'eCat', 'eRef'].forEach(id => $(id).addEventListener('input', energy));

  // ================= 3. energy profile =================
  function profile() {
    const Ea = +$('pEa').value, dH = +$('pDH').value, cat = $('pCat').checked, EaC = Ea * .55;
    $('pEaOut').textContent = Ea + ' kJ/mol'; $('pDHOut').textContent = (dH > 0 ? '+' : dH < 0 ? '−' : '') + Math.abs(dH) + ' kJ/mol';
    const g = $('pGraph'); g.replaceChildren();
    const S = 1.15, base = 250, yR = base, yP = base - dH * S, yT = yR - Ea * S, yTc = yR - EaC * S;
    const top = Math.min(yT, yP - 10), shift = top < 40 ? 40 - top : 0, Y = y => y + shift;
    const path = peak => `M60 ${Y(yR)} H170 C 250 ${Y(yR)}, 260 ${Y(peak)}, 320 ${Y(peak)} S 390 ${Y(yP)}, 470 ${Y(yP)} H600`;
    g.append(svg('path', { d: `M50 30V350H610`, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.5 }),
      svg('text', { x: 50, y: 22 }, 'พลังงาน'), svg('text', { x: 610, y: 372, 'text-anchor': 'end' }, 'การดำเนินไปของปฏิกิริยา'));
    if (cat) g.append(svg('path', { d: path(yTc), fill: 'none', stroke: '#2f8a74', 'stroke-width': 3, 'stroke-dasharray': '7 6' }), svg('text', { x: 330, y: Y(yTc) + 22, fill: '#2f8a74' }, 'มีตัวเร่ง'));
    g.append(svg('path', { d: path(yT), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 3.5 }),
      svg('text', { x: 66, y: Y(yR) - 10 }, 'สารตั้งต้น'), svg('text', { x: 520, y: Y(yP) - 10 }, 'ผลิตภัณฑ์'),
      svg('text', { x: 320, y: Y(yT) - 12, 'text-anchor': 'middle' }, 'สารเชิงซ้อนกัมมันต์'));
    const arrow = (x, y1, y2, color, label) => { const up = y2 < y1; g.append(svg('path', { d: `M${x} ${y1}V${y2}`, stroke: color, 'stroke-width': 2.5 }),
      svg('path', { d: `M${x - 6} ${y2 + (up ? 10 : -10)}L${x} ${y2}L${x + 6} ${y2 + (up ? 10 : -10)}`, fill: 'none', stroke: color, 'stroke-width': 2.5 }),
      svg('text', { x: x + 8, y: (y1 + y2) / 2 + 4, fill: color }, label)); };
    arrow(230, Y(yR), Y(yT), '#c4432b', 'Eₐ');
    if (dH !== 0) arrow(560, Y(yR), Y(yP), '#46506a', 'ΔH');
    g.append(svg('path', { d: `M470 ${Y(yR)}H600`, stroke: 'var(--muted)', 'stroke-dasharray': '3 5' }));
    $('pRead').innerHTML = `<p class="big">ปฏิกิริยา${dH < 0 ? 'คายความร้อน' : dH > 0 ? 'ดูดความร้อน' : 'ที่ ΔH = 0'}</p>
      <dl><dt>Eₐ ไปข้างหน้า</dt><dd>${Ea} kJ/mol</dd><dt>Eₐ ย้อนกลับ</dt><dd>${Ea - dH} kJ/mol</dd>
      <dt>ΔH</dt><dd>${dH > 0 ? '+' : dH < 0 ? '−' : ''}${Math.abs(dH)} kJ/mol</dd>${cat ? `<dt>Eₐ เมื่อมีตัวเร่ง</dt><dd>${EaC.toFixed(0)} kJ/mol</dd>` : ''}</dl>
      <p class="muted" style="margin-top:14px">Eₐ ย้อนกลับ = Eₐ ไปข้างหน้า − ΔH ตัวเร่งลด Eₐ ทั้งสองทิศเท่ากัน จึงไม่เปลี่ยน ΔH และไม่เปลี่ยนตำแหน่งสมดุล แค่ทำให้ถึงเร็วขึ้น</p>`;
  }
  ['pEa', 'pDH', 'pCat'].forEach(id => $(id).addEventListener('input', profile));

  // ================= 4. measuring the rate =================
  const VMAX = .050 / 24.3 * 24000;   // cm³ of H₂ from 0.050 g Mg at about 24 dm³/mol
  const kOf = (c, tC, area) => .023 * c * area * Math.exp(-50 / R * (1 / (tC + 273) - 1 / 298));
  function measure() {
    const c = +$('mConc').value, tC = +$('mTemp').value, area = +$('mForm').value, t = +$('mTime').value, k = kOf(c, tC, area), k0 = kOf(1, 25, 1);
    $('mConcOut').textContent = c.toFixed(1) + ' mol/L'; $('mTempOut').textContent = tC + ' °C'; $('mTimeOut').textContent = t + ' s';
    const V = s => VMAX * (1 - Math.exp(-k * s)), V0 = s => VMAX * (1 - Math.exp(-k0 * s));
    const g = $('mGraph'); g.replaceChildren();
    const X = s => 60 + s / 120 * 540, Y = v => 330 - v / 60 * 290;
    for (let i = 0; i <= 4; i++) g.append(svg('path', { d: `M${X(i * 30)} 40V330M60 ${Y(i * 15)}H600`, stroke: 'var(--line)' }),
      svg('text', { x: X(i * 30), y: 350, 'text-anchor': 'middle' }, i * 30), svg('text', { x: 52, y: Y(i * 15) + 4, 'text-anchor': 'end' }, i * 15));
    const line = f => Array.from({ length: 121 }, (_, s) => `${s ? 'L' : 'M'}${X(s).toFixed(1)} ${Y(f(s)).toFixed(1)}`).join('');
    const rate = VMAX * k * Math.exp(-k * t), v = V(t);
    g.append(svg('path', { d: line(V0), fill: 'none', stroke: 'var(--muted)', 'stroke-width': 2, 'stroke-dasharray': '6 6' }),
      svg('path', { d: line(V), fill: 'none', stroke: '#1f6f61', 'stroke-width': 3 }),
      svg('path', { d: `M${X(Math.max(0, t - 25))} ${Y(v - rate * Math.min(25, t))}L${X(Math.min(120, t + 25))} ${Y(v + rate * 25)}`, stroke: '#c4432b', 'stroke-width': 2.5 }),
      svg('circle', { cx: X(t), cy: Y(v), r: 6, fill: '#c4432b' }),
      svg('text', { x: 60, y: 30 }, 'ปริมาตร H₂ (cm³)'), svg('text', { x: 600, y: 372, 'text-anchor': 'end' }, 'เวลา (s)'));
    $('mRead').innerHTML = `<dl><dt>ปริมาตร H₂ ที่เวลา ${t} s</dt><dd>${v.toFixed(1)} cm³</dd>
      <dt>อัตราเฉลี่ยช่วง 0–${t} s</dt><dd>${(v / t).toFixed(2)} cm³/s</dd>
      <dt>อัตราขณะนั้น (ความชัน)</dt><dd>${rate.toFixed(2)} cm³/s</dd>
      <dt>ปริมาตรสูงสุด</dt><dd>${VMAX.toFixed(1)} cm³</dd>
      <dt>เร็วกว่าการทดลองอ้างอิง</dt><dd>${(k / k0).toFixed(1)} เท่า</dd></dl>
      <p class="muted" style="margin-top:14px">อัตราช่วงแรกสูงสุดแล้วค่อยๆ ลดลง เพราะสารตั้งต้นเหลือน้อยลง กราฟจึงโค้งเข้าหาเส้นปริมาตรสูงสุด
      เพิ่มความเข้มข้น เพิ่มอุณหภูมิ หรือใช้ผง Mg ทำให้ถึงปริมาตรสูงสุดเร็วขึ้น แต่ปริมาตรสูงสุดเท่าเดิม เพราะ Mg มีเท่าเดิม</p>`;
  }
  ['mConc', 'mTemp', 'mForm', 'mTime'].forEach(id => $(id).addEventListener('input', measure));

  energy(); profile(); measure();
})();
