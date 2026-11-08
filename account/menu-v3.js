/* v3 only: one account button in the top bar that changes with the visitor's state, and one menu that
   shows only the actions that apply. It hides the older buttons and drives them behind the scenes, so
   login, result syncing and RLS stay in the original account scripts. */
(() => {
 const modeKey='chemlab.entry.mode';
 const top=document.querySelector('#home .top');
 // the account scripts load one after another; wait until the last one (guest-entry) has run
 const ready=()=>window.ChemLabEntry&&document.querySelector('#privateLogin');
 const start=()=>{ if(!ready()) return setTimeout(start,120); init(); };
 start();

 function init(){
  const client=window.ChemLabAccount;
  const privDlg=document.querySelector('#privateLogin').closest('dialog');
  const entry=document.querySelector('dialog.guest-entry-dialog');
  const byText=t=>[...top.querySelectorAll(':scope > button')].find(b=>b.textContent.trim()===t);
  const oldAccount=byText('บัญชีและประวัติส่วนตัว'), oldSwitch=byText('Guest / เชื่อมบัญชี');
  const privBtn=t=>[...privDlg.querySelectorAll('button')].find(b=>b.textContent.trim()===t);
  [oldAccount,oldSwitch,document.getElementById('whoBtn'),document.getElementById('homeCfg')].forEach(b=>b&&(b.hidden=true));
  privDlg.classList.add('acct-legacy');

  /* ---------- the button ---------- */
  const btn=document.createElement('button');btn.className='acct-btn';btn.type='button';btn.setAttribute('aria-haspopup','dialog');
  top.append(btn);

  /* ---------- the menu ---------- */
  const menu=document.createElement('dialog');menu.className='acct-menu';menu.setAttribute('aria-label','บัญชีของฉัน');
  document.body.append(menu);
  menu.addEventListener('click',e=>{ if(e.target===menu) menu.close(); });   // click on the backdrop closes it

  let user=null;
  const guest=()=>window.ChemLabStore.scope()==='guest';
  const nick=()=>window.ChemLabGuest?.nickname()||'';
  const displayName=()=>user ? (user.user_metadata?.full_name||user.user_metadata?.name||user.email||'บัญชี') : guest() ? (nick()||'Guest') : '';
  const initial=n=>[...(n||'?').trim()][0].toUpperCase();
  const pending=()=>window.ChemLabResults?.pending()||0;
  const guestLeft=()=>{try{return JSON.parse(localStorage.getItem('chemlab.guest.history.v1')||'[]').filter(r=>!r.importedOwner).length}catch{return 0}};

  function paint(){
   const n=displayName();
   btn.replaceChildren();
   if(!n){ btn.classList.remove('who'); btn.textContent='เข้าสู่ระบบ'; btn.setAttribute('aria-label','เข้าสู่ระบบหรือทดลองใช้แบบ Guest'); return; }
   btn.classList.add('who');
   const t=document.createElement('span');t.className='tile';t.textContent=initial(n);
   const l=document.createElement('span');l.className='nm';l.textContent=n.split(/[\s@]/)[0].slice(0,14);
   btn.append(t,l);
   if(!user){ const g=document.createElement('span');g.className='st';g.textContent='Guest';btn.append(g); }
   btn.setAttribute('aria-label','บัญชีของฉัน: '+n+(user?'':' (Guest)'));
  }

  const item=(label,run,opts={})=>{ const b=document.createElement('button');b.type='button';b.className='acct-item'+(opts.danger?' danger':'');
   b.textContent=label; if(opts.hint){const h=document.createElement('small');h.textContent=opts.hint;b.append(h);}
   b.onclick=()=>{menu.close();run();}; return b; };
  const group=(title,items)=>{ items=items.filter(Boolean); if(!items.length) return null;
   const g=document.createElement('div');g.className='acct-group';
   if(title){const h=document.createElement('h4');h.textContent=title;g.append(h);} g.append(...items); return g; };
  // open the original account dialog and press one of its buttons, so its own code does the work
  const viaPrivate=label=>{ oldAccount.click(); setTimeout(()=>privBtn(label)?.click(),0); };

  function build(){
   const n=displayName();
   const head=document.createElement('div');head.className='acct-head';
   const close=document.createElement('button');close.type='button';close.className='acct-x';close.setAttribute('aria-label','ปิด');
   close.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';close.onclick=()=>menu.close();
   const t=document.createElement('span');t.className='tile';t.textContent=initial(n);
   const who=document.createElement('div');
   const b=document.createElement('b');b.textContent=n;
   const s=document.createElement('span');s.textContent=user?('บัญชี '+(user.app_metadata?.provider==='google'?'Google':'อีเมล')+', '+(user.email||'')):'Guest, เก็บผลในเครื่องนี้';
   who.append(b,s);head.append(t,who,close);

   const last=(()=>{try{return loadHist().at(-1)}catch{return null}})();
   const groups=[
    group('ประวัติของฉัน',[
     user&&item('ดูประวัติทั้งหมด',()=>viaPrivate('ดูประวัติ')),
     last&&item('ผลสอบล่าสุด',()=>renderResult(last),{hint:last.score+'/'+last.total}),
     pending()&&item('ส่งผลที่ค้างอีกครั้ง',()=>viaPrivate('ส่งผลที่ค้างอีกครั้ง'),{hint:pending()+' ชุด'}),
     user&&guestLeft()&&item('นำผล Guest เข้าบัญชี',()=>viaPrivate('เลือกนำผล Guest เข้าบัญชี'),{hint:guestLeft()+' ชุด'}),
    ]),
    group('ข้อมูลของฉัน',[ user?item('โรงเรียนและครูผู้สอน',()=>openName(false)):item('แก้ชื่อเล่น Guest',()=>window.ChemLabEntry.open()) ]),
    group('สำหรับครู',[
     user&&item('รายงานสำหรับครู',()=>viaPrivate('รายงานสำหรับครู')),
     item('รายงานเส้นทางเรียน (ใครติดเรื่องไหน)',()=>{location.href='teacher/path-report.html';}),
     item('ตั้งค่า Google Drive',()=>document.getElementById('homeCfg').click()),
    ]),
   ];
   const foot=document.createElement('div');foot.className='acct-foot';
   foot.append(user
    ? item('ออกจากระบบ',async()=>{ privBtn('ออกจากระบบ')?.click(); user=null; setTimeout(refresh,400); },{danger:true})
    : item('เปลี่ยนเป็นบัญชี Google',()=>window.ChemLabEntry.open(null,'เข้าสู่ระบบเพื่อเก็บผลข้ามเครื่อง')));
   menu.replaceChildren(head,...groups.filter(Boolean),foot);
  }

  function place(){   // desktop: drop down under the button; phones get a bottom sheet from CSS
   if(matchMedia('(max-width:640px)').matches){ menu.style.top=menu.style.right=''; return; }
   const r=btn.getBoundingClientRect();
   menu.style.top=(r.bottom+8)+'px'; menu.style.right=Math.max(16,innerWidth-r.right)+'px';
  }

  btn.onclick=()=>{ if(!displayName()) return window.ChemLabEntry.open(null,''); build(); place(); menu.showModal(); };

  async function refresh(){
   const candidate=window.ChemLabIdentity.user(); user=window.ChemLabStore.scope()===candidate?.id?candidate:null;
   paint();
  }
  window.addEventListener('chemlab:identity',refresh);
  entry?.addEventListener('close',()=>setTimeout(refresh,0));
  refresh();

  /* ---------- the sign-in dialog: Google first, then Guest, email as a quiet link ---------- */
  if(entry && !entry.dataset.v3){
   entry.dataset.v3='1';
   const g=entry.querySelector('#enterGoogle'), list=entry.querySelector('.entry-buttons'), nameLabel=entry.querySelector('label:has(#guestNickname)');
   const guestBtn=entry.querySelector('#enterGuest'), email=entry.querySelector('#enterEmail');
   g.classList.replace('ghost','primary'); guestBtn.classList.replace('primary','ghost');
   const or=document.createElement('p');or.className='entry-or';or.textContent='หรือทดลองก่อนแบบ Guest';
   list.before(g); list.before(or); list.before(nameLabel);
   list.replaceChildren(guestBtn);
   email.className='entry-link'; list.after(email);
   const small=entry.querySelector('small');
   const full=small.textContent;
   small.textContent='Guest เก็บประวัติในเครื่องนี้ และส่งผลให้ครูสกายอัตโนมัติหลังส่งข้อสอบ ';
   const more=document.createElement('details');const sm=document.createElement('summary');sm.textContent='อ่านเพิ่ม';
   const p=document.createElement('p');p.textContent=full;more.append(sm,p);small.after(more);
   entry.querySelector('.guest-icon')?.remove();
   const x=document.createElement('button');x.type='button';x.className='acct-x';x.setAttribute('aria-label','ปิด');
   x.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';x.onclick=()=>entry.close();
   entry.prepend(x);
  }

  /* the old "save latest result" button: results are already sent automatically */
  privBtn('บันทึกผลล่าสุด')?.setAttribute('hidden','');
  /* Leaderboard no longer updates, so stop asking about it in the name form */
  document.getElementById('stuShow')?.closest('label')?.setAttribute('hidden','');
 }
})();
