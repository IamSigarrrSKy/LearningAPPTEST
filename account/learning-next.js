/* ChemLab: remediation and private account integration. */
(() => {
  const originalRender = renderResult;
  renderResult = function(rec) {
    originalRender(rec);
    const root=document.querySelector('#resultWrap');
    const actions=root.querySelector('.actions');
    const report=document.createElement('button');report.className='btn ghost';report.textContent='ดาวน์โหลดรายงานให้ครูตรวจ';
    report.onclick=()=>{
      const rows=Object.entries(rec.per).map(([id,a],i)=>{const q=QBY[id];return {number:i+1,id:+id,question:q.text,topic:TOPICS[q.topic]?.name,correct:a.c,answer:q.type==='mc'?q.choices[a.choice]?.t:a.value,confidence:a.conf,systemSuggestion:a.err?ERR[a.err]?.name:null,teacherReview:!a.c,reason:a.why||'',steps:q.steps};});
      const blob=new Blob([JSON.stringify({student:rec.who,date:rec.date,set:scopeLabelOf(rec),score:rec.score,total:rec.total,questions:rows},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='chemlab-teacher-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    };actions.append(report);
    const retry=root.querySelector('#retryWrong');
    if(retry) {retry.textContent='ฝึกซ่อมด้วยข้อใหม่ 3–5 ข้อ';retry.onclick=()=>{
      const seen=new Set(Object.keys(rec.per).map(Number));
      const patterns=new Set([...seen].filter(id=>!rec.per[id].c).map(id=>patOf(QBY[id])));
      const candidates=shuffle(Q.filter(q=>!q.exam&&!q.posn&&!seen.has(q.id)&&patterns.has(patOf(q))));
      const chosen=candidates.slice(0,5);
      if(chosen.length<3){toast('แนวที่พลาดยังมีข้อใหม่ไม่ถึง 3 ข้อ ส่งรายงานให้ครูช่วยทบทวนได้');return;}
      const used=new Set(chosen.map(patOf));
      const baseline=[...seen].filter(id=>used.has(patOf(QBY[id])));
      startQuiz('exam',chosen.map(q=>q.id),{...rec.meta,remediation:{beforeCorrect:baseline.filter(id=>rec.per[id].c).length,beforeTotal:baseline.length,patterns:[...used]},size:String(chosen.length)});
    };}
    if(rec.meta?.remediation){const m=rec.meta.remediation,p=document.createElement('div');p.className='card panel';p.textContent=`ผลแนวที่ฝึกซ่อม: ก่อนฝึก ${m.beforeCorrect}/${m.beforeTotal} ข้อ → รอบใหม่ ${rec.score}/${rec.total} ข้อ • โจทย์คนละข้อในแนวเดียวกัน ผลนี้ยังไม่ใช่การวัดความสามารถทั้งหมด`;root.querySelector('.rhero').after(p);}
  };
})();
