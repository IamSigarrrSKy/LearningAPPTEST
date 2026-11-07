/* VSEPR explorer: electron regions on a sphere push each other apart.
   Swap a bonding pair for a lone pair and watch the rest squeeze together (AX4 → AX3E → AX2E2).
   Lone pairs sit closer to the central atom and spread wider, so they push harder: LP–LP > LP–BP > BP–BP. */
(() => {
  const root = document.getElementById('vseprLab');
  if (!root) return;
  const svg = root.querySelector('svg'), $ = s => root.querySelector(s);

  // textbook shapes, angles and examples for each AXmEn (สสวท. ม.4)
  const SHAPES = {
    '2,0':{name:'เส้นตรง', angle:'180°', ex:'BeCl₂, CO₂'},
    '3,0':{name:'สามเหลี่ยมแบนราบ', angle:'120°', ex:'BF₃'},
    '2,1':{name:'มุมงอ', angle:'น้อยกว่า 120° (≈ 119°)', ex:'SO₂'},
    '4,0':{name:'ทรงสี่หน้า', angle:'109.5°', ex:'CH₄'},
    '3,1':{name:'พีระมิดฐานสามเหลี่ยม', angle:'≈ 107°', ex:'NH₃'},
    '2,2':{name:'มุมงอ', angle:'≈ 104.5°', ex:'H₂O'},
    '5,0':{name:'พีระมิดคู่ฐานสามเหลี่ยม', angle:'90° และ 120°', ex:'PCl₅'},
    '4,1':{name:'ทรงไม้กระดก', angle:'น้อยกว่า 90° และ 120°', ex:'SF₄'},
    '3,2':{name:'รูปตัว T', angle:'น้อยกว่า 90°', ex:'ClF₃'},
    '2,3':{name:'เส้นตรง', angle:'180°', ex:'XeF₂'},
    '6,0':{name:'ทรงแปดหน้า', angle:'90°', ex:'SF₆'},
    '5,1':{name:'พีระมิดฐานสี่เหลี่ยม', angle:'น้อยกว่า 90°', ex:'BrF₅'},
    '4,2':{name:'สี่เหลี่ยมแบนราบ', angle:'90°', ex:'XeF₄'},
  };
  const ELECTRON = {2:'เส้นตรง', 3:'สามเหลี่ยมแบนราบ', 4:'ทรงสี่หน้า', 5:'พีระมิดคู่ฐานสามเหลี่ยม', 6:'ทรงแปดหน้า'};
  const MAX_E = {2:0, 3:1, 4:2, 5:3, 6:2};

  // ideal electron-region directions; for 5 and 6 the order puts lone pairs where they really go
  const r3 = Math.sqrt(3) / 2;
  const IDEAL = {
    2:[[1,0,0],[-1,0,0]],
    3:[[0,1,0],[r3,-.5,0],[-r3,-.5,0]],
    4:[[0,1,0],[.943,-.333,0],[-.471,-.333,.816],[-.471,-.333,-.816]],
    5:[[0,1,0],[0,-1,0],[1,0,0],[-.5,0,r3],[-.5,0,-r3]],     // lone pairs fill the last (equatorial) slots first
    6:[[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]],   // the 2nd lone pair takes the slot opposite the 1st
  };
  const LP_ORDER = {2:[], 3:[0], 4:[0,1], 5:[4,3,2], 6:[0,1]};

  const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
  const W = (a, b) => a.lp && b.lp ? 1.45 : a.lp || b.lp ? 1.18 : 1;   // LP–LP > LP–BP > BP–BP
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let N = 4, E = 0, regions = [], yaw = .45, pitch = .6, frame = 0, showPush = true;

  function setup(keep) {
    const lpSlots = LP_ORDER[N].slice(0, E);
    const old = keep ? regions : null;
    regions = IDEAL[N].map((p, i) => ({ p: old && old[i] && old.length === N ? old[i].p.slice() : norm(p), lp: lpSlots.includes(i) }));
    relax(reduce ? 400 : 0);
    if (!reduce) animate(160);
    info();
  }

  // push every region along the sphere away from the others
  function step(rate = .02) {
    const f = regions.map(() => [0, 0, 0]);
    for (let i = 0; i < regions.length; i++) for (let j = 0; j < regions.length; j++) {
      if (i === j) continue;
      const a = regions[i], b = regions[j], d = a.p.map((x, k) => x - b.p[k]), l = Math.hypot(...d) || 1e-6, w = W(a, b) / l ** 3;
      for (let k = 0; k < 3; k++) f[i][k] += w * d[k];
    }
    regions.forEach((r, i) => { const dot = f[i].reduce((s, x, k) => s + x * r.p[k], 0); r.p = norm(r.p.map((x, k) => x + rate * (f[i][k] - dot * x))); });
  }
  function relax(n) { for (let i = 0; i < n; i++) step(); }
  function animate(n) { cancelAnimationFrame(frame); let k = 0; const go = () => { step(); draw(); if (++k < n) frame = requestAnimationFrame(go); else info(); }; go(); }

  // smallest angle between two bonded atoms, the number the textbook quotes
  function bondAngle() {
    const X = regions.filter(r => !r.lp); let m = 181;
    for (let i = 0; i < X.length; i++) for (let j = i + 1; j < X.length; j++) {
      const c = X[i].p.reduce((s, x, k) => s + x * X[j].p[k], 0);
      m = Math.min(m, Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI);
    }
    return X.length > 1 ? m : null;
  }

  function rot([x, y, z]) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = cy * x + sy * z, z1 = -sy * x + cy * z;
    return [x1, cp * y - sp * z1, sp * y + cp * z1];
  }

  function draw() {
    const C = 210, R = 120, el = [];
    const items = regions.map((r, i) => ({ r, i, q: rot(r.p) }));
    if (showPush) for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j], w = W(a.r, b.r), L = a.r.lp ? .62 : 1, M = b.r.lp ? .62 : 1;
      el.push({ z: Math.min(a.q[2], b.q[2]) - 2, s: `<line class="push w${w > 1.3 ? 3 : w > 1.1 ? 2 : 1}" x1="${C + a.q[0] * R * L}" y1="${C - a.q[1] * R * L}" x2="${C + b.q[0] * R * M}" y2="${C - b.q[1] * R * M}"/>` });
    }
    items.forEach(({ r, q }) => {
      const x = C + q[0] * R, y = C - q[1] * R, depth = .78 + .22 * (q[2] + 1) / 2;
      if (r.lp) {   // a lone pair: a fat lobe close to the nucleus with its two electrons
        const ang = Math.atan2(-q[1], q[0]) * 180 / Math.PI, len = 58 * Math.hypot(q[0], q[1]) + 18;
        el.push({ z: q[2], s: `<g class="lobe" transform="translate(${C} ${C}) rotate(${ang})" opacity="${depth}"><ellipse cx="${len / 2 + 6}" cy="0" rx="${len / 2 + 6}" ry="26"/><circle cx="${len * .7}" cy="-7" r="4"/><circle cx="${len * .7}" cy="7" r="4"/></g>` });
      } else {
        el.push({ z: q[2] - .01, s: `<line class="bond" x1="${C}" y1="${C}" x2="${x}" y2="${y}" opacity="${depth}"/>` });
        el.push({ z: q[2], s: `<g opacity="${depth}"><circle class="x" cx="${x}" cy="${y}" r="${17 * depth + 6}"/><text x="${x}" y="${y}">X</text></g>` });
      }
    });
    el.push({ z: 0, s: `<circle class="a" cx="${C}" cy="${C}" r="24"/><text x="${C}" y="${C}">A</text>` });
    el.sort((a, b) => a.z - b.z);
    svg.innerHTML = el.map(e => e.s).join('');
  }

  function info() {
    const m = N - E, sh = SHAPES[m + ',' + E], ang = bondAngle();
    $('#vsFormula').innerHTML = `AX<sub>${m}</sub>${E > 1 ? `E<sub>${E}</sub>` : E ? 'E' : ''}`;
    $('#vsShape').textContent = sh.name;
    $('#vsElectron').textContent = ELECTRON[N];
    $('#vsAngle').textContent = sh.angle;
    $('#vsSim').textContent = ang == null ? '–' : ang.toFixed(1) + '°';
    $('#vsEx').textContent = sh.ex;
    $('#vsAdd').disabled = E >= MAX_E[N];
    $('#vsBack').disabled = E === 0;
    root.querySelectorAll('[data-n]').forEach(b => b.setAttribute('aria-current', +b.dataset.n === N));
    $('#vsNote').textContent = E === 0
      ? `บริเวณอิเล็กตรอน ${N} บริเวณผลักกันเท่าๆ กัน จึงกางออกห่างกันมากที่สุด`
      : `คู่โดดเดี่ยว ${E} คู่อยู่ใกล้อะตอมกลางและกินที่กว้างกว่า จึงผลักแรงกว่า ดันพันธะที่เหลือให้หุบเข้าหากัน มุมพันธะจึงเล็กลง`;
    draw();
  }

  root.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { N = +b.dataset.n; E = 0; setup(false); });
  $('#vsAdd').onclick = () => { if (E < MAX_E[N]) { E++; setup(true); } };
  $('#vsBack').onclick = () => { if (E > 0) { E--; setup(true); } };
  $('#vsPush').onchange = e => { showPush = e.target.checked; draw(); };

  // drag (or arrow keys) to turn the molecule
  let drag = null;
  svg.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, yaw, pitch]; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', e => { if (!drag) return; yaw = drag[2] + (e.clientX - drag[0]) / 90; pitch = Math.max(-1.4, Math.min(1.4, drag[3] + (e.clientY - drag[1]) / 90)); draw(); });
  svg.addEventListener('pointerup', () => drag = null);
  svg.addEventListener('keydown', e => {
    const k = { ArrowLeft: [-.2, 0], ArrowRight: [.2, 0], ArrowUp: [0, -.2], ArrowDown: [0, .2] }[e.key];
    if (k) { e.preventDefault(); yaw += k[0]; pitch = Math.max(-1.4, Math.min(1.4, pitch + k[1])); draw(); }
  });

  setup(false);
})();
