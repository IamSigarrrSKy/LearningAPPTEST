/* Bohr model of hydrogen: ground state, excited states, and the light given out on the way down.
   Eₙ = −13.6 / n² eV; a drop from n to m gives a photon with ΔE = Eₙ − Eₘ and λ = 1240 / ΔE nm.
   Lines that land on n = 1 are Lyman (UV), on n = 2 Balmer (visible), on n = 3 Paschen (IR). */
(() => {
  const root = document.getElementById('bohrLab');
  if (!root) return;
  const $ = s => root.querySelector(s);
  const atomSvg = $('#bhAtom'), levelSvg = $('#bhLevels'), specSvg = $('#bhSpectrum');
  const NMAX = 6, E = n => -13.6 / (n * n);
  const SERIES = { 1: ['ไลมาน', 'อัลตราไวโอเลต (UV)'], 2: ['บาลเมอร์', 'แสงที่ตามองเห็น'], 3: ['พาสเชน', 'อินฟราเรด (IR)'], 4: ['แบรกเกตต์', 'อินฟราเรด (IR)'], 5: ['ฟุนด์', 'อินฟราเรด (IR)'] };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let n = 1, emitted = [], anim = 0;

  // colour of light by wavelength (nm); outside the visible band a muted tone stands for UV / IR
  function lightColor(nm) {
    if (nm < 380) return '#7a6fb0';
    if (nm > 750) return '#8a4b3c';
    let r = 0, g = 0, b = 0;
    if (nm < 440) { r = (440 - nm) / 60; b = 1; } else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = (510 - nm) / 20; } else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = (645 - nm) / 65; } else { r = 1; }
    const k = nm > 700 ? .3 + .7 * (750 - nm) / 50 : nm < 420 ? .3 + .7 * (nm - 380) / 40 : 1;
    return '#' + [r, g, b].map(c => Math.round(255 * Math.pow(c * k, .8)).toString(16).padStart(2, '0')).join('');
  }

  // ---------- atom: orbits get further apart as n grows (r ∝ n², squeezed to fit) ----------
  const R = k => 26 + 150 * Math.pow((k * k - 1) / (NMAX * NMAX - 1), .62);
  function drawAtom(photon) {
    const C = 200, ang = -40 * Math.PI / 180;
    let s = '';
    for (let k = 1; k <= NMAX; k++) s += `<circle cx="${C}" cy="${C}" r="${R(k)}" class="orbit${k === n ? ' on' : ''}"/>` +
      (k === 1 || k === n || k === NMAX ? `<text x="${C}" y="${C + R(k) + 14}" class="olab" text-anchor="middle">n=${k}</text>` : '');
    s += `<circle cx="${C}" cy="${C}" r="11" class="nucleus"/><text x="${C}" y="${C + 1}" class="nlab">+</text>`;
    const er = photon && photon.from ? R(photon.from) + (R(n) - R(photon.from)) * Math.min(1, anim * 1.6) : R(n);
    s += `<circle cx="${C + er * Math.cos(ang)}" cy="${C + er * Math.sin(ang)}" r="8" class="electron"/>`;
    if (photon && photon.down && anim > .35) {   // a wave packet leaves the atom
      const t = (anim - .35) / .65, x0 = C + R(n) * Math.cos(ang) + 10, y0 = C + R(n) * Math.sin(ang) - 10, dist = 40 + 150 * t;
      let d = '';
      for (let i = 0; i <= 40; i++) { const u = i / 40, x = x0 + dist * u * .8, y = y0 - dist * u * .6 + Math.sin(u * 14 - t * 6) * 7; d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
      s += `<path d="${d}" fill="none" stroke="${lightColor(photon.nm)}" stroke-width="3.5" stroke-linecap="round" opacity="${1 - t * .4}"/>`;
    }
    if (photon && !photon.down && anim < .6) s += `<circle cx="${C}" cy="${C}" r="${R(n) + 6}" class="absorb" opacity="${.6 - anim}"/>`;
    atomSvg.innerHTML = s;
  }

  // ---------- energy-level diagram, drawn to scale in eV ----------
  const Y = e => 30 + (e / -13.6) * 300;   // 0 eV at the top, −13.6 eV at the bottom
  function drawLevels(photon) {
    let s = `<line x1="60" y1="${Y(0)}" x2="300" y2="${Y(0)}" class="ionize"/><text x="306" y="${Y(0) + 5}" class="elab">0 eV (หลุดออกจากอะตอม)</text>`;
    for (let k = 1; k <= NMAX; k++) {
      const y = Y(E(k));
      s += `<line x1="60" y1="${y}" x2="300" y2="${y}" class="lvl${k === n ? ' on' : ''}"/>` + (k <= 3 || k === n ? `<text x="50" y="${y + 5}" class="nlab2">n=${k}</text>` : '');
      if (k <= 3 || k === n) s += `<text x="306" y="${y + 5}" class="elab">${E(k).toFixed(2)} eV</text>`;
    }
    s += `<circle cx="${180}" cy="${Y(E(n))}" r="8" class="electron"/>`;
    if (photon && photon.from) {
      const y1 = Y(E(photon.from)), y2 = Y(E(n));
      s += `<line x1="150" y1="${y1}" x2="150" y2="${y1 + (y2 - y1) * Math.min(1, anim * 1.6)}" class="jump" stroke="${photon.down ? lightColor(photon.nm) : '#1f6f61'}"/>`;
    }
    levelSvg.innerHTML = s;
  }

  // ---------- spectrum: every line given out so far, at its real wavelength ----------
  const X = nm => 20 + (Math.log(nm) - Math.log(80)) / (Math.log(2700) - Math.log(80)) * 660;   // log scale 80–2700 nm
  function drawSpectrum() {
    let s = `<rect x="${X(380)}" y="20" width="${X(750) - X(380)}" height="60" class="vis"/>`;
    for (let nm = 380; nm < 750; nm += 6) s += `<rect x="${X(nm)}" y="20" width="${X(nm + 6) - X(nm) + .5}" height="60" fill="${lightColor(nm)}" opacity=".16"/>`;
    s += `<rect x="20" y="20" width="660" height="60" class="frame"/>`;
    s += `<text x="${X(150)}" y="104" class="slab">UV</text><text x="${(X(380) + X(750)) / 2}" y="104" class="slab">แสงที่ตามองเห็น</text><text x="${X(1500)}" y="104" class="slab">IR</text>`;
    emitted.forEach(l => { s += `<line x1="${X(l.nm)}" y1="20" x2="${X(l.nm)}" y2="80" stroke="${lightColor(l.nm)}" stroke-width="3"/>`; });
    specSvg.innerHTML = s;
    $('#bhCount').textContent = emitted.length ? `เส้นสเปกตรัมที่เกิดแล้ว ${emitted.length} เส้น` : 'ยังไม่มีเส้นสเปกตรัม ลองกระตุ้นแล้วให้อิเล็กตรอนตกลงมา';
  }

  function controls() {
    $('#bhState').textContent = n === 1 ? 'สภาวะพื้น (ground state)' : `สภาวะถูกกระตุ้น (excited state) ที่ n = ${n}`;
    $('#bhStateNote').textContent = n === 1
      ? 'อิเล็กตรอนอยู่ระดับพลังงานต่ำสุด เสถียรที่สุด จะอยู่อย่างนี้จนกว่าได้รับพลังงาน'
      : 'อยู่ระดับพลังงานสูงกว่าปกติ ไม่เสถียร จึงคายพลังงานออกมาเป็นแสงเพื่อกลับลงระดับต่ำกว่า';
    $('#bhUp').innerHTML = Array.from({ length: NMAX }, (_, i) => i + 1).filter(k => k > n)
      .map(k => `<button data-up="${k}">ไป n=${k} ใช้ ${(E(k) - E(n)).toFixed(2)} eV</button>`).join('') || '<span class="muted">อยู่ระดับสูงสุดในภาพแล้ว</span>';
    $('#bhDown').innerHTML = Array.from({ length: n - 1 }, (_, i) => i + 1).reverse()
      .map(k => `<button data-down="${k}">ตกลง n=${k}</button>`).join('') || '<span class="muted">อยู่สภาวะพื้นแล้ว ไม่มีระดับต่ำกว่านี้</span>';
    root.querySelectorAll('[data-up]').forEach(b => b.onclick = () => go(+b.dataset.up));
    root.querySelectorAll('[data-down]').forEach(b => b.onclick = () => go(+b.dataset.down));
    $('#bhCascade').disabled = n === 1;
  }

  function readout(p) {
    const box = $('#bhReadout');
    if (!p) { box.innerHTML = '<p class="muted">กดให้พลังงานเพื่อดูอิเล็กตรอนกระโดดขึ้น แล้วกดตกลงเพื่อดูแสงที่คายออกมา</p>'; return; }
    if (!p.down) { box.innerHTML = `<p><b>ดูดพลังงาน</b> n=${p.from} → n=${n}</p><p class="eq">ΔE = E<sub>${n}</sub> − E<sub>${p.from}</sub> = ${(E(n) - E(p.from)).toFixed(2)} eV</p><p class="muted">ต้องได้พลังงานพอดีกับช่องว่างระหว่างระดับ จึงกระโดดขึ้นได้</p>`; return; }
    const [name, band] = SERIES[n];
    box.innerHTML = `<p><b>คายพลังงานเป็นแสง</b> n=${p.from} → n=${n}</p>
      <p class="eq">ΔE = E<sub>${p.from}</sub> − E<sub>${n}</sub> = ${p.dE.toFixed(2)} eV</p>
      <p class="eq">λ = 1240 ÷ ΔE = <b style="color:${p.nm >= 380 && p.nm <= 750 ? lightColor(p.nm) : 'inherit'}">${Math.round(p.nm)} nm</b></p>
      <p>อนุกรม${name} (ตกลงมาที่ n=${n}) อยู่ในช่วง${band}</p>`;
  }

  function go(to, after) {
    if (to === n) return;
    const from = n, down = to < from, dE = Math.abs(E(from) - E(to)), p = { from, down, dE, nm: 1239.84 / dE };
    n = to;
    if (down) emitted.push({ nm: p.nm });
    controls(); readout(p);
    const end = () => { drawAtom(); drawLevels(); drawSpectrum(); if (after) after(); };
    if (reduce) { anim = 1; end(); return; }
    const t0 = performance.now(), dur = down ? 1100 : 700;
    const tick = now => { anim = Math.min(1, (now - t0) / dur); drawAtom(p); drawLevels(p); if (anim < 1) requestAnimationFrame(tick); else end(); };
    drawSpectrum(); requestAnimationFrame(tick);
  }

  // one level at a time, the way a real excited atom often comes back down
  $('#bhCascade').onclick = () => { const step = () => { if (n > 1) go(n - 1, () => setTimeout(step, reduce ? 0 : 350)); }; step(); };
  $('#bhReset').onclick = () => { n = 1; emitted = []; anim = 0; controls(); readout(); drawAtom(); drawLevels(); drawSpectrum(); };
  $('#bhBalmer').onclick = () => { emitted = [3, 4, 5, 6].map(k => ({ nm: 1239.84 / (E(k) - E(2)) })); drawSpectrum();
    $('#bhReadout').innerHTML = '<p><b>อนุกรมบาลเมอร์ของไฮโดรเจน</b> ตกลงมาที่ n=2</p><p class="eq">3→2: 656 nm, 4→2: 486 nm, 5→2: 434 nm, 6→2: 410 nm</p><p class="muted">4 เส้นนี้คือเส้นสีที่เห็นในสเปกตรัมไฮโดรเจน ระดับยิ่งสูง ช่องว่างยิ่งแคบ เส้นยิ่งชิดกันไปทางม่วง</p>'; };

  controls(); readout(); drawAtom(); drawLevels(); drawSpectrum();

  // atom.html#bohr opens the models tab and scrolls here (used by the e-book)
  if (location.hash === '#bohr') addEventListener('load', () => { document.querySelector('[data-tab="lab1"]')?.click(); setTimeout(() => root.scrollIntoView({ block: 'start' }), 50); });
})();
