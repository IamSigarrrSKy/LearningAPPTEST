/* Ideal 2D depiction for skeletal structures, shared by the mouse board (JSME) and the pen board.
   layout(atoms, bonds, coords?) → [[x, y], …] with bond length 1:
   - rings become regular polygons; fused rings share an edge, spiro rings share an atom
   - chains zigzag at 120°, an atom with a triple bond or two double bonds stays straight (180°)
   - 3 neighbours spread at 120°, 4 neighbours as a cross, substituents on a ring point outward
   - cis/trans of every C=C drawn by the user is kept, and so is the drawing's rough orientation
   atoms: ['C', 'O', …]; bonds: [{a, b, o}] (o 1/2/3, 4 = aromatic); coords: optional current [[x, y]] */
(function(root){'use strict';
const TAU=Math.PI*2,DEG=Math.PI/180;
function adjOf(n,bonds){const a=[...Array(n)].map(()=>[]);bonds.forEach(b=>{a[b.a].push({i:b.b,o:Math.abs(b.o)});a[b.b].push({i:b.a,o:Math.abs(b.o)})});return a}

/* smallest rings: for each bond not in a BFS tree, the shortest path between its ends without it */
function smallRings(n,adj){
 const seen=new Array(n).fill(false),parent=new Array(n).fill(-1),extra=[];
 for(let s=0;s<n;s++){if(seen[s])continue;seen[s]=true;const q=[s];
  while(q.length){const u=q.shift();for(const e of adj[u]){if(!seen[e.i]){seen[e.i]=true;parent[e.i]=u;q.push(e.i)}else if(parent[u]!==e.i&&u<e.i)extra.push([u,e.i])}}}
 const rings=[],keys=new Set();
 for(const [u,v]of extra){const prev=new Map([[u,-1]]),q=[u];
  while(q.length){const x=q.shift();if(x===v)break;for(const e of adj[x]){if((x===u&&e.i===v)||prev.has(e.i))continue;prev.set(e.i,x);q.push(e.i)}}
  if(!prev.has(v))continue;const path=[];for(let x=v;x!==-1;x=prev.get(x))path.push(x);
  const k=[...path].sort((p,q)=>p-q).join(',');if(!keys.has(k)&&path.length<=12){keys.add(k);rings.push(path)}}
 return rings.sort((p,q)=>p.length-q.length)}

function layout(atoms,bonds,coords){
 const n=atoms.length;if(!n)return [];
 const adj=adjOf(n,bonds),pos=new Array(n).fill(null),rings=smallRings(n,adj),ringOf=[...Array(n)].map(()=>[]);
 rings.forEach((r,k)=>r.forEach(x=>ringOf[x].push(k)));
 const centre=new Map(); // ring index → its centre once placed
 const linear=i=>adj[i].some(e=>e.o===3)||adj[i].filter(e=>e.o===2).length>=2;
 const comp=[];{const seen=new Array(n).fill(false);for(let s=0;s<n;s++){if(seen[s])continue;const c=[],q=[s];seen[s]=true;while(q.length){const u=q.shift();c.push(u);for(const e of adj[u])if(!seen[e.i]){seen[e.i]=true;q.push(e.i)}}comp.push(c)}}
 let offsetX=0;const out=new Array(n);
 for(const c of comp){
  const inC=new Set(c);
  const turn=new Map(); // chain atom → +1 / -1 so the zigzag alternates
  const queue=[];
  function placeRing(k){
   const r=rings[k],m=r.length,R=1/(2*Math.sin(Math.PI/m)),done=r.filter(x=>pos[x]);
   if(done.length===0){r.forEach((x,j)=>{const t=Math.PI/2+TAU*j/m;pos[x]=[R*Math.cos(t),R*Math.sin(t)]});centre.set(k,[0,0])}
   else{
    // build on a placed edge (fused) or a placed atom (spiro), away from what is already there
    let j0=-1;for(let j=0;j<m;j++)if(pos[r[j]]&&pos[r[(j+1)%m]]){j0=j;break}
    if(j0>=0){const A=pos[r[j0]],B=pos[r[(j0+1)%m]],mx=(A[0]+B[0])/2,my=(A[1]+B[1])/2;
     const nb=ringOf[r[j0]].filter(q=>q!==k&&centre.has(q)).map(q=>centre.get(q))[0]||[mx-(B[1]-A[1]),my+(B[0]-A[0])];
     let nx=-(B[1]-A[1]),ny=B[0]-A[0];if(nx*(mx-nb[0])+ny*(my-nb[1])<0){nx=-nx;ny=-ny}const l=Math.hypot(nx,ny);
     const h=R*Math.cos(Math.PI/m),cx=mx+nx/l*h,cy=my+ny/l*h;centre.set(k,[cx,cy]);
     const a0=Math.atan2(A[1]-cy,A[0]-cx),a1=Math.atan2(B[1]-cy,B[0]-cx);let d=a1-a0;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;const s=d>0?1:-1;
     for(let j=0;j<m;j++){const x=r[(j0+j)%m];if(!pos[x]){const t=a0+s*TAU*j/m;pos[x]=[cx+R*Math.cos(t),cy+R*Math.sin(t)]}}}
    else{const x0=r.find(x=>pos[x]),j=r.indexOf(x0),P=pos[x0];
     const away=awayDir(x0);const cx=P[0]+R*Math.cos(away),cy=P[1]+R*Math.sin(away);centre.set(k,[cx,cy]);
     const a0=Math.atan2(P[1]-cy,P[0]-cx);for(let q=0;q<m;q++){const x=r[(j+q)%m];if(!pos[x]){const t=a0+TAU*q/m;pos[x]=[cx+R*Math.cos(t),cy+R*Math.sin(t)]}}}}
   r.forEach(x=>queue.push(x))}
  function awayDir(i){ // direction pointing away from placed neighbours (and ring centres)
   let dx=0,dy=0;for(const k of ringOf[i])if(centre.has(k)){const C=centre.get(k);dx+=pos[i][0]-C[0];dy+=pos[i][1]-C[1]}
   if(!dx&&!dy)for(const e of adj[i])if(pos[e.i]){dx+=pos[i][0]-pos[e.i][0];dy+=pos[i][1]-pos[e.i][1]}
   return dx||dy?Math.atan2(dy,dx):0}
  function placeRingSystemOf(x){for(const k of ringOf[x])if(!centre.has(k)){placeRing(k);for(const y of rings[k])placeRingSystemOf(y)}}
  // start: a ring if there is one, otherwise one end of the longest chain
  const ringStart=c.find(x=>ringOf[x].length);
  if(ringStart!=null)placeRingSystemOf(ringStart);
  else{const far=s=>{const d=new Map([[s,0]]),q=[s];let last=s;while(q.length){const u=q.shift();last=u;for(const e of adj[u])if(!d.has(e.i)){d.set(e.i,d.get(u)+1);q.push(e.i)}}return last};
   const s=far(far(c[0]));pos[s]=[0,0];turn.set(s,1);queue.push(s)}
  // grow outward
  const parentOf=new Map();
  while(queue.length){
   const i=queue.shift(),kids=adj[i].filter(e=>!pos[e.i]);if(!kids.length)continue;
   const placedNb=adj[i].filter(e=>pos[e.i]);
   // order children: biggest branch first so the main chain keeps the zigzag direction
   const size=new Map();const sub=(x,from)=>{let s=1;for(const e of adj[x])if(e.i!==from&&!pos[e.i]&&!ringOf[x].some(k=>rings[k].includes(e.i)))s+=sub(e.i,x);return s};
   kids.forEach(e=>size.set(e.i,ringOf[e.i].length?50:sub(e.i,i)));kids.sort((p,q)=>size.get(q.i)-size.get(q.i)||0);kids.sort((p,q)=>size.get(q.i)-size.get(p.i));
   let dirs=[];
   if(ringOf[i].length){const base=awayDir(i);dirs=kids.length===1?[base]:kids.length===2?[base-30*DEG,base+30*DEG]:kids.map((_,j)=>base+(j-(kids.length-1)/2)*40*DEG)}
   else if(placedNb.length===0){ // the chain start
    const t=turn.get(i)||1;dirs=kids.map((_,j)=>[-30*DEG*t,150*DEG,-90*DEG*t,90*DEG][j]??j*TAU/kids.length)}
   else{const p=placedNb[0].i,inDir=Math.atan2(pos[i][1]-pos[p][1],pos[i][0]-pos[p][0]),t=-(turn.get(p)||1),d=adj[i].length;
    turn.set(i,t);
    if(linear(i)&&kids.length===1)dirs=[inDir];
    else if(d===2)dirs=[inDir+60*DEG*t];
    else if(d===3)dirs=[inDir+60*DEG*t,inDir-60*DEG*t];
    else if(d===4)dirs=[inDir,inDir+90*DEG,inDir-90*DEG];
    else dirs=kids.map((_,j)=>inDir+Math.PI+TAU*(j+1)/(kids.length+1));
    if(placedNb.length>1){const base=awayDir(i);dirs=kids.map((_,j)=>base+(j-(kids.length-1)/2)*50*DEG)}}
   kids.forEach((e,j)=>{if(pos[e.i])return;const t=dirs[j]??dirs[dirs.length-1];
    pos[e.i]=[pos[i][0]+Math.cos(t),pos[i][1]+Math.sin(t)];parentOf.set(e.i,i);
    if(!turn.has(e.i)){const tp=turn.get(i)||1;turn.set(e.i,j===0?tp:-tp)}
    if(ringOf[e.i].length)placeRingSystemOf(e.i);queue.push(e.i)})}
  // untangle: mirror a branch across its attachment bond when that moves it away from other atoms (keeps E/Z)
  const bonded=new Set(bonds.map(b=>b.a+'-'+b.b).concat(bonds.map(b=>b.b+'-'+b.a)));
  const clash=()=>{let m=Infinity;for(let x=0;x<c.length;x++)for(let y=x+1;y<c.length;y++){const i=c[x],j=c[y];if(bonded.has(i+'-'+j))continue;m=Math.min(m,Math.hypot(pos[i][0]-pos[j][0],pos[i][1]-pos[j][1]))}return m};
  for(let pass=0;pass<3&&clash()<.85;pass++)for(const b of bonds){if(!inC.has(b.a)||Math.abs(b.o)!==1)continue;
   for(const [u,v]of [[b.a,b.b],[b.b,b.a]]){if(ringOf[u].some(k=>rings[k].includes(v)))continue;
    const side=new Set([v]),q=[v];while(q.length){const x=q.shift();for(const e of adj[x])if(e.i!==u&&!side.has(e.i)){side.add(e.i);q.push(e.i)}}
    if(side.has(u)||side.size>c.length/2+1)continue;
    const before=clash();if(before>=.85)break;const [ax,ay]=pos[u],[bx,by]=pos[v],dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy,save=new Map();
    for(const x of side){save.set(x,pos[x]);if(x===v)continue;const [px,py]=pos[x],t=((px-ax)*dx+(py-ay)*dy)/l2,fx=ax+t*dx,fy=ay+t*dy;pos[x]=[2*fx-px,2*fy-py]}
    if(clash()<=before+1e-9)for(const [x,p0]of save)pos[x]=p0}}
  // keep cis/trans as drawn
  if(coords)for(const b of bonds){if(Math.abs(b.o)!==2||!inC.has(b.a))continue;const A=b.a,B=b.b;
   if(ringOf[A].some(k=>rings[k].includes(B)))continue;
   const na=adj[A].find(e=>e.i!==B),nb=adj[B].find(e=>e.i!==A);if(!na||!nb)continue;
   const side=(P,Q,R)=>Math.sign((Q[0]-P[0])*(R[1]-P[1])-(Q[1]-P[1])*(R[0]-P[0]));
   const was=side(coords[A],coords[B],coords[na.i])===side(coords[A],coords[B],coords[nb.i]);
   const now=side(pos[A],pos[B],pos[na.i])===side(pos[A],pos[B],pos[nb.i]);
   if(was!==now){const far=new Set([B]),q=[B];while(q.length){const u=q.shift();for(const e of adj[u])if(e.i!==A&&!far.has(e.i)){far.add(e.i);q.push(e.i)}}
    if(far.has(A))continue;const [ax,ay]=pos[A],[bx,by]=pos[B],dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
    for(const u of far){if(u===B)continue;const [px,py]=pos[u],t=((px-ax)*dx+(py-ay)*dy)/l2,fx=ax+t*dx,fy=ay+t*dy;pos[u]=[2*fx-px,2*fy-py]}}}
  // match the user's orientation (rotation snapped to 30°, mirror if that fits better), then place components side by side
  let P=c.map(i=>pos[i]);const cx=P.reduce((s,p)=>s+p[0],0)/P.length,cy=P.reduce((s,p)=>s+p[1],0)/P.length;P=P.map(p=>[p[0]-cx,p[1]-cy]);
  if(coords&&c.length>1){const O0=c.map(i=>coords[i]),ox=O0.reduce((s,p)=>s+p[0],0)/O0.length,oy=O0.reduce((s,p)=>s+p[1],0)/O0.length,O=O0.map(p=>[p[0]-ox,p[1]-oy]);
   const fit=Q=>{let a=0,b=0;Q.forEach((p,k)=>{a+=p[0]*O[k][0]+p[1]*O[k][1];b+=p[0]*O[k][1]-p[1]*O[k][0]});const ang=Math.round(Math.atan2(b,a)/(30*DEG))*30*DEG;
    const R=Q.map(p=>[p[0]*Math.cos(ang)-p[1]*Math.sin(ang),p[0]*Math.sin(ang)+p[1]*Math.cos(ang)]);const sc=Math.sqrt(O.reduce((s,p)=>s+p[0]*p[0]+p[1]*p[1],0)/Math.max(1e-9,R.reduce((s,p)=>s+p[0]*p[0]+p[1]*p[1],0)));
    return {R,err:R.reduce((s,p,k)=>s+(p[0]*sc-O[k][0])**2+(p[1]*sc-O[k][1])**2,0)}};
   const A=fit(P),B=fit(P.map(p=>[p[0],-p[1]]));P=(B.err<A.err?B:A).R}
  const minX=Math.min(...P.map(p=>p[0])),maxX=Math.max(...P.map(p=>p[0]));
  c.forEach((i,k)=>{out[i]=[P[k][0]-minX+offsetX,P[k][1]]});offsetX+=maxX-minX+2}
 const mid=offsetX/2-1;return out.map(p=>[p[0]-mid,p[1]])}
const api={layout};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChemLayout2D=api;
})(typeof window!=='undefined'?window:globalThis);
