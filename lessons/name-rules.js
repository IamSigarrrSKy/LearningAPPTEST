/* Deliberately bounded, neutral nomenclature for teaching: open chains, plus one benzene ring with simple substituents.
   Never drop stereochemistry, charge, rings or unsupported groups silently. */
(function(root){'use strict';
const stems=['','meth','eth','prop','but','pent','hex','hept','oct','non','dec','undec','dodec'],halo={F:'fluoro',Cl:'chloro',Br:'bromo',I:'iodo'},multi={2:'di',3:'tri',4:'tetra',5:'penta',6:'hexa'},valence={C:4,O:2,F:1,Cl:1,Br:1,I:1};
const fail=m=>{throw Error(m)},adj=g=>g.atoms.map((_,i)=>g.bonds.filter(b=>b.a===i||b.b===i).map(b=>({i:b.a===i?b.b:b.a,o:b.o})));
function validate(g){if(!g.atoms.length||g.atoms.length>40)fail('รองรับโครงสร้างไม่เกิน 40 อะตอมในโหมดกฎพื้นฐาน');if(g.atoms.some(a=>!valence[a]))fail('กฎในเครื่องรองรับ C, O และ F/Cl/Br/I แบบเป็นกลางเท่านั้น');const a=adj(g),seen=new Set();function visit(i){if(seen.has(i))return;seen.add(i);a[i].forEach(e=>visit(e.i))}visit(0);if(seen.size!==g.atoms.length)fail('ยังไม่ตั้งชื่อสารหลายส่วนหรือสารผสมด้วยกฎในเครื่อง');if(g.bonds.length!==g.atoms.length-1)fail('วงแหวนอื่นนอกจากวงเบนซีนวงเดียวยังไม่อยู่ในขอบเขตกฎในเครื่อง');for(let i=0;i<a.length;i++){const sum=a[i].reduce((s,e)=>s+e.o,0);if(sum>valence[g.atoms[i]]||a[i].some(e=>![1,2,3].includes(e.o)))fail('จำนวนพันธะไม่ตรงเวเลนซ์ที่กฎพื้นฐานรองรับ')}return a}
function molGraph(mol){if(!mol.includes('V2000')||/M  (CHG|ISO|RAD)/.test(mol))fail('กฎในเครื่องยังไม่รองรับประจุ ไอโซโทป อนุมูล หรือ MOL V3000');const lines=mol.replace(/\r/g,'').split('\n'),k=lines.findIndex(x=>x.includes('V2000')),na=+lines[k].slice(0,3),nb=+lines[k].slice(3,6);if(!Number.isInteger(na)||!Number.isInteger(nb)||na<1||na>40)fail('อ่านจำนวนอะตอมไม่ได้หรือเกินขอบเขต');const atoms=[],bonds=[];for(let i=0;i<na;i++){const l=lines[k+1+i]||'';if(+l.slice(34,36)||+l.slice(36,39)||+l.slice(39,42)||+l.slice(42,45)||+l.slice(48,51))fail('พบประจุ ไอโซโทป หรือ stereochemistry: กฎพื้นฐานจะไม่ละข้อมูลนี้');atoms.push(l.slice(31,34).trim())}for(let i=0;i<nb;i++){const l=lines[k+1+na+i]||'',a=+l.slice(0,3)-1,b=+l.slice(3,6)-1,o=+l.slice(6,9);if(+l.slice(9,12))fail('พบพันธะแสดง stereochemistry ซึ่งกฎในเครื่องยังไม่รองรับ');if(a<0||b<0||a>=na||b>=na||a===b)fail('ข้อมูลพันธะไม่ถูกต้อง');bonds.push({a,b,o})}const g={atoms,bonds};if(!ringOf(g))validate(g);return g}
function key(g){const bz=benzeneInfo(g);if(bz)return benzeneKey(bz.subs);const a=validate(g);const walk=(i,p)=>g.atoms[i]+'('+a[i].filter(e=>e.i!==p).map(e=>e.o+walk(e.i,i)).sort().join(',')+')';return g.atoms.map((_,i)=>walk(i,-1)).sort()[0]}
function formula(g){if(ringOf(g))return benzeneFormula(g);const a=validate(g),counts={};g.atoms.forEach((s,i)=>{counts[s]=(counts[s]||0)+1;counts.H=(counts.H||0)+valence[s]-a[i].reduce((n,e)=>n+e.o,0)});return ['C','H',...Object.keys(counts).filter(k=>!['C','H'].includes(k)).sort()].filter(k=>counts[k]).map(k=>k+(counts[k]>1?counts[k]:'')).join('')}
function toJme(g){const bz=benzeneInfo(g);if(bz)return benzeneJme(g,bz);validate(g);const a=adj(g),xy=new Map(),used=new Set();function place(i,p,x,y,angle){xy.set(i,[x,y]);used.add(i);const ns=a[i].filter(e=>e.i!==p);ns.forEach((e,j)=>{const theta=angle+(ns.length===1?(i%2?.35:-.35):(j-(ns.length-1)/2)*1.4);place(e.i,i,x+1.4*Math.cos(theta),y+1.4*Math.sin(theta),theta)})}place(0,-1,0,0,0);return [g.atoms.length,g.bonds.length,...g.atoms.flatMap((s,i)=>[s,...xy.get(i).map(n=>n.toFixed(3))]),...g.bonds.flatMap(b=>[b.a+1,b.b+1,b.o])].join(' ')}
function parse(input){let name=input.toLowerCase().trim().replace(/[–−]/g,'-').replace(/\s+/g,' ');if(name.length>180||/[()\[\]]|\b(cis|trans)\b/.test(name))fail('ชื่อที่มีวงเล็บหรือ stereochemistry ยังไม่อยู่ในขอบเขตกฎพื้นฐาน');if(/(benzene|phenol|benzoic acid|benzaldehyde|toluene|xylene|benzenol|benzenecarboxylic acid)$/.test(name))return parseBenzene(name);const aliases={'2-propanol':'propan-2-ol','1-propanol':'propan-1-ol','propanol':null,'butanol':null,'propanone':'propan-2-one','ethene':'eth-1-ene','ethyne':'eth-1-yne','ethanol':'ethan-1-ol','methanol':'methan-1-ol'};if(Object.hasOwn(aliases,name)){if(!aliases[name])fail('ชื่อกำกวม ต้องระบุตำแหน่ง เช่น propan-1-ol หรือ propan-2-ol');name=aliases[name]}
let parent=null;for(let n=stems.length-1;n>=1;n--){const r=stems[n],patterns=[[r+'ane','alkane',0],[r+'anal','al',1],[r+'anoic acid','acid',1]];for(const [tail,type,pos]of patterns)if(name.endsWith(tail))parent={n,type,pos,prefix:name.slice(0,-tail.length)};const m=name.match(new RegExp(r+'(?:an-(\\d+)-(ol|one)|-(\\d+)-(ene|yne))$'));if(m)parent={n,type:m[2]||m[4],pos:+(m[1]||m[3]),prefix:name.slice(0,m.index)};if(parent && parent.prefix && !/(?:yl|fluoro|chloro|bromo|iodo)-?$/.test(parent.prefix))parent=null;if(parent)break}if(!parent)fail('ชื่อนี้ยังไม่อยู่ในไวยากรณ์ที่รองรับ: แอลเคน แอลคีน/แอลไคน์หนึ่งพันธะ แอลกอฮอล์ คีโตน แอลดีไฮด์ หรือกรดโมโนคาร์บอกซิลิกสายเปิด');
const {n,type,pos}=parent,g={atoms:Array(n).fill('C'),bonds:Array.from({length:n-1},(_,i)=>({a:i,b:i+1,o:1}))},add=(s,c,o=1)=>{const i=g.atoms.push(s)-1;g.bonds.push({a:c,b:i,o});return i};
if((type!=='alkane'&&pos<1)||pos>n||(type==='one'&&(pos<=1||pos>=n))||(['ene','yne'].includes(type)&&pos>=n))fail('ตำแหน่งหมู่ฟังก์ชันหรือพันธะอยู่นอกสายโซ่');
if(type==='ol')add('O',pos-1);if(type==='one'||type==='al')add('O',pos-1,2);if(type==='acid'){add('O',0,2);add('O',0)}if(type==='ene'||type==='yne')g.bonds[pos-1].o=type==='ene'?2:3;
let prefix=parent.prefix.replace(/-$/,'');while(prefix){const m=prefix.match(/^(\d+(?:,\d+)*)-(di|tri|tetra|penta|hexa)?(methyl|ethyl|propyl|butyl|fluoro|chloro|bromo|iodo)(?:-|$)/);if(!m)fail('หมู่แทนที่ซับซ้อนหรือรูปแบบชื่อยังไม่รองรับ');const positions=m[1].split(',').map(Number),count=m[2]?+Object.keys(multi).find(k=>multi[k]===m[2]):1;if(count!==positions.length)fail('จำนวนตำแหน่งไม่ตรงกับ di/tri หรือคำนำหน้าบอกจำนวน');for(const p of positions){if(p<1||p>n)fail('ตำแหน่งหมู่แทนที่อยู่นอกสายโซ่');const element=Object.keys(halo).find(k=>halo[k]===m[3]);if(element)add(element,p-1);else{const len=['methyl','ethyl','propyl','butyl'].indexOf(m[3])+1;let last=p-1;for(let j=0;j<len;j++)last=add('C',last)}}prefix=prefix.slice(m[0].length)}
validate(g);return g}
const lex=(a,b)=>{for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]??0)-(b[i]??0);if(d)return d}return 0};
function nameGraph(g){const bz=benzeneInfo(g);if(bz)return nameBenzeneGraph(g,bz);const a=validate(g),carbons=g.atoms.map((s,i)=>s==='C'?i:-1).filter(i=>i>=0);if(!carbons.length)fail('ต้องมีสายโซ่คาร์บอนสำหรับกฎการตั้งชื่อชุดนี้');const oxy=g.atoms.map((s,i)=>s==='O'?i:-1).filter(i=>i>=0);let type='alkane',anchor=-1;
if(oxy.length){if(oxy.some(i=>a[i].length!==1||g.atoms[a[i][0].i]!=='C'))fail('อีเทอร์ เอสเทอร์ เพอร์ออกไซด์ หรือหมู่ O ซับซ้อนยังไม่รองรับ');const attached=oxy.map(i=>a[i][0]);if(oxy.length===2&&attached[0].i===attached[1].i&&attached.map(x=>x.o).sort().join('')==='12'){type='acid';anchor=attached[0].i;if(a[anchor].filter(e=>g.atoms[e.i]==='C').length>1)fail('หมู่กรดคาร์บอกซิลิกไม่ถูกต้อง')}else if(oxy.length===1){anchor=attached[0].i;type=attached[0].o===1?'ol':attached[0].o===2?(a[anchor].filter(e=>g.atoms[e.i]==='C').length<2?'al':'one'):'unsupported';if(type==='unsupported')fail('รูปแบบพันธะ O ไม่รองรับ')}else fail('หลายหมู่ฟังก์ชันยังไม่อยู่ในขอบเขตกฎชุดนี้')}
const unsat=g.bonds.filter(b=>g.atoms[b.a]==='C'&&g.atoms[b.b]==='C'&&b.o>1);if(unsat.length){if(type!=='alkane'||unsat.length>1)fail('รุ่นนี้รองรับพันธะไม่อิ่มตัวหนึ่งตำแหน่ง และไม่มีหมู่ฟังก์ชันอื่นในโมเลกุลเดียวกัน');type=unsat[0].o===2?'ene':'yne'}
const ends=carbons.filter(i=>a[i].filter(e=>g.atoms[e.i]==='C').length<=1),paths=[];function walk(i,p,path){const next=[...path,i],neighbors=a[i].filter(e=>g.atoms[e.i]==='C'&&e.i!==p);if(!neighbors.length){if(anchor<0||next.includes(anchor))paths.push(next);return}neighbors.forEach(e=>walk(e.i,i,next))}ends.forEach(i=>walk(i,-1,[]));
if(Math.max(...paths.map(p=>p.length))>12)fail('สายโซ่หลักยาวเกิน 12 คาร์บอน กฎชุดนี้จะไม่เลือกสายที่สั้นกว่ามาแทน');const candidates=[];for(const chain of paths){if(chain.length>12)continue;if(['acid','al'].includes(type)&&chain[0]!==anchor)continue;if(unsat.length&&!(chain.includes(unsat[0].a)&&chain.includes(unsat[0].b)&&Math.abs(chain.indexOf(unsat[0].a)-chain.indexOf(unsat[0].b))===1))continue;const inChain=new Set(chain),subs=[];let supported=true;for(let k=0;k<chain.length;k++){for(const e of a[chain[k]]){if(inChain.has(e.i)||g.atoms[e.i]==='O')continue;if(e.o!==1){supported=false;continue}if(halo[g.atoms[e.i]]){subs.push({pos:k+1,name:halo[g.atoms[e.i]]});continue}let count=0,last=chain[k],current=e.i;while(true){count++;const next=a[current].filter(t=>t.i!==last);if(next.some(t=>g.atoms[t.i]!=='C'||t.o!==1)||next.length>1){supported=false;break}if(!next.length)break;last=current;current=next[0].i}if(count>4){supported=false;break}subs.push({pos:k+1,name:['','methyl','ethyl','propyl','butyl'][count]})}}
const pos=unsat.length?Math.min(chain.indexOf(unsat[0].a),chain.indexOf(unsat[0].b))+1:anchor>=0?chain.indexOf(anchor)+1:0;const ordered=[...subs].sort((x,y)=>x.name.localeCompare(y.name)||x.pos-y.pos);candidates.push({chain,subs,ordered,pos,supported})}
if(!candidates.length)fail('สายโซ่หลักเกิน 12 คาร์บอนหรือเลือกสายโซ่ไม่ได้');candidates.sort((x,y)=>y.chain.length-x.chain.length||x.pos-y.pos||y.subs.length-x.subs.length||lex(x.subs.map(s=>s.pos).sort((a,b)=>a-b),y.subs.map(s=>s.pos).sort((a,b)=>a-b))||lex(x.ordered.map(s=>s.pos),y.ordered.map(s=>s.pos)));const c=candidates[0];if(!c.supported)fail('หมู่แทนที่แตกกิ่งหรือหมู่แทนที่ซับซ้อนยังไม่อยู่ในขอบเขต');
const r=stems[c.chain.length];let parent=type==='alkane'?r+'ane':type==='acid'?r+'anoic acid':type==='al'?r+'anal':['ene','yne'].includes(type)?(c.chain.length===2?r+type:r+'-'+c.pos+'-'+type):type==='ol'&&c.chain.length<=2?r+'anol':r+'an-'+c.pos+'-'+type;
const groups={};for(const s of c.ordered)(groups[s.name]??=[]).push(s.pos);const prefix=Object.entries(groups).map(([name,positions])=>{if(positions.length>6)fail('หมู่แทนที่ซ้ำเกิน 6 ยังไม่รองรับ');return positions.join(',')+'-'+(positions.length>1?multi[positions.length]:'')+name}).join('-');const name=prefix+parent,back=parse(name);if(key(g)!==key(back))fail('ตรวจย้อนกลับแล้วโครงสร้างไม่ตรง จึงไม่แสดงชื่อที่ยังยืนยันไม่ได้');
return {name,formula:formula(g),jme:toJme(g),roundTrip:true,steps:[`อ่านกราฟ: ${g.atoms.length} อะตอมที่แสดง และ ${g.bonds.length} พันธะ`, `หมู่หลัก: ${{alkane:'แอลเคน',ene:'แอลคีน',yne:'แอลไคน์',ol:'แอลกอฮอล์',one:'คีโตน',al:'แอลดีไฮด์',acid:'กรดคาร์บอกซิลิก'}[type]}`,`สายโซ่หลัก ${c.chain.length} คาร์บอน${c.pos?` / ตำแหน่งหลัก ${c.pos}`:''}`,`หมู่แทนที่: ${c.ordered.map(s=>s.pos+'-'+s.name).join(', ')||'ไม่มี'}`,`ประกอบชื่อ: ${name}`,'แปลงชื่อกลับเป็นกราฟ: ชนิดอะตอมและลำดับพันธะตรงกัน (ขอบเขตไม่มี stereo/ประจุ)']}}
/* ---- one benzene ring with simple substituents (ม.6 aromatic naming) ----
   Ring: exactly one cycle of 6 C, Kekulé (alternating 1/2) or aromatic (4) bonds. Substituents: halogen,
   straight alkyl C1–C4, and at most one principal group (-COOH benzoic acid, -CHO benzaldehyde, -OH phenol). */
const ALKYL=['','methyl','ethyl','propyl','butyl'];
function ringOf(g){
 if(!g.atoms.length||g.bonds.length!==g.atoms.length)return null;
 const a=adj(g),alive=new Set(g.atoms.map((_,i)=>i));let pruned=true;
 while(pruned){pruned=false;for(const i of [...alive])if(a[i].filter(e=>alive.has(e.i)).length<=1){alive.delete(i);pruned=true}}
 if(alive.size!==6)return null;const start=[...alive][0],order=[start];let prev=-1,cur=start;
 for(let k=0;k<5;k++){const nx=a[cur].find(e=>alive.has(e.i)&&e.i!==prev&&!order.includes(e.i));if(!nx)return null;prev=cur;cur=nx.i;order.push(cur)}
 if(order.some(i=>g.atoms[i]!=='C'))return null;
 const bo=order.map((x,k)=>(a[x].find(e=>e.i===order[(k+1)%6])||{}).o);
 const kekule=bo.every((o,k)=>o===bo[k%2])&&[bo[0],bo[1]].sort().join()==='1,2';
 return bo.every(o=>o===4)||kekule?order:null}
function benzeneInfo(g){
 const ring=ringOf(g);if(!ring)return null;
 if(g.atoms.length>40)fail('รองรับโครงสร้างไม่เกิน 40 อะตอมในโหมดกฎพื้นฐาน');
 if(g.atoms.some(s=>!valence[s]))fail('กฎในเครื่องรองรับ C, O และ F/Cl/Br/I แบบเป็นกลางเท่านั้น');
 const a=adj(g),seen=new Set();(function visit(i){if(seen.has(i))return;seen.add(i);a[i].forEach(e=>visit(e.i))})(0);
 if(seen.size!==g.atoms.length)fail('ยังไม่ตั้งชื่อสารหลายส่วนหรือสารผสมด้วยกฎในเครื่อง');
 a.forEach((es,i)=>{if(es.reduce((s,e)=>s+(e.o===4?1.5:e.o),0)>valence[g.atoms[i]])fail('จำนวนพันธะไม่ตรงเวเลนซ์ที่กฎพื้นฐานรองรับ')});
 const inRing=new Set(ring);
 const subs=ring.map(r=>{const out=a[r].filter(e=>!inRing.has(e.i));if(!out.length)return null;
  if(out.length>1||out[0].o!==1)fail('คาร์บอนในวงเบนซีนมีหมู่แทนที่ได้ตำแหน่งละหนึ่งหมู่ ด้วยพันธะเดี่ยว');
  const s=out[0].i,el=g.atoms[s],rest=a[s].filter(e=>e.i!==r);
  if(halo[el])return {name:halo[el],label:el};
  if(el==='O'){if(rest.length)fail('อีเทอร์หรือเอสเทอร์บนวงเบนซีนยังไม่อยู่ในขอบเขตกฎ');return {label:'OH',main:'phenol',group:'-OH (ฟีนอล)'}}
  const os=rest.filter(e=>g.atoms[e.i]==='O');
  if(os.length){if(rest.length!==os.length||os.some(e=>a[e.i].length!==1))fail('หมู่บนวงเบนซีนแบบนี้ยังไม่รองรับ');
   const ords=os.map(e=>e.o).sort().join();
   if(ords==='1,2')return {label:'COOH',main:'benzoic acid',group:'-COOH (กรดเบนโซอิก)'};
   if(ords==='2')return {label:'CHO',main:'benzaldehyde',group:'-CHO (เบนซาลดีไฮด์)'};
   fail('หมู่ที่มี O บนวงเบนซีนแบบนี้ยังไม่รองรับ')}
  let count=0,last=r,c=s;
  while(true){count++;const nx=a[c].filter(e=>e.i!==last);if(nx.some(e=>g.atoms[e.i]!=='C'||e.o!==1)||nx.length>1)fail('หมู่แทนที่บนวงที่แตกกิ่ง ไม่อิ่มตัว หรือมีหมู่ฟังก์ชันในสายยังไม่รองรับ');if(!nx.length)break;last=c;c=nx[0].i}
  if(count>4)fail('หมู่อัลคิลบนวงยาวเกิน 4 คาร์บอนยังไม่รองรับ');
  return {name:ALKYL[count],label:'C'+count}});
 return {ring,subs}}
const NUMBERINGS=[];for(let st=0;st<6;st++)for(const d of [1,-1])NUMBERINGS.push(k=>((st+d*k)%6+6)%6);
function benzeneKey(subs){return 'benzene:'+NUMBERINGS.map(f=>[0,1,2,3,4,5].map(k=>(subs[f(k)]||{}).label||'H').join('.')).sort()[0]}
function benzeneName(subs){
 const mains=subs.filter(s=>s&&s.main);if(mains.length>1)fail('มีหมู่ฟังก์ชันหลักบนวงมากกว่าหนึ่งหมู่ ยังไม่อยู่ในขอบเขตกฎชุดนี้');
 const main=mains[0],any=subs.some(Boolean),cands=[];
 for(const f of NUMBERINGS){const seq=[0,1,2,3,4,5].map(k=>subs[f(k)]);
  if(main?seq[0]!==main:any&&!seq[0])continue;
  const pre=seq.map((s,k)=>s&&!s.main?{pos:k+1,name:s.name}:null).filter(Boolean);
  cands.push({seq,pre,ordered:[...pre].sort((x,y)=>x.name.localeCompare(y.name)||x.pos-y.pos)})}
 cands.sort((x,y)=>lex(x.pre.map(s=>s.pos),y.pre.map(s=>s.pos))||lex(x.ordered.map(s=>s.pos),y.ordered.map(s=>s.pos)));
 const c=cands[0],parent=main?main.main:'benzene';let name;
 if(!c.pre.length)name=parent;
 else if(!main&&c.pre.length===1)name=c.pre[0].name+'benzene';
 else{const groups={};for(const s of c.ordered)(groups[s.name]??=[]).push(s.pos);
  name=Object.entries(groups).map(([n,p])=>p.join(',')+'-'+(p.length>1?multi[p.length]:'')+n).join('-')+parent}
 return {name,c,main}}
function parseBenzene(name){
 const common={'toluene':'methylbenzene','o-xylene':'1,2-dimethylbenzene','m-xylene':'1,3-dimethylbenzene','p-xylene':'1,4-dimethylbenzene','xylene':null,'benzenol':'phenol','benzenecarboxylic acid':'benzoic acid'};
 if(Object.hasOwn(common,name)){if(!common[name])fail('ชื่อกำกวม ต้องระบุตำแหน่ง เช่น 1,2-dimethylbenzene');name=common[name]}
 name=name.replace(/^([omp])-(di|bis)?/,(m,l,di)=>({o:'1,2-',m:'1,3-',p:'1,4-'}[l])+(di||''));
 const parents=[['benzoic acid','COOH'],['benzaldehyde','CHO'],['phenol','OH'],['benzene',null]],hit=parents.find(([t])=>name.endsWith(t));
 if(!hit)fail('ชื่อนี้ยังไม่อยู่ในไวยากรณ์ที่รองรับ');
 const [tail,main]=hit,places=Array(6).fill(null);let prefix=name.slice(0,-tail.length).replace(/-$/,'');
 if(main)places[0]=main;
 const single=prefix.match(/^(methyl|ethyl|propyl|butyl|fluoro|chloro|bromo|iodo)$/);
 if(single&&!main){places[0]=single[1];prefix=''}
 if(single&&main)fail('ระบุตำแหน่งหมู่แทนที่ด้วย เช่น 2-'+single[1]+tail);
 while(prefix){const m=prefix.match(/^(\d(?:,\d)*)-(di|tri|tetra|penta|hexa)?(methyl|ethyl|propyl|butyl|fluoro|chloro|bromo|iodo)(?:-|$)/);
  if(!m)fail('หมู่แทนที่หรือรูปแบบชื่อบนวงเบนซีนยังไม่รองรับ');
  const ps=m[1].split(',').map(Number),count=m[2]?+Object.keys(multi).find(k=>multi[k]===m[2]):1;
  if(count!==ps.length)fail('จำนวนตำแหน่งไม่ตรงกับ di/tri หรือคำนำหน้าบอกจำนวน');
  for(const p of ps){if(p<1||p>6)fail('ตำแหน่งบนวงเบนซีนต้องอยู่ระหว่าง 1 ถึง 6');if(places[p-1])fail(main&&p===1?'ตำแหน่ง 1 เป็นของหมู่หลักของ '+tail:'ตำแหน่ง '+p+' ซ้ำกัน');places[p-1]=m[3]}
  prefix=prefix.slice(m[0].length)}
 const g={atoms:Array(6).fill('C'),bonds:[0,1,2,3,4,5].map(i=>({a:i,b:(i+1)%6,o:i%2?1:2}))},add=(s,c,o=1)=>{const i=g.atoms.push(s)-1;g.bonds.push({a:c,b:i,o});return i};
 places.forEach((s,r)=>{if(!s)return;
  if(s==='OH')add('O',r);
  else if(s==='COOH'){const c=add('C',r);add('O',c,2);add('O',c)}
  else if(s==='CHO'){const c=add('C',r);add('O',c,2)}
  else{const el=Object.keys(halo).find(k=>halo[k]===s);if(el)add(el,r);else{let last=r;for(let j=0;j<ALKYL.indexOf(s);j++)last=add('C',last)}}});
 return g}
function benzeneJme(g,info){
 const a=adj(g),xy=new Map(),inRing=new Set(info.ring);
 info.ring.forEach((r,k)=>{const t=Math.PI/2+k*Math.PI/3;xy.set(r,[1.4*Math.cos(t),1.4*Math.sin(t)])});
 function place(i,p,theta){a[i].filter(e=>e.i!==p&&!xy.has(e.i)).forEach((e,j,ns)=>{const t=theta+(ns.length===1?(i%2?.5:-.5):(j-(ns.length-1)/2)*1.2),[x,y]=xy.get(i);xy.set(e.i,[x+1.4*Math.cos(t),y+1.4*Math.sin(t)]);place(e.i,i,t)})}
 info.ring.forEach((r,k)=>{const t=Math.PI/2+k*Math.PI/3;a[r].filter(e=>!inRing.has(e.i)).forEach(e=>{const [x,y]=xy.get(r);xy.set(e.i,[x+1.4*Math.cos(t),y+1.4*Math.sin(t)]);place(e.i,r,t)})});
 const ringBond=new Map(info.ring.map((r,k)=>[[r,info.ring[(k+1)%6]].sort((p,q)=>p-q).join('-'),k%2?1:2]));
 const order=b=>b.o===4||ringBond.has([b.a,b.b].sort((p,q)=>p-q).join('-'))?(ringBond.get([b.a,b.b].sort((p,q)=>p-q).join('-'))||b.o):b.o;
 return [g.atoms.length,g.bonds.length,...g.atoms.flatMap((s,i)=>[s,...xy.get(i).map(n=>n.toFixed(3))]),...g.bonds.flatMap(b=>[b.a+1,b.b+1,order(b)])].join(' ')}
function benzeneFormula(g){const a=adj(g),counts={};g.atoms.forEach((s,i)=>{counts[s]=(counts[s]||0)+1;counts.H=(counts.H||0)+valence[s]-Math.round(a[i].reduce((n,e)=>n+(e.o===4?1.5:e.o),0))});return ['C','H',...Object.keys(counts).filter(k=>!['C','H'].includes(k)).sort()].filter(k=>counts[k]).map(k=>k+(counts[k]>1?counts[k]:'')).join('')}
function nameBenzeneGraph(g,info){
 const {name,c,main}=benzeneName(info.subs),back=parseBenzene(name),binfo=benzeneInfo(back);
 if(!binfo||benzeneKey(binfo.subs)!==benzeneKey(info.subs))fail('ตรวจย้อนกลับแล้วโครงสร้างไม่ตรง จึงไม่แสดงชื่อที่ยังยืนยันไม่ได้');
 return {name,formula:benzeneFormula(g),jme:benzeneJme(g,info),roundTrip:true,steps:[
  `อ่านกราฟ: ${g.atoms.length} อะตอมที่แสดง และ ${g.bonds.length} พันธะ`,
  'พบวงเบนซีน: คาร์บอน 6 อะตอมต่อกันเป็นวง พันธะเดี่ยวสลับพันธะคู่',
  `หมู่หลัก: ${main?main.group+' อยู่ที่ตำแหน่ง 1':'ไม่มี ใช้ชื่อหลัก benzene'}`,
  `หมู่แทนที่: ${c.ordered.map(s=>s.pos+'-'+s.name).join(', ')||'ไม่มี'}`,
  c.pre.length>1||main&&c.pre.length?'นับตำแหน่งรอบวงให้ได้ชุดตัวเลขต่ำสุด ถ้าเท่ากันให้หมู่ที่เรียงตามตัวอักษรก่อนได้เลขต่ำกว่า':'หมู่แทนที่หมู่เดียวบนเบนซีนไม่ต้องใส่ตัวเลขตำแหน่ง',
  `ประกอบชื่อ: ${name}`,'แปลงชื่อกลับเป็นกราฟ: หมู่บนวงและตำแหน่งตรงกัน']}}
function fromName(name){const g=parse(name),result=nameGraph(g);return {...result,jme:benzeneInfo(g)?result.jme:toJme(g)}}
const api={parse,molGraph,nameGraph,fromName,key,toJme,formula};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChemNameRules=api;
})(typeof window!=='undefined'?window:globalThis);
