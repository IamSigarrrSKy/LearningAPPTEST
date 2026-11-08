/* Shared toolbar for the two molecule boards (draw.html = JSME with a mouse, ink.html = smart ink with a pen or finger).
   One SVG icon set, one layout like the JSME editor: tools across the top, atoms and groups down the left side.
   Also: ChemBoard.saveImage() exports the drawing with its name underneath as a PNG. */
(function(){'use strict';
const SPRITE=`<svg width="0" height="0" style="position:absolute" aria-hidden="true">
 <symbol id="i-pen" viewBox="0 0 24 24"><path d="M4 20l1-4.2L15.6 5.2a2.1 2.1 0 0 1 3 3L8.2 18.8z"/><path d="M13.8 7l3.2 3.2"/><path d="M14 20h6"/></symbol>
 <symbol id="i-bond1" viewBox="0 0 24 24"><path d="M5 17.5L19 6.5"/><circle cx="5" cy="17.5" r="1.4"/><circle cx="19" cy="6.5" r="1.4"/></symbol>
 <symbol id="i-bond2" viewBox="0 0 24 24"><path d="M4.2 15.6L17 5.6M7 18.4L19.8 8.4"/></symbol>
 <symbol id="i-bond3" viewBox="0 0 24 24"><path d="M3.8 14.4L15.8 5M5.6 16.7L17.6 7.3M7.4 19L19.4 9.6"/></symbol>
 <symbol id="i-wedge" viewBox="0 0 24 24"><path d="M4.5 18.5L18.4 5.2l1.4 1.9z" fill="currentColor"/></symbol>
 <symbol id="i-dash" viewBox="0 0 24 24"><path d="M5.5 17.2l.6.8M8.4 14.6l1.2 1.5M11.3 12l1.8 2.2M14.2 9.4l2.4 2.9M17.1 6.8l3 3.6"/></symbol>
 <symbol id="i-stereo" viewBox="0 0 24 24"><path d="M3.5 19L11 8.5l1.2 1.4z" fill="currentColor"/><path d="M13.5 17l.5.6M15.6 14.7l.9 1.1M17.7 12.4l1.3 1.6M19.8 10.1l1.7 2.1"/></symbol>
 <symbol id="i-chain" viewBox="0 0 24 24"><path d="M2.5 15.5l4.7-7 4.8 7 4.8-7 4.7 7"/></symbol>
 <symbol id="i-move" viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M9.2 5.8L12 3l2.8 2.8M9.2 18.2L12 21l2.8-2.8M5.8 9.2L3 12l2.8 2.8M18.2 9.2L21 12l-2.8 2.8"/></symbol>
 <symbol id="i-erase" viewBox="0 0 24 24"><path d="M9.5 20H20"/><path d="M4.6 15.4l9.6-9.6a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8L11 19H8.2z"/><path d="M8.5 11.5l5 5"/></symbol>
 <symbol id="i-r3" viewBox="0 0 24 24"><path d="M12 3.5l7.4 12.8H4.6z"/></symbol>
 <symbol id="i-r4" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="1"/></symbol>
 <symbol id="i-r5" viewBox="0 0 24 24"><path d="M12 3.5l8.1 5.9-3.1 9.5H7L3.9 9.4z"/></symbol>
 <symbol id="i-r6" viewBox="0 0 24 24"><path d="M12 3.5l7.4 4.25v8.5L12 20.5l-7.4-4.25v-8.5z"/></symbol>
 <symbol id="i-bz" viewBox="0 0 24 24"><path d="M12 3.5l7.4 4.25v8.5L12 20.5l-7.4-4.25v-8.5z"/><circle cx="12" cy="12" r="4.3"/></symbol>
 <symbol id="i-r7" viewBox="0 0 24 24"><path d="M12 3.5l6.6 3.2 1.7 7.2-4.6 5.8H8.3l-4.6-5.8 1.7-7.2z"/></symbol>
 <symbol id="i-r8" viewBox="0 0 24 24"><path d="M8.8 4.2h6.4l4.6 4.6v6.4l-4.6 4.6H8.8l-4.6-4.6V8.8z"/></symbol>
 <symbol id="i-undo" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></symbol>
 <symbol id="i-redo" viewBox="0 0 24 24"><path d="M15 14l5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/></symbol>
 <symbol id="i-center" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.6"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"/></symbol>
 <symbol id="i-tidy" viewBox="0 0 24 24"><path d="M4 20L14.5 9.5"/><path d="M13 8l3 3"/><path d="M18 3v4M16 5h4M20 11v3M18.5 12.5h3M10 3v2.5M8.75 4.25h2.5"/></symbol>
 <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></symbol>
 <symbol id="i-flask" viewBox="0 0 24 24"><path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9z"/><path d="M12 8v8M8.5 10l7 4"/></symbol>
 <symbol id="i-search" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/></symbol>
 <symbol id="i-tag" viewBox="0 0 24 24"><path d="M3.5 12.5V4.5h8l9 9-8 8z"/><circle cx="8" cy="9" r="1.5"/></symbol>
 <symbol id="i-down" viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/></symbol>
 <symbol id="i-image" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 16l5-5 4 4 2.5-2.5 5.5 5.5"/><circle cx="15.5" cy="9" r="1.6"/></symbol>
 <symbol id="i-copy" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5"/></symbol>
 <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/></symbol>
 <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/></symbol>
 <symbol id="i-out" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></symbol>
 <symbol id="i-plus" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/></symbol>
 <symbol id="i-minus" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M8 12h8"/></symbol>
 <symbol id="i-charge" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M8 10h4M10 8v4M12.5 15h4"/></symbol>
 <symbol id="i-mouse" viewBox="0 0 24 24"><rect x="6.5" y="3" width="11" height="18" rx="5.5"/><path d="M12 3v6"/></symbol>
</svg>`;
if(!document.getElementById('i-pen'))document.body.insertAdjacentHTML('afterbegin',SPRITE);

const ic=(id,cls='')=>`<svg class="ic${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const btn=(attrs,icon,label,title)=>`<button type="button" class="tool-btn" ${attrs} title="${title||label}" aria-label="${title||label}">${ic(icon)}</button>`;
// mode: 'ink' (pen board) or 'jsme' (mouse board); both share icons and order
function toolbar(mode){
 const ink=mode==='ink';
 const top=[
  ink?`<button type="button" class="tool-btn smart-active" data-tool="smart" title="ปากกาดัดเส้น: วาดอิสระ แล้วดัดเป็นเส้นตรง ซิกแซก หรือวงแหวน" aria-label="ปากกาดัดเส้น">${ic('i-pen')}</button>`:'',
  btn('data-tool="bond-1"','i-bond1','พันธะเดี่ยว'),btn('data-tool="bond-2"','i-bond2','พันธะคู่'),btn('data-tool="bond-3"','i-bond3','พันธะสาม'),
  ink?btn('data-tool="bond-wedge"','i-wedge','พันธะลิ่ม (ชี้เข้าหาผู้ดู)')+btn('data-tool="bond-dash"','i-dash','พันธะเส้นประ (ชี้ออกจากผู้ดู)'):btn('data-tool="stereo"','i-stereo','พันธะลิ่ม/เส้นประ (แตะซ้ำเพื่อสลับ)'),
  btn('data-tool="chain"','i-chain','โซ่ซิกแซก (ลากยาว)'),
  '<span class="sep"></span>',
  btn('data-tool="ring-3"','i-r3','วง 3 เหลี่ยม'),btn('data-tool="ring-4"','i-r4','วง 4 เหลี่ยม'),btn('data-tool="ring-5"','i-r5','วง 5 เหลี่ยม'),btn('data-tool="ring-6"','i-r6','วง 6 เหลี่ยม'),
  btn('data-tool="ring-ben"','i-bz','วงเบนซีน'),btn('data-tool="ring-7"','i-r7','วง 7 เหลี่ยม'),btn('data-tool="ring-8"','i-r8','วง 8 เหลี่ยม'),
  '<span class="sep"></span>',
  btn('data-tool="move"','i-move','เลื่อนอะตอม'),btn('data-tool="erase"','i-erase','ลบอะตอมหรือพันธะ'),
  ink?'':btn('data-tool="charge"','i-charge','เปลี่ยนประจุ (แตะอะตอม)'),
  '<span class="spacer"></span>',
  `<button id="btn-undo" type="button" class="tool-btn" title="ย้อนกลับ" aria-label="ย้อนกลับ">${ic('i-undo')}</button>`,
  `<button id="btn-redo" type="button" class="tool-btn" title="ทำซ้ำ" aria-label="ทำซ้ำ">${ic('i-redo')}</button>`,
  `<button id="btn-center-view" type="button" class="tool-btn" title="จัดให้อยู่กลางกระดาน" aria-label="จัดกึ่งกลาง">${ic('i-center')}</button>`].join('');
 const el=s=>`<button type="button" class="atom-pill el el-${s}${s==='C'?' active':''}" data-atom="${s}" title="ธาตุ ${s}">${s}</button>`;
 const fg=(k,t,c)=>`<button type="button" class="atom-pill fg el-${c}" data-fg="${k}" title="หมู่ ${t}">${t}</button>`;
 const left=['C','O','N','F','Cl','Br','I','S','P'].map(el).join('')+'<span class="sep h"></span>'+
  fg('OH','-OH','O')+fg('NH2','-NH₂','N')+fg('COOH','-COOH','O')+fg('CHO','-CHO','O')+fg('CN','-CN','N')+(ink?fg('NO2','-NO₂','N'):'')+
  (ink?`<span class="sep h"></span><button type="button" class="atom-pill fg" data-charge="1" title="ประจุบวก +1" aria-label="ประจุบวก">${ic('i-plus')}</button><button type="button" class="atom-pill fg" data-charge="-1" title="ประจุลบ −1" aria-label="ประจุลบ">${ic('i-minus')}</button>`:'');
 return {top,left}}
document.querySelectorAll('[data-board]').forEach(frame=>{
 const t=toolbar(frame.dataset.board);
 frame.querySelector('[data-board-top]').innerHTML=t.top;
 frame.querySelector('[data-board-left]').innerHTML=t.left});

/* PNG of the drawing with the name underneath; the white margin around the structure is trimmed */
async function saveImage({svg,canvas,name,file}){
 const scale=2,src=document.createElement('canvas');
 if(svg){const img=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=url});
  src.width=img.width*scale;src.height=img.height*scale;const c=src.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,src.width,src.height);c.drawImage(img,0,0,src.width,src.height);URL.revokeObjectURL(url)}
 else{src.width=canvas.width*scale;src.height=canvas.height*scale;const c=src.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,src.width,src.height);c.imageSmoothingQuality='high';c.drawImage(canvas,0,0,src.width,src.height)}
 const c=src.getContext('2d'),d=c.getImageData(0,0,src.width,src.height).data;let x0=src.width,y0=src.height,x1=0,y1=0;
 for(let y=0;y<src.height;y+=2)for(let x=0;x<src.width;x+=2){const k=(y*src.width+x)*4;if(d[k]<235||d[k+1]<235||d[k+2]<235){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}}
 if(x1<x0){x0=0;y0=0;x1=src.width;y1=src.height}
 const pad=40,w=x1-x0+pad*2,h=y1-y0+pad*2,label=name&&name!=='—'?name:'',fs=Math.max(28,Math.min(48,Math.round(src.width/30)));
 const out=document.createElement('canvas');out.width=Math.max(w,label?label.length*fs*.62+pad*2:0);out.height=h+(label?fs*2.2:0);
 const o=out.getContext('2d');o.fillStyle='#fff';o.fillRect(0,0,out.width,out.height);
 o.drawImage(src,x0,y0,x1-x0,y1-y0,(out.width-(x1-x0))/2,pad,x1-x0,y1-y0);
 if(label){o.fillStyle='#1a1a1a';o.textAlign='center';o.font=`600 ${fs}px "IBM Plex Sans Thai", "Mitr", sans-serif`;o.fillText(label,out.width/2,h+fs*1.1)}
 const a=document.createElement('a');a.href=out.toDataURL('image/png');a.download=(file||label||'structure').replace(/[^\w\-(),]+/g,'_').slice(0,80)+'.png';
 document.body.append(a);a.click();a.remove()}
window.ChemBoard={saveImage};
})();
