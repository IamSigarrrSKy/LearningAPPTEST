/* Local member data is selected only after authentication resolves. */
(() => {
 let scope=null;
 const guestKeys={history:'chemlab.guest.history.v1',progress:'chemlab.guest.progress.v1',claims:'chemlab.guest.claimed.v1',profile:'chemlab.guest.profile.v2',outbox:'chemlab.guest.outbox.v2',config:'chemlab.guest.config.v3'};
 const key=(kind,actor=scope)=>!actor?null:actor==='guest'?(guestKeys[kind]||'chemlab.guest.'+kind+'.v3'):'chemlab.member.'+actor+'.'+kind+'.v3';
 const read=(kind,fallback,actor=scope)=>{const k=key(kind,actor);if(!k)return fallback;try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}};
 const write=(kind,value,actor=scope)=>{const k=key(kind,actor);if(!k)throw Error('เลือก Guest หรือเข้าสู่ระบบก่อนบันทึก');localStorage.setItem(k,JSON.stringify(value));};
 window.ChemLabStore={read,write,scope:()=>scope,setScope(next){if(next!==null&&next!=='guest'&&!/^[a-f0-9-]{36}$/i.test(next))throw Error('Invalid account scope');if(scope===next)return;const previous=scope;scope=next;sessionStorage.setItem('chemlab.entry.mode',next==='guest'?'guest':next?'account':'visitor');window.dispatchEvent(new CustomEvent('chemlab:scope',{detail:{previous,current:next}}));}};
})();
