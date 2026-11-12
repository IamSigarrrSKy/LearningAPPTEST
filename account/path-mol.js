/* ChemLab learning path, pilot topic "โมลและมวล":
   pre-test 5 items → see the sticking points by skill and by mistake → guided practice / lab / e-book on those
   → post-test 5 new items of the same patterns → compare skill by skill.
   Built on the quiz engine of index-v3.html (Q, patOf, startQuiz, loadHist, renderResult, ERR).
   Attempts are ordinary records (rec.meta.path), so they sync and reach the teacher like any other attempt. */
(() => {
  if (typeof Q === 'undefined' || typeof startQuiz !== 'function') return;
  const PATH = {
    id: 'mol', name: 'โมลและมวล',
    // one item per skill in each test; post items share the pattern of the pre items so the two sets are alike
    skills: [
      { id: 'mw', name: 'หามวลโมเลกุล / มวลสูตร', pat: 'fmass', alt: ['percent'], pages: [6, 6] },
      { id: 'g2n', name: 'แปลงมวล ↔ โมล', pat: 'mol-mass', alt: ['mol-compare', 'elem-mass'], pages: [9, 11] },
      { id: 'n2N', name: 'โมล ↔ จำนวนอนุภาค', pat: 'particles', pages: [9, 11] },
      { id: 'n2V', name: 'มวล ↔ ปริมาตรแก๊สที่ STP', pat: 'g-to-vol', pages: [9, 11] },
      { id: 'elem', name: 'มวลธาตุในสารประกอบ', pat: 'elem-mass', pages: [7, 8] },
    ],
    lab: 'lessons/stoich.html#lab1', book: 4,
  };
  // what each mistake points to (keys are the ERR tags already on every wrong choice)
  const FIX = {
    molar: 'คิดมวลโมเลกุลผิด: รวมมวลอะตอมทุกตัว คูณตามตัวห้อย',
    formula: 'กลับสูตร: n = m ÷ M (g ÷ g/mol = mol)',
    skipmol: 'ข้ามขั้นโมล: แปลงเป็นโมลก่อนเสมอ',
    unit: 'แปลงหน่วยผิด: เขียนหน่วยกำกับทุกบรรทัด',
    concept: 'สับสนอนุภาค: โมเลกุล ≠ อะตอม ≠ ไอออน',
    calc: 'คำนวณพลาด: ประมาณคำตอบคร่าวๆ ก่อน',
    skip: 'ยังไม่ได้ตอบ',
  };
  const pool = pat => Q.filter(q => q.topic === 'mol' && patOf(q) === pat && !q.exam && !q.posn && !q.alevel);
  const shuffleA = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const meOf = () => (typeof studentLabel === 'function' ? studentLabel() : '') || '';
  const runs = () => (typeof loadHist === 'function' ? loadHist() : []).filter(r => r.meta?.path?.id === PATH.id && (r.who || '') === meOf());
  const latest = () => { const rs = runs(); const pre = [...rs].reverse().find(r => r.meta.path.phase === 'pre'); if (!pre) return null;
    const rid = pre.meta.path.run; return { pre, practice: rs.filter(r => r.meta.path.run === rid && r.meta.path.phase === 'practice'), post: [...rs].reverse().find(r => r.meta.path.run === rid && r.meta.path.phase === 'post') }; };
  // size goes to the teacher's sheet as is (≤10 chars): path-pre / path-prac / path-post
  const meta = (phase, extra) => ({ lv: 'm4', topics: ['mol'], size: 'path-' + phase.slice(0, 4), path: { id: PATH.id, phase, ...extra } });
  const PHASE_TH = { pre: 'ก่อนเรียน', practice: 'ฝึกทบทวน', post: 'หลังเรียน' };

  function startPre() {
    const run = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())), pre = [], post = [];
    for (const s of PATH.skills) {
      const p = shuffleA(pool(s.pat)); if (p.length < 2) continue;
      const a = p[0], b = p.slice(1).sort((x, y) => Math.abs((x.sim ?? .3) - (a.sim ?? .3)) - Math.abs((y.sim ?? .3) - (a.sim ?? .3)))[0];
      pre.push(a.id); post.push(b.id);
    }
    startQuiz('exam', pre, meta('pre', { run, post, skills: Object.fromEntries(PATH.skills.map(s => [s.pat, s.id])) }));
  }
  const skillOf = id => PATH.skills.find(s => s.pat === patOf(QBY[id]));
  function bySkill(rec) { const out = {}; for (const [id, a] of Object.entries(rec.per)) { const s = skillOf(+id); if (!s) continue; const o = out[s.id] || (out[s.id] = { ok: 0, n: 0, errs: [] }); o.n++; if (a.c) o.ok++; else if (a.err) o.errs.push({ err: a.err, why: a.why, id: +id }); } return out; }
  function byMistake(rec) { const out = {}; for (const a of Object.values(rec.per)) if (!a.c && a.err) out[a.err] = (out[a.err] || 0) + 1; return Object.entries(out).sort((a, b) => b[1] - a[1]); }
  const ebook = s => `ebook/shelf.html#read=${PATH.book}&p=${s.pages[0]}`;
  const labUrl = s => `${PATH.lab.split('#')[0]}?from=${PATH.book}-${s.pages[0]}#${PATH.lab.split('#')[1]}`;
  // practice never uses the post-test items; a skill with few items borrows from its related patterns
  function practice(s, run, postIds) {
    const seen = new Set(runs().flatMap(r => Object.keys(r.per).map(Number))), hold = new Set(postIds);
    const rank = list => shuffleA(list.filter(q => !hold.has(q.id))).sort((a, b) => (seen.has(a.id) - seen.has(b.id)) || ((b.guide ? 1 : 0) - (a.guide ? 1 : 0)));
    let qs = rank(pool(s.pat)).filter(q => !seen.has(q.id));
    for (const alt of s.alt || []) if (qs.length < 2) qs = qs.concat(rank(pool(alt)).filter(q => !seen.has(q.id)));
    if (qs.length < 2) qs = qs.concat(rank(pool(s.pat)));
    const ids = [...new Set(qs.map(q => q.id))].slice(0, 2);
    startQuiz('practice', ids, { ...meta('practice', { run, skill: s.id }), guide: true });
  }

  const css = document.createElement('style');
  css.textContent = `
  .pathcard{margin:0 0 28px;padding:20px 22px;border:1px solid var(--line);border-radius:18px;background:var(--surface)}
  .pathcard h2{margin:0 0 4px;font-size:22px}.pathcard p{margin:0 0 12px;color:var(--soft)}
  .pathsteps{display:flex;flex-wrap:wrap;gap:6px 4px;margin:10px 0 14px;padding:0;list-style:none;font-size:13px}
  .pathsteps li{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:var(--surface2);color:var(--soft)}
  .pathsteps li.on{background:color-mix(in srgb,var(--accent) 14%,transparent);color:var(--ink);font-weight:600}
  .pathsteps li.done{color:var(--ok)}.pathsteps li.done::before{content:'✓'}
  .pathsteps .arrow{background:none;padding:0 2px;color:var(--muted)}
  .pathpanel{border-left:4px solid var(--accent)}
  .pathpanel table{width:100%;border-collapse:collapse;font-size:14px;margin:6px 0 10px}
  .pathpanel th,.pathpanel td{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
  .pathpanel td.n{white-space:nowrap;font-variant-numeric:tabular-nums}
  .pathpanel .tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;background:var(--surface2)}
  .pathpanel .tag.bad{color:var(--bad)}.pathpanel .tag.ok{color:var(--ok)}.pathpanel .tag.up{color:var(--ok);font-weight:600}
  .pathpanel .fixrow{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .pathpanel .fixrow .btn,.pathpanel .fixrow a{font-size:13px;padding:6px 12px;min-height:36px;text-decoration:none}
  .pathpanel .note{font-size:13px;color:var(--muted);margin-top:8px}
  .pathpanel .next{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}`;
  document.head.append(css);

  /* ---- home card ---- */
  function homeCard() {
    let el = document.getElementById('pathCard');
    if (!el) { el = document.createElement('section'); el.id = 'pathCard'; el.className = 'pathcard'; el.setAttribute('aria-labelledby', 'pathTitle');
      const anchor = document.querySelector('#home .rxn'); if (!anchor) return; anchor.after(el); }
    const st = latest(), stage = !st ? 0 : st.post ? 4 : st.practice.length ? 2 : 1;
    const steps = ['ทำก่อนเรียน 5 ข้อ', 'ดูจุดที่ติด', 'ทบทวน: ไกด์ ห้องทดลอง ชีท', 'ทำหลังเรียน 5 ข้อ', 'เทียบรายทักษะ'];
    el.innerHTML = `<h2 id="pathTitle">เส้นทางเรียน: ${PATH.name}</h2>
      <p>ทำก่อนเรียน 5 ข้อ ระบบบอกว่าติดทักษะไหน แล้วพาไปทบทวนเฉพาะเรื่องนั้น จากนั้นทำโจทย์แนวเดิมข้อใหม่เพื่อดูว่าดีขึ้นตรงไหน</p>
      <ol class="pathsteps">${steps.map((t, i) => `<li class="${i < stage ? 'done' : i === stage ? 'on' : ''}">${t}</li>${i < steps.length - 1 ? '<li class="arrow" aria-hidden="true">→</li>' : ''}`).join('')}</ol>
      <div class="next">${!st ? `<button class="btn primary" id="pathStart">เริ่มก่อนเรียน 5 ข้อ</button>`
        : st.post ? `<button class="btn primary" id="pathOpen">ดูผลเทียบรายทักษะ</button><button class="btn ghost" id="pathStart">เริ่มรอบใหม่</button>`
        : `<button class="btn primary" id="pathOpen">ไปต่อจากที่ค้าง</button><button class="btn ghost" id="pathStart">เริ่มรอบใหม่</button>`}</div>`;
    el.querySelector('#pathStart')?.addEventListener('click', startPre);
    el.querySelector('#pathOpen')?.addEventListener('click', () => { const s = latest(); renderResult(s.post || s.pre); });
  }

  /* ---- panel on the result page ---- */
  function panel(rec) {
    const p = rec.meta?.path; if (p?.id !== PATH.id) return;
    const rs = runs(), pre = rs.find(r => r.meta.path.run === p.run && r.meta.path.phase === 'pre') || (p.phase === 'pre' ? rec : null);
    if (!pre) return;
    const post = p.phase === 'post' ? rec : [...rs].reverse().find(r => r.meta.path.run === p.run && r.meta.path.phase === 'post');
    const practiced = new Set(rs.filter(r => r.meta.path.run === p.run && r.meta.path.phase === 'practice').map(r => r.meta.path.skill));
    const A = bySkill(pre), B = post ? bySkill(post) : null;
    const box = document.createElement('div'); box.className = 'card panel pathpanel'; box.id = 'pathPanel';
    const rows = PATH.skills.filter(s => A[s.id]).map(s => {
      const a = A[s.id], b = B?.[s.id], weak = a.ok < a.n;
      const status = !B ? `<span class="tag ${weak ? 'bad' : 'ok'}">${weak ? 'ควรทบทวน' : 'ผ่าน'}</span>`
        : b.ok > a.ok ? '<span class="tag up">ดีขึ้น</span>' : b.ok < a.ok ? '<span class="tag bad">ลดลง ควรถามครู</span>' : b.ok === b.n ? '<span class="tag ok">ผ่านทั้งสองครั้ง</span>' : '<span class="tag bad">ยังติด ควรถามครู</span>';
      const mist = [...a.errs, ...(b?.errs || [])].map(e => FIX[e.err] || ERR[e.err]?.name).filter(Boolean);
      const fix = weak && !B ? `<div class="fixrow"><button class="btn ghost" data-practice="${s.id}">${practiced.has(s.id) ? '✓ ' : ''}ฝึกพร้อมไกด์ 2 ข้อ</button><a class="btn ghost" href="${labUrl(s)}">ห้องทดลอง</a><a class="btn ghost" href="${ebook(s)}">ชีทหน้า ${s.pages[0]}${s.pages[1] > s.pages[0] ? '–' + s.pages[1] : ''}</a></div>` : '';
      return `<tr><td><b>${s.name}</b>${mist.length ? `<div class="note">${[...new Set(mist)].join(' · ')}</div>` : ''}${fix}</td>
        <td class="n">ก่อน ${a.ok}/${a.n}${B ? `<br>หลัง ${b ? b.ok + '/' + b.n : '–'}` : ''}</td><td>${status}</td></tr>`;
    }).join('');
    const mistakes = byMistake(pre);
    const titles = { pre: 'ก่อนเรียน: จุดที่ควรทบทวน', practice: 'ฝึกทบทวนแล้ว', post: 'เทียบก่อนเรียนกับหลังเรียน รายทักษะ' };
    box.innerHTML = `<h3>เส้นทางเรียน ${PATH.name}: ${titles[p.phase]}</h3>
      <p class="lead">${B ? 'ข้อหลังเรียนเป็นโจทย์ใหม่ในแนวเดียวกับข้อก่อนเรียน เทียบทีละทักษะ ไม่ใช้คะแนนรวม' : 'ทักษะละ 1 ข้อ แตะปุ่มใต้ทักษะที่ติดเพื่อทบทวน แล้วจึงทำหลังเรียน'}</p>
      <table><thead><tr><th>ทักษะ</th><th>ผล</th><th>สถานะ</th></tr></thead><tbody>${rows}</tbody></table>
      ${!B && mistakes.length ? `<p class="note">ความผิดพลาดที่พบ: ${mistakes.map(([e, n]) => `${ERR[e]?.name || e} ${n} ข้อ`).join(' · ')}</p>` : ''}
      <p class="note">ประเมินจากทักษะละ 1 ข้อต่อครั้ง ผลนี้บอกทิศทาง ยังไม่ใช่การวัดความสามารถทั้งหมด ถ้ายังติด ส่งรายงานให้ครูช่วยได้จากปุ่มด้านล่าง</p>
      <div class="next">${!post ? `<button class="btn primary" id="pathPost">ทำหลังเรียน 5 ข้อ (ข้อใหม่)</button>` : `<button class="btn ghost" id="pathAgain">เริ่มเส้นทางรอบใหม่</button>`}</div>`;
    box.querySelectorAll('[data-practice]').forEach(b => b.addEventListener('click', () => practice(PATH.skills.find(s => s.id === b.dataset.practice), p.run, pre.meta.path.post)));
    box.querySelector('#pathPost')?.addEventListener('click', () => startQuiz('exam', pre.meta.path.post, meta('post', { run: p.run })));
    box.querySelector('#pathAgain')?.addEventListener('click', startPre);
    const hero = document.querySelector('#resultWrap .rhero'); if (hero) hero.after(box);
  }

  // what reaches the teacher: the set title names the path and phase, and each item's "chapter" is its skill,
  // so the sheet's chapter/detail columns read skill by skill without any change to the backend
  if (typeof scopeLabelOf === 'function') { const base = scopeLabelOf; scopeLabelOf = rec => rec.meta?.path?.id === PATH.id ? `เส้นทาง ${PATH.name} · ${PHASE_TH[rec.meta.path.phase] || ''}` : base(rec); }
  if (typeof attemptPayload === 'function') { const base = attemptPayload; attemptPayload = rec => { const out = base(rec), p = rec.meta?.path; if (p?.id !== PATH.id) return out;
    const practiced = PATH.skills.find(s => s.id === p.skill);
    Object.keys(rec.per).forEach((id, i) => { const s = skillOf(+id) || practiced; if (s && out.items[i]) out.items[i][1] = s.name; });
    return out; }; }

  const prevRender = renderResult;
  renderResult = function (rec) { prevRender(rec); try { panel(rec); } catch (e) { console.error(e); } };
  // Home card removed from the home page (2026-11-12, user request). The path still opens via #path=mol
  // and the result-page panel; call homeCard() here again to bring the card back.
  if (location.hash === '#path=mol') setTimeout(() => { const s = latest(); s ? renderResult(s.post || s.pre) : startPre(); }, 0);
  window.ChemLabPath = { startPre, latest };
})();
