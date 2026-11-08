/* Teacher report for the learning path. Reads the attempts sheet exported as CSV (or pasted TSV) in this
   browser only; nothing is sent anywhere. Rows of the path carry size = path-pre / path-prac / path-post and a
   detail column "label~ok~skill~mistake|…" where the third field is the skill name. */
(() => {
  const $ = id => document.getElementById(id);
  const SKILLS = ['หามวลโมเลกุล / มวลสูตร', 'แปลงมวล ↔ โมล', 'โมล ↔ จำนวนอนุภาค', 'มวล ↔ ปริมาตรแก๊สที่ STP', 'มวลธาตุในสารประกอบ'];
  const SHORT = ['มวลโมเลกุล', 'มวล↔โมล', 'โมล↔อนุภาค', 'มวล↔ปริมาตรแก๊ส', 'มวลธาตุ'];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // RFC 4180 CSV (quotes, commas and line breaks inside quotes); a tab in the first line means TSV
  function parseTable(text) {
    text = text.replace(/^﻿/, '');
    const sep = (text.split('\n')[0] || '').includes('\t') ? '\t' : ',', rows = [];
    let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; }
      else f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    const head = (rows.shift() || []).map(h => h.trim());
    return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
  }
  const when = r => { const d = Date.parse(r.date) || Date.parse(r.received) || NaN; return isNaN(d) ? 0 : d; };
  const phaseOf = r => ({ 'path-pre': 'pre', 'path-prac': 'practice', 'path-post': 'post' })[String(r.size || '').trim()];
  function items(r) {
    return String(r.detail || '').split('|').filter(Boolean).map(x => { const [label, ok, skill, mistake] = x.split('~'); return { label, ok: ok === '1', skill: (skill || '').trim(), mistake: (mistake || '').trim() }; });
  }

  let STUDENTS = [];
  function build(rows) {
    const by = new Map();
    // rows arrive in the order they were submitted, so sheet order decides before/after (date formats vary by locale)
    rows.forEach((r, i) => r.__i = i);
    for (const r of rows) {
      const phase = phaseOf(r); if (!phase) continue;
      const key = (r.pid || '').trim() || `${(r.name || '').trim()}|${(r.school || '').trim()}`;
      if (!by.has(key)) by.set(key, { key, name: (r.name || '').trim() || 'ไม่ระบุชื่อ', school: (r.school || '').trim(), teacher: (r.teacher || '').trim(), rows: [] });
      by.get(key).rows.push({ phase, i: r.__i, t: when(r), its: items(r) });
    }
    const out = [];
    for (const s of by.values()) {
      s.rows.sort((a, b) => a.i - b.i);
      // the latest run: the last pre-test and whatever came after it
      const iPre = s.rows.map(x => x.phase).lastIndexOf('pre'); if (iPre < 0) continue;
      const run = s.rows.slice(iPre), pre = run[0], post = [...run].reverse().find(x => x.phase === 'post');
      const practice = run.filter(x => x.phase === 'practice');
      const skill = SKILLS.map(name => {
        const a = pre.its.filter(x => x.skill === name), b = post ? post.its.filter(x => x.skill === name) : [];
        const aOk = a.filter(x => x.ok).length, bOk = b.filter(x => x.ok).length;
        const prac = practice.some(p => p.its.some(x => x.skill === name));
        const mistakes = [...a, ...b].filter(x => !x.ok && x.mistake).map(x => x.mistake);
        let st = 'none';
        if (a.length) st = post && b.length ? (bOk < b.length ? 'stuck' : aOk < a.length ? 'up' : 'pass') : aOk < a.length ? 'wait' : 'pass';
        return { name, a: [aOk, a.length], b: [bOk, b.length], st, prac, mistakes: [...new Set(mistakes)] };
      });
      out.push({ ...s, pre, post, practice: practice.length, last: run[run.length - 1].t, skill, stuck: skill.some(k => k.st === 'stuck' || k.st === 'wait') });
    }
    return out.sort((x, y) => x.name.localeCompare(y.name, 'th'));
  }

  const fmtDate = t => t ? new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : '';
  const stLabel = { up: 'ดีขึ้น', pass: 'ผ่าน', stuck: 'ยังติด', wait: 'รอหลังเรียน', none: '–' };
  function view() {
    const school = $('fSchool').value, q = $('fName').value.trim().toLowerCase(), onlyStuck = $('fStuck').checked;
    const list = STUDENTS.filter(s => (!school || s.school === school) && (!q || s.name.toLowerCase().includes(q)) && (!onlyStuck || s.stuck));
    const withPost = list.filter(s => s.post), stuckN = list.filter(s => s.skill.some(k => k.st === 'stuck')).length;
    $('kpis').innerHTML = [[list.length, 'นักเรียนที่เริ่มเส้นทาง'], [withPost.length, 'ทำหลังเรียนแล้ว'], [list.filter(s => s.practice).length, 'ฝึกทบทวนอย่างน้อย 1 ครั้ง'], [stuckN, 'หลังเรียนยังติดอย่างน้อย 1 ทักษะ']]
      .map(([n, t]) => `<div class="kpi"><b>${n}</b><span>${t}</span></div>`).join('');

    // who to help: one card per skill, red (still wrong after the post-test) before amber (wrong before, no post yet)
    const cards = [];
    SKILLS.forEach((name, i) => {
      for (const st of ['stuck', 'wait']) {
        const who = list.filter(s => s.skill[i].st === st); if (!who.length) continue;
        const mist = {}; who.forEach(s => s.skill[i].mistakes.forEach(m => mist[m] = (mist[m] || 0) + 1));
        const top = Object.entries(mist).sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m} (${n} คน)`).join(' · ');
        cards.push({ w: st === 'stuck' ? 1000 + who.length : who.length, html: `<article class="${st === 'stuck' ? '' : 'soft'}"><h3>${esc(name)} · ${who.length} คน</h3>
          <p>${st === 'stuck' ? 'ทำหลังเรียนแล้วยังผิด' : 'ผิดตอนก่อนเรียน ยังไม่ทำหลังเรียน'}${top ? ` · ความผิดพลาดที่พบบ่อย: ${esc(top)}` : ''}</p>
          <div class="chips">${who.map(s => `<span class="chip">${esc(s.name)}${s.skill[i].prac ? ' <small>ฝึกแล้ว</small>' : ''}${s.skill[i].mistakes[0] ? ` <small>· ${esc(s.skill[i].mistakes[0])}</small>` : ''}</span>`).join('')}</div></article>` });
      }
    });
    $('help').innerHTML = cards.sort((a, b) => b.w - a.w).map(c => c.html).join('') || '<p class="muted">ยังไม่มีนักเรียนที่ติดทักษะใด</p>';

    $('classView').innerHTML = SKILLS.map((name, i) => {
      const pre = list.filter(s => s.skill[i].a[1]), preOk = pre.filter(s => s.skill[i].a[0] === s.skill[i].a[1]).length;
      const post = list.filter(s => s.skill[i].b[1]), postOk = post.filter(s => s.skill[i].b[0] === s.skill[i].b[1]).length;
      const bar = (ok, n, cls) => `<div><div class="meter ${cls}"><i style="width:${n ? Math.round(100 * ok / n) : 0}%"></i></div><small class="muted">${cls === 'pre' ? 'ก่อนเรียน' : 'หลังเรียน'} ถูก ${ok}/${n} คน</small></div>`;
      return `<div class="classrow"><b>${esc(name)}</b>${bar(preOk, pre.length, 'pre')}${bar(postOk, post.length, 'post')}</div>`;
    }).join('');

    $('thead').innerHTML = `<tr><th>นักเรียน</th><th>ขั้น</th>${SHORT.map(s => `<th>${s}</th>`).join('')}</tr>`;
    $('tbody').innerHTML = list.map(s => `<tr><td><b>${esc(s.name)}</b><br><small class="muted">${esc(s.school)}${s.teacher ? ' · ' + esc(s.teacher) : ''}</small></td>
      <td><small>${s.post ? 'หลังเรียนแล้ว' : 'ก่อนเรียนแล้ว'}<br>ฝึก ${s.practice} ครั้ง · ล่าสุด ${fmtDate(s.last)}</small></td>
      ${s.skill.map(k => `<td class="sk"><span class="st ${k.st}" title="${esc(k.mistakes.join(', '))}">${stLabel[k.st]}</span><br><small class="muted">${k.a[1] ? `${k.a[0]}/${k.a[1]}` : ''}${k.b[1] ? ` → ${k.b[0]}/${k.b[1]}` : ''}${k.prac ? ' · ฝึก' : ''}</small></td>`).join('')}</tr>`).join('');
    $('empty').hidden = !!list.length;
  }

  function load(rows, source) {
    STUDENTS = build(rows);
    if (!STUDENTS.length) { alert(`ไม่พบผลเส้นทางเรียนใน${source} ตรวจว่าเป็นแผ่น attempts และมีคอลัมน์ size กับ detail`); return; }
    const schools = [...new Set(STUDENTS.map(s => s.school).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th'));
    $('fSchool').innerHTML = `<option value="">ทุกโรงเรียน (${STUDENTS.length} คน)</option>` + schools.map(s => `<option>${esc(s)}</option>`).join('');
    $('report').hidden = false; view(); $('report').scrollIntoView({ behavior: 'smooth' });
  }
  async function readFiles(files) { const rows = []; for (const f of files) rows.push(...parseTable(await f.text())); load(rows, 'ไฟล์ที่เลือก'); }
  $('file').onchange = e => readFiles([...e.target.files]);
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => readFiles([...e.dataTransfer.files]));
  $('usePaste').onclick = () => load(parseTable($('paste').value), 'ข้อมูลที่วาง');
  ['fSchool', 'fName', 'fStuck'].forEach(id => $(id).addEventListener('input', view));

  $('export').onclick = () => {
    const lines = [['ทักษะ', 'สถานะ', 'ชื่อ', 'โรงเรียน', 'ก่อนเรียน', 'หลังเรียน', 'ฝึกแล้ว', 'ความผิดพลาด']];
    STUDENTS.forEach(s => s.skill.forEach(k => { if (k.st === 'stuck' || k.st === 'wait') lines.push([k.name, stLabel[k.st], s.name, s.school, `${k.a[0]}/${k.a[1]}`, k.b[1] ? `${k.b[0]}/${k.b[1]}` : '', k.prac ? 'ใช่' : '', k.mistakes.join(' · ')]); }));
    const csv = '﻿' + lines.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'chemlab-ต้องช่วย-โมลและมวล.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  // made-up class to try the page; same columns as the real sheet
  $('sample').onclick = () => {
    const MIST = ['มวลโมเลกุลผิด', 'กลับสูตร / ตั้งสูตรผิด', 'ข้ามขั้นแปลงเป็นโมล', 'เข้าใจหลักการคลาดเคลื่อน', 'คำนวณพลาด (รูปแบบอื่น)'];
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const rows = [], day = 864e5, t0 = Date.parse('2026-11-02');
    for (let k = 1; k <= 14; k++) {
      const name = `นักเรียนตัวอย่าง ${String(k).padStart(2, '0')}`, school = k <= 9 ? 'ห้อง 4/1' : 'ห้อง 4/2', skill = SKILLS.map(() => 0.35 + rnd() * 0.6);
      const mk = (size, t, chance) => ({ pid: 'demo' + k, name, school, teacher: 'ครูตัวอย่าง', size, date: new Date(t).toISOString(),
        detail: SKILLS.map((s, i) => { const ok = rnd() < chance(i); return [`ข้อ ${i + 1}`, ok ? 1 : 0, s, ok ? '' : MIST[(i + k) % MIST.length]].join('~'); }).join('|') });
      rows.push(mk('path-pre', t0 + k * 3e6, i => skill[i]));
      if (k % 5 !== 0) { const r = mk('path-prac', t0 + day + k * 3e6, () => 1); r.detail = r.detail.split('|').filter((_, i) => skill[i] < 0.7).join('|'); if (r.detail) rows.push(r); }
      if (k % 4 !== 0) rows.push(mk('path-post', t0 + 2 * day + k * 3e6, i => Math.min(0.95, skill[i] + 0.25)));
    }
    load(rows, 'ข้อมูลตัวอย่าง');
  };
})();
