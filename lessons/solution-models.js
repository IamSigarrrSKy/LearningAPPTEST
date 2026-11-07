/* Pure idealised teaching models, also used by the numerical checks. */
(function(root){'use strict';
const Kw=1e-14,Ka=1.8e-5;
function ph({acid=0,sodium=0,chloride=0,ka=Ka}={}){let lo=-16,hi=1;for(let i=0;i<110;i++){const mid=(lo+hi)/2,h=10**mid,f=h+sodium-Kw/h-chloride-acid*ka/(ka+h);if(f>0)hi=mid;else lo=mid}const h=10**((lo+hi)/2);return {pH:-Math.log10(h),h,oh:Kw/h,alpha:ka/(ka+h)}}
function solution(kind,c){return ph(kind==='weak'?{acid:c}:kind==='base'?{sodium:c}:{chloride:c})}
function titrate(kind,ca,va,cb,vb){const vol=va+vb;return ph({acid:kind==='weak'?ca*va/vol:0,chloride:kind==='strong'?ca*va/vol:0,sodium:cb*vb/vol})}
function dynamic(t,catalyst=1,a0=.9){const kf=.3*catalyst,kr=.15*catalyst,aeq=kr/(kf+kr),a=aeq+(a0-aeq)*Math.exp(-(kf+kr)*t);return {a,b:1-a,forward:kf*a,reverse:kr*(1-a),aeq}}
function equilibrium(na,nb,v,t,dh){const k=Math.exp(-dh/8.314462618*(1/t-1/300)),total=(na+2*nb)/v,a=2*total/(1+Math.sqrt(1+8*k*total)),b=(total-a)/2,q=(nb/v)/(na/v)**2;return {a,b,k,q,initialA:na/v,initialB:nb/v,direction:Math.abs(q-k)<1e-9?'สมดุล':q<k?'ไปข้างหน้า':'ย้อนกลับ'}}
const api={Kw,Ka,ph,solution,titrate,dynamic,equilibrium};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ChemModels=api;
})(typeof window!=='undefined'?window:globalThis);
