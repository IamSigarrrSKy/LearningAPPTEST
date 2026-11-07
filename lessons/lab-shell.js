/* Shared behaviour for ChemLab lab pages (load before the lab's own script):
   - tabs: nav.tabs > button[data-tab] show section[data-panel]; #hash opens a tab and is kept in the URL;
     each switch fires a "labtab" event on document with detail = the tab name
   - ?from=N-P (opened from the e-book) adds a "กลับไป e-book หน้า P" link in the header
   - window.Lab helpers: $, svg(), sci(), mix(), reduce, loop(fn, panel) */
(() => {
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  // 0.00123 -> "1.23 × 10⁻³"; ordinary sizes stay plain
  const sci = (v, d = 2) => { if (v === 0 || (Math.abs(v) >= .01 && Math.abs(v) < 1e4)) return (+v.toFixed(d + 1)).toString();
    const e = Math.floor(Math.log10(Math.abs(v))), m = v / 10 ** e; return `${m.toFixed(d)} × 10${[...String(e)].map(c => SUP[c]).join('')}`; };
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const mix = (a, b, t) => '#' + hex(a).map((x, k) => Math.round(x + (hex(b)[k] - x) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('');
  const svg = (tag, attrs = {}, text) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text != null) n.textContent = text; return n; };

  // animation loops that run only while their panel is showing
  const loops = [];
  let last = 0;
  const frame = now => { const dt = Math.min(.05, (now - last) / 1000 || 0); last = now; loops.forEach(l => { if (!l.panel || !l.panel.hidden) l.fn(dt, now / 1000); }); requestAnimationFrame(frame); };
  const loop = (fn, panel) => { loops.push({ fn, panel }); if (loops.length === 1) requestAnimationFrame(t => { last = t; frame(t); }); };

  window.Lab = { $, svg, sci, mix, reduce, loop };

  // tabs
  const buttons = [...document.querySelectorAll('nav.tabs [data-tab]')];
  const select = key => {
    const names = buttons.map(b => b.dataset.tab), k = names.includes(key) ? key : names[0];
    document.querySelectorAll('[data-panel]').forEach(p => p.hidden = p.dataset.panel !== k);
    buttons.forEach(b => b.setAttribute('aria-current', b.dataset.tab === k));
    document.dispatchEvent(new CustomEvent('labtab', { detail: k }));
    return k;
  };
  buttons.forEach(b => b.addEventListener('click', () => { history.replaceState(null, '', location.search + '#' + select(b.dataset.tab)); }));
  addEventListener('hashchange', () => select(location.hash.slice(1)));
  addEventListener('DOMContentLoaded', () => {
    if (buttons.length) select(location.hash.slice(1));
    const m = new URLSearchParams(location.search).get('from')?.match(/^(\d+)-(\d+)$/);
    if (m) { const a = document.createElement('a'); a.className = 'back ebook-back'; a.href = `../ebook/shelf.html#read=${m[1]}&p=${m[2]}`; a.textContent = `กลับไป e-book หน้า ${m[2]}`; document.querySelector('header .brand')?.after(a); }
  });
})();
