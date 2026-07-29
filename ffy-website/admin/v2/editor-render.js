/* ════════════════════════════════════════════
   FFY Builder v2 — Editor renderer
   Obaluje bloky značkami (data-ffy-block) pro výběr na plátně
   a injektuje data-ffy-field na editovatelné texty (inline editace).
   Vyžaduje: registry.js (BLOCK_REGISTRY, renderPageHTML)
   ════════════════════════════════════════════ */

// Mapa: typ bloku → [{ selector, field }] editovatelných textů přímo na plátně
var INLINE_FIELDS = {
  page_header: [
    { selector: '.subpage-h1', field: 'heading' },
    { selector: '.subpage-lead', field: 'lead' },
  ],
  content_section: [
    { selector: '.sdileni-block-label', field: 'label' },
    { selector: '.sdileni-block-content', field: 'content', multiline: true },
  ],
  cta_block: [
    { selector: '.sdileni-cta-title', field: 'title' },
    { selector: '.sdileni-cta-desc', field: 'description' },
  ],
  quote_block: [
    { selector: '.pribeh-quote', field: 'text' },
  ],
};

// Vyrenderuje jeden blok obalený editorním wrapperem
function renderEditorBlock(block, index, isSelected) {
  var reg = BLOCK_REGISTRY[block.type];
  var inner;
  if (!reg) {
    inner = '<div style="padding:1.5rem;background:rgba(224,85,85,0.1);border-radius:8px;text-align:center;color:#e05555">Neznámý blok: ' + block.type + '</div>';
  } else {
    try {
      inner = reg.render(block.props);
      if (!inner || !inner.trim()) {
        inner = '<div style="padding:1rem;background:rgba(255,200,50,0.08);border:1px dashed rgba(255,200,50,0.3);border-radius:8px;text-align:center;font-size:0.8rem;color:rgba(255,200,50,0.6)">' + (reg.label || block.type) + ' — prázdný blok</div>';
      }
    } catch (e) {
      inner = '<div style="padding:1rem;background:rgba(224,85,85,0.1);border-radius:8px;text-align:center;color:#e05555">Chyba: ' + e.message + '</div>';
    }
  }
  var cls = 'ffy-ed-block' + (isSelected ? ' ffy-ed-selected' : '');
  var label = reg ? reg.label : block.type;
  return '<div class="' + cls + '" data-ffy-block="' + block.id + '" data-ffy-index="' + index + '" data-ffy-label="' + label + '">' + inner + '</div>';
}

// Vyrenderuje celou stránku pro plátno editoru
function renderEditorPage(page, selectedId, baseHref) {
  var blocksHTML = page.blocks.map(function (b, i) {
    return renderEditorBlock(b, i, b.id === selectedId);
  }).join('\n');

  var wrap = page.wrapper || 'sdileni';
  var isGlobal = (page.meta.slug === '_header' || page.meta.slug === '_footer');
  var body;
  if (isGlobal) {
    body = '<main class="subpage-main">' + blocksHTML + '</main>';
  } else {
    body = '<main class="subpage-main"><section class="' + wrap + '-section"><div class="' + wrap + '-inner">' + blocksHTML + '</div></section></main>';
  }

  var editorCSS = getEditorCanvasCSS();
  var editorJS = getEditorCanvasJS(JSON.stringify(INLINE_FIELDS));

  return '<!DOCTYPE html>\n<html lang="cs">\n<head>\n<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    (baseHref ? '<base href="' + baseHref + '">\n' : '') +
    '<link rel="stylesheet" href="../../styles.css">\n' +
    (page.customCss ? '<style>' + page.customCss + '</style>\n' : '') +
    '<style>' + editorCSS + '</style>\n</head>\n<body>\n' +
    '<div class="nebula" aria-hidden="true"><div class="nebula-blob nebula-blob-1"></div><div class="nebula-blob nebula-blob-2"></div></div>\n' +
    body + '\n<script>' + editorJS + '</scr' + 'ipt>\n</body>\n</html>';
}

// CSS injektované do plátna (výběr, hover, editace)
function getEditorCanvasCSS() {
  return [
    '.ffy-ed-block{position:relative;transition:outline .1s;outline:1px solid transparent;outline-offset:2px;border-radius:4px}',
    '.ffy-ed-block:hover{outline:1px dashed rgba(68,230,163,0.5);cursor:pointer}',
    '.ffy-ed-selected{outline:2px solid #44e6a3 !important;outline-offset:2px}',
    '.ffy-ed-selected:hover{outline:2px solid #44e6a3 !important}',
    '[data-ffy-field]{transition:background .1s;border-radius:3px}',
    '[data-ffy-field]:hover{background:rgba(68,230,163,0.06)}',
    '[data-ffy-field][contenteditable="true"]{outline:2px solid rgba(68,230,163,0.6);outline-offset:2px;background:rgba(68,230,163,0.04);cursor:text}',
    '[data-ffy-field][contenteditable="true"]:focus{outline:2px solid #44e6a3}',
    '.ffy-ed-block::before{content:attr(data-ffy-label);position:absolute;top:-2px;left:-2px;z-index:50;' +
      'background:#44e6a3;color:#0a0f18;font-size:10px;font-weight:600;padding:2px 7px;border-radius:4px 0 4px 0;' +
      'font-family:Ubuntu,sans-serif;opacity:0;transform:translateY(-100%);transition:opacity .1s;pointer-events:none}',
    '.ffy-ed-block:hover::before,.ffy-ed-selected::before{opacity:1}',
  ].join('');
}

// JS injektované do plátna (komunikace s rodičem přes postMessage)
function getEditorCanvasJS(inlineFieldsJSON) {
  return '(function(){' +
    'var INLINE=' + inlineFieldsJSON + ';' +
    'var editing=null;' +
    // Klik na blok → vyber
    'document.addEventListener("click",function(e){' +
      'if(e.target.closest("[contenteditable=true]"))return;' +
      'if(e.target.closest("a")){e.preventDefault();}' +
      'var block=e.target.closest(".ffy-ed-block");' +
      'if(block){e.stopPropagation();' +
        'parent.postMessage({type:"ffy-select",id:block.getAttribute("data-ffy-block")},"*");}' +
    '},true);' +
    // Dvojklik na editovatelný text → edituj inline
    'document.addEventListener("dblclick",function(e){' +
      'var block=e.target.closest(".ffy-ed-block");if(!block)return;' +
      'var type=null;var idx=block.getAttribute("data-ffy-index");' +
      'parent.postMessage({type:"ffy-request-type",id:block.getAttribute("data-ffy-block")},"*");' +
      // Najdi editovatelný element pod kurzorem
      'var t=e.target;while(t&&t!==block){if(t.hasAttribute&&t.hasAttribute("data-ffy-field")){startEdit(t,block);return;}t=t.parentNode;}' +
    '});' +
    'function startEdit(el,block){' +
      'if(editing)stopEdit();' +
      'editing={el:el,block:block};' +
      'el.setAttribute("contenteditable","true");el.focus();' +
      // Select all text
      'var r=document.createRange();r.selectNodeContents(el);var s=getSelection();s.removeAllRanges();s.addRange(r);' +
      'el.addEventListener("blur",stopEdit,{once:true});' +
      'el.addEventListener("keydown",editKeydown);' +
    '}' +
    'function editKeydown(e){' +
      'if(e.key==="Escape"){e.preventDefault();stopEdit();}' +
      'if(e.key==="Enter"&&!e.shiftKey&&!editing.el.hasAttribute("data-ffy-multiline")){e.preventDefault();stopEdit();}' +
    '}' +
    'function stopEdit(){' +
      'if(!editing)return;var el=editing.el,block=editing.block;' +
      'el.removeAttribute("contenteditable");el.removeEventListener("keydown",editKeydown);' +
      'var field=el.getAttribute("data-ffy-field");' +
      'var val=el.getAttribute("data-ffy-multiline")?el.innerText:el.textContent;' +
      'parent.postMessage({type:"ffy-edit",id:block.getAttribute("data-ffy-block"),field:field,value:val},"*");' +
      'editing=null;' +
    '}' +
    // Po načtení: injektuj data-ffy-field podle mapy (rodič pošle typy bloků)
    'window.addEventListener("message",function(e){' +
      'if(e.data&&e.data.type==="ffy-inject-fields"){injectFields(e.data.blocks);}' +
      'if(e.data&&e.data.type==="ffy-scroll-to"){var b=document.querySelector(\'[data-ffy-block="\'+e.data.id+\'"]\');if(b)b.scrollIntoView({behavior:"smooth",block:"center"});}' +
    '});' +
    'function injectFields(blocks){' +
      'blocks.forEach(function(bl){' +
        'var el=document.querySelector(\'[data-ffy-block="\'+bl.id+\'"]\');if(!el)return;' +
        'var fields=INLINE[bl.type];if(!fields)return;' +
        'fields.forEach(function(f){' +
          'var target=el.querySelector(f.selector);if(!target)return;' +
          'target.setAttribute("data-ffy-field",f.field);' +
          'if(f.multiline)target.setAttribute("data-ffy-multiline","1");' +
        '});' +
      '});' +
      'parent.postMessage({type:"ffy-ready"},"*");' +
    '}' +
    'parent.postMessage({type:"ffy-loaded"},"*");' +
  '})();';
}
