'use strict';
  document.getElementById('yr').textContent = new Date().getFullYear();

  // ── CONFIG ─────────────────────────────────────────────────────────────────
  const REPO     = 'Barez21/My-site';
  const BRANCH   = 'main';
  const RAW      = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`;
  const MANIFEST = RAW + 'tvorba/texty/manifest.json';
  const POEMS_PATH = 'tvorba/texty/básně/';

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
  function clean(fn){ return fn.normalize('NFC').replace(/\.[^.]+$/,'').replace(/^\d+[\s.\-–—]+/,'').trim(); }

  // ── RAW FETCH (bez GitHub API, bez rate limitu) ────────────────────────────
  async function rawGet(path){
    // Normalizovat na NFC — Mac někdy ukládá názvy v NFD (decomposed)
    const encoded = path.split('/').map(s => encodeURIComponent(s.normalize('NFC')).replace(/\.\./g, '%2E%2E')).join('/');
    const url = RAW + encoded;
    console.log('FETCH:', url);
    const r = await fetch(url);
    if(!r.ok) throw new Error(`Fetch ${r.status}: ${path}`);
    return r.text();
  }

  async function loadManifest(){
    const r = await fetch(MANIFEST);
    if(!r.ok) throw new Error(`manifest.json nenalezen (${r.status})`);
    return r.json();
  }

  async function fileText(collection, filename){
    const path = POEMS_PATH + collection + '/' + filename;
    return rawGet(path);
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
        mDiv.innerHTML = hdr + `<div style="font-family:inherit;font-size:inherit;line-height:inherit;text-align:center">${unitsHTML(test)}</div>` + foot;
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
      el.addEventListener('click',(e)=>{
        e.stopPropagation(); // nezastavit flip na pageL
        jumpSpread(parseInt(el.dataset.spread));
      });
    });
  }

  // ── BUILD PAGES ────────────────────────────────────────────────────────────
  async function buildPages(col, _dims){ const _DW=(_dims||{}).w||300, _DH=(_dims||{}).h||480;
    // Načtení textů z raw.githubusercontent.com — bez GitHub API, bez rate limitu
    const prefaceName = (col.preface||null);
    const poemNames   = col.poems || [];

    // Předmluva — pokud soubor neexistuje, tiše ignorovat
    const prefaceText = prefaceName
      ? await fileText(col.name, prefaceName).catch(() => null)
      : null;

    // Básně — načíst paralelně, chyba u jedné nepoloží zbytek
    const poemTexts = await Promise.all(
      poemNames.map(fn => fileText(col.name, fn).catch(e => { console.warn('Nelze načíst:', fn, e); return ''; }))
    );

    const poems = poemNames.map((fn, i) => ({ name: clean(fn), text: poemTexts[i]||'' }));

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
    // Vytvořit dočasný .poem-body element, připojit do DOM a přečíst jeho computed style
    // Tím se automaticky použijí styly z CSS bez ohledu na aktuální font-size
    const _probe = document.createElement('div');
    _probe.className = 'poem-body';
    _probe.style.cssText = 'position:fixed;left:-9999px;top:0;visibility:hidden;';
    document.body.appendChild(_probe);
    const _probeCS  = getComputedStyle(_probe);
    const _dynFont  = _probeCS.fontFamily;
    const _dynSize  = _probeCS.fontSize;
    const _dynLH    = _probeCS.lineHeight;
    document.body.removeChild(_probe);

    const mDiv = document.createElement('div');
    mDiv.style.cssText = `position:fixed;left:-9999px;top:0;width:${_DW}px;height:${_DH}px;overflow:hidden;visibility:hidden;font-family:${_dynFont};font-size:${_dynSize};line-height:${_dynLH};`;
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
      const manifest = await loadManifest();
      const cols = manifest.collections || [];
      if(!cols.length){ shelf.innerHTML=`<div style="position:relative;z-index:2;color:var(--muted);font-family:'DM Mono',monospace;font-size:11px;padding-bottom:2rem;align-self:center">Žádné sbírky</div>`; return; }
      collections = cols.map((c,i)=>({ ...c, leather:LEATHER[i%LEATHER.length] }));
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
        <span style="color:#7070a0">manifest.json: ${esc(MANIFEST)}</span>
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

    // Show open scene — loading spinner visible
    os.classList.add('ready');
    await sleep(20);
    os.classList.add('animated');

    // Počkat na dokončení CSS transition, aby pageR měl správné rozměry
    await sleep(450);

    // Teď měřit — scéna je plně viditelná a pageR má správnou výšku
    const _pR = document.getElementById('pageR');
    let _dims = { w: 300, h: 480 };
    if(_pR){
      const _cs = getComputedStyle(_pR);
      const _w = Math.floor(_pR.clientWidth  - parseFloat(_cs.paddingLeft) - parseFloat(_cs.paddingRight));
      const _h = Math.floor(_pR.clientHeight - parseFloat(_cs.paddingTop)  - parseFloat(_cs.paddingBottom) - 32);
      if(_w > 50 && _h > 50){ _dims.w = _w; _dims.h = _h; }
    }
    console.log('Page dims:', _dims);

    try{
      pages = await buildPages(col, _dims);
    } catch(e){
      console.error('buildPages error:', e);
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

  // ── SWIPE GESTA — drátujeme na overlay (vždy v DOM) ──────────────────────
  let _touchStartX = null;

  $('overlay').addEventListener('touchstart', e => {
    _touchStartX = e.touches[0].clientX;
  }, { passive: true });

  $('overlay').addEventListener('touchend', e => {
    if(_touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - _touchStartX;
    _touchStartX = null;
    if(Math.abs(dx) < 40) return;
    if(dx < 0) flipForward();
    else        flipBackward();
  }, { passive: true });

  // ── MOBILE: na mobilu zobrazovat jen jednu stránku ─────────────────────────
  // Levá stránka je skrytá přes CSS — přepíšeme showSpread aby správně
  // zobrazoval obsah i pro sudé spreads kde by byl obsah jen v levé stránce
  function mobileFixSpread(idx){
    if(window.innerWidth > 680) return;
    const li = idx*2, ri = li+1;
    const leftPg  = pages[li];
    const rightPg = pages[ri];
    // Pravá prázdná ale levá má obsah → zobrazit levou v pravém slotu
    if(leftPg && leftPg.type !== 'verso' && (!rightPg || rightPg.type === 'verso')){
      $('pageRC').innerHTML = renderPage(leftPg, li+1);
      attachTOC();
    }
  }

  // Obalit showSpread
  const _showSpreadOrig = showSpread;
  showSpread = function(idx){
    _showSpreadOrig(idx);
    mobileFixSpread(idx);
  };

  // ── BOOT ───────────────────────────────────────────────────────────────────
  loadShelf();