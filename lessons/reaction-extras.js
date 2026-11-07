/* Additions on top of the chapter 7 and 8 labs (acids.html, equilibrium.html), kept apart from their own code:
   - numbers written as 1.00e-2 read as 1.00 × 10⁻²
   - titration: choose the indicator; the flask takes its colour and the graph shades its range
   - Le Chatelier: the 2A ⇌ B model drawn as 2NO₂ (brown) ⇌ N₂O₄ (colourless) in a syringe */
(() => {
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const after = fn => () => setTimeout(fn, 0);   // run after the page's own input handlers have redrawn

  // ---------- 1.00e-2 -> 1.00 × 10⁻² in text the page writes ----------
  const SUP = { '-': '⁻', '+': '', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  const sci = t => t.replace(/(\d+(?:\.\d+)?)e([+-]?)(\d+)/g, (m, a, s, e) => +e === 0 ? a : `${a} × 10${[...(s === '-' ? '-' : '') + String(+e)].map(c => SUP[c]).join('')}`);
  const fixText = root => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) if (/\de[+-]?\d/.test(n.nodeValue)) n.nodeValue = sci(n.nodeValue); };
  const main = document.querySelector('main');
  if (main) { fixText(main); new MutationObserver(() => fixText(main)).observe(main, { childList: true, subtree: true, characterData: true }); }

  // ---------- titration indicators ----------
  const IND = {
    php: { name: 'ฟีนอล์ฟทาลีน', lo: 8.3, hi: 10.0, a: null, b: '#d9408a' },
    btb: { name: 'บรอมไทมอลบลู', lo: 6.0, hi: 7.6, a: '#e2c23a', b: '#3a6fd0' },
    mr:  { name: 'เมทิลเรด', lo: 4.4, hi: 6.2, a: '#d23c2c', b: '#e6c229' },
    mo:  { name: 'เมทิลออเรนจ์', lo: 3.1, hi: 4.4, a: '#d23c2c', b: '#e8a923' },
  };
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const mix = (a, b, t) => '#' + hex(a).map((x, k) => Math.round(x + (hex(b)[k] - x) * t).toString(16).padStart(2, '0')).join('');
  if ($('titKind')) {
    const lab = document.createElement('label'); lab.className = 'control'; lab.htmlFor = 'indicator';
    lab.innerHTML = 'อินดิเคเตอร์<select id="indicator">' + Object.entries(IND).map(([k, v]) => `<option value="${k}">${v.name} (pH ${v.lo}–${v.hi})</option>`).join('') + '</select>';
    $('titKind').closest('label').after(lab);
    const paint = () => {
      const ind = IND[$('indicator').value], pH = parseFloat($('titPH').textContent), u = Math.max(0, Math.min(1, (pH - ind.lo) / (ind.hi - ind.lo)));
      const fill = $('titrationBeaker')?.querySelector('rect'); if (fill) {
        if (ind.a) { fill.setAttribute('fill', mix(ind.a, ind.b, u)); fill.setAttribute('opacity', .55); }
        else { fill.setAttribute('fill', ind.b); fill.setAttribute('opacity', (.05 + .55 * u).toFixed(2)); }
      }
      const lbl = $('titrationBeaker')?.querySelectorAll('text')[1]; if (lbl) lbl.textContent = `เติม${ind.name} (สีโดยประมาณ)`;
      const band = $('titrationGraph')?.querySelector('rect'); if (band) {   // the chart maps pH 0..14 to y 278..48
        const Y = v => 278 - v / 14 * 230; band.setAttribute('y', Y(ind.hi)); band.setAttribute('height', Y(ind.lo) - Y(ind.hi)); band.setAttribute('fill', ind.a ? mix(ind.a, ind.b, .5) : ind.b);
      }
      const note = $('indNote') || Object.assign(document.createElement('p'), { id: 'indNote', className: 'ind-note' });
      if (!note.isConnected) $('titrationNote')?.before(note);
      // the steep part of the curve: pH from 99% to 101% of the base needed for equivalence (same model as the page)
      const kind = $('titKind').value, ca = +$('acidC').value, va = +$('acidV').value, cb = +$('baseC').value, ve = ca * va / cb;
      const lo = ChemModels.titrate(kind, ca, va, cb, .99 * ve).pH, hi = ChemModels.titrate(kind, ca, va, cb, 1.01 * ve).pH;
      const good = ind.lo >= lo - .2 && ind.hi <= hi + .2;
      note.textContent = `${ind.name} เปลี่ยนสีที่ pH ${ind.lo}–${ind.hi} ส่วนช่วงที่กราฟชันรอบจุดสมมูลคือ pH ${lo.toFixed(1)}–${hi.toFixed(1)} ` +
        (good ? 'ช่วงเปลี่ยนสีอยู่ในช่วงชัน สีจึงเปลี่ยนตรงจุดสมมูล ใช้กับการไทเทรตนี้ได้'
              : 'ช่วงเปลี่ยนสีอยู่นอกช่วงชัน สีจะเปลี่ยนก่อนหรือหลังจุดสมมูล จึงไม่เหมาะกับการไทเทรตนี้');
    };
    const panel = $('titrationGraph').closest('section');
    panel.addEventListener('input', after(paint)); panel.addEventListener('click', after(paint));
    paint();
  }

  // ---------- Le Chatelier: a syringe of NO₂ / N₂O₄ ----------
  if ($('shiftGraph') && window.ChemModels) {
    const fig = document.createElement('figure'); fig.className = 'syringe-fig';
    fig.innerHTML = `<svg id="syringe" viewBox="0 0 640 170" role="img" aria-label="กระบอกฉีดยาบรรจุ NO2 และ N2O4"></svg>
      <figcaption>ให้ A คือ NO₂ (แก๊สสีน้ำตาลแดง) และ B คือ N₂O₄ (ไม่มีสี): 2NO₂(g) ⇌ N₂O₄(g) สีเข้มตาม [NO₂] เมื่อปรับค่า ภาพจะแสดงสีทันทีหลังรบกวน แล้วค่อยๆ เปลี่ยนเป็นสีที่สมดุลใหม่ ค่าตัวเลขเป็นแบบจำลองสอนแนวคิด</figcaption>`;
    ($('shiftGraph').closest('.bench') || $('shiftGraph').parentElement).before(fig);
    const clip = document.createElement('figure'); clip.className = 'clip-fig';
    clip.innerHTML = `<video controls playsinline preload="none" poster="media/lechatelier-syringe-poster.webp" width="1920" height="1080" aria-label="คลิป 30 วินาที กดลูกสูบกระบอกฉีดยาที่มี NO2 แล้วแช่น้ำร้อน"><source src="media/lechatelier-syringe.mp4" type="video/mp4"></video>
      <figcaption>ดูคลิป 30 วินาทีก่อน: กดลูกสูบแล้วสีเข้มขึ้นทันที ก่อนจางลงเมื่อสมดุลเลื่อนไปทาง N₂O₄ แล้วแช่น้ำร้อนสีกลับเข้มขึ้น จากนั้นลองปรับเองด้านล่าง</figcaption>`;
    fig.before(clip);
    const draw = (conc, vol) => {
      const len = 150 + 85 * Math.min(4, vol), alpha = Math.max(.04, Math.min(.9, conc / 1.6));
      $('syringe').innerHTML =
        `<rect x="40" y="45" width="${len}" height="80" rx="6" fill="#a6461f" opacity="${alpha.toFixed(3)}"/>` +
        `<rect x="40" y="45" width="520" height="80" rx="6" fill="none" stroke="var(--ink)" stroke-width="3"/>` +
        `<rect x="${40 + len}" y="49" width="14" height="72" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.5"/>` +
        `<path d="M${54 + len} 85 H600" stroke="var(--ink)" stroke-width="6"/><rect x="600" y="55" width="12" height="60" rx="3" fill="var(--ink)"/>` +
        `<path d="M40 85 H18" stroke="var(--ink)" stroke-width="5"/><text x="${40 + len / 2}" y="154" text-anchor="middle" class="syr-lbl">[NO₂] = ${conc.toFixed(3)} mol/L</text>`;
    };
    let anim = 0, shown = null;
    const update = () => {
      const na = +$('na').value, nb = +$('nb').value, v = +$('vol').value, s = ChemModels.equilibrium(na, nb, v, +$('temp').value, +$('heat').value);
      const from = shown ?? s.initialA, to = s.a;   // right after a change the mixture still has the old make-up
      cancelAnimationFrame(anim);
      if (reduce) { shown = to; draw(to, v); return; }
      draw(s.initialA, v);
      const t0 = performance.now();
      const step = now => { const u = Math.min(1, (now - t0 - 500) / 1400); const c = u <= 0 ? s.initialA : s.initialA + (to - s.initialA) * (1 - Math.pow(1 - u, 3)); shown = c; draw(c, v); if (u < 1) anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step);
    };
    ['na', 'nb', 'vol', 'temp', 'heat'].forEach(id => $(id)?.addEventListener('input', after(update)));
    $('heat')?.addEventListener('change', after(update));
    const s0 = ChemModels.equilibrium(+$('na').value, +$('nb').value, +$('vol').value, +$('temp').value, +$('heat').value); shown = s0.a; draw(s0.a, +$('vol').value);
  }
})();
