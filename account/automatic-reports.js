/* Private automatic submission. Each queued item is bound to its original user. */
(() => {
 const client=window.ChemLabAccount;if(!client)return;
 const queueKey='chemlab.private.pending.v1';
 const read=()=>{try{return JSON.parse(sessionStorage.getItem(queueKey)||'[]')}catch{return []}};
 const write=q=>sessionStorage.setItem(queueKey,JSON.stringify(q));
 function message(text){let e=document.getElementById('privateSync');if(!e){e=document.createElement('p');e.id='privateSync';e.className='card panel';e.setAttribute('role','status');document.querySelector('#resultWrap')?.append(e);}e.textContent=text;}
 const oldStart=startQuiz;
 startQuiz=async(mode,ids,meta)=>{
  const again=()=>startQuiz(mode,ids,meta);   // re-run once the visitor has chosen Guest or signed in
  if(window.ChemLabGuest?.active()){const name=window.ChemLabGuest.nickname();if(!name){window.ChemLabEntry?window.ChemLabEntry.open(again,'ใส่ชื่อเล่นก่อนเริ่มแบบ Guest'):toast('ใส่ชื่อเล่นใน Guest / เชื่อมบัญชีก่อน');return;}oldStart(mode,ids,{...meta,accountOwner:null,guest:true,guestNickname:name,reportTeacher:''});return;}
  const {data,error}=await client.auth.getUser();if(error||!data.user){window.ChemLabEntry?window.ChemLabEntry.open(again,'เลือกทำแบบ Guest หรือเข้าสู่ระบบก่อนเริ่มทำข้อสอบ'):toast('เข้าสู่ระบบด้วย Google ก่อนทำข้อสอบเพื่อเก็บผลส่วนตัว');return;}
  const student=getStudent()||{};
  oldStart(mode,ids,{...meta,accountOwner:data.user.id,reportTeacher:student.teacher||''});
 };
 let flushing=false;
 async function flush(){
  if(flushing)return;flushing=true;
  try{
   const {data,error}=await client.auth.getUser();if(error||!data.user)return;
   for(const entry of read().filter(e=>e.owner===data.user.id)){
    const {error}=await client.from('learning_attempts').insert(entry);
    if(error){
     if(error.code!=='23505')throw error;
     const check=await client.from('learning_attempts').select('id').eq('id',entry.id).eq('owner',entry.owner).maybeSingle();
     if(check.error||!check.data)throw error;
    }
    write(read().filter(e=>e.id!==entry.id));
    const routed=await client.from('teacher_review_queue').select('route,reviewer_id').eq('attempt_id',entry.id).maybeSingle();
    message(routed.data?.route==='sky'&&routed.data.reviewer_id?'บันทึกส่วนตัวและส่งเข้าคิวครูสกายแล้ว':routed.error?'บันทึกผลแล้ว แต่ยังตรวจคิวครูไม่ได้':'บันทึกผลแล้ว — รอยืนยันบัญชีครูผู้รับ');
   }
  }catch(e){message('ยังส่งไม่สำเร็จ เก็บคิวไว้ในแท็บนี้แล้ว อย่าปิดแท็บจนส่งสำเร็จ: '+e.message)}finally{flushing=false;}
 }
 syncAttempts=async rec=>{
  if(!rec)return flush();
  if(!rec.meta?.accountOwner){message(rec.meta?.guest?'Guest: เก็บผลในเบราว์เซอร์เครื่องนี้ ยังไม่ได้ส่งให้ครูหรือขึ้นบัญชี':'ผลนี้ยังไม่ได้ผูกบัญชี ไม่ส่งอัตโนมัติ');return;}
  const q=read();rec.cloudId ||= crypto.randomUUID();
  const student=getStudent()||{};
  const record={accountType:'member',date:rec.date,mode:rec.mode,meta:rec.meta,score:rec.score,total:rec.total,dur:rec.dur,per:rec.per,name:student.name||'',school:student.school||'',teacher:rec.meta.reportTeacher||'',title:scopeLabelOf(rec),items:attemptPayload(rec).items};
  if(!q.some(x=>x.id===rec.cloudId))q.push({id:rec.cloudId,owner:rec.meta.accountOwner,record});
  try{write(q)}catch{message('พื้นที่เก็บคิวไม่พอ ดาวน์โหลดรายงานเก็บไว้ก่อน');return;}
  message('กำลังบันทึกผลส่วนตัว…');await flush();
 };
 const retry=document.createElement('button');retry.className='btn ghost';retry.textContent='ส่งผลที่ค้างอีกครั้ง';retry.onclick=flush;document.querySelector('#privateStatus').after(retry);
 const teacher=document.createElement('button');teacher.className='btn ghost';teacher.textContent='รายงานสำหรับครู';retry.after(teacher);
 teacher.onclick=async()=>{
  const box=document.querySelector('#privateHistory');box.replaceChildren();
  try{const {data:{user}}=await client.auth.getUser();if(!user)throw Error('เข้าสู่ระบบก่อน');
   const {data,error}=await client.from('teacher_review_queue').select('attempt_id,created_at,learning_attempts(record)').eq('reviewer_id',user.id).order('created_at',{ascending:false}).limit(50);if(error)throw error;
   for(const item of data){const r=item.learning_attempts?.record;if(!r)continue;const d=document.createElement('details'),h=document.createElement('summary');h.textContent=`${r.name||'ผู้เรียน'} · ${r.title||'แบบฝึกหัด'} · ${r.score}/${r.total}`;d.append(h);
    for(const [id,a] of Object.entries(r.per||{})){if(a.c)continue;const p=document.createElement('p');const q=QBY[id];p.textContent=`${q?.short||'ข้อ '+id} | คำตอบ: ${a.value??q?.choices?.[a.choice]?.t??'—'} | ระบบเสนอ: ${ERR[a.err]?.name||'ให้ครูตรวจ'} | มั่นใจระดับ ${a.conf||0}`;d.append(p);}box.append(d);
   }if(!data.length)box.textContent='ยังไม่มีรายงานที่ได้รับสิทธิ์ดู';
  }catch(e){box.textContent='โหลดรายงานไม่สำเร็จ: '+e.message;}
 };
 window.addEventListener('online',flush);
 client.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN')setTimeout(flush,0);});
})();


