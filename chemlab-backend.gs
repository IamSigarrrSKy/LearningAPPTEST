/**
 * ChemLab backend — Google Apps Script web app (replaces drive-uploader.gs)
 *
 * Stores in the owner's Google Drive:
 *   - Spreadsheet "ChemLab ข้อมูล"  → sheet "players" (one row per player, for the leaderboard)
 *                                     sheet "attempts" (one row per submitted exam: score, wrong questions, weak chapters…)
 *                                     sheet "teachers" (teachers who receive their students' work, see below)
 *                                     sheets "สรุปรายนักเรียน" / "สรุปข้อที่ผิดบ่อย" (rebuilt every hour by refreshSummaries)
 *   - Folder "ChemLab กระดาษทด"     → scratch-pad images, moved to trash after KEEP_DAYS days
 *
 * Teachers: a teacher registers on the website with a Google Drive folder link (shared with the owner as Editor)
 * or the /exec URL of their own copy of this script, plus a teacher code for later edits.
 * The owner ticks "approved" in the teachers sheet. From then on, students who type that teacher's name
 * send scratch images and results to the teacher; everything else (and any failure) goes to the owner.
 *
 * Install (once):
 *   1. script.google.com → New project → paste this file
 *   2. Run 'setup' and allow Drive + Sheets access (run it again after pasting a newer version: it adds new triggers/columns)
 *   3. Deploy → New deployment → Web app · Execute as: Me · Who has access: Anyone
 *   4. Put the /exec URL in config.js of the website (window.CHEMLAB_BACKEND = '...')
 *   5. Optional: Project Settings → Script Properties → SHARE_EMAIL = the address teachers share folders with
 *
 * The URL is public (every student's browser calls it), so nothing here is secret:
 * the script accepts only small, validated payloads, computes XP itself and rate-limits callers.
 * Teacher links and codes stay in the sheet and are never sent back to a browser.
 * Owner-only work (setup, cleanup, approving teachers, reading the sheet) runs inside the editor, never over the web.
 */
const FOLDER_NAME = 'ChemLab กระดาษทด';
const SHEET_NAME = 'ChemLab ข้อมูล';
const TEACHER_SHEET_NAME = 'ChemLab ผลสอบนักเรียน';
const KEEP_DAYS = 7;
const BOARD_SIZE = 50;
const LIMITS = {                     // [max calls, per seconds]
  submitPerPlayer: [1, 15],
  uploadPerPlayer: [60, 3600],
  profilePerPlayer: [10, 3600],
  teacherPerPlayer: [5, 3600],
  checkPerPlayer: [60, 3600],
  submitAll: [1500, 3600],
  uploadAll: [600, 3600],
  boardAll: [6000, 3600],
  teacherAll: [200, 3600],
  checkAll: [3000, 3600],
  pinFail: [8, 86400],               // wrong teacher codes per teacher name per day
};
const MAX_IMAGE_CHARS = 3 * 1024 * 1024;   // base64 data URL of one PNG
const MAX_QUESTIONS = 80;
const PLAYER_COLS = ['pid', 'name', 'school', 'show', 'xp', 'runs', 'answered', 'correct', 'created', 'updated', 'teacher'];
// set → sureWrong are written for people; detail ("label~ok~chapter~mistake" | …) feeds the summary sheets
const ATTEMPT_COLS = ['received', 'pid', 'name', 'school', 'date', 'mode', 'level', 'size', 'topics', 'score', 'total', 'seconds', 'xp', 'answers', 'teacher',
  'set', 'wrong', 'chapters', 'mistakes', 'sureWrong', 'detail'];
const SUMMARY_STUDENTS = 'สรุปรายนักเรียน';
const SUMMARY_ITEMS = 'สรุปข้อที่ผิดบ่อย';
const TEACHER_COLS = ['key', 'name', 'school', 'kind', 'target', 'approved', 'pinHash', 'salt', 'sheetId', 'created', 'updated'];

/* ---------- web entry points ---------- */
function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = String(body.action || (body.ping ? 'ping' : ''));
    if (action === 'ping') return json_({ ok: true, folder: FOLDER_NAME, sheet: SHEET_NAME });
    if (action === 'board') return json_(board_(body));
    if (action === 'submit') return json_(submit_(body));
    if (action === 'profile') return json_(profile_(body));
    if (action === 'upload') return json_(upload_(body));
    if (action === 'teacher_check') return json_(teacherCheck_(body));
    if (action === 'teacher_info') return json_(teacherInfo_());
    if (action === 'teacher_register') return json_(teacherRegister_(body));
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}
function doGet() {
  return json_({ ok: true, app: 'ChemLab backend', folder: FOLDER_NAME });
}

/* ---------- student actions ---------- */
function board_(b) {
  limit_('boardAll', 'all');
  const pid = cleanPid_(b.pid, true);
  const school = cleanText_(b.school, 80);
  const rows = players_().rows;
  const ranked = rows.filter(r => r.xp > 0).sort((a, c) => c.xp - a.xp || a.updated - c.updated);
  const scope = school ? ranked.filter(r => r.school === school) : ranked;
  const shown = scope.filter(r => r.show);
  const top = shown.slice(0, BOARD_SIZE).map(r => ({ name: r.name, school: r.school, xp: r.xp, runs: r.runs, me: r.pid === pid }));
  const mine = pid ? scope.findIndex(r => r.pid === pid) : -1;
  return {
    ok: true, players: scope.length, top,
    me: mine >= 0 ? { rank: mine + 1, xp: scope[mine].xp, show: scope[mine].show } : null,
  };
}

function submit_(b) {
  const who = who_(b);
  limit_('submitPerPlayer', who.pid);
  limit_('submitAll', 'all');
  const r = b.rec || {};
  const per = Array.isArray(r.per) ? r.per.slice(0, MAX_QUESTIONS) : [];
  if (!per.length) throw new Error('empty attempt');
  // XP is computed here, never taken from the browser: correct 10, attempted 2, a set of 5+ earns 20 more
  let xp = 0, correct = 0, answered = 0;
  const answers = [];
  per.forEach(p => {
    const id = Math.floor(Number(p[0])) || 0, c = p[1] ? 1 : 0, err = cleanText_(p[2], 12);
    if (err !== 'skip') answered++;
    if (c) correct++;
    xp += c ? 10 : (err === 'skip' ? 0 : 2);
    answers.push([id, c, err, clampInt_(p[3], 0, 3), clampInt_(p[4], 0, 7200)].join(':'));
  });
  if (per.length >= 5) xp += 20;
  const report = report_(per, r);
  const t = findTeacher_(who.teacher);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let total;
  try {
    const now = new Date();
    const row = [now, who.pid, who.name, who.school,
      new Date(clampInt_(r.date, 0, now.getTime() + 864e5) || now.getTime()), cleanText_(r.mode, 10), cleanText_(r.lv, 10),
      cleanText_(r.size, 10), (Array.isArray(r.topics) ? r.topics : []).slice(0, 20).map(x => cleanText_(x, 30)).join(','),
      correct, per.length, clampInt_(r.dur, 0, 86400), xp, answers.join(' '), t ? t.name : '',
      report.set, report.wrong, report.chapters, report.mistakes, report.sureWrong, report.detail];
    sheet_('attempts', ATTEMPT_COLS).appendRow(row);
    // a teacher with a Drive folder gets the same row in a spreadsheet inside that folder
    if (t && t.kind === 'folder') {
      try { const sh = teacherBook_(t).getSheets()[0]; ensureCols_(sh, ATTEMPT_COLS); sh.appendRow(row); } catch (e) { /* the owner's copy is kept */ }
    }
    total = upsert_(who, p => {
      p.xp += xp; p.runs += 1; p.answered += answered; p.correct += correct;
    }, t).xp;
  } finally {
    lock.releaseLock();
  }
  // a teacher with their own copy of this script gets the attempt there too (outside the lock: it is a web call)
  if (t && t.kind === 'script') { try { forward_(t.target, { action: 'submit', pid: who.pid, name: who.name, school: who.school, show: who.show, rec: r }); } catch (e) { /* ignore */ } }
  return { ok: true, xp, total };
}

function profile_(b) {
  const who = who_(b);
  limit_('profilePerPlayer', who.pid);
  const t = findTeacher_(who.teacher);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { upsert_(who, () => {}, t); } finally { lock.releaseLock(); }
  return { ok: true, teacher: t ? t.name : '' };
}

function upload_(b) {
  const pid = cleanPid_(b.pid);
  limit_('uploadPerPlayer', pid);
  limit_('uploadAll', 'all');
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ''));
  if (!m || b.image.length > MAX_IMAGE_CHARS) throw new Error('bad image');
  const name = (cleanText_(b.name, 120) || 'scratch').replace(/[\\/:*?"<>|]/g, '_').replace(/\.png$/i, '') + '.png';
  const note = cleanText_(b.note, 300);
  const t = findTeacher_(b.teacher);
  if (t && t.kind === 'script') {
    try {
      const r = forward_(t.target, { action: 'upload', pid, name, image: b.image, note });
      if (r.ok) return { ok: true, id: r.id, name: r.name, to: t.name };
    } catch (e) { /* fall back to the owner's folder */ }
  }
  let folder = null, to = '';
  if (t && t.kind === 'folder') { try { folder = teacherScratch_(t, true); to = t.name; } catch (e) { folder = null; } }
  const blob = Utilities.newBlob(Utilities.base64Decode(m[1]), 'image/png', name);
  const file = (folder || getFolder_()).createFile(blob);
  file.setDescription(note + ' · ลบอัตโนมัติหลัง ' + KEEP_DAYS + ' วัน');
  return { ok: true, id: file.getId(), name, to };
}

// Turns per[i] = [id, ok, mistakeCode, confidence, seconds] and rec.items[i] = [label, chapter, mistakeName]
// into sentences a teacher can read. Old pages send no items: the question id stands in for the label.
function report_(per, rec) {
  const items = Array.isArray(rec.items) ? rec.items : [];
  const rows = per.map((p, i) => {
    const it = Array.isArray(items[i]) ? items[i] : [];
    const label = cleanText_(it[0], 70).replace(/[|~]/g, '/') || '#' + (Math.floor(Number(p[0])) || 0);
    const err = cleanText_(p[2], 12);
    return { label, ok: !!p[1], skip: err === 'skip', chapter: cleanText_(it[1], 40).replace(/[|~]/g, '/'),
      mistake: p[1] ? '' : cleanText_(it[2], 40).replace(/[|~]/g, '/'), sure: clampInt_(p[3], 0, 3) === 3 };
  });
  const wrong = rows.filter(x => !x.ok);
  const byChapter = {};
  rows.forEach(x => { if (!x.chapter) return; const c = byChapter[x.chapter] = byChapter[x.chapter] || [0, 0]; c[1]++; if (x.ok) c[0]++; });
  const mistakes = {};
  wrong.forEach(x => { if (x.mistake) mistakes[x.mistake] = (mistakes[x.mistake] || 0) + 1; });
  return {
    set: cleanText_(rec.title, 120),
    wrong: wrong.map(x => x.label + (x.skip ? ' (ไม่ตอบ)' : '')).join(' · ') || 'ถูกทุกข้อ',
    // weakest chapter first
    chapters: Object.entries(byChapter).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]).map(([c, v]) => c + ' ' + v[0] + '/' + v[1]).join(' · '),
    mistakes: Object.entries(mistakes).sort((a, b) => b[1] - a[1]).map(([m, n]) => m + ' ×' + n).join(' · '),
    sureWrong: wrong.filter(x => x.sure).map(x => x.label).join(' · '),
    detail: rows.map(x => [x.label, x.ok ? 1 : 0, x.chapter, x.mistake].join('~')).join('|').slice(0, 40000),
  };
}

/* ---------- teacher actions ---------- */
// tells a student whether the teacher name they typed is registered and approved; never reveals the teacher's link
function teacherCheck_(b) {
  limit_('checkPerPlayer', cleanPid_(b.pid));
  limit_('checkAll', 'all');
  const t = findTeacher_(b.teacher);
  return { ok: true, found: !!t, name: t ? t.name : '', school: t ? t.school : '' };
}
function teacherInfo_() {
  return { ok: true, shareEmail: PropertiesService.getScriptProperties().getProperty('SHARE_EMAIL') || '' };
}
function teacherRegister_(b) {
  const pid = cleanPid_(b.pid);
  limit_('teacherPerPlayer', pid);
  limit_('teacherAll', 'all');
  const name = cleanText_(b.name, 60), school = cleanText_(b.school, 80), key = teacherKey_(name);
  const pin = String(b.pin || '');
  if (!key || !school) throw new Error('ใส่ชื่อครูและโรงเรียน');
  if (!/^[0-9A-Za-z]{6,20}$/.test(pin)) throw new Error('รหัสครูต้องเป็นตัวอักษรอังกฤษหรือตัวเลข 6–20 ตัว');
  const target = parseTarget_(b.link);
  checkTarget_(target);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const T = teachers_(), now = new Date();
    let r = T.rows.find(x => x.key === key), isNew = false;
    if (r) {
      limit_('pinFail', key, true);
      if (hash_(r.salt, pin) !== r.pinHash) { limit_('pinFail', key); throw new Error('ชื่อนี้ลงทะเบียนแล้ว · ใส่รหัสครูเดิมเพื่อแก้ไข หรือใช้ชื่ออื่น'); }
      // a new destination needs the owner's approval again
      if (r.kind !== target.kind || r.target !== target.target) { r.approved = false; r.sheetId = ''; }
    } else {
      const salt = Utilities.getUuid();
      r = { key, salt, pinHash: hash_(salt, pin), approved: false, sheetId: '', created: now, _row: T.sheet.getLastRow() + 1 };
      isNew = true;
    }
    r.name = name; r.school = school; r.kind = target.kind; r.target = target.target; r.updated = now;
    T.sheet.getRange(r._row, 1, 1, TEACHER_COLS.length).setValues([TEACHER_COLS.map(c => r[c])]);
    if (isNew) T.sheet.getRange(r._row, TEACHER_COLS.indexOf('approved') + 1).insertCheckboxes();
    return { ok: true, approved: r.approved, name };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- owner-run functions (editor only) ---------- */
function setup() {
  getFolder_();
  sheet_('players', PLAYER_COLS);
  sheet_('attempts', ATTEMPT_COLS);
  sheet_('teachers', TEACHER_COLS);
  ScriptApp.getProjectTriggers().filter(t => ['cleanupOld', 'refreshSummaries'].includes(t.getHandlerFunction())).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('cleanupOld').timeBased().everyDays(1).atHour(3).create();
  ScriptApp.newTrigger('refreshSummaries').timeBased().everyHours(1).create();
  refreshSummaries();
  Logger.log('พร้อมแล้ว · ชีท: ' + book_().getUrl() + ' · โฟลเดอร์: ' + getFolder_().getUrl());
}
// moves scratch images older than KEEP_DAYS to the trash (Drive empties the trash itself after 30 days)
function cleanupOld() {
  const cutoff = Date.now() - KEEP_DAYS * 864e5;
  let n = trashOld_(getFolder_(), cutoff);
  teachers_().rows.filter(t => t.kind === 'folder').forEach(t => {
    try { const f = teacherScratch_(t, false); if (f) n += trashOld_(f, cutoff); } catch (e) { /* folder no longer shared */ }
  });
  Logger.log('ย้ายไปถังขยะ ' + n + ' ไฟล์');
}
// rebuilds the two summary sheets in the owner's spreadsheet and in every Drive-folder teacher's spreadsheet
// (teachers with their own copy of this script get them from their own hourly trigger)
function refreshSummaries() {
  buildSummaries_(book_(), sheet_('attempts', ATTEMPT_COLS), true);
  teachers_().rows.filter(t => t.kind === 'folder' && t.approved && t.sheetId).forEach(t => {
    try { const ss = SpreadsheetApp.openById(t.sheetId); buildSummaries_(ss, ss.getSheets()[0], false); } catch (e) { /* sheet deleted or unshared */ }
  });
}

// hide a player from the leaderboard (e.g. an inappropriate name): run with the player's pid from the sheet
function hidePlayer(pid) {
  const P = players_(), r = P.rows.find(x => x.pid === pid);
  if (!r) throw new Error('ไม่พบ ' + pid);
  P.sheet.getRange(r._row, PLAYER_COLS.indexOf('show') + 1).setValue(false);
}
// same as ticking "approved" in the teachers sheet
function approveTeacher(name) {
  const T = teachers_(), r = T.rows.find(x => x.key === teacherKey_(name));
  if (!r) throw new Error('ไม่พบครู ' + name);
  T.sheet.getRange(r._row, TEACHER_COLS.indexOf('approved') + 1).setValue(true);
}

/* ---------- storage helpers ---------- */
function book_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) { /* deleted: make a new one */ } }
  const ss = SpreadsheetApp.create(SHEET_NAME);
  props.setProperty('SHEET_ID', ss.getId());
  return ss;
}
function sheet_(name, cols) {
  const ss = book_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(cols);
    sh.setFrozenRows(1);
    const first = ss.getSheets()[0];
    if (first.getName() !== name && first.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(first);
  } else {
    ensureCols_(sh, cols);
  }
  return sh;
}
function players_() {
  const sh = sheet_('players', PLAYER_COLS);
  const vals = sh.getDataRange().getValues().slice(1);
  const rows = vals.map((v, i) => {
    const o = { _row: i + 2 };
    PLAYER_COLS.forEach((c, k) => { o[c] = v[k]; });
    o.pid = String(o.pid); o.name = String(o.name); o.school = String(o.school);
    o.show = o.show === true || o.show === 'TRUE';
    ['xp', 'runs', 'answered', 'correct'].forEach(c => { o[c] = Number(o[c]) || 0; });
    o.updated = o.updated instanceof Date ? o.updated.getTime() : 0;
    return o;
  });
  return { sheet: sh, rows };
}
// caller must hold the script lock
function upsert_(who, change, teacher) {
  const P = players_(), now = new Date();
  let r = P.rows.find(x => x.pid === who.pid);
  if (!r) r = { pid: who.pid, xp: 0, runs: 0, answered: 0, correct: 0, created: now, _row: P.sheet.getLastRow() + 1 };
  r.name = who.name; r.school = who.school; r.show = who.show; r.updated = now; r.teacher = teacher ? teacher.name : '';
  change(r);
  P.sheet.getRange(r._row, 1, 1, PLAYER_COLS.length).setValues([PLAYER_COLS.map(c => r[c])]);
  return r;
}
// older sheets were created with fewer columns: extend the header row so new columns get a name
function ensureCols_(sh, cols) {
  if (sh.getLastColumn() < cols.length) sh.getRange(1, 1, 1, cols.length).setValues([cols]);
}
function buildSummaries_(ss, src, withTeacher) {
  const vals = src.getDataRange().getValues();
  if (vals.length < 2) return;
  const col = {};
  vals[0].forEach((h, i) => { col[String(h)] = i; });
  const get = (r, k) => (col[k] == null ? '' : r[col[k]]);
  const students = {}, items = {};
  vals.slice(1).forEach(r => {
    const pid = String(get(r, 'pid'));
    if (!pid) return;
    const s = students[pid] = students[pid] || { name: '', school: '', teacher: '', runs: 0, score: 0, total: 0, last: null, lastSet: '', lastScore: '', chapters: {}, mistakes: {}, sure: 0 };
    const when = get(r, 'received');
    s.name = get(r, 'name'); s.school = get(r, 'school'); s.teacher = get(r, 'teacher') || s.teacher;
    s.runs++; s.score += Number(get(r, 'score')) || 0; s.total += Number(get(r, 'total')) || 0;
    if (!s.last || when > s.last) { s.last = when; s.lastSet = get(r, 'set'); s.lastScore = get(r, 'score') + '/' + get(r, 'total'); }
    if (get(r, 'sureWrong')) s.sure += String(get(r, 'sureWrong')).split(' · ').length;
    String(get(r, 'detail') || '').split('|').forEach(d => {
      if (!d) return;
      const [label, ok, chapter, mistake] = d.split('~');
      const wrong = ok !== '1';
      if (chapter) { const c = s.chapters[chapter] = s.chapters[chapter] || [0, 0]; c[1]++; if (wrong) c[0]++; }
      if (wrong && mistake) s.mistakes[mistake] = (s.mistakes[mistake] || 0) + 1;
      const it = items[label] = items[label] || { chapter: chapter || '', n: 0, wrong: 0, who: {}, mistakes: {} };
      it.n++;
      if (wrong) { it.wrong++; it.who[pid] = 1; if (mistake) it.mistakes[mistake] = (it.mistakes[mistake] || 0) + 1; }
    });
  });
  const top = (o, k) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k).map(([m, n]) => m + ' ×' + n).join(' · ');
  const stamp = 'อัปเดตอัตโนมัติทุกชั่วโมง · ล่าสุด ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'd/M/yyyy HH:mm');

  const sHead = ['ชื่อ', 'โรงเรียน'].concat(withTeacher ? ['ครู'] : [],
    ['ทำ (ครั้ง)', 'ถูก/ทั้งหมด', 'ร้อยละ', 'ทำล่าสุด', 'ชุดล่าสุด', 'คะแนนล่าสุด', 'บทที่ควรทบทวน (ผิด/ทำ)', 'ผิดบ่อยเพราะ', 'มั่นใจแต่ผิด (ข้อ)']);
  const sRows = Object.values(students).sort((a, b) => a.score / (a.total || 1) - b.score / (b.total || 1)).map(s => {
    const weak = Object.entries(s.chapters).filter(([, v]) => v[0] > 0).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1] || b[1][0] - a[1][0])
      .slice(0, 3).map(([c, v]) => c + ' ' + v[0] + '/' + v[1]).join(' · ');
    return [s.name, s.school].concat(withTeacher ? [s.teacher] : [],
      [s.runs, s.score + '/' + s.total, s.total ? Math.round(s.score / s.total * 100) : 0, s.last, s.lastSet, s.lastScore, weak, top(s.mistakes, 2), s.sure]);
  });
  writeSummary_(ss, SUMMARY_STUDENTS, stamp + ' · เรียงจากคนที่ต้องช่วยมากที่สุด', sHead, sRows);

  const iHead = ['ข้อ / รูปแบบโจทย์', 'บท', 'ทำ (ครั้ง)', 'ผิด (ครั้ง)', 'ร้อยละที่ผิด', 'จำนวนคนที่ผิด', 'ผิดบ่อยเพราะ'];
  const iRows = Object.entries(items).filter(([, v]) => v.wrong > 0)
    .sort((a, b) => b[1].wrong / b[1].n - a[1].wrong / a[1].n || b[1].wrong - a[1].wrong).slice(0, 300)
    .map(([label, v]) => [label, v.chapter, v.n, v.wrong, Math.round(v.wrong / v.n * 100), Object.keys(v.who).length, top(v.mistakes, 2)]);
  writeSummary_(ss, SUMMARY_ITEMS, stamp + ' · เรียงจากข้อที่ผิดมากที่สุด', iHead, iRows);
}
function writeSummary_(ss, name, note, head, rows) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  sh.getRange(1, 1).setValue(note);
  sh.getRange(2, 1, 1, head.length).setValues([head]).setFontWeight('bold');
  if (rows.length) sh.getRange(3, 1, rows.length, head.length).setValues(rows);
  sh.setFrozenRows(2);
}
function getFolder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}
function trashOld_(folder, cutoff) {
  const it = folder.getFiles();
  let n = 0;
  while (it.hasNext()) {
    const f = it.next();
    if (f.getDateCreated().getTime() < cutoff) { f.setTrashed(true); n++; }
  }
  return n;
}

/* ---------- teacher helpers ---------- */
function teachers_() {
  const sh = sheet_('teachers', TEACHER_COLS);
  const vals = sh.getDataRange().getValues().slice(1);
  const rows = vals.map((v, i) => {
    const o = { _row: i + 2 };
    TEACHER_COLS.forEach((c, k) => { o[c] = v[k]; });
    ['key', 'name', 'school', 'kind', 'target', 'pinHash', 'salt', 'sheetId'].forEach(c => { o[c] = String(o[c] == null ? '' : o[c]); });
    o.approved = o.approved === true || o.approved === 'TRUE';
    return o;
  });
  return { sheet: sh, rows };
}
// "ครูสมศรี ใจดี", "อ. สมศรี ใจดี" and "สมศรีใจดี" all match the same teacher
function teacherKey_(v) {
  return cleanText_(v, 60).toLowerCase()
    .replace(/^(ครู|อาจารย์|อ\.|teacher|t\.|mr\.|mrs\.|ms\.|miss)\s*/, '')
    .replace(/[\s.]/g, '');
}
function findTeacher_(name) {
  const key = teacherKey_(name);
  if (!key) return null;
  return teachers_().rows.find(t => t.key === key && t.approved) || null;
}
function parseTarget_(link) {
  const s = String(link || '').trim();
  if (/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec$/.test(s)) return { kind: 'script', target: s };
  const m = /^https:\/\/drive\.google\.com\/(?:drive\/(?:u\/\d+\/)?folders\/|open\?id=)([A-Za-z0-9_-]{10,})/.exec(s);
  if (m) return { kind: 'folder', target: m[1] };
  throw new Error('ลิงก์ต้องเป็นโฟลเดอร์ Google Drive หรือ Apps Script ที่ลงท้ายด้วย /exec');
}
// makes sure the destination works before saving it
function checkTarget_(t) {
  if (t.kind === 'folder') {
    try {
      DriveApp.getFolderById(t.target).createFile('chemlab-ทดสอบ.txt', 'ChemLab เขียนโฟลเดอร์นี้ได้').setTrashed(true);
    } catch (e) {
      const email = teacherInfo_().shareEmail;
      throw new Error('ยังเข้าโฟลเดอร์นี้ไม่ได้ · แชร์โฟลเดอร์ให้ ' + (email || 'อีเมลของผู้ดูแล ChemLab') + ' เป็น "ผู้แก้ไข" แล้วลองใหม่');
    }
    return;
  }
  let r = null;
  try { r = forward_(t.target, { action: 'ping' }); } catch (e) { r = null; }
  if (!r || !r.ok) throw new Error('เรียก Apps Script นี้ไม่ได้ · Deploy เป็น Web app แบบ Who has access: Anyone แล้วลองใหม่');
}
// calls a teacher's own copy of this script; the forwarded body never names a teacher, so it cannot loop
function forward_(url, body) {
  const res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'text/plain;charset=utf-8', payload: JSON.stringify(body),
    muteHttpExceptions: true, followRedirects: true,
  });
  return JSON.parse(res.getContentText() || '{}');
}
function teacherScratch_(t, create) {
  const parent = DriveApp.getFolderById(t.target), it = parent.getFoldersByName(FOLDER_NAME);
  if (it.hasNext()) return it.next();
  return create ? parent.createFolder(FOLDER_NAME) : null;
}
// caller must hold the script lock
function teacherBook_(t) {
  if (t.sheetId) { try { return SpreadsheetApp.openById(t.sheetId); } catch (e) { /* deleted: make a new one */ } }
  const ss = SpreadsheetApp.create(TEACHER_SHEET_NAME + ' · ' + t.name);
  const sh = ss.getSheets()[0];
  sh.appendRow(ATTEMPT_COLS);
  sh.setFrozenRows(1);
  DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(t.target));
  const T = teachers_(), r = T.rows.find(x => x.key === t.key);
  if (r) T.sheet.getRange(r._row, TEACHER_COLS.indexOf('sheetId') + 1).setValue(ss.getId());
  t.sheetId = ss.getId();
  return ss;
}

/* ---------- validation ---------- */
function who_(b) {
  const name = cleanText_(b.name, 60), school = cleanText_(b.school, 80);
  if (!name || !school) throw new Error('name and school required');
  return { pid: cleanPid_(b.pid), name, school, show: b.show !== false, teacher: cleanText_(b.teacher, 60) };
}
function cleanPid_(v, optional) {
  const s = String(v || '');
  if (/^[a-z0-9]{16}$/.test(s)) return s;
  if (optional && !s) return '';
  throw new Error('bad player id');
}
// plain text only: no tags, no control characters, and nothing a spreadsheet would run as a formula
function cleanText_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim()
    .replace(/^[=+\-@]+/, '').slice(0, max);
}
function clampInt_(v, lo, hi) {
  const n = Math.round(Number(v)) || 0;
  return Math.min(hi, Math.max(lo, n));
}
function hash_(salt, pin) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pin)
    .map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
}
// counts a call against LIMITS[kind]; with peek, only checks whether the limit is already reached
function limit_(kind, who, peek) {
  const [max, secs] = LIMITS[kind];
  const cache = CacheService.getScriptCache(), key = 'rl:' + kind + ':' + who;
  const n = Number(cache.get(key) || 0);
  if (n >= max) {
    if (kind === 'pinFail') throw new Error('ใส่รหัสครูผิดหลายครั้ง ลองใหม่พรุ่งนี้');
    throw new Error(kind.indexOf('All') > 0 ? 'ระบบมีผู้ใช้มาก ลองใหม่ภายหลัง' : 'ส่งถี่เกินไป รอสักครู่');
  }
  if (!peek) cache.put(key, String(n + 1), secs);
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
