/* ChemLab local nomenclature rules (teaching scope, ม.4–6). No network, no database.
   Neutral molecules of C, N, O, F, Cl, Br, I. Carbocycles C3–C8 or benzene, several rings allowed if they do not
   share atoms (cyclohexylbenzene). Groups, senior first: carboxylic acid > ester > amide > nitrile > aldehyde >
   ketone > alcohol > amine; ethers are alkoxy prefixes. The senior group is the suffix (one or several: diol,
   dioic acid, diamine), the others become prefixes (carboxy, alkoxycarbonyl, cyano, formyl, oxo, hydroxy, amino).
   Substituents may be branched or substituted ((1-methylethyl), (2-chloroethyl), (dimethylamino)), unsaturated
   (ethenyl, cyclohex-1-enyl) or rings (cyclohexyl, phenyl). C=C in the parent chain carry E/Z (cis/trans accepted).
   Every name is parsed back into a graph and compared atom-for-atom (and E/Z) before it is shown.
   Not handled (said so, never guessed): R/S, rings with O/N in the ring, fused rings, charges (nitro), isotopes. */
(function(root){'use strict';
const STEMS=['','meth','eth','prop','but','pent','hex','hept','oct','non','dec','undec','dodec','tridec','tetradec','pentadec','hexadec','heptadec','octadec','nonadec','icos'];
const STEM_RE='('+STEMS.slice(1).sort((x,y)=>y.length-x.length).join('|')+')';
const HALO={F:'fluoro',Cl:'chloro',Br:'bromo',I:'iodo'};
const MULT=['','','di','tri','tetra','penta','hexa','hepta','octa'],MULTX=['','','bis','tris','tetrakis','pentakis','hexakis'];
const VAL={C:4,N:3,O:2,F:1,Cl:1,Br:1,I:1},ZN={H:1,C:6,N:7,O:8,F:9,Cl:17,Br:35,I:53};
const RANK=['acid','ester','amide','nitrile','al','one','ol','amine'];
const EXO=new Set(['acid','ester','amide','nitrile','al']);           // carbonyl/nitrile carbon: chain end, or outside a ring
const GROUP_TH={acid:'กรดคาร์บอกซิลิก (-COOH)',ester:'เอสเทอร์ (-COO-)',amide:'เอไมด์ (-CONH-)',nitrile:'ไนไตรล์ (-C≡N)',al:'แอลดีไฮด์ (-CHO)',one:'คีโตน (C=O)',ol:'แอลกอฮอล์ (-OH)',amine:'เอมีน (-NH₂, -NH-, -N<)'};
const fail=m=>{throw Error(m)};
const isNum=x=>typeof x==='number';
const lex=(a,b)=>{a=a.filter(isNum);b=b.filter(isNum);for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]??-1)-(b[i]??-1);if(d)return d}return 0};
const ord=o=>o===4?1.5:o;
const alphaOf=t=>t.replace(/[^a-z]/g,'');

/* ---------- graph checks ---------- */
function adjOf(g){const a=g.atoms.map(()=>[]);for(const b of g.bonds){a[b.a].push({i:b.b,o:b.o});a[b.b].push({i:b.a,o:b.o})}return a}
const bondO=(a,x,y)=>(a[x].find(e=>e.i===y)||{o:0}).o;
function findRings(g,a){
 const n=g.atoms.length,parent=Array(n).fill(-1),depth=Array(n).fill(-1),rings=[],seen=new Set();
 depth[0]=0;const stack=[0];
 while(stack.length){const u=stack.pop();for(const e of a[u])if(depth[e.i]<0){depth[e.i]=depth[u]+1;parent[e.i]=u;stack.push(e.i)}}
 for(const b of g.bonds){const k=Math.min(b.a,b.b)+'-'+Math.max(b.a,b.b);if(parent[b.a]===b.b||parent[b.b]===b.a)continue;if(seen.has(k))continue;seen.add(k);
  let x=b.a,y=b.b;const px=[x],py=[y];
  while(x!==y){if(depth[x]>=depth[y]){x=parent[x];px.push(x)}else{y=parent[y];py.push(y)}}
  py.pop();rings.push([...px,...py.reverse()])}
 return rings}
function isBenzene(a,ring){if(ring.length!==6)return false;const bo=ring.map((r,k)=>bondO(a,r,ring[(k+1)%6]));
 return bo.every(o=>o===4)||(bo.every((o,k)=>o===bo[k%2])&&[bo[0],bo[1]].sort().join()==='1,2')}
function hasOxo(g,a,c){return g.atoms[c]==='C'&&a[c].some(e=>g.atoms[e.i]==='O'&&e.o===2)}
function validate(g){
 const n=g.atoms.length;
 if(!n||n>60)fail('รองรับโครงสร้าง 1–60 อะตอมในโหมดกฎพื้นฐาน');
 if(g.atoms.some(s=>!VAL[s]))fail('กฎในเครื่องรองรับ C, N, O และ F/Cl/Br/I แบบเป็นกลางเท่านั้น');
 const seenBond=new Set();
 for(const b of g.bonds){if(![1,2,3,4].includes(b.o)||b.a===b.b||b.a<0||b.b<0||b.a>=n||b.b>=n)fail('ข้อมูลพันธะไม่ถูกต้อง');
  const k=Math.min(b.a,b.b)+'-'+Math.max(b.a,b.b);if(seenBond.has(k))fail('ข้อมูลพันธะซ้ำ');seenBond.add(k)}
 const a=adjOf(g),seen=new Set(),stack=[0];
 while(stack.length){const i=stack.pop();if(seen.has(i))continue;seen.add(i);a[i].forEach(e=>stack.push(e.i))}
 if(seen.size!==n)fail('ยังไม่ตั้งชื่อสารหลายส่วนหรือสารผสมด้วยกฎในเครื่อง');
 a.forEach((es,i)=>{if(es.reduce((s,e)=>s+ord(e.o),0)>VAL[g.atoms[i]]+1e-9)fail('จำนวนพันธะเกินเวเลนซ์ของ '+g.atoms[i])});
 const rawRings=findRings(g,a),ringOf=new Map(),rings=[];
 rawRings.forEach((r,k)=>{for(const x of r){if(ringOf.has(x))fail('วงที่เชื่อมติดกันหรือใช้อะตอมร่วมกัน (เช่น naphthalene) ยังไม่อยู่ในขอบเขตกฎในเครื่อง');ringOf.set(x,k)}
  if(r.some(i=>g.atoms[i]!=='C'))fail('วงที่มี O หรือ N อยู่ในวง (เฮเทอโรไซคลิก) ยังไม่อยู่ในขอบเขตกฎในเครื่อง');
  if(r.length<3||r.length>8)fail('รองรับวงคาร์บอน 3–8 อะตอม');
  const arom=isBenzene(a,r);
  if(!arom&&r.some((x,j)=>bondO(a,x,r[(j+1)%r.length])===3))fail('พันธะสามในวงยังไม่รองรับ');
  rings.push({atoms:r,arom})});
 const inArom=x=>ringOf.has(x)&&rings[ringOf.get(x)].arom;
 for(const b of g.bonds)if(b.o===4&&!(inArom(b.a)&&inArom(b.b)&&ringOf.get(b.a)===ringOf.get(b.b)))fail('พันธะอะโรมาติกนอกวงเบนซีนยังไม่รองรับ');
 g.atoms.forEach((s,i)=>{
  if(HALO[s]){if(a[i].length!==1||g.atoms[a[i][0].i]!=='C'||a[i][0].o!==1)fail('แฮโลเจนต้องต่อกับคาร์บอนหนึ่งอะตอมด้วยพันธะเดี่ยว');return}
  if(s==='O'){if(a[i].some(e=>g.atoms[e.i]!=='C'))fail('O ที่ต่อกับ O หรือ N (เช่น เพอร์ออกไซด์ ไนโตร) ยังไม่รองรับ');
   if(a[i].length>2)fail('O ต่อได้ไม่เกิน 2 อะตอม');
   if(a[i].length===2&&a[i].some(e=>e.o!==1))fail('รูปแบบพันธะ O ไม่รองรับ');
   if(a[i].length===2&&a[i].filter(e=>hasOxo(g,a,e.i)).length>1)fail('แอนไฮไดรด์ยังไม่อยู่ในขอบเขตกฎในเครื่อง');
   if(a[i].length===1&&a[i][0].o===3)fail('รูปแบบพันธะ O ไม่รองรับ')}
  if(s==='N'){if(a[i].some(e=>g.atoms[e.i]!=='C'))fail('N ที่ต่อกับ N หรือ O (เช่น ไนโตร ไฮดราซีน) ยังไม่รองรับ');
   if(a[i].some(e=>e.o===2))fail('อิมีน (C=N) ยังไม่อยู่ในขอบเขตกฎในเครื่อง');
   if(a[i].some(e=>e.o===3)&&a[i].length>1)fail('ไนไตรล์ต้องเป็น -C≡N');
   if(a[i].filter(e=>hasOxo(g,a,e.i)).length>1)fail('อิไมด์ยังไม่อยู่ในขอบเขตกฎในเครื่อง')}});
 return {a,rings,ringOf}}

/* heteroatom neighbours of a carbon */
function het(g,a,i){const h={o1:[],o2:[],oe:[],na:[],nt:[],hal:[]};
 for(const e of a[i]){const s=g.atoms[e.i];
  if(s==='O'){if(e.o===2)h.o2.push(e.i);else if(a[e.i].length===1)h.o1.push(e.i);else h.oe.push(e.i)}
  else if(s==='N'){if(e.o===3)h.nt.push(e.i);else h.na.push(e.i)}
  else if(HALO[s])h.hal.push(e.i)}
 return h}
function analyse(g){
 const V=validate(g),{a,ringOf}=V,site={};
 g.atoms.forEach((s,i)=>{if(s!=='C')return;
  const h=het(g,a,i),cs=a[i].filter(e=>g.atoms[e.i]==='C').length,ring=ringOf.has(i);
  if(h.o2.length>1||h.o1.length>1||h.nt.length>1||h.na.length>1)fail('คาร์บอนเดียวมีหมู่ O หรือ N หลายหมู่ ยังไม่รองรับ');
  const end=()=>{if(ring||cs>1)fail('หมู่ '+GROUP_TH[site[i]]+' ต้องอยู่ปลายโซ่หรือต่อกับวง')};
  if(h.o2.length){
   if(h.hal.length)fail('แอซิลแฮไลด์ยังไม่อยู่ในขอบเขตกฎในเครื่อง');
   if(h.o1.length+h.oe.length+h.na.length>1)fail('คาร์บอนิล C ที่มีหมู่อื่นหลายหมู่ (เช่น คาร์บอเนต ยูเรีย) ยังไม่รองรับ');
   if(h.o1.length){site[i]='acid';end()}
   else if(h.oe.length){site[i]='ester';end()}
   else if(h.na.length){site[i]='amide';end()}
   else if(ring){if(V.rings[ringOf.get(i)].arom)fail('C=O บนวงเบนซีนไม่ถูกต้อง');site[i]='one'}
   else site[i]=cs<=1?'al':'one'}
  else if(h.nt.length){site[i]='nitrile';end()}
  else{if(h.o1.length&&h.na.length)fail('คาร์บอนเดียวมีทั้ง -OH และ N ยังไม่รองรับ');
   if(h.o1.length)site[i]='ol';else if(h.na.length&&!a[h.na[0]].some(e=>hasOxo(g,a,e.i)))site[i]='amine'}});
 return {...V,site,P:RANK.find(t=>Object.values(site).includes(t))||null}}

/* ---------- CIP priority (sphere by sphere) and E/Z ---------- */
function cipCompare(g,a,x,fx,y,fy){
 const dupN=o=>o===4?1:o-1;
 const expand=nodes=>{const out=[];for(const n of nodes){if(n.dup||n.h)continue;const u=n.atom;let used=0;
   for(const e of a[u]){used+=ord(e.o);
    if(e.i===n.from){for(let k=0;k<dupN(e.o);k++)out.push({z:ZN[g.atoms[e.i]],dup:true});continue}
    out.push({atom:e.i,from:u,z:ZN[g.atoms[e.i]],path:new Set([...n.path,e.i]),dup:n.path.has(e.i)});
    for(let k=0;k<dupN(e.o);k++)out.push({z:ZN[g.atoms[e.i]],dup:true})}
   const hs=Math.max(0,Math.round(VAL[g.atoms[u]]-used));for(let k=0;k<hs;k++)out.push({z:1,h:true})}
  return out};
 const start=(v,f)=>v<0?[{z:1,h:true}]:[{atom:v,from:f,z:ZN[g.atoms[v]],path:new Set([f,v])}];
 let A=start(x,fx),B=start(y,fy);
 for(let d=0;d<12;d++){
  const za=A.map(n=>n.z).sort((p,q)=>q-p),zb=B.map(n=>n.z).sort((p,q)=>q-p);
  for(let k=0;k<Math.max(za.length,zb.length);k++){const dd=(za[k]??0)-(zb[k]??0);if(dd)return dd}
  A=expand(A);B=expand(B);if(!A.length&&!B.length)return 0}
 return 0}
function cipPair(g,a,c,p){
 const subs=a[c].filter(e=>e.i!==p).map(e=>e.i);
 const hs=Math.round(VAL.C-a[c].reduce((t,e)=>t+ord(e.o),0));for(let k=0;k<hs;k++)subs.push(-1);
 if(subs.length!==2)return null;
 const d=cipCompare(g,a,subs[0],c,subs[1],c);
 if(!d)return null;return d>0?{hi:subs[0],lo:subs[1]}:{hi:subs[1],lo:subs[0]}}
function stereo(g,A){
 const {a,ringOf}=A,out=[];
 for(const b of g.bonds){if(b.o!==2||g.atoms[b.a]!=='C'||g.atoms[b.b]!=='C')continue;if(ringOf.has(b.a)&&ringOf.get(b.a)===ringOf.get(b.b))continue;
  const pa=cipPair(g,a,b.a,b.b),pb=cipPair(g,a,b.b,b.a);if(!pa||!pb)continue;
  const sp=(g.ez||[]).find(s=>(s.a===b.a&&s.b===b.b)||(s.a===b.b&&s.b===b.a));let d=null;
  if(sp){const [na,nb]=sp.a===b.a?[sp.na,sp.nb]:[sp.nb,sp.na];let same=sp.same;
   if(na!==pa.hi)same=!same;if(nb!==pb.hi)same=!same;d=same?'Z':'E'}
  out.push({a:b.a,b:b.b,pa,pb,d})}
 return out}

/* ---------- canonical key (exact for trees + disjoint rings, plus E/Z) ---------- */
function key(g){
 const A=validate(g),{a,rings,ringOf}=A;
 const arom=(x,y)=>ringOf.has(x)&&ringOf.get(x)===ringOf.get(y)&&rings[ringOf.get(x)].arom;
 const sym=(x,y,o)=>arom(x,y)?'a':String(o);
 const cuts=rings.map(r=>r.atoms.map((x,k)=>[x,r.atoms[(k+1)%r.atoms.length]]));
 const full=a.map((es,i)=>es.map(e=>({i:e.i,s:sym(i,e.i,e.o)})));
 const tree=(adj,i,p,mark)=>g.atoms[i]+(mark.get(i)||'')+'('+adj[i].filter(e=>e.i!==p).map(e=>e.s+tree(adj,e.i,i,mark)).sort().join(',')+')';
 let best=null;
 const combos=cuts.reduce((acc,list)=>acc.flatMap(c=>list.map(x=>[...c,x])),[[]]).slice(0,4096);
 for(const combo of combos){const mark=new Map();combo.forEach(([x,y])=>{mark.set(x,(mark.get(x)||'')+'*');mark.set(y,(mark.get(y)||'')+'*')});
  const cut=new Set(combo.flatMap(([x,y])=>[x+'-'+y,y+'-'+x]));
  const adj=full.map((es,i)=>es.filter(e=>!cut.has(i+'-'+e.i)));
  const s=combo.map(([x,y])=>sym(x,y,bondO(a,x,y))).sort().join('')+'|'+g.atoms.map((_,i)=>tree(adj,i,-1,mark)).sort()[0];
  if(best===null||s<best)best=s}
 const st=stereo(g,A).filter(s=>s.d);
 if(!st.length)return best;
 const local=(i,p,d)=>d>5?g.atoms[i]:g.atoms[i]+'('+a[i].filter(e=>e.i!==p).map(e=>e.o+local(e.i,i,d+1)).sort().join(',')+')';
 return best+'|ez:'+st.map(s=>[local(s.a,s.b,0),local(s.b,s.a,0)].sort().join('=')+s.d).sort().join(';')}
// the drawing always has a geometry; a name without E/Z matches either isomer
function sameStructure(drawn,fromName){
 if(!(fromName.ez&&fromName.ez.length))return key({atoms:drawn.atoms,bonds:drawn.bonds})===key({atoms:fromName.atoms,bonds:fromName.bonds});
 return key(drawn)===key(fromName)}

function formula(g){
 const {a}=validate(g),c={};
 g.atoms.forEach((s,i)=>{c[s]=(c[s]||0)+1;c.H=(c.H||0)+VAL[s]-Math.round(a[i].reduce((t,e)=>t+ord(e.o),0))});
 return ['C','H',...Object.keys(c).filter(k=>k!=='C'&&k!=='H').sort()].filter(k=>c[k]).map(k=>k+(c[k]>1?c[k]:'')).join('')}

/* ---------- 2D layout for JME (keeps E/Z) ---------- */
function toJme(g){
 const A=validate(g),{a,rings,ringOf}=A,xy=new Map(),L=1.4,doneRing=new Set();
 function placeRingFrom(entry,ex,ey,t){ // ring whose atom `entry` sits at (ex,ey), pointing away along angle t
  const r=rings[ringOf.get(entry)],n=r.atoms.length,R=L/(2*Math.sin(Math.PI/n)),k0=r.atoms.indexOf(entry),cx=ex+R*Math.cos(t),cy=ey+R*Math.sin(t);
  doneRing.add(ringOf.get(entry));
  r.atoms.forEach((x,k)=>{const tt=t+Math.PI+2*Math.PI*((k-k0+n)%n)/n;xy.set(x,[cx+R*Math.cos(tt),cy+R*Math.sin(tt)])});
  r.atoms.forEach(x=>{const [px,py]=xy.get(x);out(x,Math.atan2(py-cy,px-cx))})}
 function out(i,theta,flip){ // place unplaced neighbours of i pointing along theta
  const ns=a[i].filter(e=>!xy.has(e.i));
  ns.forEach((e,k)=>{const t=ns.length===1?theta+(flip===undefined?0:flip?.5:-.5):theta+(k-(ns.length-1)/2)*1.05,[x,y]=xy.get(i),nx=x+L*Math.cos(t),ny=y+L*Math.sin(t);
   if(ringOf.has(e.i)&&!doneRing.has(ringOf.get(e.i)))placeRingFrom(e.i,nx,ny,t);
   else{xy.set(e.i,[nx,ny]);out(e.i,t,!flip)}})}
 if(ringOf.has(0)){xy.set(0,[0,0]);placeRingFrom(0,0,0,-Math.PI/2)}
 else{const far=s=>{const d=new Map([[s,[s]]]),q=[s];while(q.length){const i=q.shift();for(const e of a[i])if(!d.has(e.i)&&!ringOf.has(e.i)){d.set(e.i,[...d.get(i),e.i]);q.push(e.i)}}return [...d.values()].sort((x,y)=>y.length-x.length)[0]};
  const back=far(far(0).at(-1));
  back.forEach((i,k)=>xy.set(i,[1.25*k,k%2?.72:0]));
  back.forEach((i,k)=>{const up=k%2===1;out(i,up?Math.PI/2:-Math.PI/2,up)})}
 g.atoms.forEach((_,i)=>{if(!xy.has(i))xy.set(i,[i*.3,-3])});
 for(const s of g.ez||[]){if(s.na==null||s.nb==null||s.na<0||s.nb<0)continue;
  const side=n=>{const [ax,ay]=xy.get(s.a),[bx,by]=xy.get(s.b),[px,py]=xy.get(n);return Math.sign((bx-ax)*(py-ay)-(by-ay)*(px-ax))};
  if((side(s.na)===side(s.nb))!==s.same){const far=new Set([s.b]),q=[s.b];while(q.length){const u=q.shift();for(const e of a[u])if(e.i!==s.a&&!far.has(e.i)){far.add(e.i);q.push(e.i)}}
   const [ax,ay]=xy.get(s.a),[bx,by]=xy.get(s.b),dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
   for(const u of far){if(u===s.b)continue;const [px,py]=xy.get(u),t=((px-ax)*dx+(py-ay)*dy)/l2,fx=ax+t*dx,fy=ay+t*dy;xy.set(u,[2*fx-px,2*fy-py])}}}
 const kek=new Map();for(const r of rings)if(r.arom)r.atoms.forEach((x,k)=>kek.set([x,r.atoms[(k+1)%6]].sort((p,q)=>p-q).join('-'),k%2?1:2));
 const bo=b=>b.o===4?kek.get([b.a,b.b].sort((p,q)=>p-q).join('-')):b.o;
 return [g.atoms.length,g.bonds.length,...g.atoms.flatMap((s,i)=>[s,...xy.get(i).map(v=>v.toFixed(3))]),...g.bonds.flatMap(b=>[b.a+1,b.b+1,bo(b)])].join(' ')}

/* ---------- MOL file (from the JSME editor); E/Z read from the 2D coordinates ---------- */
function molGraph(mol){
 if(!mol.includes('V2000')||/M {2}(CHG|ISO|RAD)/.test(mol))fail('กฎในเครื่องยังไม่รองรับประจุ ไอโซโทป อนุมูล หรือ MOL V3000');
 const lines=mol.replace(/\r/g,'').split('\n'),k=lines.findIndex(x=>x.includes('V2000')),na=+lines[k].slice(0,3),nb=+lines[k].slice(3,6);
 if(!Number.isInteger(na)||!Number.isInteger(nb)||na<1||na>60)fail('อ่านจำนวนอะตอมไม่ได้หรือเกินขอบเขต');
 const atoms=[],bonds=[],xy=[];
 for(let i=0;i<na;i++){const l=lines[k+1+i]||'';if(+l.slice(34,36)||+l.slice(36,39)||+l.slice(39,42)||+l.slice(42,45)||+l.slice(48,51))fail('พบประจุ ไอโซโทป หรือ stereochemistry ของอะตอม: กฎพื้นฐานจะไม่ละข้อมูลนี้');
  atoms.push(l.slice(31,34).trim());xy.push([+l.slice(0,10),+l.slice(10,20)])}
 for(let i=0;i<nb;i++){const l=lines[k+1+na+i]||'',a=+l.slice(0,3)-1,b=+l.slice(3,6)-1,o=+l.slice(6,9);if(+l.slice(9,12))fail('พบพันธะลิ่ม/เส้นประ (R/S) ซึ่งกฎในเครื่องยังไม่รองรับ');bonds.push({a,b,o})}
 return withGeometry({atoms,bonds},xy)}
// E/Z from coordinates (used for the MOL file and for the ink board)
function withGeometry(g,xy){
 const A=validate(g),ez=[];
 for(const s of stereo(g,A)){if(s.pa.hi<0||s.pb.hi<0)continue;
  const side=n=>{const [ax,ay]=xy[s.a],[bx,by]=xy[s.b],[px,py]=xy[n];return (bx-ax)*(py-ay)-(by-ay)*(px-ax)};
  const u=side(s.pa.hi),v=side(s.pb.hi);if(Math.abs(u)<1e-3||Math.abs(v)<1e-3)continue;
  ez.push({a:s.a,b:s.b,na:s.pa.hi,nb:s.pb.hi,same:Math.sign(u)===Math.sign(v)})}
 g.ez=ez;return g}

/* ---------- graph → name ---------- */
function locSort(l){return [...l].sort((x,y)=>isNum(x)&&isNum(y)?x-y:isNum(x)?1:isNum(y)?-1:0)}
function prefixText(entries,omit){
 const groups=new Map();for(const e of entries){const k=(e.complex?'(':'')+e.text;if(!groups.has(k))groups.set(k,{...e,locs:[]});groups.get(k).locs.push(e.pos)}
 const list=[...groups.values()].map(gr=>{gr.locs=locSort(gr.locs);const n=gr.locs.length;
  const body=gr.complex?(n>1?MULTX[n]:'')+'('+gr.text+')':(n>1?MULT[n]:'')+gr.text,hasN=gr.locs.some(x=>!isNum(x));
  return {alpha:alphaOf(gr.text),locs:gr.locs,body,show:(!omit||hasN)&&gr.locs.some(x=>x!=='')}}).sort((x,y)=>x.alpha.localeCompare(y.alpha)||lex(x.locs,y.locs));
 let s='';list.forEach((x,k)=>{const part=(x.show?x.locs.join(',')+'-':'')+x.body;s+=(k&&x.show?'-':'')+part});
 return s}
function citedLocs(entries){return [...entries].sort((x,y)=>alphaOf(x.text).localeCompare(alphaOf(y.text))||(isNum(x.pos)?x.pos:0)-(isNum(y.pos)?y.pos:0)).map(e=>e.pos)}
const OXY={methyl:'methoxy',ethyl:'ethoxy',propyl:'propoxy',butyl:'butoxy',phenyl:'phenoxy'};
const toOxy=t=>OXY[t]||(/\d.*(meth|eth|prop|but)yl$/.test(t)?t.replace(/yl$/,'oxy'):t+'oxy');

function nameGraph(g){
 const A=analyse(g),{a,rings,ringOf,site,P}=A,isC=i=>g.atoms[i]==='C',inRing=i=>ringOf.has(i);
 const EZ=stereo(g,A).filter(s=>s.d);
 const exoOther=i=>site[i]&&EXO.has(site[i])&&site[i]!=='al'&&site[i]!==P;
 const chainable=i=>isC(i)&&!inRing(i)&&!exoOther(i);
 function group(c){const h=het(g,a,c),t=site[c],out={atoms:new Set(),nsub:[],alkyl:null,n:null};
  if(t==='acid')h.o2.concat(h.o1).forEach(x=>out.atoms.add(x));
  else if(t==='ester'){out.atoms.add(h.o2[0]);out.atoms.add(h.oe[0]);out.alkyl={start:a[h.oe[0]].find(e=>e.i!==c).i,from:h.oe[0]}}
  else if(t==='amide'){out.atoms.add(h.o2[0]);out.atoms.add(h.na[0]);out.n=h.na[0];out.nsub=a[h.na[0]].filter(e=>e.i!==c).map(e=>e.i)}
  else if(t==='nitrile')out.atoms.add(h.nt[0]);
  else if(t==='al'||t==='one')out.atoms.add(h.o2[0]);
  else if(t==='ol')out.atoms.add(h.o1[0]);
  else if(t==='amine'){out.atoms.add(h.na[0]);out.n=h.na[0];out.nsub=a[h.na[0]].filter(e=>e.i!==c).map(e=>e.i)}
  return out}
 function branch(start,from,isSuffix){
  if(isSuffix(start))return null;
  const s=g.atoms[start],o=bondO(a,from,start);
  if(HALO[s])return {text:HALO[s],complex:false};
  if(s==='O'){if(a[start].length===1)return {text:o===2?'oxo':'hydroxy',complex:false};
   const other=a[start].find(e=>e.i!==from).i;
   if(site[other]==='ester')return {text:acylName(other,start)+'oxy',complex:true};
   const sub=subName(other,start);return {text:toOxy(sub.text),complex:sub.complex}}
  if(s==='N'){
   const subs=a[start].filter(e=>e.i!==from).map(e=>{const b=subName(e.i,start);return {pos:'',text:b.text,complex:b.complex}});
   if(!subs.length)return {text:'amino',complex:false};
   return {text:prefixText(subs,true)+'amino',complex:true}}
  if(o!==1)fail('หมู่แทนที่ที่ต่อด้วยพันธะคู่หรือพันธะสาม (เช่น methylidene) ยังไม่รองรับ');
  return subName(start,from)}
 function subName(start,from){
  if(inRing(start))return ringSub(start,from);
  const t=site[start];
  if(t==='acid')return {text:'carboxy',complex:false};
  if(t==='nitrile')return {text:'cyano',complex:false};
  if(t==='amide')fail('หมู่เอไมด์ที่ไม่ใช่หมู่หลัก (carbamoyl) ยังไม่รองรับ');
  if(t==='ester'){const h=het(g,a,start),alk=subName(a[h.oe[0]].find(e=>e.i!==start).i,h.oe[0]);return {text:toOxy(alk.text)+'carbonyl',complex:true}}
  const paths=[];(function walk(i,path){const next=[...path,i];paths.push(next);
   for(const e of a[i])if(e.i!==from&&!next.includes(e.i)&&isC(e.i)&&!inRing(e.i)&&!(site[e.i]&&EXO.has(site[e.i])&&site[e.i]!=='al'))walk(e.i,next)})(start,[]);
  const scored=paths.map(p=>{const set=new Set([from,...p]),mb=p.slice(1).map((x,k)=>bondO(a,p[k],x)).filter(o=>o>1).length;
   return {p,mb,set,nb:p.reduce((tt,x)=>tt+a[x].filter(e=>!set.has(e.i)).length,0)}});
  scored.sort((x,y)=>y.p.length-x.p.length||y.mb-x.mb||y.nb-x.nb);
  const top=scored.filter(c=>c.p.length===scored[0].p.length&&c.mb===scored[0].mb&&c.nb===scored[0].nb);
  for(const c of top){c.ents=entriesOn(c.p,c.set,()=>false);c.mbl=c.p.slice(1).map((x,k)=>bondO(a,c.p[k],x)>1?k+1:0).filter(Boolean)}
  top.sort((x,y)=>lex(x.mbl,y.mbl)||lex(x.ents.map(e=>e.pos).sort((p,q)=>p-q),y.ents.map(e=>e.pos).sort((p,q)=>p-q))||lex(citedLocs(x.ents),citedLocs(y.ents)));
  const c=top[0],N=c.p.length;
  if(N>20)fail('หมู่แทนที่ยาวเกิน 20 คาร์บอน');
  for(const s of EZ)if(c.p.includes(s.a)&&c.p.includes(s.b))fail('E/Z ของพันธะคู่ในหมู่แทนที่ยังไม่รองรับ');
  if(N===1&&c.ents.length===1&&c.ents[0].text==='oxo')return {text:'formyl',complex:false};
  const enes=[],ynes=[];c.p.slice(1).forEach((x,k)=>{const o=bondO(a,c.p[k],x);if(o===2)enes.push(k+1);if(o===3)ynes.push(k+1)});
  let core=STEMS[N];
  if(enes.length||ynes.length){const multi=enes.length>1||ynes.length>1,part=(l,w)=>l.length?(N===2?'':'-'+l.join(',')+'-')+(l.length>1?MULT[l.length]:'')+w:'';
   core+=(multi?'a':'')+part(enes,'en')+part(ynes,'yn')}
  return {text:prefixText(c.ents,N===1)+core+'yl',complex:!!c.ents.length||/\d/.test(core)}}
 // R-C(=O)- seen from the ester O: straight chain (ethanoyl, propanoyl …) or benzoyl
 function acylName(c,o){
  const next=a[c].filter(e=>e.i!==o&&g.atoms[e.i]==='C');
  if(!next.length)return 'methanoyl';
  if(inRing(next[0].i)){const r=rings[ringOf.get(next[0].i)];if(r.arom&&!r.atoms.some(x=>a[x].some(e=>!r.atoms.includes(e.i)&&e.i!==c)))return 'benzoyl';fail('หมู่ acyloxy ที่มีวงแบบนี้ยังไม่รองรับ')}
  const path=[c];let prev=c,cur=next[0].i;
  while(true){path.push(cur);if(inRing(cur)||a[cur].some(e=>!isC(e.i)&&e.i!==prev)||a[cur].some(e=>e.o!==1))fail('หมู่ acyloxy ที่แตกกิ่งหรือมีหมู่อื่นยังไม่รองรับ');
   const nx=a[cur].filter(e=>e.i!==prev);if(nx.length>1)fail('หมู่ acyloxy ที่แตกกิ่งยังไม่รองรับ');if(!nx.length)break;prev=cur;cur=nx[0].i}
  if(path.length>20)fail('หมู่ acyloxy ยาวเกิน 20 คาร์บอน');
  return STEMS[path.length]+'anoyl'}
 function ringSub(start,from){
  const r=rings[ringOf.get(start)],n=r.atoms.length,k0=r.atoms.indexOf(start),set=new Set([from,...r.atoms]);
  let best=null;
  for(const d of [1,-1]){const order=[...Array(n)].map((_,k)=>r.atoms[((k0+d*k)%n+n)%n]),ents=entriesOn(order,set,()=>false);
   const enes=r.arom?[]:order.map((x,k)=>bondO(a,x,order[(k+1)%n])===2?(k===n-1?n:k+1):0).filter(Boolean).sort((p,q)=>p-q);
   const c={ents,enes,locs:ents.map(e=>e.pos).sort((p,q)=>p-q)};
   if(!best||lex(c.enes,best.enes)<0||(!lex(c.enes,best.enes)&&(lex(c.locs,best.locs)<0||(!lex(c.locs,best.locs)&&lex(citedLocs(c.ents),citedLocs(best.ents))<0))))best=c}
  let base;
  if(r.arom)base='phenyl';
  else if(best.enes.length){const m=best.enes.length;base='cyclo'+STEMS[n]+(m>1?'a':'')+'-'+best.enes.join(',')+'-'+(m>1?MULT[m]:'')+'enyl'}
  else base='cyclo'+STEMS[n]+'yl';
  return {text:prefixText(best.ents,false)+base,complex:!!best.ents.length||/\d/.test(base)}}
 function entriesOn(atoms,parentSet,isSuffix){
  const out=[];atoms.forEach((x,k)=>a[x].forEach(e=>{if(parentSet.has(e.i))return;const b=branch(e.i,x,isSuffix);if(b)out.push({pos:k+1,text:b.text,complex:b.complex})}));return out}

 /* parent candidates */
 const ringSites=r=>{let s=0;r.atoms.forEach(x=>{if(site[x]===P&&!EXO.has(P))s++;a[x].forEach(e=>{if(!inRing(e.i)&&EXO.has(P)&&site[e.i]===P)s++})});return s};
 const cands=[];
 rings.forEach(r=>{const mb=r.arom?3:r.atoms.map((x,j)=>bondO(a,x,r.atoms[(j+1)%r.atoms.length])).filter(o=>o>1).length;
  cands.push({kind:'ring',ring:r,atoms:r.atoms,sites:ringSites(r),mb,dbl:mb,len:r.atoms.length})});
 for(const s of g.atoms.map((_,i)=>i).filter(chainable))(function walk(i,path){const p=[...path,i];
   if(p[0]<=i){const mbl=p.slice(1).map((x,k)=>bondO(a,p[k],x)).filter(o=>o>1);
    cands.push({kind:'chain',atoms:p,sites:p.filter(x=>site[x]===P&&(!EXO.has(P)||x===p[0]||x===p.at(-1))).length,mb:mbl.length,dbl:mbl.filter(o=>o===2).length,len:p.length})}
   for(const e of a[i])if(chainable(e.i)&&!p.includes(e.i))walk(e.i,p)})(s,[]);
 if(!cands.length)fail('ไม่พบคาร์บอนที่ใช้เป็นโครงสร้างหลักได้');
 const exo=c=>c.kind==='ring'&&EXO.has(P)?new Set(c.ring.atoms.flatMap(x=>a[x].filter(e=>!inRing(e.i)&&site[e.i]===P).map(e=>e.i))):new Set();
 const branchCount=c=>{const set=new Set(c.atoms),ex=exo(c);return c.atoms.reduce((t,x)=>t+a[x].filter(e=>!set.has(e.i)&&!ex.has(e.i)&&!(site[x]===P&&!isC(e.i))).length,0)};
 cands.forEach(c=>{c.nb=branchCount(c)});
 const order1=(x,y)=>y.sites-x.sites||(x.kind==='ring'?-1:0)-(y.kind==='ring'?-1:0)||
  (x.kind==='ring'?(y.len-x.len)||(y.mb-x.mb):(y.mb-x.mb)||(y.len-x.len)||(y.dbl-x.dbl))||y.nb-x.nb;
 cands.sort(order1);
 const tier=cands.filter(c=>!order1(c,cands[0]));
 if(cands[0].kind==='chain'&&cands[0].len>20)fail('โซ่หลักยาวเกิน 20 คาร์บอน');

 function numberings(c){const n=c.atoms.length,out=[];
  if(c.kind==='chain'){out.push(c.atoms);if(n>1)out.push([...c.atoms].reverse())}
  else for(let s=0;s<n;s++)for(const d of [1,-1])out.push([...Array(n)].map((_,k)=>c.atoms[((s+d*k)%n+n)%n]));
  return out}
 function profile(c,order){
  const n=order.length,set=new Set(c.atoms),ex=exo(c),isRing=c.kind==='ring';
  const sites=[];
  order.forEach((x,k)=>{
   if(isRing){if(site[x]===P&&!EXO.has(P))sites.push({c:x,pos:k+1});a[x].forEach(e=>{if(ex.has(e.i))sites.push({c:e.i,pos:k+1})})}
   else if(site[x]===P&&(!EXO.has(P)||k===0||k===n-1))sites.push({c:x,pos:k+1})});
  const suffix=new Set([...ex]),groups=sites.map(s=>({...s,...group(s.c)}));
  groups.forEach(gr=>gr.atoms.forEach(x=>suffix.add(x)));
  const enes=[],ynes=[];
  if(!(isRing&&c.ring.arom))for(let k=0;k<(isRing?n:n-1);k++){const o=bondO(a,order[k],order[(k+1)%n]);if(o===2||o===3)(o===2?enes:ynes).push(k===n-1?n:k+1)}
  const ents=entriesOn(order,set,x=>suffix.has(x));
  for(const gr of groups)for(const s of gr.nsub){const b=subName(s,gr.n);ents.push({pos:'N',text:b.text,complex:b.complex})}
  const alkyls=groups.filter(gr=>gr.alkyl).map(gr=>subName(gr.alkyl.start,gr.alkyl.from).text);
  return {order,principal:groups.map(x=>x.pos).sort((p,q)=>p-q),groups,enes:enes.sort((p,q)=>p-q),ynes:ynes.sort((p,q)=>p-q),ents,alkyls,
   mbl:[...enes,...ynes].sort((p,q)=>p-q),pl:ents.map(e=>e.pos).filter(isNum).sort((p,q)=>p-q),cl:citedLocs(ents)}}
 const cmp=(x,y)=>lex(x.principal,y.principal)||lex(x.mbl,y.mbl)||lex(x.enes,y.enes)||lex(x.pl,y.pl)||lex(x.cl,y.cl);
 let best=null,bestC=null;
 for(const c of tier)for(const o of numberings(c)){const p=profile(c,o);if(!best||cmp(p,best)<0){best=p;bestC=c}}
 const c=bestC,p=best,N=c.atoms.length,isRing=c.kind==='ring',isBz=isRing&&c.ring.arom;
 if((P==='amine'||P==='amide')&&p.groups.length>1&&p.groups.some(gr=>gr.nsub.length))fail('ไดเอมีน/ไดเอไมด์ที่มีหมู่แทนที่บน N ยังไม่รองรับ');
 const posOf=new Map(p.order.map((x,k)=>[x,k+1])),ezDesc=[];
 for(const s of EZ){if(!(posOf.has(s.a)&&posOf.has(s.b))||isRing)fail('E/Z ของพันธะคู่ที่ไม่อยู่บนโซ่หลักยังไม่รองรับ');ezDesc.push([Math.min(posOf.get(s.a),posOf.get(s.b)),s.d])}
 ezDesc.sort((x,y)=>x[0]-y[0]);

 /* assemble */
 const m=p.principal.length;
 const numericItems=p.ents.filter(e=>isNum(e.pos)).length+(['ol','one','amine'].includes(P)||(isRing&&P)?m:0)+(isBz?0:p.enes.length+p.ynes.length);
 const SUF={acid:['oic acid','carboxylic acid','benzoic acid'],ester:['oate','carboxylate','benzoate'],amide:['amide','carboxamide','benzamide'],
  nitrile:['nitrile','carbonitrile','benzonitrile'],al:['al','carbaldehyde','benzaldehyde'],one:['one','one',null],ol:['ol','ol','phenol'],amine:['amine','amine','aniline']};
 function build(omit){
  const L=l=>omit?'':'-'+l.join(',')+'-';
  const pre=prefixText(p.ents,omit);
  let parent;
  if(isBz)parent=!P?'benzene':m===1?SUF[P][2]:'benzene'+L(p.principal)+MULT[m]+SUF[P][1];
  else{
   const stem=(isRing?'cyclo':'')+STEMS[N];let core;
   if(!p.enes.length&&!p.ynes.length)core=stem+'an';
   else{const multi=p.enes.length>1||p.ynes.length>1,short=omit||(!isRing&&N===2);
    const part=(l,w)=>l.length?(short?'':'-'+l.join(',')+'-')+(l.length>1?MULT[l.length]:'')+w:'';
    core=stem+(multi?'a':'')+part(p.enes,'en')+part(p.ynes,'yn')}
   if(!P)parent=core+'e';
   else if(isRing&&EXO.has(P))parent=core+'e'+(omit?'':L(p.principal))+(m>1?MULT[m]:'')+SUF[P][1];
   else if(EXO.has(P)){const s=SUF[P][0];parent=m>1?core+'e'+MULT[m]+s:core+(/^[aeiou]/.test(s)?'':'e')+s}
   else{const s=SUF[P][0];
    if(m>1)parent=core+'e'+L(p.principal)+MULT[m]+s;
    else parent=core+(omit||(!isRing&&N<=2&&P!=='one')?'':L(p.principal))+s}}
  let name=pre+parent;
  if(ezDesc.length)name=(ezDesc.length===1&&p.enes.length===1?'('+ezDesc[0][1]+')':'('+ezDesc.map(x=>x[0]+x[1]).join(',')+')')+'-'+name;
  if(P==='ester'){const al=p.alkyls,uniq=[...new Set(al)];
   const words=uniq.length===1&&al.length>1?MULT[al.length]+(/\d/.test(uniq[0])?'('+uniq[0]+')':uniq[0]):[...al].sort((x,y)=>alphaOf(x).localeCompare(alphaOf(y))).join(' ');
   name=words+' '+name}
  return name}
 const tries=[];
 if(isRing&&numericItems<=1)tries.push(build(true));
 if(!isRing&&N===1)tries.push(build(true));
 if(!isRing&&N===2&&p.ents.filter(e=>isNum(e.pos)).length+(['ol','one','amine'].includes(P)?m:0)<=1)tries.push(build(true));
 tries.push(build(false));
 const want=key(g);let name=null,lastErr='';
 for(const t of tries){try{if(key(parse(t))===want){name=t;break}}catch(e){lastErr=e.message}}
 if(!name)fail('ตรวจย้อนกลับแล้วโครงสร้างไม่ตรง จึงไม่แสดงชื่อที่ยังยืนยันไม่ได้');

 const parentTh=isBz?'วงเบนซีน':isRing?`วง ${N} คาร์บอน (cyclo${STEMS[N]}…)`:`โซ่เปิด ${N} คาร์บอน (${STEMS[N]}…)`;
 const why=isRing?'วงมีหมู่หลักเท่ากับหรือมากกว่าโซ่ (ถ้ามีหลายวง เลือกวงใหญ่กว่า แล้ววงที่มีพันธะคู่มากกว่า)':'เลือกโซ่ที่มีหมู่หลักมากที่สุด → มีพันธะคู่/สามมากที่สุด → ยาวที่สุด → มีหมู่แทนที่มากที่สุด';
 const subsTh=p.ents.length?p.ents.map(e=>e.pos+'-'+(e.complex?'('+e.text+')':e.text)).join(', '):'ไม่มี';
 const steps=[`อ่านกราฟ: ${g.atoms.length} อะตอมที่แสดง และ ${g.bonds.length} พันธะ`,
  `หมู่หลัก (กรด > เอสเทอร์ > เอไมด์ > ไนไตรล์ > แอลดีไฮด์ > คีโตน > แอลกอฮอล์ > เอมีน): ${P?GROUP_TH[P]+(m>1?` ${m} หมู่`:''):'ไม่มี (ไฮโดรคาร์บอน แฮโลเจน หรืออีเทอร์)'}`,
  `โครงสร้างหลัก: ${parentTh} · ${why}`,
  `พันธะไม่อิ่มตัวในโครงสร้างหลัก: ${isBz?'วงเบนซีน (ไม่ต้องระบุตำแหน่ง)':[...p.enes.map(l=>l+' (คู่)'),...p.ynes.map(l=>l+' (สาม)')].join(', ')||'ไม่มี'}`,
  `หมู่แทนที่: ${subsTh}${p.ents.some(e=>e.complex)?' · หมู่ที่มีกิ่งย่อยนับคาร์บอนที่ต่อกับโครงสร้างหลักเป็นตำแหน่ง 1 แล้วเขียนในวงเล็บ':''}${p.ents.some(e=>e.pos==='N')?' · N- คือหมู่ที่ต่อกับไนโตรเจน':''}${/oxy/.test(subsTh)?' · -oxy คือหมู่ RO- ของอีเทอร์':''}`];
 if(P==='ester')steps.push(`เอสเทอร์: เขียนหมู่ R ที่ต่อกับ O ก่อน (${p.alkyls.join(', ')}) แล้วตามด้วยส่วนกรดที่เปลี่ยน -oic acid เป็น -oate`);
 if(ezDesc.length)steps.push('E/Z: เทียบหมู่ที่มีลำดับความสำคัญสูงกว่า (เลขอะตอมมากกว่า) ของคาร์บอนแต่ละข้างของพันธะคู่ อยู่ด้านเดียวกัน = Z, อยู่คนละด้าน = E · ถ้าแต่ละข้างมี H หนึ่งอะตอม Z มักตรงกับ cis และ E ตรงกับ trans');
 else if(stereo(g,A).length)steps.push('พันธะคู่นี้มีไอโซเมอร์ E/Z ได้ แต่โครงสร้างไม่ได้ระบุรูปทรง จึงไม่ใส่ E/Z');
 steps.push('นับตำแหน่ง: หมู่หลักได้เลขต่ำสุด → พันธะคู่/สาม → หมู่แทนที่ทั้งหมด → หมู่ที่ขึ้นก่อนตามตัวอักษร',`ประกอบชื่อ: ${name}`,'แปลงชื่อกลับเป็นกราฟ: ชนิดอะตอม ลำดับพันธะ และ E/Z ตรงกันทุกตำแหน่ง');
 return {name,formula:formula(g),jme:toJme(g),roundTrip:true,steps}}

/* ---------- name → graph ---------- */
const ALIASES={'2-propanol':'propan-2-ol','1-propanol':'propan-1-ol',propanol:null,butanol:null,propanone:'propan-2-one',acetone:'propan-2-one',butanone:'butan-2-one',
 'acetic acid':'ethanoic acid','formic acid':'methanoic acid',formaldehyde:'methanal',acetaldehyde:'ethanal',chloroform:'trichloromethane',
 'ethylene glycol':'ethane-1,2-diol',glycerol:'propane-1,2,3-triol','oxalic acid':'ethanedioic acid',toluene:'methylbenzene',
 'o-xylene':'1,2-dimethylbenzene','m-xylene':'1,3-dimethylbenzene','p-xylene':'1,4-dimethylbenzene',xylene:null,styrene:'ethenylbenzene',
 benzenol:'phenol','benzenecarboxylic acid':'benzoic acid',cumene:'(1-methylethyl)benzene',ethylene:'ethene',acetylene:'ethyne',propylene:'propene',
 'diethyl ether':'ethoxyethane','dimethyl ether':'methoxymethane','ethyl acetate':'ethyl ethanoate','methyl acetate':'methyl ethanoate',
 acetonitrile:'ethanenitrile',benzenamine:'aniline',acetamide:'ethanamide',methylamine:'methanamine',ethylamine:'ethanamine',
 dimethylamine:'n-methylmethanamine',trimethylamine:'n,n-dimethylmethanamine',anisole:'methoxybenzene',
 'acrylic acid':'prop-2-enoic acid',aspirin:'2-(ethanoyloxy)benzoic acid','acetylsalicylic acid':'2-(ethanoyloxy)benzoic acid','benzyl alcohol':'phenylmethanol',biphenyl:'phenylbenzene'};
const COMMON_SUB={'tert-butyl':'(1,1-dimethylethyl)','t-butyl':'(1,1-dimethylethyl)','sec-butyl':'(1-methylpropyl)',isobutyl:'(2-methylpropyl)',isopropyl:'(1-methylethyl)',benzyl:'(phenylmethyl)',vinyl:'ethenyl',allyl:'(prop-2-enyl)'};
const locsOf=s=>s?s.split(',').map(x=>x==='n'?'N':Number(x)):null;
const multN=w=>w?MULT.indexOf(w):1;
const chainDesc=(N,subs=[])=>({kind:'chain',N,arom:false,enes:[],ynes:[],subs});
const PHENYL=()=>({kind:'ring',N:6,arom:true,enes:[],ynes:[],subs:[]});

function parsePrefixes(str){
 const out=[];let i=0,locs=null;
 while(i<str.length){
  if(str[i]==='-'){i++;continue}
  const lm=str.slice(i).match(/^((?:\d+|n)(?:,(?:\d+|n))*)-/);
  if(lm){locs=locsOf(lm[1]);i+=lm[0].length;continue}
  const rest=str.slice(i);let m;
  if((m=rest.match(/^(bis|tris|tetrakis|pentakis|hexakis)?\(/))){
   let depth=0,j=m[0].length-1;for(;j<rest.length;j++){if(rest[j]==='(')depth++;if(rest[j]===')'&&--depth===0)break}
   if(depth)fail('วงเล็บไม่ครบคู่');
   out.push({locs,mult:m[1]?MULTX.indexOf(m[1]):1,sub:parseSub(rest.slice(m[0].length,j))});locs=null;i+=j+1;continue}
  let hit=null;
  for(const w of ['',...MULT.slice(2)]){if(!rest.startsWith(w))continue;const s=simpleSub(rest.slice(w.length));if(s&&(!hit||s.len+w.length>hit.len)){hit={len:s.len+w.length,mult:w?MULT.indexOf(w):1,sub:s.sub};if(!w)break}}
  if(!hit)fail('อ่านหมู่แทนที่ "'+rest.split('-')[0]+'" ไม่ได้');
  out.push({locs,mult:hit.mult,sub:hit.sub});locs=null;i+=hit.len}
 if(locs)fail('ตำแหน่งไม่มีชื่อหมู่ตามหลัง');
 for(const e of out)if(e.locs&&e.locs.length!==e.mult)fail('จำนวนตำแหน่งไม่ตรงกับ di/tri หรือ bis/tris');
 return out}
function simpleSub(r){
 const names=[['fluoro',{x:'F'}],['chloro',{x:'Cl'}],['bromo',{x:'Br'}],['iodo',{x:'I'}],['hydroxy',{x:'OH'}],['oxo',{x:'=O'}],['formyl',{x:'CHO'}],['carboxy',{x:'COOH'}],
  ['cyano',{x:'CN'}],['amino',{amino:[]}],['phenyl',PHENYL()],['phenoxy',{alkoxy:PHENYL()}],
  ['methoxy',{alkoxy:chainDesc(1)}],['ethoxy',{alkoxy:chainDesc(2)}],['propoxy',{alkoxy:chainDesc(3)}],['butoxy',{alkoxy:chainDesc(4)}],
  ['methoxycarbonyl',{esterC:chainDesc(1)}],['ethoxycarbonyl',{esterC:chainDesc(2)}],['propoxycarbonyl',{esterC:chainDesc(3)}],['butoxycarbonyl',{esterC:chainDesc(4)}]];
 let best=null;for(const [w,sub]of names)if(r.startsWith(w)&&(!best||w.length>best.len))best={len:w.length,sub};
 const ac=r.match(new RegExp('^(?:'+STEM_RE+'anoyl|(benzoyl)|(acetyl))oxy'));
 if(ac&&(!best||ac[0].length>best.len))best={len:ac[0].length,sub:{acyloxy:ac[2]?'benzoyl':ac[3]?2:STEMS.indexOf(ac[1])}};
 const m=r.match(new RegExp('^(cyclo)?'+STEM_RE+'(en|yn)?yl(oxy)?'));
 if(m&&(!best||m[0].length>best.len)){const N=STEMS.indexOf(m[2]),d={kind:m[1]?'ring':'chain',N,arom:false,enes:m[3]==='en'?[1]:[],ynes:m[3]==='yn'?[1]:[],subs:[]};
  best={len:m[0].length,sub:m[4]?{alkoxy:d}:d}}
 return best}
function parseSub(text){
 let m;
 if((m=text.match(/^(.*)carbonyl$/))&&/oxy$/.test(m[1])){const al=parseSub(m[1]);if(!al.alkoxy)fail('อ่านหมู่ "'+text+'" ไม่ได้');return {esterC:al.alkoxy}}
 if((m=text.match(/^(.*?)amino$/))){const subs=parsePrefixes(m[1]),list=[];
  for(const x of subs){if(x.locs&&x.locs.some(v=>v!=='N'))fail('หมู่บน N ของ amino ไม่ต้องมีเลขตำแหน่ง');for(let k=0;k<x.mult;k++)list.push(x.sub)}
  if(list.length>2)fail('N มีหมู่แทนที่ได้ไม่เกิน 2 หมู่');return {amino:list}}
 {const s1=simpleSub(text);if(s1&&s1.len===text.length&&s1.sub.acyloxy!=null)return s1.sub}
 if((m=text.match(/^(.*)oxy$/))){const t=m[1].replace(/(meth|eth|prop|but)$/,'$1yl').replace(/phen$/,'phenyl');return {alkoxy:parseSub(t)}}
 if((m=text.match(/^(.*?)phenyl$/))){const subs=parsePrefixes(m[1]);if(subs.some(x=>!x.locs))fail('ต้องระบุตำแหน่งบนวงของ "'+text+'"');return {...PHENYL(),subs}}
 if(text==='formyl'||text==='carboxy'||text==='cyano')return simpleSub(text).sub;
 m=text.match(new RegExp('^(.*?)(cyclo)?'+STEM_RE+'(a)?((?:-\\d+(?:,\\d+)*-(?:di|tri)?en)?(?:-\\d+(?:,\\d+)*-(?:di|tri)?yn)?|en|yn)?yl$'));
 if(!m)fail('อ่านหมู่แทนที่ "'+text+'" ไม่ได้');
 const N=STEMS.indexOf(m[3]),u=unsat(m[5]||'',N,!!m[2]),subs=parsePrefixes(m[1]);
 for(const x of subs)if(!x.locs){if(N===1&&!m[2])x.locs=Array(x.mult).fill(1);else fail('ต้องระบุตำแหน่งในหมู่แทนที่ "'+text+'"')}
 return {kind:m[2]?'ring':'chain',N,arom:false,enes:u.enes,ynes:u.ynes,subs}}
function unsat(s,N,isRing){
 if(!s||s==='an')return {enes:[],ynes:[]};
 if(s==='en'||s==='yn'){if(!isRing&&N>3)fail('ต้องระบุตำแหน่งพันธะคู่หรือพันธะสาม');return {enes:s==='en'?[1]:[],ynes:s==='yn'?[1]:[]}}
 const e=s.match(/-([\d,]+)-(di|tri|tetra)?en/),y=s.match(/-([\d,]+)-(di|tri|tetra)?yn/),out={enes:e?locsOf(e[1]):[],ynes:y?locsOf(y[1]):[]};
 if(e&&out.enes.length!==multN(e[2]))fail('จำนวนตำแหน่งพันธะคู่ไม่ตรงกับ di/tri');
 if(y&&out.ynes.length!==multN(y[2]))fail('จำนวนตำแหน่งพันธะสามไม่ตรงกับ di/tri');
 return out}

function parse(input){
 let s=String(input).toLowerCase().trim().replace(/[–−‐]/g,'-').replace(/\s+/g,' ').replace(/n['′]/g,'n');
 if(!s||s.length>200)fail('กรอกชื่อไม่เกิน 200 ตัวอักษร');
 if(/nitro/.test(s))fail('หมู่ nitro (-NO₂) มีประจุใน N และ O ยังไม่อยู่ในขอบเขตกฎในเครื่อง');
 if(Object.hasOwn(ALIASES,s)){if(!ALIASES[s])fail('ชื่อกำกวม ต้องระบุตำแหน่ง เช่น propan-1-ol หรือ 1,2-dimethylbenzene');s=ALIASES[s]}
 let ezSpec=null;
 const sm=s.match(/^(cis|trans)-/)||s.match(/^\(((?:\d+)?[ez](?:,\d+[ez])*)\)-/);
 if(sm){s=s.slice(sm[0].length);ezSpec=sm[1]==='cis'||sm[1]==='trans'?{ct:sm[1]}:{list:sm[1].split(',').map(x=>({loc:x.length>1?+x.slice(0,-1):null,d:x.slice(-1).toUpperCase()}))}}
 s=s.replace(/tert-butyl|t-butyl|sec-butyl|isobutyl|isopropyl|benzyl|vinyl|allyl/g,w=>COMMON_SUB[w]);
 s=s.replace(/^([omp])-(di|bis)?/,(w,l,d)=>({o:'1,2-',m:'1,3-',p:'1,4-'}[l])+(d||''));
 let esterAlkyls=null;
 if(/ /.test(s)&&!/ acid$/.test(s)){const words=s.split(' '),last=words.pop();
  if(!/(oate|carboxylate)$/.test(last))fail('ชื่อหลายคำรองรับเฉพาะเอสเทอร์ เช่น ethyl ethanoate');
  esterAlkyls=[];
  for(const w of words){let n=1,t=w;const mm=w.match(/^(di|tri)(.+)$/);
   if(mm){let ok=true;try{parseSub(w.replace(/^\((.*)\)$/,'$1'))}catch(e){ok=false}if(!ok){n=MULT.indexOf(mm[1]);t=mm[2]}}
   const sub=parseSub(t.replace(/^\((.*)\)$/,'$1'));for(let k=0;k<n;k++)esterAlkyls.push(sub)}
  s=last.replace(/oate$/,'oic acid').replace(/carboxylate$/,'carboxylic acid');
  const sm2=s.match(/^\(((?:\d+)?[ez](?:,\d+[ez])*)\)-/);
  if(sm2){if(ezSpec)fail('ระบุ E/Z ซ้ำ');s=s.slice(sm2[0].length);ezSpec={list:sm2[1].split(',').map(x=>({loc:x.length>1?+x.slice(0,-1):null,d:x.slice(-1).toUpperCase()}))}}}
 if(/\b(cis|trans)\b|\[|\]|\((?:\d*[rs](?:,\d*[rs])*)\)|\(\d*[ez][,)]/.test(s))fail('R/S หรือ E/Z ที่ไม่อยู่หน้าชื่อยังไม่อยู่ในขอบเขตกฎพื้นฐาน');
 let P=null,par=null,pre='';
 const bz=[[/benzene-([\d,]+)-(di|tri|tetra|penta|hexa)ol$/,'ol'],[/phenol$/,'ol'],[/benzene-([\d,]+)-(di|tri|tetra)carboxylic acid$/,'acid'],[/benzoic acid$/,'acid'],
  [/benzene-([\d,]+)-(di|tri|tetra)carbaldehyde$/,'al'],[/benzaldehyde$/,'al'],[/benzene-([\d,]+)-(di|tri|tetra)carboxamide$/,'amide'],[/benzamide$/,'amide'],
  [/benzene-([\d,]+)-(di|tri|tetra)carbonitrile$/,'nitrile'],[/benzonitrile$/,'nitrile'],[/benzene-([\d,]+)-(di|tri|tetra)amine$/,'amine'],[/aniline$/,'amine'],[/benzene$/,null]];
 for(const [re,t]of bz){const m=s.match(re);if(!m)continue;
  pre=s.slice(0,m.index);P=t;par={kind:'ring',N:6,arom:true,enes:[],ynes:[],principal:t?(m[1]?locsOf(m[1]):[1]):[]};
  if(m[2]&&par.principal.length!==multN(m[2]))fail('จำนวนตำแหน่งไม่ตรงกับ di/tri');break}
 if(!par){
  const re=new RegExp('^(.*?)(cyclo)?'+STEM_RE+'(a)?(an|en|yn|(?:-\\d+(?:,\\d+)*-(?:di|tri|tetra)?en)?(?:-\\d+(?:,\\d+)*-(?:di|tri|tetra)?yn)?)'+
   '(e|e?(?:-(\\d+(?:,\\d+)*)-)?(di|tri|tetra)?(carboxylic acid|carbaldehyde|carboxamide|carbonitrile)|(e?)(di)?(oic acid|amide|nitrile|al)|e?(?:-(\\d+(?:,\\d+)*)-)?(di|tri|tetra|penta|hexa)?(ol|one|amine))$');
  const m=s.match(re);
  if(!m)fail('ชื่อนี้ยังไม่อยู่ในไวยากรณ์ที่รองรับ: ดูขอบเขตกฎด้านล่าง');
  if(!m[5])fail('ชื่อโครงสร้างหลักไม่ครบ (ต้องมี an / en / yn)');
  if(m[4]&&!/(di|tri|tetra)(en|yn)/.test(m[5]))fail('ใช้ "a" หลังชื่อโซ่เฉพาะเมื่อมีพันธะคู่/สามหลายตำแหน่ง เช่น buta-1,3-diene');
  pre=m[1];const isRing=!!m[2],N=STEMS.indexOf(m[3]),u=unsat(m[5],N,isRing);
  par={kind:isRing?'ring':'chain',N,arom:false,...u,principal:[]};
  if(m[9]){P={'carboxylic acid':'acid',carbaldehyde:'al',carboxamide:'amide',carbonitrile:'nitrile'}[m[9]];if(!isRing)fail(m[9]+' ใช้กับวงเท่านั้น');
   const n=multN(m[8]);par.principal=m[7]?locsOf(m[7]):(n===1?[1]:fail('ต้องระบุตำแหน่งหมู่'));if(par.principal.length!==n)fail('จำนวนตำแหน่งไม่ตรงกับ di/tri')}
  else if(m[12]){P={'oic acid':'acid',amide:'amide',nitrile:'nitrile',al:'al'}[m[12]];if(isRing)fail('วงใช้ -carboxylic acid, -carboxamide, -carbonitrile หรือ -carbaldehyde');
   if(P==='nitrile'&&!m[10])fail('ไนไตรล์เขียนเป็น -enitrile เช่น ethanenitrile');par.principal=m[11]?[1,N]:[1]}
  else if(m[15]){P=m[15];const n=multN(m[14]);
   if(m[13])par.principal=locsOf(m[13]);
   else if(n===1&&(isRing||N<=2))par.principal=[1];
   else if(n===1&&P==='one'&&(N===3||N===4))par.principal=[2];
   else fail('ต้องระบุตำแหน่งของหมู่ -'+P+' เช่น propan-2-'+P);
   if(par.principal.length!==n)fail('จำนวนตำแหน่งไม่ตรงกับ di/tri')}
  if(par.N<1||par.N>20)fail('ความยาวโซ่ไม่รองรับ');
  if(isRing&&(N<3||N>8))fail('รองรับวงคาร์บอน 3–8 อะตอม')}
 if(esterAlkyls){if(P!=='acid')fail('เอสเทอร์ต้องลงท้าย -oate หรือ -carboxylate');if(esterAlkyls.length!==par.principal.length)fail('จำนวนหมู่ R ของเอสเทอร์ไม่ตรงกับจำนวนหมู่ -oate');P='ester'}
 const prefixes=parsePrefixes(pre);
 for(const x of prefixes)if(x.locs&&x.locs.includes('N')&&x.locs.some(v=>v!=='N'))fail('ตำแหน่ง N ปนกับตัวเลขในหมู่เดียวกันไม่ได้');
 if(prefixes.some(x=>x.locs&&x.locs.includes('N'))&&!['amine','amide'].includes(P))fail('N- ใช้กับเอมีนหรือเอไมด์เท่านั้น');
 const free=prefixes.filter(x=>!x.locs);
 if(free.length){
  const n=par.N,taken=par.principal,numeric=prefixes.filter(x=>!x.locs||!x.locs.includes('N'));
  if(par.kind==='chain'&&n===1)free.forEach(x=>x.locs=Array(x.mult).fill(1));
  else if(par.kind==='chain'&&n===2){const pos=P&&taken.includes(1)&&!taken.includes(2)?2:1;free.forEach(x=>x.locs=Array(x.mult).fill(pos))}
  else if(par.kind==='ring'&&numeric.length===1&&free[0].mult===1&&!(P&&taken.length)&&!par.enes.length)free[0].locs=[1];
  else fail('ต้องระบุตำแหน่งหมู่แทนที่ เช่น 2-methyl');
 }
 const g=buildGraph(par,P,prefixes,esterAlkyls);
 if(ezSpec)applyEZ(g,ezSpec);
 return g}

function buildGraph(par,P,prefixes,esterAlkyls){
 const g={atoms:[],bonds:[]},add=(s,to,o=1)=>{const i=g.atoms.push(s)-1;if(to!=null)g.bonds.push({a:to,b:i,o});return i};
 const parent=mkSkeleton(g,add,par,null);
 Object.defineProperty(g,'_parent',{value:{ids:parent,par},enumerable:false});
 const at=k=>{if(!isNum(k)||k<1||k>par.N)fail('ตำแหน่ง '+k+' อยู่นอกโครงสร้างหลัก ('+par.N+' คาร์บอน)');return parent[k-1]};
 const ring=par.kind==='ring',nAtoms=[];
 par.principal.forEach((k,j)=>{const c=at(k);
  if(P==='ol')add('O',c);
  else if(P==='one')add('O',c,2);
  else if(P==='amine')nAtoms.push(add('N',c));
  else{const x=ring?add('C',c):c;
   if(P==='al')add('O',x,2);
   else if(P==='acid'){add('O',x,2);add('O',x)}
   else if(P==='ester'){add('O',x,2);const o=add('O',x);mkSkeleton(g,add,esterAlkyls[j],o)}
   else if(P==='amide'){add('O',x,2);nAtoms.push(add('N',x))}
   else if(P==='nitrile')add('N',x,3)}});
 for(const pr of prefixes){
  if(pr.locs.includes('N')){if(!nAtoms.length)fail('ไม่มี N ให้ต่อหมู่ N-');if(nAtoms.length>1)fail('หมู่ N- บนไดเอมีน/ไดเอไมด์ยังไม่รองรับ');for(const k of pr.locs)attach(g,add,nAtoms[0],pr.sub);continue}
  for(const k of pr.locs)attach(g,add,at(k),pr.sub)}
 validate(g);
 if(P==='one')for(const k of par.principal){const c=parent[k-1];if(g.bonds.filter(b=>(b.a===c||b.b===c)&&g.atoms[b.a===c?b.b:b.a]==='C').length<2)fail('คีโตนต้องอยู่ระหว่างคาร์บอน 2 อะตอม (C=O ที่ปลายโซ่คือแอลดีไฮด์ ใช้ -al)')}
 return g}
function mkSkeleton(g,add,d,attachTo){
 if(d.alkoxy||d.amino||d.x||d.esterC||d.acyloxy!=null)fail('หมู่แทนที่นี้ใช้ในตำแหน่งนี้ไม่ได้');
 const ids=[];for(let k=0;k<d.N;k++)ids.push(add('C',k===0?attachTo:null));
 const n=d.N;
 for(let k=0;k<(d.kind==='ring'?n:n-1);k++){if(d.kind==='ring'&&n<3)break;
  let o=1;if(d.arom)o=k%2?1:2;else{if(d.enes.includes(k+1))o=2;if(d.ynes.includes(k+1))o=3}
  g.bonds.push({a:ids[k],b:ids[(k+1)%n],o})}
 for(const l of [...d.enes,...d.ynes])if(l<1||l>(d.kind==='ring'?n:n-1))fail('ตำแหน่งพันธะคู่หรือพันธะสาม '+l+' อยู่นอกโครงสร้าง');
 for(const pr of d.subs||[])for(const k of pr.locs){if(!isNum(k)||k<1||k>n)fail('ตำแหน่ง '+k+' อยู่นอกหมู่แทนที่ ('+n+' คาร์บอน)');attach(g,add,ids[k-1],pr.sub)}
 return ids}
function attach(g,add,at,sub){
 if(sub.x){const x=sub.x;
  if(x==='OH')return add('O',at);if(x==='=O')return add('O',at,2);
  if(x==='CHO'){const c=add('C',at);return add('O',c,2)}
  if(x==='COOH'){const c=add('C',at);add('O',c,2);return add('O',c)}
  if(x==='CN'){const c=add('C',at);return add('N',c,3)}
  return add(x,at)}
 if(sub.alkoxy){const o=add('O',at);mkSkeleton(g,add,sub.alkoxy,o);return}
 if(sub.acyloxy!=null){const o=add('O',at),c=add('C',o);add('O',c,2);if(sub.acyloxy==='benzoyl')mkSkeleton(g,add,PHENYL(),c);else if(sub.acyloxy>1)mkSkeleton(g,add,chainDesc(sub.acyloxy-1),c);return}
 if(sub.esterC){const c=add('C',at);add('O',c,2);const o=add('O',c);mkSkeleton(g,add,sub.esterC,o);return}
 if(sub.amino){const n=add('N',at);for(const s2 of sub.amino)attach(g,add,n,s2);return}
 mkSkeleton(g,add,sub,at)}
function applyEZ(g,spec){
 const {a}=validate(g),{ids,par}=g._parent;
 if(par.kind!=='chain')fail('E/Z รองรับเฉพาะพันธะคู่บนโซ่หลัก');
 const list=spec.list||[{loc:null,ct:spec.ct}];
 g.ez=[];
 for(const it of list){let loc=it.loc;
  if(loc==null){if(par.enes.length!==1)fail('ต้องระบุตำแหน่งของ E/Z เมื่อมีพันธะคู่หลายตำแหน่ง เช่น (2E,4Z)');loc=par.enes[0]}
  if(!par.enes.includes(loc))fail('ตำแหน่ง '+loc+' ไม่ใช่พันธะคู่บนโซ่หลัก');
  const x=ids[loc-1],y=ids[loc],pa=cipPair(g,a,x,y),pb=cipPair(g,a,y,x);
  if(!pa||!pb)fail('พันธะคู่ตำแหน่ง '+loc+' ไม่มีไอโซเมอร์ E/Z (มีหมู่เหมือนกันสองหมู่บนคาร์บอนเดียว)');
  if(it.ct){const heavy=(c,p)=>{const h=a[c].filter(e=>e.i!==p).map(e=>e.i);return h.length===1?h[0]:null};
   const nx=ids[loc-2]??heavy(x,y),ny=ids[loc+1]??heavy(y,x);if(nx==null||ny==null)fail('cis/trans ใช้ได้เมื่อแต่ละคาร์บอนของพันธะคู่มีหมู่หลักหนึ่งหมู่ ใช้ E/Z แทน');g.ez.push({a:x,b:y,na:nx,nb:ny,same:it.ct==='cis'})}
  else{if(pa.hi<0||pb.hi<0)fail('E/Z ไม่ถูกต้อง');g.ez.push({a:x,b:y,na:pa.hi,nb:pb.hi,same:it.d==='Z'})}}}

function fromName(name){const g=parse(name),r=nameGraph(g);return {...r,jme:toJme(g)}}
const api={parse,molGraph,withGeometry,nameGraph,fromName,key,toJme,formula,sameStructure};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChemNameRules=api;
})(typeof window!=='undefined'?window:globalThis);
