/* Display conventions for guided steps only; question stems and arithmetic stay intact. */
window.normalizeGuideNotation = function(g, id) {
  const source=JSON.stringify([g.given,g.find,g.plan,g.work,g.result]);
  const molality=/โมแลล|mol\/kg|°C\/m|K[bf] × m/.test(source);
  const nonGramMass=/\b(?:kg|mg|μg)\b|ตัน/.test(String(g.result||''));
  // These exercises use M as an unknown metal, not molecular/molar mass.
  const unknownMetal=[447,554].includes(Number(id));
  const convert=value=>{
    if(typeof value!=='string')return value;
    return value.split(/(<[^>]*>)/g).map(part=>{
      if(part.startsWith('<'))return part;
      let text=part;
      if(!unknownMetal)text=text.replace(/(?<![A-Za-z])(?:MW|M)(?![A-Za-z])/g,(match,offset,whole)=>{
        // A numeric concentration followed by M is a unit, not a mass symbol.
        if(match==='M'&&/[0-9]\s*$/.test(whole.slice(0,offset)))return match;
        return 'Mw';
      });
      if(!molality&&!nonGramMass)text=text.replace(/(?<![A-Za-z])m(?![A-Za-z²³⁻])/g,'g');
      return text;
    }).join('');
  };
  g.given=(g.given||[]).map(pair=>pair.map(convert));
  if(g.find)g.find=g.find.map(convert);
  g.plan=(g.plan||[]).map(convert);
  g.work=(g.work||[]).map(pair=>pair.map(convert));
  g.result=convert(g.result);
  return g;
};
