/* Guest results remain local until the learner explicitly imports selected attempts. */
(() => {
 const client=window.ChemLabAccount;
 const modeKey='chemlab.entry.mode';
 const guestHistory='chemlab.guest.history.v1';
 const active=()=>sessionStorage.getItem(modeKey)==='guest';
 const nickname=()=>{try{return (localStorage.getItem('chemlab.guest.nickname')||'').trim().slice(0,40)}catch{return ''}};
 window.ChemLabGuest={active,nickname};
 const drive=document.createElement("script");drive.src="account/guest-drive.js";document.body.append(drive);
 const oldStudent=getStudent,oldLabel=studentLabel,oldLoad=loadHist,oldSave=saveHist;
 getStudent=()=>active()?{name:nickname()||'Guest',school:'ทดลองใช้ในเครื่อง',teacher:'',show:false}:oldStudent();
 studentLabel=()=>active()?(nickname()||'Guest')+' (Guest)':oldLabel();
 loadHist=()=>{if(!active())return oldLoad();try{return JSON.parse(localStorage.getItem(guestHistory)||'[]')}catch{return []}};
 saveHist=h=>{if(active()){try{localStorage.setItem(guestHistory,JSON.stringify(h))}catch{toast('บันทึกในเครื่องไม่ได้ ดาวน์โหลดรายงานเก็บไว้ก่อน')}}else oldSave(h)};
 const oldLoadProg=loadProg,oldSaveProg=saveProg,oldLoadClaims=loadClaims,oldSaveClaims=saveClaims;
 const localRead=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback}catch{return fallback}};
 saveProg=p=>{if(active()){try{localStorage.setItem('chemlab.guest.progress.v1',JSON.stringify(p))}catch{}}else oldSaveProg(p)};
 loadProg=()=>active()?localRead('chemlab.guest.progress.v1',emptyProg()):oldLoadProg();
 loadClaims=()=>active()?localRead('chemlab.guest.claimed.v1',{}):oldLoadClaims();
 saveClaims=c=>{if(active()){try{localStorage.setItem('chemlab.guest.claimed.v1',JSON.stringify(c))}catch{}}else oldSaveClaims(c)};
 const style=document.createElement('style');style.textContent=`.entry-dialog{width:min(540px,calc(100% - 28px));padding:30px;border:1px solid var(--line);border-radius:24px;background:var(--surface);color:var(--ink);box-shadow:var(--shadow)}.entry-dialog::backdrop{background:#152d36aa;backdrop-filter:blur(5px)}.entry-dialog h2{font-family:Mitr;margin:12px 0}.entry-dialog p{line-height:1.7}.entry-dialog .entry-buttons{display:grid;gap:12px}.entry-dialog input{width:100%;padding:12px;font:inherit;margin:8px 0}.entry-dialog small{display:block;color:var(--soft);line-height:1.7;margin:16px 0}.entry-dialog .guest-icon{font-size:38px}.entry-dialog label{display:block}.entry-dialog .import-row input{width:auto}`;document.head.append(style);
 const entry=document.createElement('dialog');entry.className='entry-dialog';entry.innerHTML='<div class="guest-icon">🧪</div><h2>เริ่มเรียนในแบบของคุณ</h2><p>ลองทำโจทย์ก่อน แล้วค่อยสร้างบัญชีเพื่อเก็บผลข้ามเครื่อง</p><div class="entry-buttons"><button class="btn primary" id="enterGuest">ทดลองใช้แบบ Guest</button><button class="btn ghost" id="enterGoogle">เข้าสู่ระบบด้วย Google</button><button class="btn ghost" id="enterEmail">สมัคร / เข้าใช้ด้วยอีเมล</button></div><form id="emailEntry" hidden><label>อีเมล<input type="email" required autocomplete="email" id="entryEmailAddress"></label><button class="btn primary">ส่งลิงก์เข้าใช้</button></form><small>Guest เก็บประวัติในเครื่อง และส่งคะแนน ข้อที่ผิด และความมั่นใจให้ครูสกายอัตโนมัติหลังส่งข้อสอบ พร้อมชื่อเล่นและรหัส Guest ไม่แสดงบน Leaderboard เปลี่ยนเครื่องหรือล้างข้อมูลแล้วประวัติในเครื่องจะไม่ตามไปด้วย</small><p id="entryStatus" role="status"></p>';document.body.append(entry);
 const status=t=>entry.querySelector('#entryStatus').textContent=t;
 let pending=null;
 entry.addEventListener('close',()=>{const go=pending;pending=null;if(go&&(active()||sessionStorage.getItem(modeKey)==='account'))setTimeout(go,0);});
 /* Visitors browse freely; this dialog opens only when they start a quiz or open an e-book. */
 window.ChemLabEntry={open(next,why){pending=next||null;status(why||'');entry.showModal();}};
 const nameLabel=document.createElement('label');nameLabel.textContent='ชื่อเล่นสำหรับ Guest';
 const nameInput=document.createElement('input');nameInput.id='guestNickname';nameInput.maxLength=40;nameInput.placeholder='เช่น ฟ้า';nameInput.autocomplete='nickname';nameInput.value=nickname();nameInput.required=true;nameLabel.append(nameInput);entry.querySelector('.entry-buttons').before(nameLabel);
 const enter=()=>{if(!nameInput.value.trim()){nameInput.setCustomValidity('ใส่ชื่อเล่นก่อนเริ่ม Guest');nameInput.reportValidity();return;}nameInput.setCustomValidity('');try{localStorage.setItem('chemlab.guest.nickname',nameInput.value.trim().slice(0,40))}catch{status('บันทึกชื่อเล่นไม่ได้ กรุณาเปิดให้เว็บเก็บข้อมูลในเครื่อง');return;}sessionStorage.setItem(modeKey,'guest');refreshHome();renderWho();entry.close();};
 nameInput.oninput=()=>nameInput.setCustomValidity('');
 entry.querySelector('#enterGuest').onclick=enter;   // Esc just closes: nothing starts until they choose
 entry.querySelector('#enterGoogle').onclick=async()=>{try{if(!client)throw Error('ยังไม่ได้เชื่อมระบบบัญชี');sessionStorage.setItem(modeKey,'account');const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}});if(error)throw error;}catch(e){status(e.message)}};
 entry.querySelector('#enterEmail').onclick=()=>{entry.querySelector('#emailEntry').hidden=false;entry.querySelector('#entryEmailAddress').focus();};
 entry.querySelector('#emailEntry').onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;try{if(!client)throw Error('ยังไม่ได้เชื่อมระบบบัญชี');const {error}=await client.auth.signInWithOtp({email:entry.querySelector('#entryEmailAddress').value.trim(),options:{emailRedirectTo:location.origin+location.pathname}});if(error)throw error;status('ส่งลิงก์แล้ว เปิดอีเมลและเข้าใช้จากเบราว์เซอร์นี้');}catch(err){status('ส่งลิงก์ไม่ได้: '+err.message)}finally{b.disabled=false}};
 const switcher=document.createElement('button');switcher.className='btn ghost';switcher.textContent='Guest / เชื่อมบัญชี';document.querySelector('.top').append(switcher);
 switcher.onclick=()=>window.ChemLabEntry.open(null,'');
 const importButton=document.createElement('button');importButton.className='btn ghost';importButton.textContent='เลือกนำผล Guest เข้าบัญชี';document.querySelector('#privateStatus').after(importButton);
 importButton.onclick=async()=>{
  const box=document.querySelector('#privateHistory');box.replaceChildren();
  const {data,error}=await client.auth.getUser();if(error||!data.user){box.textContent='เข้าสู่ระบบก่อนนำผล Guest เข้าบัญชี';return;}
  const user=data.user;let records;try{records=JSON.parse(localStorage.getItem(guestHistory)||'[]')}catch{records=[]}
  const notice=document.createElement('p');notice.textContent='เลือกเฉพาะผลของคุณ ผลที่นำเข้าจะบันทึกในบัญชี '+user.email+' และส่งให้ครูสกายตรวจ ไม่ลบต้นฉบับในเครื่อง';box.append(notice);
  const choices=[];
  for(const rec of records){if(rec.importedOwner)continue;rec.cloudId ||= crypto.randomUUID();const row=document.createElement('label');row.className='import-row';const cb=document.createElement('input');cb.type='checkbox';row.append(cb,document.createTextNode(' '+new Date(rec.date).toLocaleDateString('th-TH')+' · '+rec.score+'/'+rec.total));box.append(row,document.createElement('br'));choices.push({cb,rec});}
  localStorage.setItem(guestHistory,JSON.stringify(records));
  if(!choices.length){box.append(document.createTextNode('ไม่มีผล Guest ที่รอนำเข้า'));return;}
  const send=document.createElement('button');send.className='btn primary';send.textContent='นำเฉพาะผลที่เลือกเข้าบัญชี';box.append(send);
  send.onclick=async()=>{send.disabled=true;try{
   const checked=choices.filter(x=>x.cb.checked);if(!checked.length)throw Error('เลือกผลอย่างน้อยหนึ่งชุด');
   const current=await client.auth.getUser();if(current.data.user?.id!==user.id)throw Error('บัญชีเปลี่ยนแล้ว เปิดหน้านำเข้าใหม่');
   for(const {rec} of checked){const record={date:rec.date,mode:rec.mode,meta:{...rec.meta,accountOwner:user.id,importedGuest:true,accountType:'guest_import'},score:rec.score,total:rec.total,dur:rec.dur,per:rec.per,name:rec.meta?.guestNickname||'Guest ที่นำเข้า',teacher:'',title:scopeLabelOf(rec)};
    const result=await client.from('learning_attempts').insert({id:rec.cloudId,owner:user.id,record});
    if(result.error){if(result.error.code!=='23505')throw result.error;const exists=await client.from('learning_attempts').select('id').eq('id',rec.cloudId).eq('owner',user.id).maybeSingle();if(exists.error||!exists.data)throw result.error;}
    rec.importedOwner=user.id;localStorage.setItem(guestHistory,JSON.stringify(records));
   }notice.textContent='นำเข้าผลที่เลือกแล้ว ต้นฉบับยังอยู่ในเครื่อง';
  }catch(e){notice.textContent=e.message}finally{send.disabled=false}};
 };
 client?.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'&&session){sessionStorage.setItem(modeKey,'account');if(entry.open)entry.close();}if(event==='SIGNED_OUT')sessionStorage.setItem(modeKey,'guest');});
 (async()=>{let user=null;try{user=(await client?.auth.getUser())?.data?.user}catch{}if(user)sessionStorage.setItem(modeKey,'account');})();
 // the base page asks for a name before a quiz / e-book (needName); with accounts that question becomes this dialog
 const baseNeed=needName;
 needName=(then,why)=>{const mode=sessionStorage.getItem(modeKey);if(mode==='guest'||mode==='account')return baseNeed(then,why);window.ChemLabEntry.open(()=>baseNeed(then,why),why||'เลือกทำแบบ Guest หรือเข้าสู่ระบบก่อนเริ่ม');};
 // arrived from the e-book shelf (#join=read-N): the base page already opened its name form before this script loaded
 {const m=location.hash.match(/^#join=read-(\d+)$/);const mode=sessionStorage.getItem(modeKey);
  if(m&&mode!=='guest'&&mode!=='account'){document.getElementById('nameDlg')?.close();window.ChemLabEntry.open(()=>{location.href='ebook/shelf.html#read='+m[1];},'เลือกทำแบบ Guest หรือเข้าสู่ระบบก่อนอ่าน E-book');}}
})();



