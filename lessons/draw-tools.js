/* Mouse board: our toolbar (board-ui.js, same icons as the pen board) drives the JSME editor.
   JSME's own menus are cropped out of view; tools map to JSME action codes, atoms and groups are set when an atom
   is clicked (AtomClicked) by rewriting the JME string, undo/redo keep our own history, and the name strip under
   the drawing is filled from name-rules.js on every change. */
(function(){'use strict';
const CODES={'bond-1':202,'bond-2':203,'bond-3':204,stereo:201,chain:205,'ring-3':206,'ring-4':207,'ring-5':208,'ring-6':210,'ring-ben':209,'ring-7':211,'ring-8':212,move:113,erase:104,charge:108};
const GROUPS={OH:[['O',0,1]],NH2:[['N',0,1]],CN:[['C',0,1],['N',1,3,0]],CHO:[['C',0,1],['O',1,2,60]],COOH:[['C',0,1],['O',1,2,60],['O',1,1,-60]]};
let ed=null,host=null,off=null,pending=null,hist=[],redo=[],last='',muting=false;
const frame=document.querySelector('[data-board="jsme"]');
const strip=document.getElementById('board-name'),stripText=document.getElementById('board-name-text');

function area(){return [...host.querySelectorAll('svg')].map(s=>[s,s.getBoundingClientRect()]).filter(([,r])=>r.width>100&&r.height>100).sort((x,y)=>y[1].width*y[1].height-x[1].width*x[1].height)[0]}
function fit(){
 if(!ed||!off)return;const w=Math.max(260,host.clientWidth),h=Math.max(300,host.clientHeight);
 ed.setSize((w+off.l+off.r)+'px',(h+off.t+off.b)+'px');
 const root=host.firstElementChild;if(root){root.style.position='absolute';root.style.left=-off.l+'px';root.style.top=-off.t+'px'}}
function select(btn){frame.querySelectorAll('.tool-btn,.atom-pill').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active')}

function parseJme(s){const t=s.trim().split(/\s+/),na=+t[0],nb=+t[1],atoms=[],bonds=[];let k=2;
 for(let i=0;i<na;i++){atoms.push([t[k],+t[k+1],+t[k+2]]);k+=3}for(let i=0;i<nb;i++){bonds.push([+t[k],+t[k+1],+t[k+2]]);k+=3}return {atoms,bonds}}
const jmeOf=m=>[m.atoms.length,m.bonds.length,...m.atoms.flatMap(a=>[a[0],a[1].toFixed(3),a[2].toFixed(3)]),...m.bonds.flat()].join(' ');
function applyToAtom(i){ // i is 1-based
 const src=ed.jmeFile();if(!src)return;const m=parseJme(src),a=m.atoms[i-1];if(!a)return;
 if(pending.atom){a[0]=pending.atom}
 else{const nb=m.bonds.filter(b=>b[0]===i||b[1]===i).map(b=>m.atoms[(b[0]===i?b[1]:b[0])-1]);
  let dx=0,dy=0;nb.forEach(n=>{dx+=a[1]-n[1];dy+=a[2]-n[2]});let l=Math.hypot(dx,dy);if(l<1e-6){dx=1;dy=0;l=1}dx/=l;dy/=l;
  if(nb.length===1){const r=Math.PI/6;[dx,dy]=[dx*Math.cos(r)-dy*Math.sin(r),dx*Math.sin(r)+dy*Math.cos(r)]}
  const ids=[i];
  for(const [sym,from,order,turn=0]of GROUPS[pending.fg]){const base=m.atoms[ids[from]-1],t=turn*Math.PI/180,ux=dx*Math.cos(t)-dy*Math.sin(t),uy=dx*Math.sin(t)+dy*Math.cos(t);
   m.atoms.push([sym,base[1]+1.4*ux,base[2]+1.4*uy]);ids.push(m.atoms.length);m.bonds.push([ids[from],m.atoms.length,order])}}
 ed.readMolecule(jmeOf(m));document.dispatchEvent(new Event('chemboard:changed'))}

function nameNow(){
 if(!ed)return {name:'—'};let mol='';try{mol=ed.molFile()}catch{}
 let smiles='';try{smiles=ed.smiles()}catch{}
 if(!smiles)return {name:'—',empty:true};
 try{return {name:ChemNameRules.nameGraph(ChemNameRules.molGraph(mol)).name}}catch(e){return {name:'—',why:e.message}}}
function refreshName(){
 if(!strip)return;const r=nameNow();
 strip.dataset.state=r.why?'warn':'';
 stripText.textContent=r.empty?'—':r.why?'ตั้งชื่อด้วยกฎในเครื่องไม่ได้: '+r.why:r.name}

function changed(){
 if(!ed)return;const now=ed.jmeFile()||'';
 if(!muting&&now!==last){hist.push(last);if(hist.length>60)hist.shift();redo=[]}
 last=now;refreshName()}
function restore(s){muting=true;try{s?ed.readMolecule(s):ed.reset()}finally{last=s;muting=false}refreshName();document.dispatchEvent(new Event('chemboard:changed'))}

function attach(editor,hostEl){
 ed=editor;host=hostEl;
 host.style.position='relative';host.style.overflow='hidden';
 const root=host.firstElementChild,ar=area();
 if(root&&ar){const r=root.getBoundingClientRect(),q=ar[1];off={l:q.left-r.left,t:q.top-r.top,r:r.right-q.right,b:r.bottom-q.bottom}}
 fit();new ResizeObserver(fit).observe(host);
 ed.setCallBack('AtomClicked',e=>{if(!pending)return;applyToAtom(e.atom)});
 frame.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>{pending=null;select(b);ed.setAction(CODES[b.dataset.tool])});
 frame.querySelectorAll('[data-atom]').forEach(b=>b.onclick=()=>{pending={atom:b.dataset.atom};select(b);ed.setAction(113)});
 frame.querySelectorAll('[data-fg]').forEach(b=>b.onclick=()=>{pending={fg:b.dataset.fg};select(b);ed.setAction(113)});
 document.getElementById('btn-undo').onclick=()=>{if(!hist.length)return;redo.push(last);restore(hist.pop())};
 document.getElementById('btn-redo').onclick=()=>{if(!redo.length)return;hist.push(last);restore(redo.pop())};
 document.getElementById('btn-center-view').onclick=()=>{const s=ed.jmeFile();if(s)restore(s)};
 // start like JSME: single bond tool
 const first=frame.querySelector('[data-tool="bond-1"]');select(first);ed.setAction(202);
 last=ed.jmeFile()||'';refreshName()}

async function saveImage(){
 if(!ed)return;let smiles='';try{smiles=ed.smiles()}catch{}if(!smiles)return false;
 const r=nameNow();await ChemBoard.saveImage({svg:ed.getMolecularAreaGraphicsString(),name:r.why?'':r.name,file:r.why?'structure':r.name});return true}
window.ChemBoardJsme={attach,changed,saveImage};
})();
