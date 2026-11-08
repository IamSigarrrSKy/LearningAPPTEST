/* ChemLab classroom page for POSN chemistry papers.
   Nothing about the papers ships with the site: question images live in Supabase (public.posn_items),
   readable only by emails the teacher invited (see chemlab-next/posn-classroom.sql). The teacher
   uploads them from this page while signed in, so no secret key is ever used. */
(() => {
  const $ = s => document.querySelector(s);
  const cfg = window.CHEMLAB_SUPABASE;
  const KEYS = ['ก', 'ข', 'ค', 'ง'];
  const gateText = t => { $('#gateText').textContent = t; };
  if (!cfg?.url || !cfg?.publishableKey || !window.supabase) { gateText('ระบบบัญชียังไม่พร้อม'); return; }
  const db = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { flowType: 'pkce', storage: sessionStorage, storageKey: 'chemlab.posn.auth', persistSession: true, detectSessionInUrl: true } });

  const S = { role: 'none', items: [], year: null, list: [], idx: 0, answers: {}, imgs: {}, classRows: [] };
  const idOf = (y, n) => `${y}-${String(n).padStart(2, '0')}`;
  const el = (tag, props = {}, kids = []) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

  async function boot() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) { gateText('เข้าสู่ระบบด้วยบัญชี Google ที่ครูเพิ่มไว้'); $('#login').hidden = false; return; }
    $('#logout').hidden = false;
    const { data: role, error } = await db.rpc('posn_access');
    if (error) { gateText('ตรวจสิทธิ์ไม่สำเร็จ: ' + error.message); return; }
    S.role = role;
    if (role === 'none') { gateText(`บัญชี ${user.email} ยังไม่ได้รับสิทธิ์ แจ้งครูให้เพิ่มอีเมลนี้`); return; }
    $('#gate').hidden = true; $('#app').hidden = false;
    if (role === 'teacher') { $('#teacher').hidden = false; loadPeople(); }
    await loadIndex();
  }

  async function loadIndex() {
    const { data, error } = await db.from('posn_items').select('id,year,no,part').order('year', { ascending: false }).order('no');
    if (error) { gateText(error.message); $('#gate').hidden = false; return; }
    S.items = data;
    const years = [...new Set(data.map(r => r.year))];
    const box = $('#years'); box.replaceChildren();
    if (!years.length) { box.append(el('p', { className: 'note', textContent: S.role === 'teacher' ? 'ยังไม่มีชุดข้อสอบ อัปโหลดจากเครื่องมือครูด้านล่าง' : 'ครูยังไม่ได้เปิดชุดข้อสอบ' })); return; }
    for (const y of years) box.append(el('button', { textContent: 'ปี ' + y, onclick: () => openYear(y) }));
    const want = +(new URLSearchParams(location.hash.slice(1)).get('y')) || years[0];
    openYear(years.includes(want) ? want : years[0]);
  }

  async function openYear(y) {
    S.year = y; S.idx = 0;
    document.querySelectorAll('#years button').forEach(b => b.setAttribute('aria-pressed', b.textContent === 'ปี ' + y));
    S.list = S.items.filter(r => r.year === y && r.part !== 'info');
    $('#info').hidden = !S.items.some(r => r.year === y && r.part === 'info');
    const ids = S.list.map(r => r.id);
    const { data } = await db.from('posn_answers').select('item_id,answer').in('item_id', ids);
    S.answers = Object.fromEntries((data || []).map(r => [r.item_id, r.answer]));
    $('#exam').hidden = false;
    history.replaceState(null, '', '#y=' + y);
    drawNav(); show(0);
  }

  function drawNav() {
    const nav = $('#nav'); nav.replaceChildren();
    let part = null;
    S.list.forEach((r, i) => {
      if (r.part !== part) { part = r.part; nav.append(el('div', { className: 'sep', textContent: part === 'mc' ? 'ปรนัย' : 'อัตนัย' })); }
      const b = el('button', { textContent: r.no, onclick: () => show(i) });
      b.setAttribute('aria-label', 'ข้อ ' + r.no);
      if (S.answers[r.id]) b.className = 'done';
      if (i === S.idx) b.setAttribute('aria-current', 'true');
      nav.append(b);
    });
    const done = S.list.filter(r => S.answers[r.id]).length;
    $('#progress').textContent = `ตอบแล้ว ${done}/${S.list.length} ข้อ`;
  }

  async function image(id) {
    if (S.imgs[id]) return S.imgs[id];
    const { data, error } = await db.from('posn_items').select('img').eq('id', id).single();
    if (error) throw error;
    return (S.imgs[id] = data.img);
  }

  async function paint(id, alt) {
    const paper = $('#paper');
    paper.replaceChildren(el('div', { className: 'wait', textContent: 'กำลังโหลด…' }));
    try {
      const img = el('img', { src: await image(id), alt, draggable: false });
      img.oncontextmenu = e => e.preventDefault();
      paper.replaceChildren(img);
    } catch (e) { paper.replaceChildren(el('div', { className: 'wait', textContent: 'โหลดไม่สำเร็จ: ' + e.message })); }
  }

  function show(i) {
    S.idx = Math.max(0, Math.min(i, S.list.length - 1));
    const r = S.list[S.idx];
    const w = S.list.filter(x => x.part === 'written'), wi = w.indexOf(r);
    $('#qTitle').textContent = `ปี ${S.year} ข้อ ${r.no}` + (wi >= 0 ? ` · อัตนัยข้อที่ ${wi + 1}` : '');
    paint(r.id, `โจทย์ข้อ ${r.no}`);
    const box = $('#answer'), st = el('p', { className: 'status' });
    const saved = S.answers[r.id] || '';
    if (r.part === 'mc') {
      const row = el('div', { className: 'choices', role: 'group' });
      row.setAttribute('aria-label', 'เลือกคำตอบ');
      for (const k of KEYS) {
        const b = el('button', { textContent: k, onclick: () => save(r, k, st) });
        b.setAttribute('aria-pressed', saved === k);
        row.append(b);
      }
      box.replaceChildren(row, st);
    } else {
      const ta = el('textarea', { value: saved, placeholder: 'เขียนคำตอบหรือวิธีคิด' });
      ta.setAttribute('aria-label', 'คำตอบข้อ ' + r.no);
      const b = el('button', { textContent: 'บันทึกคำตอบ', onclick: () => save(r, ta.value.trim(), st) });
      box.replaceChildren(ta, el('div', { className: 'row' }, [b]), st);
    }
    if (saved) st.textContent = 'บันทึกไว้แล้ว';
    $('#prev').disabled = S.idx === 0; $('#next').disabled = S.idx === S.list.length - 1;
    drawNav();
  }

  async function save(r, value, st) {
    st.textContent = 'กำลังบันทึก…';
    const { data: { user } } = await db.auth.getUser();
    const q = value
      ? db.from('posn_answers').upsert({ owner: user.id, item_id: r.id, answer: value.slice(0, 2000), updated_at: new Date().toISOString() })
      : db.from('posn_answers').delete().eq('item_id', r.id);
    const { error } = await q;
    if (error) { st.textContent = 'บันทึกไม่สำเร็จ: ' + error.message; return; }
    if (value) S.answers[r.id] = value; else delete S.answers[r.id];
    if (r.part === 'mc') document.querySelectorAll('#answer .choices button').forEach(b => b.setAttribute('aria-pressed', b.textContent === value));
    st.textContent = value ? 'บันทึกแล้ว' : 'ลบคำตอบแล้ว';
    drawNav();
  }

  /* ---- teacher tools ---- */
  async function loadPeople() {
    const { data, error } = await db.rpc('posn_invite_list');
    const box = $('#people'); box.replaceChildren();
    if (error) { $('#peopleStatus').textContent = error.message; return; }
    for (const p of data) {
      const x = el('button', { textContent: 'เอาออก', onclick: async () => {
        if (!confirm(`เอา ${p.email} ออกจากชั้น?`)) return;
        const { error } = await db.rpc('posn_invite_remove', { target: p.email });
        $('#peopleStatus').textContent = error ? error.message : 'เอาออกแล้ว'; loadPeople();
      } });
      box.append(el('span', { className: p.signed_in ? '' : 'off', title: p.signed_in ? 'เข้าสู่ระบบแล้ว' : 'ยังไม่เคยเข้าสู่ระบบ' }, [p.email, x]));
    }
    $('#peopleStatus').textContent = `ทั้งหมด ${data.length} คน`;
  }

  async function uploadFiles(files) {
    const status = t => { $('#uploadStatus').textContent = t; };
    const byName = Object.fromEntries([...files].map(f => [f.name, f]));
    if (!byName['manifest.json']) { status('ไม่พบ manifest.json'); return; }
    const man = JSON.parse(await byName['manifest.json'].text());
    if (!/^\d{4}$/.test(String(man.year)) || !Array.isArray(man.items)) { status('manifest.json ไม่ถูกรูปแบบ'); return; }
    const missing = man.items.filter(it => !byName[it.file]);
    if (missing.length) { status('ไฟล์ขาด: ' + missing.map(m => m.file).join(', ')); return; }
    const toData = f => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = bad; r.readAsDataURL(f); });
    let n = 0;
    for (let i = 0; i < man.items.length; i += 5) {
      const rows = await Promise.all(man.items.slice(i, i + 5).map(async it => ({ id: idOf(man.year, it.no), year: man.year, no: it.no, part: it.part, img: await toData(byName[it.file]), updated_at: new Date().toISOString() })));
      const { error } = await db.from('posn_items').upsert(rows);
      if (error) { status(`หยุดที่ข้อ ${rows[0].no}: ${error.message}`); return; }
      n += rows.length; status(`อัปโหลดปี ${man.year} แล้ว ${n}/${man.items.length}`);
    }
    status(`อัปโหลดปี ${man.year} ครบ ${n} รูป`);
    S.imgs = {}; loadIndex();
  }

  async function loadClass() {
    const st = t => { $('#classStatus').textContent = t; };
    if (!S.year) { st('เลือกปีก่อน'); return; }
    const { data, error } = await db.rpc('posn_class_answers', { p_year: S.year });
    if (error) { st(error.message); return; }
    S.classRows = data;
    const people = [...new Set(data.map(r => r.email))], nos = S.list.map(r => r.no);
    const cell = Object.fromEntries(data.map(r => [r.email + '|' + r.no, r.answer]));
    const head = el('tr', {}, [el('th', { textContent: 'นักเรียน' }), el('th', { textContent: 'ตอบ' }), ...nos.map(n => el('th', { textContent: n }))]);
    const body = people.map(p => el('tr', {}, [el('td', { textContent: p }), el('td', { textContent: nos.filter(n => cell[p + '|' + n]).length }),
      ...nos.map(n => { const a = cell[p + '|' + n] || ''; return el('td', { textContent: a.length > 12 ? a.slice(0, 12) + '…' : a, title: a }); })]));
    $('#classTable').replaceChildren(el('table', {}, [el('thead', {}, [head]), el('tbody', {}, body)]));
    $('#csv').hidden = !data.length;
    st(`ปี ${S.year}: ${people.length} คน`);
  }

  function downloadCsv() {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const lines = [['email', 'no', 'answer', 'updated_at'].join(',')].concat(S.classRows.map(r => [r.email, r.no, r.answer, r.updated_at].map(q).join(',')));
    const a = el('a', { href: URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' })), download: `posn-${S.year}-answers.csv` });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  $('#login').onclick = async () => {
    const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
    if (error) gateText(error.message);
  };
  $('#logout').onclick = async () => { await db.auth.signOut(); location.hash = ''; location.reload(); };
  $('#prev').onclick = () => show(S.idx - 1);
  $('#next').onclick = () => show(S.idx + 1);
  $('#info').onclick = () => { const r = S.items.find(x => x.year === S.year && x.part === 'info'); if (r) { $('#qTitle').textContent = `ปี ${S.year} ค่าที่กำหนดให้`; paint(r.id, 'ค่าที่กำหนดให้'); } };
  $('#addEmails').onclick = async () => {
    const emails = $('#emails').value.split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
    if (!emails.length) { $('#peopleStatus').textContent = 'ไม่พบอีเมลที่ถูกรูปแบบ'; return; }
    const { data, error } = await db.rpc('posn_invite_add', { emails });
    $('#peopleStatus').textContent = error ? error.message : `เพิ่มใหม่ ${data} คน`;
    if (!error) $('#emails').value = '';
    loadPeople();
  };
  $('#upload').onchange = e => uploadFiles(e.target.files);
  $('#loadClass').onclick = loadClass;
  $('#csv').onclick = downloadCsv;
  document.addEventListener('keydown', e => {
    if ($('#exam').hidden || /TEXTAREA|INPUT/.test(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowRight') show(S.idx + 1);
    if (e.key === 'ArrowLeft') show(S.idx - 1);
  });
  boot().catch(e => gateText(e.message));
})();
