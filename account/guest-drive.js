/* Automatic Guest reports use the owner's Drive, separately from member storage. */
(() => {
 const endpoint='https://script.google.com/macros/s/AKfycbyJ2Uk-cbwc7PX3wnMWH-TN0TRF3M1B6ecFZ9wseulNQjW6v_yvILfHJ9QiFRGnp6px/exec';
 const transport=typeof originalFetch==='function'?originalFetch:window.fetch.bind(window);
 const memberSync=syncAttempts;
 const inFlight=new Set();
 function status(text){let p=document.getElementById('privateSync');if(!p){p=document.createElement('p');p.id='privateSync';p.className='card panel';p.setAttribute('role','status');document.querySelector('#resultWrap')?.append(p);}p.textContent=text;}
 syncAttempts=async rec=>{
  if(!rec?.meta?.guest)return memberSync(rec);
  const key='chemlab.guest.drive.sent.'+rec.date+'.'+Object.keys(rec.per).join('-');
  if(inFlight.has(key))return;
  let saved;try{saved=localStorage.getItem(key)}catch{}
  if(saved==='1'){status('Guest: ส่งรายงานเข้า Drive แล้ว • ประวัติยังอยู่ในเครื่อง');return;}
  if(saved==='pending'){status('Guest: มีรายการที่ยังยืนยันการรับไม่ได้ ให้ครูตรวจ Sheet ก่อนส่งซ้ำ');return;}
  if(!navigator.onLine){status('Guest: ออฟไลน์ เก็บผลในเครื่องแล้ว กดส่งอีกครั้งเมื่อมีอินเทอร์เน็ต');retry(rec);return;}
  inFlight.add(key);status('Guest: กำลังส่งรายงานให้ครูสกาย…');
  try{
   let pid=localStorage.getItem('chemlab.guest.drive.pid');if(!pid){pid=crypto.randomUUID().replaceAll('-','').slice(0,16);localStorage.setItem('chemlab.guest.drive.pid',pid);}
   const report=attemptPayload(rec);report.title='[Guest] '+report.title;report.accountType='guest';
   const nickname=String(rec.meta.guestNickname||'').trim().slice(0,40);
   const payload={action:'submit',pid,name:nickname?nickname+' (Guest-'+pid.slice(-6)+')':'Guest-'+pid.slice(-6),school:'Guest',teacher:'',show:false,rec:report};
   localStorage.setItem(key,'pending');
   const response=await transport(endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(data.ok!==true)throw Error(data.error||'ระบบไม่ได้ยืนยันการรับผล');
   localStorage.setItem(key,'1');status('Guest: ส่งรายงานเข้า Drive แล้ว • แยกจากสมาชิก • ประวัติยังอยู่ในเครื่อง');
  }catch(e){status('Guest: ยังยืนยันการรับผลไม่ได้ เก็บผลในเครื่องแล้ว ให้ครูตรวจ Sheet ก่อนส่งซ้ำ — '+e.message);}
  finally{inFlight.delete(key);}
 };
 function retry(rec){const button=document.createElement('button');button.className='btn ghost';button.textContent='ส่งรายงาน Guest อีกครั้ง';button.onclick=async()=>{button.disabled=true;await syncAttempts(rec);button.remove()};document.querySelector('#resultWrap .actions')?.append(button);}
})();
