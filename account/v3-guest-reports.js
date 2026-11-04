/* Durable Guest delivery. The server acknowledges a stable ID before removal. */
(() => {
 const store=window.ChemLabStore;let busy=false;
 const hex=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,'0')).join('');
 const status=t=>{if(store.scope()==='guest')window.ChemLabResults?.status(t)};
 async function request(url,body){const r=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('เครือข่ายไม่พร้อม');const j=await r.json();if(!j.ok)throw Error(j.error||'ยังไม่ได้รับการยืนยัน');return j;}
 async function submit(rec){
  if(store.scope()!=='guest'||!rec.meta?.guest||!rec.cloudId)throw Error('Guest report owner mismatch');
  const queue=store.read('outbox',[],'guest');
  if(!queue.some(x=>x.attemptId===rec.cloudId)){
   const previous=store.read('receipts',[],'guest');if(previous.includes(rec.cloudId))return;
   queue.push({action:'guest_submit_v2',attemptId:rec.cloudId,receipt:hex(32),pid:hex(8),name:rec.meta.guestNickname||rec.meta.profileSnapshot?.name||'Guest',school:'Guest',show:false,teacher:'',rec:attemptPayload(rec)});
   store.write('outbox',queue,'guest');
  }
  return flush();
 }
 async function flush(){
  if(busy||store.scope()!=='guest')return;const url=window.CHEMLAB_BACKEND;if(!url)return status('ผลอยู่ในเครื่อง รอเชื่อม Drive');
  const queue=store.read('outbox',[],'guest');if(!queue.length)return;busy=true;
  try{
   status('กำลังส่งรายงาน Guest…');const ping=await request(url,{action:'ping'});
   if(ping.guestReportsVersion!==2)throw Error('ต้องอัปเดต Apps Script รุ่นรายงาน Guest ก่อน ผลยังอยู่ในคิว');
   for(const entry of queue){
    if(store.scope()!=='guest')return;
    const reply=await request(url,entry);if(reply.attemptId!==entry.attemptId)throw Error('รหัสตอบรับไม่ตรง');
    const receipts=store.read('receipts',[],'guest');receipts.push(entry.attemptId);store.write('receipts',[...new Set(receipts)].slice(-500),'guest');
    store.write('outbox',store.read('outbox',[],'guest').filter(x=>x.attemptId!==entry.attemptId),'guest');
   }
   status('ส่งชื่อเล่นและผล Guest เข้า Drive ครูสกายแล้ว');
  }catch(e){status('ยังส่งไม่สำเร็จ เก็บคิวในเครื่องแล้ว: '+e.message)}finally{busy=false;}
 }
 window.ChemLabGuestReports={submit,flush};
})();
