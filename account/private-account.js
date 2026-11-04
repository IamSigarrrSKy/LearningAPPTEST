/* Requires Supabase JS v2 and CHEMLAB_SUPABASE {url, publishableKey}. */
(() => {
 const cfg=window.CHEMLAB_SUPABASE;
 const button=document.createElement('button');button.className='btn ghost';button.textContent='บัญชีและประวัติส่วนตัว';document.querySelector('.top').append(button);
 const client=cfg?.url&&cfg?.publishableKey&&window.supabase ? window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{flowType:'pkce',storage:sessionStorage,storageKey:'chemlab.private.auth',persistSession:true,detectSessionInUrl:true}}):null;
 window.ChemLabAccount=client;
 const dlg=document.createElement('dialog');dlg.innerHTML='<form method="dialog"><button>ปิด</button></form><h2>บัญชีส่วนตัว</h2><p>เข้าสู่ระบบด้วย Google ผลสอบดูได้เฉพาะเจ้าของบัญชี</p><button id="privateLogin" class="btn primary">เข้าสู่ระบบด้วย Google</button><button id="privateSave">บันทึกผลล่าสุด</button><button id="privateLoad">ดูประวัติ</button><button id="privateLogout">ออกจากระบบ</button><p role="status" id="privateStatus"></p><div id="privateHistory"></div>';dlg.style.cssText='max-width:620px;width:calc(100% - 32px);padding:28px;border-radius:20px;background:var(--surface);color:var(--ink)';document.body.append(dlg);
 const status=t=>dlg.querySelector('#privateStatus').textContent=t;
 const run=fn=>async()=>{try{await fn()}catch(e){status(e.message)}};
 button.onclick=()=>{dlg.showModal();if(!cfg?.url||!cfg?.publishableKey||!window.supabase){status('บัญชียังไม่เปิดใช้งาน รอเชื่อมต่อบริการยืนยันตัวตน');dlg.querySelectorAll('button[id]').forEach(b=>b.disabled=true);return;}client.auth.getUser().then(({data})=>status(data.user?'เข้าสู่ระบบแล้ว: '+data.user.email:'เข้าสู่ระบบเพื่อดูประวัติส่วนตัว'));};
 dlg.querySelector('#privateLogin').onclick=run(async()=>{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}});if(error)throw error;});
 dlg.querySelector('#privateSave').onclick=run(async()=>{const {data:{user}}=await client.auth.getUser();if(!user)throw Error('เข้าสู่ระบบก่อนบันทึก');const rec=loadHist().at(-1);if(!rec)throw Error('ยังไม่มีผลสอบ');if(!confirm('ยืนยันว่าผลสอบล่าสุดเป็นของคุณ และต้องการเก็บในบัญชีนี้?'))return;const {error}=await client.from('learning_attempts').insert({owner:user.id,record:{date:rec.date,mode:rec.mode,meta:rec.meta,score:rec.score,total:rec.total,dur:rec.dur,per:rec.per}});if(error)throw error;status('บันทึกส่วนตัวแล้ว');});
 dlg.querySelector('#privateLoad').onclick=run(async()=>{const {data,error}=await client.from('learning_attempts').select('id,created_at,record').order('created_at',{ascending:false}).limit(50);if(error)throw error;const root=dlg.querySelector('#privateHistory');root.replaceChildren();for(const row of data){const b=document.createElement('button');b.className='btn ghost';b.textContent=new Date(row.created_at).toLocaleDateString('th-TH')+' — '+row.record.score+'/'+row.record.total;b.onclick=()=>{status('คะแนน '+Number(row.record.score)+'/'+Number(row.record.total)+' • ดูรายละเอียดฉบับเต็มจากรายงานที่บันทึกไว้')};root.append(b)}status('ประวัติส่วนตัว '+data.length+' ชุด');});
 dlg.querySelector('#privateLogout').onclick=run(async()=>{await client.auth.signOut();dlg.querySelector('#privateHistory').replaceChildren();status('ออกจากระบบแล้ว');});
 const auto=document.createElement("script");auto.src="account/automatic-reports.js";auto.onload=()=>{const guest=document.createElement("script");guest.src="account/guest-entry.js";document.body.append(guest);};document.body.append(auto);
})();



