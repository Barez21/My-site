'use strict';
  document.getElementById('yr').textContent = new Date().getFullYear();

  // ── CONFIG ─────────────────────────────────────────────────────────────────
  const REPO   = 'Barez21/My-site';
  const FOLDER = 'tvorba/texty/básně';
  const API    = `https://api.github.com/repos/${REPO}/contents/`;

  const LEATHER = [
    ['#4a1e0a','#6b2d10','#321408'],
    ['#0f2040','#1c3560','#0a1830'],
    ['#2b1340','#3e1c58','#1e0d30'],
    ['#103020','#1a5030','#0a2418'],
    ['#3e280a','#5a3c10','#2c1c06'],
    ['#380e10','#501618','#280a0c'],
    ['#1a1840','#282558','#12102c'],
    ['#2e1820','#483040','#200f18'],
  ];

  // Measurement box dimensions (match actual page inner area approximately)

  // ── STATE ──────────────────────────────────────────────────────────────────
  let collections  = [];
  let pages        = [];   // all built pages
  let spread       = 0;    // current spread index
  let flipping     = false;

  // ── UTILS ──────────────────────────────────────────────────────────────────
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $  = id => document.getElementById(id);
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function clean(fn){ return fn.replace(/\.[^.]+$/,'').replace(/^\d+[\s.\-–—]+/,'').trim(); }

  // ── GITHUB API ─────────────────────────────────────────────────────────────
  async function apiGet(path){
    const r = await fetch(API + path, { headers:{ Accept:'application/vnd.github+json', Authorization:'Bearer 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' }});
    if(!r.ok) throw new Error(`GitHub ${r.status}`);
    return r.json();
  }
  async function fileText(url){
    const d = await fetch(url, { headers:{ Accept:'application/vnd.github+json', Authorization:'Bearer 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' }}).then(r=>r.json());
    if(d.encoding==='base64')
      return decodeURIComponent(atob(d.content.replace(/\s/g,'')).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    return d.content||'';
  }

  // ── PAGINATION ─────────────────────────────────────────────────────────────
  // Measure actual page content area at runtime
  function getPageDims(){
    const pg = document.getElementById('pageR');
    const style = getComputedStyle(pg);
    const w = pg.clientWidth  - parseFloat(style.paddingLeft)  - parseFloat(style.paddingRight);
    const h = pg.clientHeight - parseFloat(style.paddingTop)   - parseFloat(style.paddingBottom);
    return { w: Math.floor(w), h: Math.floor(h) };
  }

  function parseUnits(raw){
    const units=[];
    raw.split(/\n{2,}/).forEach((st,si)=>{
      if(si>0) units.push({t:'br'});
      st.trim().split('\n').forEach(ln=>{ const l=ln.trim(); if(l) units.push({t:'ln',text:l}); });
    });
    while(units.length && units[units.length-1].t==='br') units.pop();
    return units;
  }

  function unitsHTML(units){
    return units.map(u=> u.t==='ln'
      ? `<span style="display:block">${esc(u.text)}</span>`
      : `<span class="poem-sbr"></span>`
    ).join('');
  }

  function paginatePoem(title, raw, mDiv, dims){
    const MH = dims.h, MW = dims.w;
    const units = parseUnits(raw);
    if(!units.length) return [{ type:'poem', title, units:[], poemTitle:title }];
    const out=[];
    let i=0, first=true;
    while(i<units.length){
      const pageUnits=[];
      let j=i;
      const hdr = first
        ? `<div style="font-family:'Lora',serif;font-size:15px;font-style:italic;font-weight:500;line-height:1.3;margin-bottom:.25rem">${esc(title)}</div><div style="width:26px;height:1px;background:rgba(42,31,20,.22);margin:.65rem 0 .9rem"></div>`
        : `<div style="font-family:'Lora',serif;font-size:9px;font-style:italic;color:#9a8878;text-align:center;margin-bottom:.8rem">— pokračování —</div>`;
      const foot = `<div style="height:26px"></div>`;

      while(j<units.length){
        const test=[...pageUnits,units[j]];
        mDiv.innerHTML = hdr + `<div style="font-family:'Lora',serif;font-size:13px;line-height:1.95;text-align:center">${unitsHTML(test)}</div>` + foot;
        if(mDiv.scrollHeight > mDiv.clientHeight && pageUnits.length>0) break;
        pageUnits.push(units[j]); j++;
      }
      if(!pageUnits.length){ pageUnits.push(units[j]||{t:'ln',text:''}); j++; }
      out.push({ type: first?'poem':'poem-cont', title: first?title:null, units:pageUnits, poemTitle:title });
      i=j; first=false;
    }
    return out;
  }

  // ── RENDER PAGE HTML ───────────────────────────────────────────────────────
  function renderPage(pg, pgNum){
    if(!pg || pg.type==='verso'){
      return `<div class="pg-content"><div class="pg-verso"></div>${pgNum?`<div class="pg-num">${pgNum}</div>`:''}</div>`;
    }
    if(pg.type==='title'){
      return `<div class="pg-content"><div class="pg-title">
        <div class="pt-orn">✦ &nbsp;✦ &nbsp;✦</div>
        <div class="pt-main">${esc(pg.title)}</div>
        <div class="pt-rule"></div>
        <div class="pt-series">Sbírka básní</div>
        <div class="pt-author">b-place.org</div>
        <div class="pt-orn">✦ &nbsp;✦ &nbsp;✦</div>
      </div></div>`;
    }
    if(pg.type==='toc'){
      const rows = pg.entries.map((e,i)=>`
        <div class="toc-row" data-spread="${e.spread}">
          <span class="toc-n">${i+1}</span>
          <span class="toc-t">${esc(e.title)}</span>
          <span class="toc-dots"></span>
          <span class="toc-p">${e.pgNum}</span>
        </div>`).join('');
      return `<div class="pg-content"><div class="pg-toc"><div class="toc-hd">Obsah</div><div class="toc-entries">${rows}</div></div><div class="pg-num">${pgNum}</div></div>`;
    }
    if(pg.type==='preface'){
      const body = esc(pg.text).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
      return `<div class="pg-content"><div class="pg-preface"><div class="pref-hd">Předmluva</div><div class="pref-body"><p>${body}</p></div></div><div class="pg-num">${pgNum}</div></div>`;
    }
    if(pg.type==='poem'||pg.type==='poem-cont'){
      const hdr = pg.type==='poem'
        ? `<div class="poem-hd">${esc(pg.title)}</div><div class="poem-rule"></div>`
        : `<div class="poem-cont-lbl">— pokračování —</div>`;
      return `<div class="pg-content"><div class="pg-poem">${hdr}<div class="poem-body">${unitsHTML(pg.units)}</div></div><div class="pg-num">${pgNum}</div></div>`;
    }
    return `<div class="pg-content"><div class="pg-verso"></div></div>`;
  }

  function attachTOC(){
    document.querySelectorAll('.toc-row[data-spread]').forEach(el=>{
      el.addEventListener('click',()=>{ jumpSpread(parseInt(el.dataset.spread)); });
    });
  }

  // ── BUILD PAGES ────────────────────────────────────────────────────────────
  async function buildPages(col, _dims){ const _DW=(_dims||{}).w||300, _DH=(_dims||{}).h||480;
    const path = encodeURIComponent(FOLDER).replace(/%2F/g,'/') + '/' + encodeURIComponent(col.name);
    const items = await apiGet(path);
    const files = items.filter(i=>i.type==='file');

    const prefaceFile = files.find(f=>/^(predmluva|preface|uvod|intro)/i.test(f.name));
    const poemFiles   = files.filter(f=>f!==prefaceFile);

    const [prefaceText, ...poemTexts] = await Promise.all([
      prefaceFile ? fileText(prefaceFile.url) : Promise.resolve(null),
      ...poemFiles.map(f=>fileText(f.url))
    ]);

    const poems = poemFiles.map((f,i)=>({ name: clean(f.name), text: poemTexts[i]||'' }));

    // Start building
    const pgs = [];
    pgs.push({ type:'verso' });                      // [0] L blank
    pgs.push({ type:'title', title: col.name });     // [1] R title
    pgs.push({ type:'toc', entries:[] });             // [2] L toc
    if(prefaceText){
      pgs.push({ type:'preface', text: prefaceText }); // [3] R preface
    } else {
      pgs.push({ type:'verso' });                    // [3] R blank
    }

    // Measurement div — sized to actual page content area
    const dims = getPageDims();
    const mDiv = document.createElement('div');
    mDiv.style.cssText = `position:fixed;left:-9999px;top:0;width:${_DW}px;height:${_DH}px;overflow:hidden;visibility:hidden;font-family:'Lora',serif;`;
    document.body.appendChild(mDiv);

    const tocEntries=[];
    for(const poem of poems){
      const startIdx = pgs.length;
      const poemPages = paginatePoem(poem.name, poem.text, mDiv, dims);
      tocEntries.push({ title: poem.name, pgNum: startIdx+1, spread: Math.floor(startIdx/2) });
      pgs.push(...poemPages);
    }
    document.body.removeChild(mDiv);

    // Fill TOC
    pgs[2].entries = tocEntries;

    // Pad to even
    if(pgs.length%2!==0) pgs.push({ type:'verso' });
    return pgs;
  }

  // ── SPREAD RENDER ──────────────────────────────────────────────────────────
  function showSpread(idx){
    const li=idx*2, ri=li+1;
    $('pageLC').innerHTML = renderPage(pages[li],  li+1);
    $('pageRC').innerHTML = renderPage(pages[ri],  ri+1);
    attachTOC();
    spread = idx;
    updateNav();
  }

  function jumpSpread(idx){
    if(idx===spread||flipping) return;
    showSpread(idx);
  }

  function updateNav(){
    const total = Math.ceil(pages.length/2);
    $('prevBtn').disabled = spread<=0;
    $('nextBtn').disabled = spread>=total-1;
    $('pgInd').textContent = `${spread*2+1} — ${Math.min((spread+1)*2, pages.length)}`;
  }

  // ── PAGE FLIP ──────────────────────────────────────────────────────────────
  async function flipForward(){
    if(flipping || spread >= Math.ceil(pages.length/2)-1) return;
    flipping=true;

    const ns=spread+1;
    const ri=spread*2+1, nli=ns*2, nri=nli+1;

    // Pre-render BOTH target pages into the flipper faces BEFORE animating
    const fl=$('flipR'), ff=$('flipRF'), fb=$('flipRB');
    ff.innerHTML = renderPage(pages[ri],  ri+1);   // front = current right
    fb.innerHTML = renderPage(pages[nli], nli+1);  // back  = next left

    // Also pre-render the new right page (hidden behind) so it's ready
    $('pageRC').innerHTML = renderPage(pages[nri], nri+1);
    attachTOC();

    // Start flip — from flat to -180deg
    fl.style.display='block';
    fl.style.transition='none';
    fl.style.transform='rotateY(0deg)';
    fl.classList.remove('turning');
    void fl.offsetWidth; // force reflow

    fl.style.transition='transform 0.7s cubic-bezier(0.77,0,0.175,1)';
    fl.style.transform='rotateY(-180deg)';
    fl.classList.add('turning');

    // At halfway (350ms), swap left page to next-left (already matches fb)
    await sleep(350);
    $('pageLC').innerHTML = renderPage(pages[nli], nli+1);
    attachTOC();

    await sleep(370);
    fl.style.display='none';
    fl.classList.remove('turning');

    spread=ns;
    updateNav();
    flipping=false;
  }

  async function flipBackward(){
    if(flipping || spread<=0) return;
    flipping=true;

    const ps=spread-1;
    const li=spread*2, pli=ps*2, pri=pli+1;

    const fl=$('flipL'), ff=$('flipLF'), fb=$('flipLB');
    ff.innerHTML = renderPage(pages[li],  li+1);   // front = current left
    fb.innerHTML = renderPage(pages[pri], pri+1);  // back  = prev right

    // Pre-render new left page
    $('pageLC').innerHTML = renderPage(pages[pli], pli+1);
    attachTOC();

    fl.style.display='block';
    fl.style.transition='none';
    fl.style.transform='rotateY(0deg)';
    fl.classList.remove('turning');
    void fl.offsetWidth;

    fl.style.transition='transform 0.7s cubic-bezier(0.77,0,0.175,1)';
    fl.style.transform='rotateY(180deg)';
    fl.classList.add('turning');

    await sleep(350);
    $('pageRC').innerHTML = renderPage(pages[pri], pri+1);
    attachTOC();

    await sleep(370);
    fl.style.display='none';
    fl.classList.remove('turning');

    spread=ps;
    updateNav();
    flipping=false;
  }

  // ── SHELF ──────────────────────────────────────────────────────────────────
  async function loadShelf(){
    const shelf=$('shelf');
    try{
      const items = await apiGet(encodeURIComponent(FOLDER).replace(/%2F/g,'/'));
      const dirs  = items.filter(i=>i.type==='dir');
      if(!dirs.length){ shelf.innerHTML=`<div style="position:relative;z-index:2;color:var(--muted);font-family:'DM Mono',monospace;font-size:11px;padding-bottom:2rem;align-self:center">Žádné sbírky</div>`; return; }
      collections = dirs.map((d,i)=>({ name:d.name, leather:LEATHER[i%LEATHER.length] }));
      shelf.innerHTML = collections.map((c,i)=>`
        <div class="book-wrap" data-i="${i}" title="${esc(c.name)}">
          <div class="book-spine" style="background:linear-gradient(90deg,${c.leather[0]} 0%,${c.leather[1]} 50%,${c.leather[0]} 100%)">
            <span class="book-title-spine">${esc(c.name)}</span>
          </div>
          <div class="book-pages"></div>
        </div>`).join('');
      document.querySelectorAll('.book-wrap').forEach(el=>{
        el.addEventListener('click',()=>openCollection(+el.dataset.i));
      });
    } catch(e){
      console.error('loadShelf error:', e);
      shelf.innerHTML=`<div style="position:relative;z-index:2;color:#f472b6;padding:2rem;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.08em">
        ⚠ ${esc(e.message)}<br><br>
        <span style="color:#7070a0">Repozitář: Barez21/My-site<br>Složka: ${esc(FOLDER)}</span>
      </div>`;
    }
  }

  // ── OPEN COLLECTION ────────────────────────────────────────────────────────
  async function openCollection(idx){
    const col = collections[idx];
    const leather = col.leather;

    // Animate book out of shelf
    const bookEl = document.querySelector(`.book-wrap[data-i="${idx}"]`);
    if(bookEl){ bookEl.classList.add('extracting'); await sleep(200); }

    // Dress the closed book
    $('coverTitleText').textContent   = col.name;
    $('closedSpineText').textContent  = col.name;
    $('closedCover').style.background = `linear-gradient(135deg, ${leather[1]} 0%, ${leather[0]} 60%, ${leather[2]} 100%)`;
    $('closedSpine').style.background = `linear-gradient(180deg, ${leather[2]} 0%, ${leather[0]} 100%)`;

    // Show overlay with closed book
    const cs=$('closedScene'), os=$('openScene');
    cs.classList.remove('gone');
    os.classList.remove('ready','animated');
    $('overlay').classList.add('visible');
    document.body.style.overflow='hidden';

    if(bookEl){ await sleep(250); bookEl.classList.remove('extracting'); }

    // Wire open handlers
    $('closedBook').onclick = ()=>openBook(col);
    document.querySelector('.open-hint').onclick = ()=>openBook(col);
  }

  async function openBook(col){
    const cs=$('closedScene'), os=$('openScene');

    // Fade out closed scene
    cs.classList.add('gone');
    await sleep(320);
    cs.style.display='none';

    // Show open scene (loading state)
    os.classList.add('ready');
    await sleep(20);
    os.classList.add('animated');

    // Fetch + build pages
    // Measure actual page area for pagination
    const _pR = document.getElementById('pageR');
    let _dims = { w: 300, h: 480 };
    if(_pR){
      const _cs = getComputedStyle(_pR);
      _dims.w = Math.floor(_pR.clientWidth  - parseFloat(_cs.paddingLeft) - parseFloat(_cs.paddingRight));
      _dims.h = Math.floor(_pR.clientHeight - parseFloat(_cs.paddingTop)  - parseFloat(_cs.paddingBottom) - 32);
    }
    try{
      pages = await buildPages(col, _dims);
    } catch(e){
      pages=[{type:'verso'},{type:'title',title:col.name},{type:'toc',entries:[]},{type:'verso'}];
    }

    spread=0;
    showSpread(0);
  }

  // ── CLOSE ──────────────────────────────────────────────────────────────────
  function closeOverlay(){
    $('overlay').classList.remove('visible');
    document.body.style.overflow='';
    setTimeout(()=>{
      const cs=$('closedScene'), os=$('openScene');
      cs.style.display=''; cs.classList.remove('gone');
      os.classList.remove('ready','animated');
      pages=[]; spread=0;
    }, 500);
  }

  // ── EVENTS ─────────────────────────────────────────────────────────────────
  $('closeBtn').addEventListener('click', closeOverlay);
  $('pageL').addEventListener('click', flipBackward);
  $('pageR').addEventListener('click', flipForward);
  $('overlay').addEventListener('click', e=>{ if(e.target===$('overlay')) closeOverlay(); });
  $('prevBtn').addEventListener('click', flipBackward);
  $('nextBtn').addEventListener('click', flipForward);
  document.addEventListener('keydown', e=>{
    if(!$('overlay').classList.contains('visible')) return;
    if(e.key==='Escape')      closeOverlay();
    if(e.key==='ArrowRight')  flipForward();
    if(e.key==='ArrowLeft')   flipBackward();
  });

  // ── BOOT ───────────────────────────────────────────────────────────────────
  loadShelf();