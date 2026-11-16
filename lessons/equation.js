/* ChemLab chemical equation writer: type an equation in plain text, get it balanced and typeset,
   then copy it out for exams (Word/Docs with real subscripts, Unicode text, LaTeX mhchem, plain).
   Balancing is exact: the element (and charge) matrix is reduced over rationals (BigInt), so the
   smallest whole-number coefficients come out without rounding. Nothing is sent anywhere. */
(function(root){'use strict';
const ELEMENTS='H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og D T'.split(' ');
const EL=new Set(ELEMENTS);
const SUB='₀₁₂₃₄₅₆₇₈₉',SUP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻'};
const fail=m=>{throw Error(m)};

/* ---------- reading the text ---------- */
function normalize(s){
 return String(s).replace(/[₀-₉]/g,c=>String(SUB.indexOf(c))).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/g,c=>'^'+Object.keys(SUP).find(k=>SUP[k]===c))
  .replace(/\^\^/g,'^').replace(/(\^\d*[+-])\^?(?=[+-])/g,'$1')
  .replace(/[−–—]/g,'-').replace(/[⟶➝➞→]/g,'->').replace(/[⇌⇄]/g,'<=>').replace(/\s+/g,' ').trim()}
// split the line into left side, arrow (with optional condition) and right side
function splitSides(s){
 const m=s.match(/\s*(<=>|<->|<-->|=>|-->|->|=)(?:\[([^\]]*)\])?\s*/);
 if(!m)fail('ไม่พบลูกศร ใช้ -> หรือ = (สมดุลใช้ <=>)');
 const left=s.slice(0,m.index),right=s.slice(m.index+m[0].length);
 if(/(<=>|<->|->|=>|=)/.test(right.replace(/\[[^\]]*\]/g,'')))fail('มีลูกศรมากกว่าหนึ่งตัว');
 if(!left.trim()||!right.trim())fail('ต้องมีสารทั้งสองข้างของลูกศร');
 return {left,right,arrow:/<=>|<->|<-->/.test(m[1])?'eq':'to',cond:(m[2]||'').trim()}}
// "+" between species: with spaces around it, or right before a new species (H2+O2); a "+" after a charge stays
function splitSpecies(side){
 const parts=[];let cur='';
 for(let i=0;i<side.length;i++){const c=side[i];
  if(c==='+'){const prev=side[i-1],next=side[i+1];
   const spaced=prev===' '&&next===' ';
   const startsNew=next&&/[A-Z(\[0-9]/.test(next)&&prev&&prev!=='^'&&prev!==' '&&!/[+-]/.test(prev)&&!/^\d+$/.test(cur.trim());
   if(spaced||startsNew||(prev===' '&&next&&/[A-Z(\[0-9e]/.test(next))){if(cur.trim())parts.push(cur.trim());cur='';continue}}
  cur+=c}
 if(cur.trim())parts.push(cur.trim());
 if(!parts.length)fail('อ่านสารไม่ได้');
 return parts}
function parseFormulaCounts(f){ // H2O, Ca(OH)2, [Fe(CN)6] → {H:2,O:1}
 let i=0;
 function group(){const counts={};
  while(i<f.length){const c=f[i];
   if(c==='('||c==='['){i++;const inner=group();if(f[i]!==')'&&f[i]!==']')fail('วงเล็บไม่ครบคู่ใน '+f);i++;const n=num();for(const k in inner)counts[k]=(counts[k]||0)+inner[k]*n}
   else if(c===')'||c===']')break;
   else if(/[A-Z]/.test(c)){let s=c;i++;if(i<f.length&&/[a-z]/.test(f[i])){s+=f[i];i++}if(!EL.has(s))fail('ไม่มีธาตุ "'+s+'" (ตัวพิมพ์ใหญ่-เล็กต้องถูก เช่น Co กับ CO ต่างกัน)');const n=num();counts[s]=(counts[s]||0)+n}
   else fail('อ่าน "'+c+'" ใน '+f+' ไม่ได้')}
  return counts}
 function num(){let s='';while(i<f.length&&/\d/.test(f[i]))s+=f[i++];return s?+s:1}
 const r=group();if(i!==f.length)fail('วงเล็บไม่ครบคู่ใน '+f);return r}
function parseSpecies(raw){
 let s=raw.trim(),coef=null,state='',charge=0;
 const cm=s.match(/^(\d+)\s*(?=[A-Z(\[e])/);if(cm){coef=+cm[1];s=s.slice(cm[0].length)}
 const sm=s.match(/\((s|l|g|aq)\)$/i);if(sm){state=sm[1].toLowerCase();s=s.slice(0,sm.index)}
 if(/^e(\^?-|⁻)?$/.test(s))return {raw,coef,state,formula:'e',parts:[],counts:{},charge:-1,electron:true};
 // charge: ^2+, ^-, or trailing 2+ / + / -  (Fe3+ means Fe³⁺)
 let ch=s.match(/\^(\d*)([+-])$/);
 if(!ch)ch=s.match(/(?<=[A-Za-z)\]])(\d*)([+-])$/);
 if(ch){charge=(ch[1]?+ch[1]:1)*(ch[2]==='+'?1:-1);s=s.slice(0,ch.index)}
 if(!s)fail('อ่านสาร "'+raw+'" ไม่ได้');
 // hydrates: CuSO4·5H2O, CuSO4*5H2O, CuSO4.5H2O
 const pieces=s.split(/[·•*.]/).map(p=>p.trim()).filter(Boolean),parts=[],counts={};
 pieces.forEach((p,k)=>{let n=1,f=p;const m=p.match(/^(\d+)(?=[A-Z(\[])/);if(m&&k>0){n=+m[1];f=p.slice(m[1].length)}
  const c=parseFormulaCounts(f);parts.push({n,f});for(const e in c)counts[e]=(counts[e]||0)+c[e]*n});
 return {raw,coef,state,formula:s,parts,counts,charge}}
function parse(text){
 const s=normalize(text);if(!s)fail('พิมพ์สมการก่อน');
 const sides=splitSides(s);
 return {...sides,lhs:splitSpecies(sides.left).map(parseSpecies),rhs:splitSpecies(sides.right).map(parseSpecies)}}

/* ---------- exact balancing over rationals ---------- */
const babs=x=>x<0n?-x:x,gcd=(a,b)=>{a=babs(a);b=babs(b);while(b){[a,b]=[b,a%b]}return a},lcm=(a,b)=>a/gcd(a,b)*b;
class Q{constructor(n,d=1n){if(d<0n){n=-n;d=-d}const g=gcd(n,d)||1n;this.n=n/g;this.d=d/g}
 add(o){return new Q(this.n*o.d+o.n*this.d,this.d*o.d)}sub(o){return new Q(this.n*o.d-o.n*this.d,this.d*o.d)}
 mul(o){return new Q(this.n*o.n,this.d*o.d)}div(o){return new Q(this.n*o.d,this.d*o.n)}zero(){return this.n===0n}}
function nullspace(M){ // returns basis vectors of {x : Mx = 0}
 const rows=M.length,cols=M[0].length,A=M.map(r=>r.map(v=>new Q(BigInt(v))));const piv=[];let r=0;
 for(let c=0;c<cols&&r<rows;c++){let p=r;while(p<rows&&A[p][c].zero())p++;if(p===rows)continue;[A[r],A[p]]=[A[p],A[r]];
  const pv=A[r][c];A[r]=A[r].map(v=>v.div(pv));for(let i=0;i<rows;i++)if(i!==r&&!A[i][c].zero()){const f=A[i][c];A[i]=A[i].map((v,j)=>v.sub(f.mul(A[r][j])))}piv.push(c);r++}
 const free=[...Array(cols).keys()].filter(c=>!piv.includes(c));
 return free.map(f=>{const x=Array(cols).fill(null).map(()=>new Q(0n));x[f]=new Q(1n);piv.forEach((c,i)=>{x[c]=new Q(0n).sub(A[i][f])});return x})}
function toIntegers(v){const L=v.reduce((a,q)=>lcm(a,q.d),1n);let ints=v.map(q=>q.n*(L/q.d));const g=ints.reduce((a,b)=>gcd(a,b),0n)||1n;ints=ints.map(x=>x/g);if(ints.some(x=>x<0n)&&ints.every(x=>x<=0n))ints=ints.map(x=>-x);return ints}
function balance(eq){
 const species=[...eq.lhs,...eq.rhs],nL=eq.lhs.length;
 const els=[...new Set(species.flatMap(s=>Object.keys(s.counts)))];
 const useCharge=species.some(s=>s.charge);
 const M=els.map(e=>species.map((s,j)=>(s.counts[e]||0)*(j<nL?1:-1)));
 if(useCharge)M.push(species.map((s,j)=>s.charge*(j<nL?1:-1)));
 // elements that appear on one side only can never balance
 for(const e of els){const l=eq.lhs.some(s=>s.counts[e]),r=eq.rhs.some(s=>s.counts[e]);if(l!==r)return {ok:false,why:`ธาตุ ${e} มีอยู่ข้าง${l?'ซ้าย':'ขวา'}เท่านั้น ตรวจสูตรหรือสารที่ขาดไป`,els}}
 const basis=nullspace(M);
 if(!basis.length)return {ok:false,why:'ดุลไม่ได้: ไม่มีชุดสัมประสิทธิ์ที่ทำให้อะตอม'+(useCharge?'และประจุ':'')+'เท่ากันทั้งสองข้าง ตรวจสูตรเคมีหรือสารที่ขาดไป',els};
 if(basis.length>1)return {ok:false,why:'สมการนี้ดุลได้หลายแบบ (เป็นปฏิกิริยาหลายอย่างรวมกัน) ใส่สัมประสิทธิ์บางตัวเองก่อน หรือแยกเป็นสมการย่อย',els,multi:true};
 const k=toIntegers(basis[0]);
 if(k.some(x=>x<=0n))return {ok:false,why:k.some(x=>x===0n)?'มีสารที่ไม่ได้เข้าร่วมปฏิกิริยา (สัมประสิทธิ์เป็น 0) ลองตัดสารนั้นออก':'มีสารอยู่ผิดข้าง (สัมประสิทธิ์ติดลบ) ลองย้ายสารนั้นไปอีกข้างของลูกศร',els};
 return {ok:true,coefs:k.map(Number),els,useCharge}}
function given(eq){const all=[...eq.lhs,...eq.rhs];return all.some(s=>s.coef!=null)?all.map(s=>s.coef??1):null}
function check(eq,coefs){ // atoms and charge per side for a coefficient list
 const species=[...eq.lhs,...eq.rhs],nL=eq.lhs.length,els=[...new Set(species.flatMap(s=>Object.keys(s.counts)))];
 const rows=els.map(e=>{let L=0,R=0;species.forEach((s,j)=>{const v=(s.counts[e]||0)*coefs[j];if(j<nL)L+=v;else R+=v});return {e,L,R}});
 if(species.some(s=>s.charge)){let L=0,R=0;species.forEach((s,j)=>{const v=s.charge*coefs[j];if(j<nL)L+=v;else R+=v});rows.push({e:'ประจุ',L,R})}
 return {rows,ok:rows.every(r=>r.L===r.R)}}

/* ---------- writing it out ---------- */
const subDigits=s=>s.replace(/\d/g,d=>SUB[+d]);
const chargeText=c=>c?(Math.abs(c)>1?String(Math.abs(c)):'')+(c>0?'+':'-'):'';
function speciesOut(s,coef,mode){
 const k=coef>1?String(coef):'',ch=chargeText(s.charge),st=s.state?`(${s.state})`:'';
 if(s.electron){
  if(mode==='html')return `${k}e<sup>−</sup>`;if(mode==='uni')return `${k}e⁻`;if(mode==='tex')return `${k}e-`;return `${k}e-`}
 const body=s.parts.map((p,i)=>{const n=p.n>1?String(p.n):'';
  if(mode==='html')return (i?'·':'')+n+p.f.replace(/(\d+)/g,'<sub>$1</sub>');
  if(mode==='uni')return (i?'·':'')+n+subDigits(p.f);
  if(mode==='tex')return (i?' * ':'')+n+p.f;
  return (i?'·':'')+n+p.f}).join('');
 if(mode==='html')return `${k}${body}${ch?`<sup>${ch.replace('-','−')}</sup>`:''}${st?`<span class="st">${st}</span>`:''}`;
 if(mode==='uni')return `${k}${body}${[...ch].map(c=>SUP[c]).join('')}${st}`;
 if(mode==='tex')return `${k}${body}${ch?'^{'+ch+'}':''}${st}`;
 return `${k}${body}${ch?'^'+ch:''}${st}`}
function write(eq,coefs,mode){
 const nL=eq.lhs.length,side=(list,off)=>list.map((s,i)=>speciesOut(s,coefs[off+i],mode)).join(' + ');
 const cond=eq.cond;let arrow;
 if(mode==='html')arrow=`<span class="arrow">${cond?`<small>${cond.replace(/[<>&]/g,'')}</small>`:''}<span>${eq.arrow==='eq'?'⇌':'⟶'}</span></span>`;
 else if(mode==='tex')arrow=(eq.arrow==='eq'?'<=>':'->')+(cond?`[${cond}]`:'');
 else if(mode==='uni')arrow=(eq.arrow==='eq'?'⇌':'→')+(cond?`(${cond})`:'');
 else arrow=(eq.arrow==='eq'?'<=>':'->')+(cond?`[${cond}]`:'');
 const text=`${side(eq.lhs,0)} ${arrow} ${side(eq.rhs,nL)}`;
 return mode==='tex'?`\\ce{${text}}`:text}
function wordHtml(eq,coefs){ // for Word/Google Docs: real <sub>/<sup>, arrow condition as a small superscript
 const nL=eq.lhs.length,side=(list,off)=>list.map((s,i)=>speciesOut(s,coefs[off+i],'html').replace(/<span class="st">/g,'<span>')).join(' + ');
 const arrow=(eq.arrow==='eq'?'⇌':'→')+(eq.cond?`<sup>${eq.cond.replace(/[<>&]/g,'')}</sup>`:'');
 return `<span style="font-family:'TH Sarabun New','Cambria Math',serif">${side(eq.lhs,0)} ${arrow} ${side(eq.rhs,nL)}</span>`}

function solve(text){
 const eq=parse(text),g=given(eq),b=balance(eq);
 const coefs=b.ok?b.coefs:(g||[...eq.lhs,...eq.rhs].map(()=>1));
 const typed=g?check(eq,g):null;
 return {eq,balanced:b,coefs,typed,
  html:write(eq,coefs,'html'),unicode:write(eq,coefs,'uni'),tex:write(eq,coefs,'tex'),plain:write(eq,coefs,'plain'),word:wordHtml(eq,coefs),
  table:check(eq,coefs)}}
const api={parse,balance,solve,check};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChemEquation=api;
})(typeof window!=='undefined'?window:globalThis);
