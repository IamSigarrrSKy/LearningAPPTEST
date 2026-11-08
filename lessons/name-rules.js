/* ChemLab local nomenclature rules (teaching scope, ม.4–6). No network, no database.
   Neutral molecules of C, O, F, Cl, Br, I with at most one carbocycle (C3–C8 or benzene):
   - parent: open chain or ring; several C=C / C≡C allowed in the parent (diene, en-yne)
   - groups: carboxylic acid > aldehyde > ketone > alcohol. The senior group is the suffix (one or several:
     diol, dione, dioic acid); the others become prefixes (hydroxy, oxo, formyl, carboxy)
   - substituents: halogens and alkyl groups that may themselves be branched or substituted, written in
     parentheses ((1-methylethyl), (2-chloroethyl)), unsaturated (ethenyl), or rings (cyclohexyl, phenyl)
   Every name is parsed back into a graph and compared atom-for-atom before it is shown.
   Never drop stereochemistry, charge, isotopes, extra rings or unsupported groups silently. */
(function(root){'use strict';
const STEMS=['','meth','eth','prop','but','pent','hex','hept','oct','non','dec','undec','dodec','tridec','tetradec','pentadec','hexadec','heptadec','octadec','nonadec','icos'];
const STEM_RE='('+STEMS.slice(1).sort((x,y)=>y.length-x.length).join('|')+')';
const HALO={F:'fluoro',Cl:'chloro',Br:'bromo',I:'iodo'},HALO_EL=Object.fromEntries(Object.entries(HALO).map(([k,v])=>[v,k]));
const MULT=['','','di','tri','tetra','penta','hexa','hepta','octa'],MULTX=['','','bis','tris','tetrakis','pentakis','hexakis'];
const VAL={C:4,O:2,F:1,Cl:1,Br:1,I:1},RANK=['acid','al','one','ol'];
const GROUP_TH={acid:'กรดคาร์บอกซิลิก (-COOH)',al:'แอลดีไฮด์ (-CHO)',one:'คีโตน (C=O)',ol:'แอลกอฮอล์ (-OH)'};
const fail=m=>{throw Error(m)};
const lex=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]??-1)-(b[i]??-1);if(d)return d}return 0};
const ord=o=>o===4?1.5:o;

/* ---------- graph checks ---------- */
function adjOf(g){const a=g.atoms.map(()=>[]);for(const b of g.bonds){a[b.a].push({i:b.b,o:b.o});a[b.b].push({i:b.a,o:b.o})}return a}
const bondO=(a,x,y)=>(a[x].find(e=>e.i===y)||{o:0}).o;
function ringOrder(g,a){
 const alive=new Set(g.atoms.map((_,i)=>i));let pruned=true;
 while(pruned){pruned=false;for(const i of [...alive])if(a[i].filter(e=>alive.has(e.i)).length<=1){alive.delete(i);pruned=true}}
 const order=[[...alive][0]];
 while(order.length<alive.size){const nx=a[order[order.length-1]].find(e=>alive.has(e.i)&&!order.includes(e.i));if(!nx)fail('อ่านวงไม่ได้');order.push(nx.i)}
 return order}
function isBenzene(a,ring){if(ring.length!==6)return false;const bo=ring.map((r,k)=>bondO(a,r,ring[(k+1)%6]));
 return bo.every(o=>o===4)||(bo.every((o,k)=>o===bo[k%2])&&[bo[0],bo[1]].sort().join()==='1,2')}
function validate(g){
 const n=g.atoms.length;
 if(!n||n>60)fail('รองรับโครงสร้าง 1–60 อะตอมในโหมดกฎพื้นฐาน');
 if(g.atoms.some(s=>!VAL[s]))fail('กฎในเครื่องรองรับ C, O และ F/Cl/Br/I แบบเป็นกลางเท่านั้น');
 const seenBond=new Set();
 for(const b of g.bonds){if(![1,2,3,4].includes(b.o)||b.a===b.b||b.a<0||b.b<0||b.a>=n||b.b>=n)fail('ข้อมูลพันธะไม่ถูกต้อง');
  const k=Math.min(b.a,b.b)+'-'+Math.max(b.a,b.b);if(seenBond.has(k))fail('ข้อมูลพันธะซ้ำ');seenBond.add(k)}
 const a=adjOf(g),seen=new Set(),stack=[0];
 while(stack.length){const i=stack.pop();if(seen.has(i))continue;seen.add(i);a[i].forEach(e=>stack.push(e.i))}
 if(seen.size!==n)fail('ยังไม่ตั้งชื่อสารหลายส่วนหรือสารผสมด้วยกฎในเครื่อง');
 a.forEach((es,i)=>{if(es.reduce((s,e)=>s+ord(e.o),0)>VAL[g.atoms[i]]+1e-9)fail('จำนวนพันธะเกินเวเลนซ์ของ '+g.atoms[i])});
 const cycles=g.bonds.length-n+1;
 if(cycles>1)fail('มีมากกว่าหนึ่งวง (เช่น วงเชื่อมกันหรือหลายวง) ยังไม่อยู่ในขอบเขตกฎในเครื่อง');
 let ring=null,arom=false;
 if(cycles===1){ring=ringOrder(g,a);
  if(ring.some(i=>g.atoms[i]!=='C'))fail('วงที่มีออกซิเจนอยู่ในวง (เฮเทอโรไซคลิก) ยังไม่รองรับ');
  if(ring.length<3||ring.length>8)fail('รองรับวงคาร์บอน 3–8 อะตอม');
  arom=isBenzene(a,ring);
  if(!arom&&ring.some((r,k)=>bondO(a,r,ring[(k+1)%ring.length])===3))fail('พันธะสามในวงยังไม่รองรับ')}
 const inRing=new Set(ring||[]);
 for(const b of g.bonds)if(b.o===4&&!(arom&&inRing.has(b.a)&&inRing.has(b.b)))fail('พันธะอะโรมาติกนอกวงเบนซีนยังไม่รองรับ');
 g.atoms.forEach((s,i)=>{if(s==='C')return;
  if(a[i].length!==1||g.atoms[a[i][0].i]!=='C')fail(s==='O'?'อีเทอร์ เอสเทอร์ หรือ O ที่ต่อกับหลายอะตอม ยังไม่อยู่ในขอบเขตกฎในเครื่อง':'แฮโลเจนต้องต่อกับคาร์บอนหนึ่งอะตอม');
  if(s!=='O'&&a[i][0].o!==1)fail('แฮโลเจนต้องต่อด้วยพันธะเดี่ยว')});
 return {a,ring,arom,inRing}}

/* classify each carbon: acid / al / one / ol */
function analyse(g){
 const V=validate(g),{a,inRing,arom}=V,site={};
 g.atoms.forEach((s,i)=>{if(s!=='C')return;
  const oh=a[i].filter(e=>g.atoms[e.i]==='O'&&e.o===1).length,oxo=a[i].filter(e=>g.atoms[e.i]==='O'&&e.o===2).length,
   cs=a[i].filter(e=>g.atoms[e.i]==='C').length,hal=a[i].some(e=>HALO[g.atoms[e.i]]);
  if(oh>1||oxo>1)fail('คาร์บอนเดียวมี -OH หรือ =O หลายหมู่ ยังไม่รองรับ');
  if(oxo&&hal)fail('แอซิลแฮไลด์ยังไม่อยู่ในขอบเขตกฎในเครื่อง');
  if(oxo&&oh){if(inRing.has(i)||cs>1)fail('หมู่ -COOH ต้องอยู่ปลายโซ่');site[i]='acid'}
  else if(oxo){if(inRing.has(i)&&arom)fail('C=O บนวงเบนซีนไม่ถูกต้อง');site[i]=!inRing.has(i)&&cs<=1?'al':'one'}
  else if(oh)site[i]='ol'});
 return {...V,site,P:RANK.find(t=>Object.values(site).includes(t))||null}}

/* ---------- canonical key (exact for trees + one ring) ---------- */
function key(g){
 const {a,ring,arom,inRing}=validate(g);
 const sym=(x,y,o)=>arom&&inRing.has(x)&&inRing.has(y)?'a':String(o);
 const tree=(adj,i,p,mark)=>g.atoms[i]+(mark.has(i)?'*':'')+'('+adj[i].filter(e=>e.i!==p).map(e=>e.s+tree(adj,e.i,i,mark)).sort().join(',')+')';
 const best=(adj,mark)=>g.atoms.map((_,i)=>tree(adj,i,-1,mark)).sort()[0];
 const full=a.map((es,i)=>es.map(e=>({i:e.i,s:sym(i,e.i,e.o)})));
 if(!ring)return best(full,new Set());
 const out=[];
 ring.forEach((x,k)=>{const y=ring[(k+1)%ring.length],cut=full.map((es,i)=>es.filter(e=>!((i===x&&e.i===y)||(i===y&&e.i===x))));
  out.push(sym(x,y,bondO(a,x,y))+'|'+best(cut,new Set([x,y])))});
 return 'ring'+ring.length+':'+out.sort()[0]}

function formula(g){
 const {a}=validate(g),c={};
 g.atoms.forEach((s,i)=>{c[s]=(c[s]||0)+1;c.H=(c.H||0)+VAL[s]-Math.round(a[i].reduce((t,e)=>t+ord(e.o),0))});
 return ['C','H',...Object.keys(c).filter(k=>k!=='C'&&k!=='H').sort()].filter(k=>c[k]).map(k=>k+(c[k]>1?c[k]:'')).join('')}

/* ---------- 2D layout for JME ---------- */
function toJme(g){
 const {a,ring,arom,inRing}=validate(g),xy=new Map(),L=1.4;
 function grow(i,theta,flip){
  const ns=a[i].filter(e=>!xy.has(e.i));
  ns.forEach((e,k)=>{const t=ns.length===1?theta+(flip?.5:-.5):theta+(k-(ns.length-1)/2)*1.05,[x,y]=xy.get(i);
   xy.set(e.i,[x+L*Math.cos(t),y+L*Math.sin(t)]);grow(e.i,t,!flip)})}
 if(ring){const n=ring.length,R=L/(2*Math.sin(Math.PI/n));
  ring.forEach((r,k)=>{const t=Math.PI/2+2*Math.PI*k/n;xy.set(r,[R*Math.cos(t),R*Math.sin(t)])});
  ring.forEach((r,k)=>{const t=Math.PI/2+2*Math.PI*k/n;a[r].filter(e=>!xy.has(e.i)).forEach((e,j,ns)=>{const tt=t+(j-(ns.length-1)/2)*.9,[x,y]=xy.get(r);
   xy.set(e.i,[x+L*Math.cos(tt),y+L*Math.sin(tt)]);grow(e.i,tt,k%2===0)})})}
 else{ // longest path as a zigzag backbone, branches pointing away from it
  const far=(s)=>{const d=new Map([[s,[s]]]),q=[s];while(q.length){const i=q.shift();for(const e of a[i])if(!d.has(e.i)){d.set(e.i,[...d.get(i),e.i]);q.push(e.i)}}return [...d.values()].sort((x,y)=>y.length-x.length)[0]};
  const back=far(far(0).at(-1));
  back.forEach((i,k)=>xy.set(i,[1.25*k,k%2?.72:0]));
  back.forEach((i,k)=>{const up=k%2===1;a[i].filter(e=>!xy.has(e.i)).forEach((e,j,ns)=>{const base=up?Math.PI/2:-Math.PI/2,t=base+(j-(ns.length-1)/2)*1.1,[x,y]=xy.get(i);
   xy.set(e.i,[x+L*Math.cos(t),y+L*Math.sin(t)]);grow(e.i,t,up)})})}
 const kek=new Map();if(arom)ring.forEach((r,k)=>kek.set([r,ring[(k+1)%6]].sort((p,q)=>p-q).join('-'),k%2?1:2));
 const bo=b=>b.o===4?kek.get([b.a,b.b].sort((p,q)=>p-q).join('-')):b.o;
 return [g.atoms.length,g.bonds.length,...g.atoms.flatMap((s,i)=>[s,...xy.get(i).map(v=>v.toFixed(3))]),...g.bonds.flatMap(b=>[b.a+1,b.b+1,bo(b)])].join(' ')}

/* ---------- MOL file (from the JSME editor) ---------- */
function molGraph(mol){
 if(!mol.includes('V2000')||/M {2}(CHG|ISO|RAD)/.test(mol))fail('กฎในเครื่องยังไม่รองรับประจุ ไอโซโทป อนุมูล หรือ MOL V3000');
 const lines=mol.replace(/\r/g,'').split('\n'),k=lines.findIndex(x=>x.includes('V2000')),na=+lines[k].slice(0,3),nb=+lines[k].slice(3,6);
 if(!Number.isInteger(na)||!Number.isInteger(nb)||na<1||na>60)fail('อ่านจำนวนอะตอมไม่ได้หรือเกินขอบเขต');
 const atoms=[],bonds=[];
 for(let i=0;i<na;i++){const l=lines[k+1+i]||'';if(+l.slice(34,36)||+l.slice(36,39)||+l.slice(39,42)||+l.slice(42,45)||+l.slice(48,51))fail('พบประจุ ไอโซโทป หรือ stereochemistry: กฎพื้นฐานจะไม่ละข้อมูลนี้');atoms.push(l.slice(31,34).trim())}
 for(let i=0;i<nb;i++){const l=lines[k+1+na+i]||'',a=+l.slice(0,3)-1,b=+l.slice(3,6)-1,o=+l.slice(6,9);if(+l.slice(9,12))fail('พบพันธะแสดง stereochemistry ซึ่งกฎในเครื่องยังไม่รองรับ');bonds.push({a,b,o})}
 const g={atoms,bonds};validate(g);return g}

/* ---------- graph → name ---------- */
function prefixText(entries,omit){
 // entries: {pos, text, complex}; identical substituents are grouped (di/tri or bis/tris) and sorted alphabetically
 const groups=new Map();for(const e of entries){const k=(e.complex?'(':'')+e.text;if(!groups.has(k))groups.set(k,{...e,locs:[]});groups.get(k).locs.push(e.pos)}
 const list=[...groups.values()].map(gr=>{gr.locs.sort((x,y)=>x-y);const n=gr.locs.length;
  const body=gr.complex?(n>1?MULTX[n]:'')+'('+gr.text+')':(n>1?MULT[n]:'')+gr.text;
  return {alpha:gr.text.replace(/[^a-z]/g,''),locs:gr.locs,body}}).sort((x,y)=>x.alpha.localeCompare(y.alpha)||lex(x.locs,y.locs));
 return list.map(x=>(omit?'':x.locs.join(',')+'-')+x.body).join(omit?'':'-').replace(/^-/,'')}
function citedLocs(entries){return [...entries].sort((x,y)=>x.text.replace(/[^a-z]/g,'').localeCompare(y.text.replace(/[^a-z]/g,''))||x.pos-y.pos).map(e=>e.pos)}

function nameGraph(g){
 const A=analyse(g),{a,ring,arom,inRing,site,P}=A,isC=i=>g.atoms[i]==='C';
 // a substituent group hanging from `start` (its bond partner `from` is outside it)
 function branch(start,from,isSuffix){
  const s=g.atoms[start],o=bondO(a,from,start);
  if(s==='O')return isSuffix(start)?null:{text:o===2?'oxo':'hydroxy',complex:false};
  if(HALO[s])return {text:HALO[s],complex:false};
  if(o!==1)fail('หมู่แทนที่ที่ต่อด้วยพันธะคู่หรือพันธะสาม (เช่น methylidene) ยังไม่รองรับ');
  if(isSuffix(start))return null;
  return inRing.has(start)?ringSub(start,from):chainSub(start,from)}
 function entriesOn(atoms,parentSet,isSuffix){ // prefixes on each parent atom (index in `atoms`)
  const out=[];atoms.forEach((x,k)=>a[x].forEach(e=>{if(parentSet.has(e.i))return;const b=branch(e.i,x,isSuffix);if(b)out.push({k,...b})}));return out}
 function chainSub(start,from){
  if(site[start]==='acid'){if(a[start].filter(e=>isC(e.i)).length>1)fail('หมู่ -COOH ไม่อยู่ปลายโซ่');return {text:'carboxy',complex:false}}
  const paths=[];(function walk(i,path){const next=[...path,i];paths.push(next);
   for(const e of a[i])if(e.i!==from&&!next.includes(e.i)&&isC(e.i)&&!inRing.has(e.i)&&site[e.i]!=='acid')walk(e.i,next)})(start,[]);
  const scored=paths.map(p=>{const set=new Set([from,...p]),mb=p.slice(1).map((x,k)=>bondO(a,p[k],x)).filter(o=>o>1).length;
   return {p,mb,ents:null,set,nb:p.reduce((t,x)=>t+a[x].filter(e=>!set.has(e.i)).length,0)}});
  scored.sort((x,y)=>y.p.length-x.p.length||y.mb-x.mb||y.nb-x.nb);
  const top=scored.filter(c=>c.p.length===scored[0].p.length&&c.mb===scored[0].mb&&c.nb===scored[0].nb);
  for(const c of top){c.ents=entriesOn(c.p,c.set,()=>false).map(e=>({pos:e.k+1,text:e.text,complex:e.complex}));
   c.mbl=c.p.slice(1).map((x,k)=>bondO(a,c.p[k],x)>1?k+1:0).filter(Boolean)}
  top.sort((x,y)=>lex(x.mbl,y.mbl)||lex(x.ents.map(e=>e.pos).sort((p,q)=>p-q),y.ents.map(e=>e.pos).sort((p,q)=>p-q))||lex(citedLocs(x.ents),citedLocs(y.ents)));
  const c=top[0],N=c.p.length;
  if(N>20)fail('หมู่แทนที่ยาวเกิน 20 คาร์บอน');
  if(N===1&&c.ents.length===1&&c.ents[0].text==='oxo')return {text:'formyl',complex:false};
  const enes=[],ynes=[];c.p.slice(1).forEach((x,k)=>{const o=bondO(a,c.p[k],x);if(o===2)enes.push(k+1);if(o===3)ynes.push(k+1)});
  let core=STEMS[N];
  if(enes.length||ynes.length){const multi=enes.length>1||ynes.length>1,part=(l,w)=>l.length?(N===2?'':'-'+l.join(',')+'-')+(l.length>1?MULT[l.length]:'')+w:'';
   core+=(multi?'a':'')+part(enes,'en')+part(ynes,'yn')}
  const pre=prefixText(c.ents,N===1);
  return {text:pre+core+'yl',complex:!!c.ents.length||/\d/.test(core)}}
 function ringSub(start,from){
  const n=ring.length,k0=ring.indexOf(start),set=new Set([from,...ring]);
  if(!arom&&ring.some((r,k)=>bondO(a,r,ring[(k+1)%n])>1))fail('วงที่มีพันธะคู่ในฐานะหมู่แทนที่ (เช่น cyclohexenyl) ยังไม่รองรับ');
  let best=null;
  for(const d of [1,-1]){const order=[...Array(n)].map((_,k)=>ring[((k0+d*k)%n+n)%n]),ents=entriesOn(order,set,()=>false).map(e=>({pos:e.k+1,text:e.text,complex:e.complex}));
   const c={ents,locs:ents.map(e=>e.pos).sort((p,q)=>p-q)};
   if(!best||lex(c.locs,best.locs)<0||(!lex(c.locs,best.locs)&&lex(citedLocs(c.ents),citedLocs(best.ents))<0))best=c}
  const base=arom?'phenyl':'cyclo'+STEMS[n]+'yl';
  return {text:prefixText(best.ents,false)+base,complex:!!best.ents.length}}

 /* parent candidates */
 const cands=[];
 if(ring){let sites=0;ring.forEach(r=>{if(site[r]===P&&(P==='one'||P==='ol'))sites++;a[r].forEach(e=>{if(!inRing.has(e.i)&&(P==='acid'||P==='al')&&site[e.i]===P)sites++})});
  const mbs=arom?[]:ring.map((r,k)=>bondO(a,r,ring[(k+1)%ring.length])).filter(o=>o>1);
  cands.push({kind:'ring',atoms:ring,sites,mb:mbs.length,dbl:mbs.filter(o=>o===2).length,len:ring.length})}
 const acyc=g.atoms.map((s,i)=>i).filter(i=>isC(i)&&!inRing.has(i));
 for(const s of acyc)(function walk(i,path){const p=[...path,i];
   if(p[0]<=i){const mbl=p.slice(1).map((x,k)=>bondO(a,p[k],x)).filter(o=>o>1);
    cands.push({kind:'chain',atoms:p,sites:p.filter(x=>site[x]===P&&(!['acid','al'].includes(P)||x===p[0]||x===p.at(-1))).length,mb:mbl.length,dbl:mbl.filter(o=>o===2).length,len:p.length})}
   for(const e of a[i])if(isC(e.i)&&!inRing.has(e.i)&&!p.includes(e.i))walk(e.i,p)})(s,[]);
 const parentSet=c=>new Set(c.atoms);
 // exocyclic -COOH / -CHO carbons that become a ring suffix (carboxylic acid / carbaldehyde)
 const exo=c=>c.kind==='ring'&&(P==='acid'||P==='al')?new Set(ring.flatMap(r=>a[r].filter(e=>!inRing.has(e.i)&&site[e.i]===P).map(e=>e.i))):new Set();
 const branchCount=c=>{const set=parentSet(c),ex=exo(c);return c.atoms.reduce((t,x)=>t+a[x].filter(e=>!set.has(e.i)&&!ex.has(e.i)&&!(g.atoms[e.i]==='O'&&site[x]===P)).length,0)};
 cands.forEach(c=>{c.nb=branchCount(c)});
 cands.sort((x,y)=>y.sites-x.sites||(x.kind==='ring'?-1:0)-(y.kind==='ring'?-1:0)||y.mb-x.mb||y.len-x.len||y.dbl-x.dbl||y.nb-x.nb);
 const t0=cands[0],tier=cands.filter(c=>c.sites===t0.sites&&c.kind===t0.kind&&c.mb===t0.mb&&c.len===t0.len&&c.dbl===t0.dbl&&c.nb===t0.nb);
 if(t0.kind==='chain'&&t0.len>20)fail('โซ่หลักยาวเกิน 20 คาร์บอน');

 // number each candidate and keep the best numbering
 function numberings(c){const n=c.atoms.length,out=[];
  if(c.kind==='chain'){out.push(c.atoms);if(n>1)out.push([...c.atoms].reverse())}
  else for(let s=0;s<n;s++)for(const d of [1,-1])out.push([...Array(n)].map((_,k)=>c.atoms[((s+d*k)%n+n)%n]));
  return out}
 function profile(c,order){
  const n=order.length,set=parentSet(c),ex=exo(c),pos=new Map(order.map((x,k)=>[x,k+1]));
  const isSuffix=atom=>{ // O of the principal group on a parent atom, or the exocyclic suffix carbon
   if(ex.has(atom))return true;
   if(g.atoms[atom]==='O'){const host=a[atom][0].i;return set.has(host)&&site[host]===P&&(c.kind==='ring'||!['acid','al'].includes(P)||pos.get(host)===1||pos.get(host)===n)}
   return false};
  const principal=[];order.forEach((x,k)=>{if(c.kind==='ring'){if(['one','ol'].includes(P)&&site[x]===P)principal.push(k+1);if(a[x].some(e=>ex.has(e.i)))principal.push(k+1)}
   else if(site[x]===P&&(!['acid','al'].includes(P)||k===0||k===n-1))principal.push(k+1)});
  const enes=[],ynes=[];
  if(!(c.kind==='ring'&&arom))for(let k=0;k<(c.kind==='ring'?n:n-1);k++){const o=bondO(a,order[k],order[(k+1)%n]);if(o===2||o===3)(o===2?enes:ynes).push(k===n-1?n:k+1)}
  const ents=entriesOn(order,set,isSuffix).map(e=>({pos:e.k+1,text:e.text,complex:e.complex}));
  // the acid/aldehyde end of a chain is C1 (the second end too, for a di-acid)
  return {order,principal:principal.sort((x,y)=>x-y),enes:enes.sort((x,y)=>x-y),ynes:ynes.sort((x,y)=>x-y),ents,
   mbl:[...enes,...ynes].sort((x,y)=>x-y),pl:ents.map(e=>e.pos).sort((x,y)=>x-y),cl:citedLocs(ents)}}
 const cmp=(x,y)=>lex(x.principal,y.principal)||lex(x.mbl,y.mbl)||lex(x.enes,y.enes)||lex(x.pl,y.pl)||lex(x.cl,y.cl);
 let best=null,bestC=null;
 for(const c of tier)for(const order of numberings(c)){const p=profile(c,order);if(!best||cmp(p,best)<0){best=p;bestC=c}}
 const c=bestC,p=best,N=c.atoms.length;

 /* assemble */
 const m=p.principal.length,isBz=c.kind==='ring'&&arom;
 const locItems=p.ents.length+(['ol','one'].includes(P)||(c.kind==='ring'&&P)?m:0)+(isBz?0:p.enes.length+p.ynes.length);
 function build(omitAll){
  const L=l=>omitAll?'':'-'+l.join(',')+'-';
  const pre=prefixText(p.ents,omitAll);
  if(isBz){
   if(!P)return pre+'benzene';
   const one={ol:'phenol',acid:'benzoic acid',al:'benzaldehyde'}[P],many={ol:'ol',acid:'carboxylic acid',al:'carbaldehyde'}[P];
   return pre+(m===1?one:'benzene'+(omitAll?'':L(p.principal))+MULT[m]+many)}
  const stem=(c.kind==='ring'?'cyclo':'')+STEMS[N];
  let core;
  if(!p.enes.length&&!p.ynes.length)core=stem+'an';
  else{const multi=p.enes.length>1||p.ynes.length>1,short=omitAll||(c.kind==='chain'&&N===2);
   const part=(l,w)=>l.length?(short?'':'-'+l.join(',')+'-')+(l.length>1?MULT[l.length]:'')+w:'';
   core=stem+(multi?'a':'')+part(p.enes,'en')+part(p.ynes,'yn')}
  if(!P)return pre+core+'e';
  if(c.kind==='ring'&&(P==='acid'||P==='al'))return pre+core+'e'+(omitAll?'':L(p.principal))+(m>1?MULT[m]:'')+(P==='acid'?'carboxylic acid':'carbaldehyde');
  if(P==='acid')return pre+core+(m>1?'edioic acid':'oic acid');
  if(P==='al')return pre+core+(m>1?'edial':'al');
  const suf=P==='ol'?'ol':'one';
  if(m>1)return pre+core+'e'+L(p.principal)+MULT[m]+suf;
  return pre+core+(omitAll||(c.kind==='chain'&&N<=2&&P==='ol')?'':L(p.principal))+suf}
 // locants are left out only where the name stays unambiguous; the round trip decides
 const tries=[];
 if(c.kind==='ring'&&locItems<=1)tries.push(build(true));
 if(c.kind==='chain'&&N===1)tries.push(build(true));
 if(c.kind==='chain'&&N===2&&p.ents.length+(['ol','one'].includes(P)?m:0)<=1)tries.push(build(true));
 tries.push(build(false));
 const want=key(g);let name=null;
 for(const t of tries){try{if(key(parse(t))===want){name=t;break}}catch(e){}}
 if(!name)fail('ตรวจย้อนกลับแล้วโครงสร้างไม่ตรง จึงไม่แสดงชื่อที่ยังยืนยันไม่ได้');

 const parentTh=isBz?'วงเบนซีน':c.kind==='ring'?`วง ${N} คาร์บอน (cyclo${STEMS[N]}…)`:`โซ่เปิด ${N} คาร์บอน (${STEMS[N]}…)`;
 const why=c.kind==='ring'?'วงมีหมู่หลักเท่ากับหรือมากกว่าโซ่ จึงใช้วงเป็นโครงสร้างหลัก':'เลือกโซ่ที่มีหมู่หลักมากที่สุด → มีพันธะคู่/สามมากที่สุด → ยาวที่สุด → มีหมู่แทนที่มากที่สุด';
 const subsTh=p.ents.length?p.ents.map(e=>e.pos+'-'+(e.complex?'('+e.text+')':e.text)).join(', '):'ไม่มี';
 return {name,formula:formula(g),jme:toJme(g),roundTrip:true,steps:[
  `อ่านกราฟ: ${g.atoms.length} อะตอมที่แสดง และ ${g.bonds.length} พันธะ`,
  `หมู่หลัก (ลำดับ: กรด > แอลดีไฮด์ > คีโตน > แอลกอฮอล์): ${P?GROUP_TH[P]+(m>1?` ${m} หมู่`:''):'ไม่มี (ไฮโดรคาร์บอน/แฮโลเจน)'}`,
  `โครงสร้างหลัก: ${parentTh} · ${why}`,
  `พันธะไม่อิ่มตัวในโครงสร้างหลัก: ${isBz?'วงเบนซีน (ไม่ต้องระบุตำแหน่ง)':[...p.enes.map(l=>l+' (คู่)'),...p.ynes.map(l=>l+' (สาม)')].join(', ')||'ไม่มี'}`,
  `หมู่แทนที่: ${subsTh}${p.ents.some(e=>e.complex)?' · หมู่ที่มีกิ่งย่อยนับคาร์บอนที่ต่อกับโครงสร้างหลักเป็นตำแหน่ง 1 แล้วเขียนในวงเล็บ':''}`,
  'นับตำแหน่ง: หมู่หลักได้เลขต่ำสุด → พันธะคู่/สาม → หมู่แทนที่ทั้งหมด → หมู่ที่ขึ้นก่อนตามตัวอักษร',
  `ประกอบชื่อ: ${name}`,
  'แปลงชื่อกลับเป็นกราฟ: ชนิดอะตอมและลำดับพันธะตรงกันทุกตำแหน่ง']}}

/* ---------- name → graph ---------- */
const ALIASES={'2-propanol':'propan-2-ol','1-propanol':'propan-1-ol',propanol:null,butanol:null,propanone:'propan-2-one',acetone:'propan-2-one',butanone:'butan-2-one',
 'acetic acid':'ethanoic acid','formic acid':'methanoic acid',formaldehyde:'methanal',acetaldehyde:'ethanal',chloroform:'trichloromethane',
 'ethylene glycol':'ethane-1,2-diol',glycerol:'propane-1,2,3-triol','oxalic acid':'ethanedioic acid',toluene:'methylbenzene',
 'o-xylene':'1,2-dimethylbenzene','m-xylene':'1,3-dimethylbenzene','p-xylene':'1,4-dimethylbenzene',xylene:null,styrene:'ethenylbenzene',
 benzenol:'phenol','benzenecarboxylic acid':'benzoic acid',cumene:'(1-methylethyl)benzene',ethylene:'ethene',acetylene:'ethyne',propylene:'propene'};
const COMMON_SUB={'tert-butyl':'(1,1-dimethylethyl)','t-butyl':'(1,1-dimethylethyl)','sec-butyl':'(1-methylpropyl)',isobutyl:'(2-methylpropyl)',isopropyl:'(1-methylethyl)',benzyl:'(phenylmethyl)',vinyl:'ethenyl',allyl:'(prop-2-enyl)'};
const locsOf=s=>s?s.split(',').map(Number):null;
const multN=w=>w?MULT.indexOf(w):1;

// split "3-ethyl-2,2-dimethyl" / "4-(1-methylethyl)" / "chloro(phenyl)" into [{locs, mult, sub}]
function parsePrefixes(str){
 const out=[];let i=0,locs=null;
 while(i<str.length){
  if(str[i]==='-'){i++;continue}
  const lm=str.slice(i).match(/^(\d+(?:,\d+)*)-/);
  if(lm){locs=locsOf(lm[1]);i+=lm[0].length;continue}
  const rest=str.slice(i);let m;
  if((m=rest.match(/^(bis|tris|tetrakis|pentakis|hexakis)?\(/))){
   let depth=0,j=m[0].length-1;for(;j<rest.length;j++){if(rest[j]==='(')depth++;if(rest[j]===')'&&--depth===0)break}
   if(depth)fail('วงเล็บไม่ครบคู่');
   const inner=rest.slice(m[0].length,j);out.push({locs,mult:m[1]?MULTX.indexOf(m[1]):1,sub:parseSub(inner)});locs=null;i+=j+1;continue}
  let hit=null;
  for(const w of ['',...MULT.slice(2)]){if(!rest.startsWith(w))continue;const r2=rest.slice(w.length),s=simpleSub(r2);if(s&&(!hit||s.len+w.length>hit.len)){hit={len:s.len+w.length,mult:w?MULT.indexOf(w):1,sub:s.sub};if(!w)break}}
  if(!hit)fail('อ่านหมู่แทนที่ "'+rest.split('-')[0]+'" ไม่ได้');
  out.push({locs,mult:hit.mult,sub:hit.sub});locs=null;i+=hit.len}
 if(locs)fail('ตำแหน่งไม่มีชื่อหมู่ตามหลัง');
 for(const e of out)if(e.locs&&e.locs.length!==e.mult)fail('จำนวนตำแหน่งไม่ตรงกับ di/tri หรือ bis/tris');
 return out}
function simpleSub(r){ // the longest simple substituent name at the start of r
 const names=[['fluoro',{x:'F'}],['chloro',{x:'Cl'}],['bromo',{x:'Br'}],['iodo',{x:'I'}],['hydroxy',{x:'OH'}],['oxo',{x:'=O'}],['formyl',{x:'CHO'}],['carboxy',{x:'COOH'}],['phenyl',{kind:'ring',N:6,arom:true,enes:[],ynes:[],subs:[]}]];
 let best=null;for(const [w,sub]of names)if(r.startsWith(w)&&(!best||w.length>best.len))best={len:w.length,sub};
 const m=r.match(new RegExp('^(cyclo)?'+STEM_RE+'(en|yn)?yl'));
 if(m&&(!best||m[0].length>best.len)){const N=STEMS.indexOf(m[2]);best={len:m[0].length,sub:{kind:m[1]?'ring':'chain',N,arom:false,enes:m[3]==='en'?[1]:[],ynes:m[3]==='yn'?[1]:[],subs:[]}}}
 return best}
function parseSub(text){ // "1-methylethyl", "2-chloroethyl", "4-methylphenyl", "prop-2-enyl"
 let m=text.match(/^(.*?)phenyl$/);
 if(m){const subs=parsePrefixes(m[1]);if(subs.some(x=>!x.locs))fail('ต้องระบุตำแหน่งบนวงของ "'+text+'"');return {kind:'ring',N:6,arom:true,enes:[],ynes:[],subs}}
 if(text==='formyl'||text==='carboxy')return simpleSub(text).sub;
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
 let s=String(input).toLowerCase().trim().replace(/[–−‐]/g,'-').replace(/\s+/g,' ');
 if(!s||s.length>200)fail('กรอกชื่อไม่เกิน 200 ตัวอักษร');
 if(/\b(cis|trans)\b|\[|\]|\((?:[ezrs]|\d+[ezrs](?:,\d+[ezrs])*)\)/.test(s))fail('ชื่อที่ระบุ stereochemistry (cis/trans, E/Z, R/S) ยังไม่อยู่ในขอบเขตกฎพื้นฐาน');
 if(Object.hasOwn(ALIASES,s)){if(!ALIASES[s])fail('ชื่อกำกวม ต้องระบุตำแหน่ง เช่น propan-1-ol หรือ 1,2-dimethylbenzene');s=ALIASES[s]}
 s=s.replace(/tert-butyl|t-butyl|sec-butyl|isobutyl|isopropyl|benzyl|vinyl|allyl/g,w=>COMMON_SUB[w]);
 s=s.replace(/^([omp])-(di|bis)?/,(w,l,d)=>({o:'1,2-',m:'1,3-',p:'1,4-'}[l])+(d||''));
 // parent
 let P=null,par=null,pre='';
 const bz=[[/benzene-([\d,]+)-(di|tri|tetra|penta|hexa)ol$/,'ol'],[/phenol$/,'ol'],[/benzene-([\d,]+)-(di|tri|tetra)carboxylic acid$/,'acid'],[/benzoic acid$/,'acid'],
  [/benzene-([\d,]+)-(di|tri|tetra)carbaldehyde$/,'al'],[/benzaldehyde$/,'al'],[/benzene$/,null]];
 for(const [re,t]of bz){const m=s.match(re);if(!m)continue;
  pre=s.slice(0,m.index);P=t;par={kind:'ring',N:6,arom:true,enes:[],ynes:[],principal:t?(m[1]?locsOf(m[1]):[1]):[]};
  if(m[2]&&par.principal.length!==multN(m[2]))fail('จำนวนตำแหน่งไม่ตรงกับ di/tri');break}
 if(!par){
  const re=new RegExp('^(.*?)(cyclo)?'+STEM_RE+'(a)?(an|en|yn|(?:-\\d+(?:,\\d+)*-(?:di|tri|tetra)?en)?(?:-\\d+(?:,\\d+)*-(?:di|tri|tetra)?yn)?)'+
   '(e|e?(?:-(\\d+(?:,\\d+)*)-)?(di|tri|tetra)?(carboxylic acid|carbaldehyde)|(e?)(di)?oic acid|(e?)(di)?al|e?(?:-(\\d+(?:,\\d+)*)-)?(di|tri|tetra|penta|hexa)?(ol|one))$');
  const m=s.match(re);
  if(!m)fail('ชื่อนี้ยังไม่อยู่ในไวยากรณ์ที่รองรับ: ดูขอบเขตกฎด้านล่าง');
  if(!m[5])fail('ชื่อโครงสร้างหลักไม่ครบ (ต้องมี an / en / yn)');
  if(m[4]&&!/(di|tri|tetra)(en|yn)/.test(m[5]))fail('ใช้ "a" หลังชื่อโซ่เฉพาะเมื่อมีพันธะคู่/สามหลายตำแหน่ง เช่น buta-1,3-diene');
  pre=m[1];const isRing=!!m[2],N=STEMS.indexOf(m[3]),u=unsat(m[5],N,isRing);
  par={kind:isRing?'ring':'chain',N,arom:false,...u,principal:[]};
  if(m[9]){P=m[9]==='carboxylic acid'?'acid':'al';if(!isRing)fail(m[9]+' ใช้กับวงเท่านั้น สำหรับโซ่ใช้ -oic acid หรือ -al');
   const n=multN(m[8]);par.principal=m[7]?locsOf(m[7]):(n===1?[1]:fail('ต้องระบุตำแหน่งหมู่'));if(par.principal.length!==n)fail('จำนวนตำแหน่งไม่ตรงกับ di/tri')}
  else if(m[6].endsWith('oic acid')){P='acid';if(isRing)fail('วงใช้ -carboxylic acid');par.principal=m[11]?[1,N]:[1]}
  else if(/al$/.test(m[6])){P='al';if(isRing)fail('วงใช้ -carbaldehyde');par.principal=m[13]?[1,N]:[1]}
  else if(m[16]){P=m[16];const n=multN(m[15]);
   if(m[14])par.principal=locsOf(m[14]);
   else if(n===1&&(isRing||N<=2))par.principal=[1];
   else if(n===1&&P==='one'&&(N===3||N===4))par.principal=[2];
   else fail('ต้องระบุตำแหน่งของหมู่ -'+P+' เช่น propan-2-ol');
   if(par.principal.length!==n)fail('จำนวนตำแหน่งไม่ตรงกับ di/tri')}
  if(par.N<1||par.N>20)fail('ความยาวโซ่ไม่รองรับ');
  if(isRing&&(N<3||N>8))fail('รองรับวงคาร์บอน 3–8 อะตอม')}
 const prefixes=parsePrefixes(pre);
 // missing locants: only where the position is unique
 const free=prefixes.filter(x=>!x.locs);
 if(free.length){
  const n=par.N,taken=par.principal;
  if(par.kind==='chain'&&n===1)free.forEach(x=>x.locs=Array(x.mult).fill(1));
  else if(par.kind==='chain'&&n===2){const pos=P&&taken.includes(1)&&!taken.includes(2)?2:1;free.forEach(x=>x.locs=Array(x.mult).fill(pos))}
  else if(par.kind==='ring'&&prefixes.length===1&&free[0].mult===1&&!(P&&taken.length)&&!par.enes.length)free[0].locs=[1];
  else fail('ต้องระบุตำแหน่งหมู่แทนที่ เช่น 2-methyl');
 }
 return buildGraph(par,P,prefixes)}

function buildGraph(par,P,prefixes){
 const g={atoms:[],bonds:[]},add=(s,to,o=1)=>{const i=g.atoms.push(s)-1;if(to!=null)g.bonds.push({a:to,b:i,o});return i};
 const parent=mkSkeleton(g,add,par,null);
 const at=k=>{if(k<1||k>par.N)fail('ตำแหน่ง '+k+' อยู่นอกโครงสร้างหลัก ('+par.N+' คาร์บอน)');return parent[k-1]};
 for(const k of par.principal){const c=at(k);
  if(P==='ol')add('O',c);
  else if(P==='one')add('O',c,2);
  else if(P==='al'){if(par.kind==='ring'){const x=add('C',c);add('O',x,2)}else add('O',c,2)}
  else if(P==='acid'){if(par.kind==='ring'){const x=add('C',c);add('O',x,2);add('O',x)}else{add('O',c,2);add('O',c)}}}
 attachAll(g,add,parent,prefixes,par.N);
 validate(g);
 if(P==='one')for(const k of par.principal){const c=parent[k-1];if(g.bonds.filter(b=>(b.a===c||b.b===c)&&g.atoms[b.a===c?b.b:b.a]==='C').length<2)fail('คีโตนต้องอยู่ระหว่างคาร์บอน 2 อะตอม (C=O ที่ปลายโซ่คือแอลดีไฮด์ ใช้ -al)')}
 return g}
function mkSkeleton(g,add,d,attachTo){
 const ids=[];for(let k=0;k<d.N;k++)ids.push(add('C',k===0?attachTo:null));
 const n=d.N;
 for(let k=0;k<(d.kind==='ring'?n:n-1);k++){if(d.kind==='ring'&&n<3)break;
  let o=1;if(d.arom)o=k%2?1:2;else{if(d.enes.includes(k+1))o=2;if(d.ynes.includes(k+1))o=3}
  g.bonds.push({a:ids[k],b:ids[(k+1)%n],o})}
 for(const l of [...d.enes,...d.ynes])if(l<1||l>(d.kind==='ring'?n:n-1))fail('ตำแหน่งพันธะคู่หรือพันธะสาม '+l+' อยู่นอกโครงสร้าง');
 return ids}
function attachAll(g,add,parent,prefixes,N){
 for(const pr of prefixes)for(const k of pr.locs){if(k<1||k>N)fail('ตำแหน่ง '+k+' อยู่นอกโครงสร้าง ('+N+' คาร์บอน)');attach(g,add,parent[k-1],pr.sub)}}
function attach(g,add,at,sub){
 if(sub.x){const x=sub.x;
  if(x==='OH')return add('O',at);if(x==='=O')return add('O',at,2);
  if(x==='CHO'){const c=add('C',at);return add('O',c,2)}
  if(x==='COOH'){const c=add('C',at);add('O',c,2);return add('O',c)}
  return add(x,at)}
 const ids=mkSkeleton(g,add,sub,at);
 attachAll(g,add,ids,sub.subs,sub.N)}

function fromName(name){const g=parse(name),r=nameGraph(g);return {...r,jme:toJme(g)}}
const api={parse,molGraph,nameGraph,fromName,key,toJme,formula};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChemNameRules=api;
})(typeof window!=='undefined'?window:globalThis);
