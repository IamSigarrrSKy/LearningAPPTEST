/* ChemLab teacher classrooms (see chemlab-next/classroom.sql).
   Teachers (approved by the site owner) create classes, invite students by email, upload question images
   or crop them from a PDF, and set the answer key. Students sign in with Google, answer, submit, and see
   their result if the teacher allows it. All access is enforced by RLS and security-definer functions;
   this page only uses the publishable key. Answers for multiple choice are stored as "1".."5". */
(() => {
  const $ = s => document.querySelector(s);
  const cfg = window.CHEMLAB_SUPABASE;
  const LETTERS = ['ก', 'ข', 'ค', 'ง', 'จ'];
  const MAX_BYTES = 850000;
  const gateText = t => { $('#gateText').textContent = t; };
  if (!cfg?.url || !cfg?.publishableKey || !window.supabase) { gateText('ระบบบัญชียังไม่พร้อม'); return; }
  const db = window.supabase.createClient(cfg.url, cfg.publishableKey, { auth: { flowType: 'pkce', storage: sessionStorage, storageKey: 'chemlab.classroom.auth', persistSession: true, detectSessionInUrl: true } });

  const S = {
    user: null, role: 'none',
    // student
    myClasses: [], myClass: null, sets: [], set: null, list: [], idx: 0, answers: {}, imgs: {}, submitted: false, result: null,
    // teacher
    classes: [], cls: null, tsets: [], tset: null, items: [], keys: {}, rows: [], subs: [],
    pdf: null, page: 1, pageScale: 2, crop: null,
  };
  const el = (tag, props = {}, kids = []) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
  const btn = (text, onclick, props = {}) => el('button', { textContent: text, onclick, ...props });
  const say = (sel, t) => { $(sel).textContent = t; };
  const err = e => (e && (e.message || e.error_description)) || String(e);

  /* ================= boot ================= */
  async function boot() {
    const { data: { user } } = await db.auth.getUser();
    if (!user) { gateText('เข้าสู่ระบบด้วยบัญชี Google (นักเรียนใช้อีเมลที่ครูเพิ่มไว้)'); $('#login').hidden = false; return; }
    S.user = user;
    $('#logout').hidden = false;
    const { data: role, error } = await db.rpc('cr_my_role');
    if (error) { gateText('ตรวจสิทธิ์ไม่สำเร็จ: ' + error.message); return; }
    S.role = role;
    $('#gate').hidden = true; $('#app').hidden = false;
    const teacher = role === 'teacher' || role === 'owner';
    $('#teacher').hidden = !teacher;
    $('#requestArea').hidden = teacher;
    $('#pendingNote').hidden = role !== 'pending';
    $('#requestBox').hidden = role === 'pending';
    $('#ownerTools').hidden = role !== 'owner';
    await loadMyClasses();
    if (teacher) await loadClasses();
    if (role === 'owner') loadRequests();
  }

  /* ================= student ================= */
  async function loadMyClasses() {
    const { data, error } = await db.rpc('cr_my_classes');
    const box = $('#myClasses'); box.replaceChildren();
    if (error) { box.append(el('p', { className: 'note', textContent: error.message })); return; }
    S.myClasses = data || [];
    if (!S.myClasses.length) {
      box.append(el('p', { className: 'note', textContent: `ยังไม่มีห้องเรียนสำหรับ ${S.user.email} ถ้าเป็นนักเรียน แจ้งครูให้เพิ่มอีเมลนี้` }));
      $('#studentArea').hidden = S.role === 'teacher' || S.role === 'owner';   // teachers without invites see only their tools
      return;
    }
    $('#studentArea').hidden = false;
    for (const c of S.myClasses) {
      const b = btn(`${c.name} · ${c.teacher_name}`, () => openMyClass(c));
      b.dataset.id = c.id; box.append(b);
    }
    openMyClass(S.myClasses[0]);
  }

  async function openMyClass(c) {
    S.myClass = c;
    document.querySelectorAll('#myClasses button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === c.id));
    const { data, error } = await db.from('cr_sets').select('id,title,show_key,created_at').eq('class_id', c.id).eq('is_open', true).order('created_at', { ascending: false });
    const box = $('#mySets'); box.replaceChildren();
    if (error) { box.append(el('p', { className: 'note', textContent: error.message })); return; }
    S.sets = data || [];
    if (!S.sets.length) { box.append(el('p', { className: 'note', textContent: 'ครูยังไม่ได้เปิดชุดให้ทำ' })); return; }
    const { data: subs } = await db.from('cr_submissions').select('set_id').in('set_id', S.sets.map(s => s.id));
    const done = new Set((subs || []).map(r => r.set_id));
    const list = el('div', { className: 'setlist' });
    for (const s of S.sets) {
      list.append(el('div', { className: 'setcard' }, [
        el('div', {}, [el('div', { textContent: s.title }), el('div', { className: 'meta', textContent: done.has(s.id) ? 'ส่งแล้ว' : 'ยังไม่ส่ง' })]),
        btn(done.has(s.id) ? 'ดูผล' : 'เริ่มทำ', () => openSet(s), { className: done.has(s.id) ? '' : 'btn primary' }),
      ]));
    }
    box.append(list);
  }

  async function openSet(s) {
    S.set = s; S.idx = 0; S.result = null; $('#result').replaceChildren();
    const { data: items, error } = await db.from('cr_items').select('id,no,kind,choices').eq('set_id', s.id).order('no');
    if (error) { alert(error.message); return; }
    S.list = items || [];
    const ids = S.list.map(r => r.id);
    const { data: ans } = ids.length ? await db.from('cr_answers').select('item_id,answer').in('item_id', ids) : { data: [] };
    S.answers = Object.fromEntries((ans || []).map(r => [r.item_id, r.answer]));
    const { data: sub } = await db.from('cr_submissions').select('set_id').eq('set_id', s.id);
    S.submitted = !!(sub && sub.length);
    $('#studentArea').hidden = true; $('#exam').hidden = false;
    say('#examTitle', s.title);
    if (!S.list.length) { $('#paper').replaceChildren(el('div', { className: 'wait', textContent: 'ชุดนี้ยังไม่มีโจทย์' })); return; }
    if (S.submitted) await loadResult();
    show(0);
  }

  function drawNav() {
    const nav = $('#nav'); nav.replaceChildren();
    const res = S.result ? Object.fromEntries(S.result.map(r => [r.item_id, r])) : null;
    S.list.forEach((r, i) => {
      const b = btn(r.no, () => show(i));
      b.setAttribute('aria-label', 'ข้อ ' + r.no);
      const x = res?.[r.id];
      if (x && x.correct === true) b.className = 'ok';
      else if (x && x.correct === false) b.className = 'bad';
      else if (S.answers[r.id]) b.className = 'done';
      if (i === S.idx) b.setAttribute('aria-current', 'true');
      nav.append(b);
    });
    const done = S.list.filter(r => S.answers[r.id]).length;
    say('#progress', S.submitted ? `ส่งแล้ว · ตอบ ${done}/${S.list.length} ข้อ` : `ตอบแล้ว ${done}/${S.list.length} ข้อ`);
    $('#submit').hidden = S.submitted;
  }

  async function image(id) {
    if (S.imgs[id]) return S.imgs[id];
    const { data, error } = await db.from('cr_items').select('img').eq('id', id).single();
    if (error) throw error;
    return (S.imgs[id] = data.img);
  }

  async function paint(target, id, alt) {
    target.replaceChildren(el('div', { className: 'wait', textContent: 'กำลังโหลด…' }));
    try {
      const img = el('img', { src: await image(id), alt, draggable: false });
      img.oncontextmenu = e => e.preventDefault();
      target.replaceChildren(img);
    } catch (e) { target.replaceChildren(el('div', { className: 'wait', textContent: 'โหลดไม่สำเร็จ: ' + err(e) })); }
  }

  function show(i) {
    S.idx = Math.max(0, Math.min(i, S.list.length - 1));
    const r = S.list[S.idx];
    say('#qTitle', `ข้อ ${r.no}`);
    paint($('#paper'), r.id, `โจทย์ข้อ ${r.no}`);
    const box = $('#answer'), st = el('p', { className: 'status' });
    const saved = S.answers[r.id] || '';
    const res = S.result?.find(x => x.item_id === r.id);
    if (r.kind === 'mc') {
      const row = el('div', { className: 'choices', role: 'group' });
      row.setAttribute('aria-label', 'เลือกคำตอบ');
      for (let k = 1; k <= r.choices; k++) {
        const b = btn(LETTERS[k - 1], () => save(r, String(k), st), { disabled: S.submitted });
        b.setAttribute('aria-pressed', saved === String(k));
        if (res?.key === String(k)) b.classList.add('key');
        row.append(b);
      }
      box.replaceChildren(row, st);
      if (res && res.key) st.textContent = res.correct ? 'ถูก' : `ยังไม่ถูก เฉลยคือ ${LETTERS[+res.key - 1]}`;
    } else {
      const ta = el('textarea', { value: saved, placeholder: 'เขียนคำตอบหรือวิธีคิด', disabled: S.submitted });
      ta.setAttribute('aria-label', 'คำตอบข้อ ' + r.no);
      const b = btn('บันทึกคำตอบ', () => save(r, ta.value.trim(), st), { hidden: S.submitted });
      box.replaceChildren(ta, el('div', { className: 'row' }, [b]), st);
      if (S.submitted) st.textContent = 'ข้อเขียน ครูเป็นผู้ตรวจ';
    }
    if (saved && !S.submitted) st.textContent = 'บันทึกไว้แล้ว';
    $('#prev').disabled = S.idx === 0; $('#next').disabled = S.idx === S.list.length - 1;
    drawNav();
  }

  async function save(r, value, st) {
    if (S.submitted) return;
    st.textContent = 'กำลังบันทึก…';
    const q = value
      ? db.from('cr_answers').upsert({ owner: S.user.id, item_id: r.id, answer: value.slice(0, 2000), updated_at: new Date().toISOString() })
      : db.from('cr_answers').delete().eq('item_id', r.id);
    const { error } = await q;
    if (error) { st.textContent = 'บันทึกไม่สำเร็จ: ' + error.message; return; }
    if (value) S.answers[r.id] = value; else delete S.answers[r.id];
    if (r.kind === 'mc') document.querySelectorAll('#answer .choices button').forEach((b, i) => b.setAttribute('aria-pressed', String(i + 1) === value));
    st.textContent = value ? 'บันทึกแล้ว' : 'ลบคำตอบแล้ว';
    drawNav();
  }

  async function submit() {
    const left = S.list.filter(r => !S.answers[r.id]).length;
    if (!confirm(left ? `ยังไม่ได้ตอบ ${left} ข้อ ส่งเลยไหม ส่งแล้วแก้คำตอบไม่ได้` : 'ส่งคำตอบ? ส่งแล้วแก้ไม่ได้')) return;
    const { error } = await db.from('cr_submissions').insert({ owner: S.user.id, set_id: S.set.id });
    if (error) { alert('ส่งไม่สำเร็จ: ' + error.message); return; }
    S.submitted = true;
    await loadResult();
    show(S.idx);
  }

  async function loadResult() {
    const { data, error } = await db.rpc('cr_my_result', { p_set: S.set.id });
    const box = $('#result');
    if (error) { box.replaceChildren(el('p', { className: 'note', textContent: error.message })); return; }
    S.result = data && data.length ? data : null;
    if (!S.result) { box.replaceChildren(el('div', { className: 'score', textContent: 'ส่งคำตอบแล้ว ครูจะแจ้งผลภายหลัง' })); return; }
    const graded = S.result.filter(r => r.key);
    const right = graded.filter(r => r.correct).length;
    box.replaceChildren(el('div', { className: 'score', textContent: `ได้ ${right}/${graded.length} คะแนน (ปรนัยที่มีเฉลย)` }));
  }

  /* ================= teacher request / owner ================= */
  async function sendRequest() {
    const name = $('#reqName').value.trim(), school = $('#reqSchool').value.trim();
    if (!name) { say('#reqStatus', 'ใส่ชื่อก่อน'); return; }
    const { error } = await db.rpc('cr_request_teacher', { p_name: name, p_school: school });
    if (error) { say('#reqStatus', error.message); return; }
    $('#requestBox').hidden = true; $('#pendingNote').hidden = false;
  }

  async function loadRequests() {
    const { data, error } = await db.rpc('cr_teacher_requests');
    const box = $('#requests');
    if (error) { box.replaceChildren(el('p', { className: 'note', textContent: error.message })); return; }
    if (!data.length) { box.replaceChildren(el('p', { className: 'note', textContent: 'ยังไม่มีคำขอ' })); return; }
    const rows = data.map(r => el('tr', {}, [
      el('td', { textContent: r.display_name }), el('td', { textContent: r.school }), el('td', { textContent: r.email }),
      el('td', { textContent: r.approved ? 'อนุมัติแล้ว' : 'รอ' }),
      el('td', {}, [
        btn(r.approved ? 'ยกเลิกสิทธิ์' : 'อนุมัติ', async () => { const { error } = await db.rpc('cr_set_teacher', { p_user: r.user_id, p_approved: !r.approved }); if (error) alert(error.message); loadRequests(); }),
        btn('ลบคำขอ', async () => { if (!confirm(`ลบคำขอของ ${r.email}?`)) return; const { error } = await db.rpc('cr_set_teacher', { p_user: r.user_id, p_approved: null }); if (error) alert(error.message); loadRequests(); }),
      ]),
    ]));
    box.replaceChildren(el('table', {}, [el('thead', {}, [el('tr', {}, ['ชื่อ', 'โรงเรียน', 'อีเมล', 'สถานะ', ''].map(t => el('th', { textContent: t })))]), el('tbody', {}, rows)]));
  }

  /* ================= teacher: classes, members ================= */
  async function loadClasses(selectId) {
    const { data, error } = await db.from('cr_classes').select('id,name,created_at').eq('teacher', S.user.id).order('created_at');
    const box = $('#classes'); box.replaceChildren();
    if (error) { say('#classStatus', error.message); return; }
    S.classes = data || [];
    for (const c of S.classes) { const b = btn(c.name, () => openClass(c)); b.dataset.id = c.id; box.append(b); }
    if (!S.classes.length) { box.append(el('p', { className: 'note', textContent: 'ยังไม่มีห้อง สร้างห้องแรกด้านล่าง' })); $('#classTools').hidden = true; return; }
    openClass(S.classes.find(c => c.id === selectId) || S.cls && S.classes.find(c => c.id === S.cls.id) || S.classes[0]);
  }

  async function addClass() {
    const name = $('#newClass').value.trim();
    if (!name) return;
    const { data, error } = await db.from('cr_classes').insert({ name, teacher: S.user.id }).select('id').single();
    if (error) { say('#classStatus', error.message); return; }
    $('#newClass').value = ''; say('#classStatus', 'สร้างห้องแล้ว');
    loadClasses(data.id);
  }

  async function openClass(c) {
    S.cls = c; S.tset = null;
    document.querySelectorAll('#classes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === c.id));
    $('#classTools').hidden = false; $('#setTools').hidden = true; $('#resultTools').hidden = true;
    say('#className', c.name);
    loadPeople(); loadSets();
  }

  async function loadPeople() {
    const { data, error } = await db.rpc('cr_member_list', { p_class: S.cls.id });
    const box = $('#people'); box.replaceChildren();
    if (error) { say('#peopleStatus', error.message); return; }
    for (const p of data) {
      const x = btn('เอาออก', async () => {
        if (!confirm(`เอา ${p.email} ออกจากห้อง?`)) return;
        const { error } = await db.rpc('cr_member_remove', { p_class: S.cls.id, target: p.email });
        say('#peopleStatus', error ? error.message : 'เอาออกแล้ว'); loadPeople();
      });
      box.append(el('span', { className: p.signed_in ? '' : 'off', title: p.signed_in ? 'เคยเข้าสู่ระบบแล้ว' : 'ยังไม่เคยเข้าสู่ระบบ' }, [p.email, x]));
    }
    say('#peopleStatus', `ทั้งหมด ${data.length} คน`);
  }

  async function addEmails() {
    const emails = $('#emails').value.split(/[\s,;]+/).map(s => s.trim().toLowerCase()).filter(s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s));
    if (!emails.length) { say('#peopleStatus', 'ไม่พบอีเมลที่ถูกรูปแบบ'); return; }
    const { data, error } = await db.rpc('cr_member_add', { p_class: S.cls.id, emails });
    say('#peopleStatus', error ? error.message : `เพิ่มใหม่ ${data} คน`);
    if (!error) $('#emails').value = '';
    loadPeople();
  }

  async function deleteClass() {
    if (prompt(`พิมพ์ชื่อห้อง "${S.cls.name}" เพื่อยืนยันการลบถาวร`) !== S.cls.name) return;
    const { error } = await db.from('cr_classes').delete().eq('id', S.cls.id);
    if (error) { alert(error.message); return; }
    S.cls = null; loadClasses();
  }

  /* ================= teacher: sets and items ================= */
  async function loadSets(selectId) {
    const { data, error } = await db.from('cr_sets').select('id,title,is_open,show_key,created_at').eq('class_id', S.cls.id).order('created_at');
    const box = $('#sets'); box.replaceChildren();
    if (error) { say('#setStatus', error.message); return; }
    S.tsets = data || [];
    for (const s of S.tsets) { const b = btn(s.title + (s.is_open ? '' : ' (ปิด)'), () => openTSet(s)); b.dataset.id = s.id; box.append(b); }
    const pick = S.tsets.find(s => s.id === selectId) || (S.tset && S.tsets.find(s => s.id === S.tset.id));
    if (pick) openTSet(pick); else { $('#setTools').hidden = true; $('#resultTools').hidden = true; }
  }

  async function addSet() {
    const title = $('#newSet').value.trim();
    if (!title) return;
    const { data, error } = await db.from('cr_sets').insert({ class_id: S.cls.id, title }).select('id').single();
    if (error) { say('#setStatus', error.message); return; }
    $('#newSet').value = ''; say('#setStatus', 'สร้างชุดแล้ว ยังปิดอยู่ เพิ่มโจทย์และเฉลยก่อนเปิด');
    loadSets(data.id);
  }

  async function openTSet(s) {
    S.tset = s;
    document.querySelectorAll('#sets button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === s.id));
    $('#setTools').hidden = false; $('#resultTools').hidden = false;
    say('#setName', s.title); $('#isOpen').checked = s.is_open; $('#showKey').checked = s.show_key;
    $('#resultTable').replaceChildren(); $('#csv').hidden = true; say('#resultStatus', '');
    closePdf();
    await loadItems();
  }

  async function updateSet(patch) {
    const { error } = await db.from('cr_sets').update(patch).eq('id', S.tset.id);
    if (error) { alert(error.message); return; }
    Object.assign(S.tset, patch); loadSets(S.tset.id);
  }

  async function deleteSet() {
    if (!confirm(`ลบชุด "${S.tset.title}" พร้อมโจทย์ เฉลย และคำตอบของนักเรียน? กู้คืนไม่ได้`)) return;
    const { error } = await db.from('cr_sets').delete().eq('id', S.tset.id);
    if (error) { alert(error.message); return; }
    S.tset = null; loadSets();
  }

  async function loadItems() {
    const { data, error } = await db.from('cr_items').select('id,no,kind,choices').eq('set_id', S.tset.id).order('no');
    if (error) { say('#uploadStatus', error.message); return; }
    S.items = data || [];
    const ids = S.items.map(i => i.id);
    const { data: keys } = ids.length ? await db.from('cr_keys').select('item_id,answer').in('item_id', ids) : { data: [] };
    S.keys = Object.fromEntries((keys || []).map(k => [k.item_id, k.answer]));
    drawItems();
  }

  function drawItems() {
    const box = $('#items'); box.replaceChildren();
    const noKey = S.items.filter(i => i.kind === 'mc' && !S.keys[i.id]).length;
    say('#itemCount', `${S.items.length} ข้อ` + (noKey ? ` · ยังไม่มีเฉลย ${noKey} ข้อ` : ''));
    S.items.forEach((it, idx) => {
      const pic = el('img', { alt: 'ข้อ ' + it.no });
      image(it.id).then(src => { pic.src = src; }).catch(() => {});
      pic.onclick = () => zoom(pic.src);
      const keys = el('div', { className: 'keys' });
      if (it.kind === 'mc') {
        for (let k = 1; k <= it.choices; k++) {
          const b = btn(LETTERS[k - 1], () => setKey(it, String(k)));
          b.setAttribute('aria-pressed', S.keys[it.id] === String(k));
          b.setAttribute('aria-label', `เฉลยข้อ ${it.no} เป็น ${LETTERS[k - 1]}`);
          keys.append(b);
        }
      } else keys.append(el('span', { className: 'note', textContent: 'ข้อเขียน ไม่มีเฉลยอัตโนมัติ' }));
      const kind = el('select', {}, [el('option', { value: 'mc', textContent: 'ปรนัย' }), el('option', { value: 'written', textContent: 'ข้อเขียน' })]);
      kind.value = it.kind; kind.onchange = () => updateItem(it, { kind: kind.value });
      const ch = el('select', {}, [2, 3, 4, 5].map(n => el('option', { value: n, textContent: n + ' ตัวเลือก' })));
      ch.value = it.choices; ch.onchange = () => updateItem(it, { choices: +ch.value }); ch.hidden = it.kind !== 'mc';
      const tools = el('div', { className: 'tools' }, [kind, ch,
        btn('↑', () => move(idx, -1), { disabled: idx === 0, title: 'เลื่อนขึ้น' }),
        btn('↓', () => move(idx, 1), { disabled: idx === S.items.length - 1, title: 'เลื่อนลง' }),
        btn('ลบ', () => removeItem(it))]);
      box.append(el('div', { className: 'item' + (it.kind === 'mc' && !S.keys[it.id] ? ' nokey' : '') }, [el('div', { className: 'head' }, [el('span', { textContent: 'ข้อ ' + it.no })]), pic, keys, tools]));
    });
  }

  function zoom(src) {
    const d = el('dialog', { className: 'zoom' }, [el('img', { src, alt: '' })]);
    d.onclick = () => { d.close(); d.remove(); };
    document.body.append(d); d.showModal();
  }

  async function setKey(it, k) {
    const { error } = await db.from('cr_keys').upsert({ item_id: it.id, answer: k });
    if (error) { alert(error.message); return; }
    S.keys[it.id] = k; drawItems();
  }

  async function updateItem(it, patch) {
    const { error } = await db.from('cr_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', it.id);
    if (error) { alert(error.message); return; }
    Object.assign(it, patch);
    if (patch.choices && S.keys[it.id] && +S.keys[it.id] > patch.choices) { await db.from('cr_keys').delete().eq('item_id', it.id); delete S.keys[it.id]; }
    drawItems();
  }

  async function removeItem(it) {
    if (!confirm(`ลบข้อ ${it.no}? ข้อที่ตามมาจะเลื่อนเลขขึ้น`)) return;
    const { error } = await db.from('cr_items').delete().eq('id', it.id);
    if (error) { alert(error.message); return; }
    S.items = S.items.filter(x => x.id !== it.id);
    await renumber();
  }

  async function move(idx, d) {
    const j = idx + d; if (j < 0 || j >= S.items.length) return;
    [S.items[idx], S.items[j]] = [S.items[j], S.items[idx]];
    await renumber();
  }

  // numbers are unique per set: park everything at high numbers first, then write 1..n
  async function renumber() {
    const changed = S.items.map((it, i) => ({ it, no: i + 1 })).filter(x => x.it.no !== x.no);
    for (const x of changed) { const { error } = await db.from('cr_items').update({ no: 200 + x.no }).eq('id', x.it.id); if (error) { alert(error.message); return loadItems(); } }
    for (const x of changed) { const { error } = await db.from('cr_items').update({ no: x.no }).eq('id', x.it.id); if (error) { alert(error.message); return loadItems(); } x.it.no = x.no; }
    drawItems();
  }

  /* ---- images: shrink to WebP under the size limit ---- */
  async function toWebp(source) {
    let w = source.width, h = source.height;
    const maxW = 1400;
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    for (let scale = 1, q = 0.85; ; ) {
      const c = el('canvas'); c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(source, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/webp', q);
      const fmtOk = url.startsWith('data:image/webp');
      const out = fmtOk ? url : c.toDataURL('image/jpeg', q);
      if (out.length <= MAX_BYTES || scale < 0.35) return out;
      if (q > 0.6) q -= 0.1; else scale *= 0.8;
    }
  }

  const loadImage = file => new Promise((ok, bad) => {
    const url = URL.createObjectURL(file);
    const img = new Image(); img.onload = () => { ok(img); URL.revokeObjectURL(url); }; img.onerror = () => bad(new Error('อ่านรูปไม่ได้: ' + file.name)); img.src = url;
  });

  async function addItems(dataUrls) {
    let no = S.items.reduce((m, i) => Math.max(m, i.no), 0);
    for (const img of dataUrls) {
      no += 1;
      const { error } = await db.from('cr_items').insert({ set_id: S.tset.id, no, kind: 'mc', choices: 4, img });
      if (error) { say('#uploadStatus', `เพิ่มข้อ ${no} ไม่สำเร็จ: ${error.message}`); break; }
      say('#uploadStatus', `เพิ่มข้อ ${no} แล้ว`);
    }
    await loadItems();
  }

  async function pickImages(files) {
    const list = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const urls = [];
    for (const f of list) {
      say('#uploadStatus', `กำลังย่อรูป ${f.name}…`);
      try { urls.push(await toWebp(await loadImage(f))); } catch (e) { say('#uploadStatus', err(e)); return; }
    }
    await addItems(urls);
    say('#uploadStatus', `เพิ่ม ${urls.length} ข้อแล้ว ตั้งเฉลยใต้แต่ละรูป`);
  }

  /* ---- PDF cropper ---- */
  async function pickPdf(file) {
    if (!window.pdfjsLib) { say('#uploadStatus', 'โหลดตัวอ่าน PDF ไม่ได้ ตรวจอินเทอร์เน็ต'); return; }
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.js', location.href).href;
    say('#uploadStatus', 'กำลังเปิด PDF…');
    try { S.pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise; } catch (e) { say('#uploadStatus', 'เปิด PDF ไม่ได้: ' + err(e)); return; }
    S.page = 1; $('#cropper').hidden = false; say('#uploadStatus', '');
    renderPage();
  }

  async function renderPage() {
    const page = await S.pdf.getPage(S.page);
    const vp = page.getViewport({ scale: S.pageScale });
    const c = $('#pdfCanvas'); c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    say('#pgInfo', `หน้า ${S.page}/${S.pdf.numPages}`);
    $('#pgPrev').disabled = S.page === 1; $('#pgNext').disabled = S.page === S.pdf.numPages;
    S.crop = null; $('#cropBox').hidden = true; $('#cropAdd').disabled = true;
  }

  function closePdf() { S.pdf = null; $('#cropper').hidden = true; }

  function cropFromCanvas(r) {
    const src = $('#pdfCanvas');
    const c = el('canvas'); c.width = Math.max(1, Math.round(r.w)); c.height = Math.max(1, Math.round(r.h));
    c.getContext('2d').drawImage(src, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
    return c;
  }

  async function cropAdd(whole) {
    const c = $('#pdfCanvas');
    const r = whole ? { x: 0, y: 0, w: c.width, h: c.height } : S.crop;
    if (!r || r.w < 20 || r.h < 20) return;
    $('#cropAdd').disabled = true;
    await addItems([await toWebp(cropFromCanvas(r))]);
    S.crop = null; $('#cropBox').hidden = true;
  }

  function cropEvents() {
    const wrap = $('#cropWrap'), c = $('#pdfCanvas'), box = $('#cropBox');
    let start = null;
    const pos = e => { const b = c.getBoundingClientRect(); return { x: (e.clientX - b.left), y: (e.clientY - b.top), sx: c.width / b.width, sy: c.height / b.height }; };
    wrap.addEventListener('pointerdown', e => { if (!S.pdf) return; start = pos(e); wrap.setPointerCapture(e.pointerId); e.preventDefault(); });
    wrap.addEventListener('pointermove', e => {
      if (!start) return;
      const p = pos(e), x = Math.min(start.x, p.x), y = Math.min(start.y, p.y), w = Math.abs(p.x - start.x), h = Math.abs(p.y - start.y);
      Object.assign(box.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' }); box.hidden = false;
      S.crop = { x: x * p.sx, y: y * p.sy, w: w * p.sx, h: h * p.sy };
    });
    const end = () => { start = null; $('#cropAdd').disabled = !(S.crop && S.crop.w > 20 && S.crop.h > 20); };
    wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
  }

  /* ================= teacher: results ================= */
  async function loadResults() {
    say('#resultStatus', 'กำลังโหลด…');
    const [{ data, error }, { data: subs, error: e2 }] = await Promise.all([
      db.rpc('cr_class_answers', { p_set: S.tset.id }), db.rpc('cr_class_submissions', { p_set: S.tset.id })]);
    if (error || e2) { say('#resultStatus', err(error || e2)); return; }
    S.rows = data; S.subs = subs;
    const { data: members } = await db.rpc('cr_member_list', { p_class: S.cls.id });
    const people = [...new Set([...(members || []).map(m => m.email), ...data.map(r => r.email)])].sort();
    const nos = S.items.map(i => i.no);
    const cell = Object.fromEntries(data.map(r => [r.email + '|' + r.no, r]));
    const subAt = Object.fromEntries(subs.map(s => [s.email, s.submitted_at]));
    const graded = S.items.filter(i => i.kind === 'mc' && S.keys[i.id]).length;
    const head = el('tr', {}, ['นักเรียน', 'ส่ง', 'คะแนน', ...nos.map(String), ''].map(t => el('th', { textContent: t })));
    const body = people.map(p => {
      const score = data.filter(r => r.email === p && r.correct).length;
      const tds = nos.map(n => {
        const r = cell[p + '|' + n]; const it = S.items.find(i => i.no === n);
        const a = !r ? '' : it?.kind === 'mc' ? (LETTERS[+r.answer - 1] || r.answer) : r.answer;
        return el('td', { textContent: a.length > 12 ? a.slice(0, 12) + '…' : a, title: r?.answer || '', className: r?.correct === true ? 'ok' : r?.correct === false ? 'bad' : '' });
      });
      const redo = subAt[p] ? btn('ให้ทำใหม่', async () => {
        if (!confirm(`ให้ ${p} แก้คำตอบและส่งใหม่ได้?`)) return;
        const { error } = await db.rpc('cr_reopen_for', { p_set: S.tset.id, target: p }); if (error) alert(error.message); loadResults();
      }) : '';
      return el('tr', {}, [el('td', { textContent: p }), el('td', { textContent: subAt[p] ? new Date(subAt[p]).toLocaleString('th-TH') : '-' }),
        el('td', { textContent: `${score}/${graded}` }), ...tds, el('td', {}, redo ? [redo] : [])]);
    });
    $('#resultTable').replaceChildren(el('table', {}, [el('thead', {}, [head]), el('tbody', {}, body)]));
    $('#csv').hidden = !people.length;
    say('#resultStatus', `${people.length} คน · ส่งแล้ว ${subs.length} คน · นับคะแนน ${graded} ข้อที่มีเฉลย`);
  }

  function downloadCsv() {
    const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const kind = Object.fromEntries(S.items.map(i => [i.no, i.kind]));
    const lines = [['email', 'no', 'answer', 'correct', 'updated_at'].join(',')].concat(S.rows.map(r =>
      [r.email, r.no, kind[r.no] === 'mc' ? (LETTERS[+r.answer - 1] || r.answer) : r.answer, r.correct ?? '', r.updated_at].map(q).join(',')));
    const a = el('a', { href: URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv' })), download: `${S.cls.name}-${S.tset.title}.csv`.replace(/[\\/:*?"<>|]/g, '_') });
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ================= wiring ================= */
  $('#login').onclick = async () => {
    const { error } = await db.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: 'select_account' } } });
    if (error) gateText(error.message);
  };
  $('#logout').onclick = async () => { await db.auth.signOut(); location.reload(); };
  $('#prev').onclick = () => show(S.idx - 1);
  $('#next').onclick = () => show(S.idx + 1);
  $('#submit').onclick = submit;
  $('#examBack').onclick = () => { $('#exam').hidden = true; $('#studentArea').hidden = false; if (S.myClass) openMyClass(S.myClass); };
  $('#reqSend').onclick = sendRequest;
  $('#addClass').onclick = addClass;
  $('#addEmails').onclick = addEmails;
  $('#delClass').onclick = deleteClass;
  $('#addSet').onclick = addSet;
  $('#isOpen').onchange = e => updateSet({ is_open: e.target.checked });
  $('#showKey').onchange = e => updateSet({ show_key: e.target.checked });
  $('#delSet').onclick = deleteSet;
  $('#pickImages').onchange = e => { pickImages(e.target.files); e.target.value = ''; };
  $('#pickPdf').onchange = e => { if (e.target.files[0]) pickPdf(e.target.files[0]); e.target.value = ''; };
  $('#pgPrev').onclick = () => { S.page--; renderPage(); };
  $('#pgNext').onclick = () => { S.page++; renderPage(); };
  $('#cropAdd').onclick = () => cropAdd(false);
  $('#cropWhole').onclick = () => cropAdd(true);
  $('#cropClose').onclick = closePdf;
  $('#loadResults').onclick = loadResults;
  $('#csv').onclick = downloadCsv;
  cropEvents();
  document.addEventListener('keydown', e => {
    if ($('#exam').hidden || /TEXTAREA|INPUT|SELECT/.test(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowRight') show(S.idx + 1);
    if (e.key === 'ArrowLeft') show(S.idx - 1);
  });
  boot().catch(e => gateText(err(e)));
})();
