/* ══════════════════════════════════════════
   FFY CMS — Block Registry, Renderer, Store
   ══════════════════════════════════════════
   
   ROZŠÍŘENÍ: Pro přidání nového typu bloku
   stačí přidat objekt do BLOCK_REGISTRY.
   Editor se vygeneruje automaticky ze schema.
   
   Schema field types:
     text     — jednořádkový input
     textarea — víceřádkový textarea
     url      — URL input
     select   — dropdown (vyžaduje options[])
     toggle   — checkbox boolean
   
   Každý field: { key, label, type, hint?, options? }
   ══════════════════════════════════════════ */


// ═══════════════════════════════════
//  BLOCK REGISTRY
// ═══════════════════════════════════

const BLOCK_REGISTRY = {

  page_header: {
    label: 'Záhlaví stránky',
    description: 'Nadpis, popis a štítky',
    schema: [
      { key: 'breadcrumb', label: 'Breadcrumb cesta', type: 'text', hint: 'Oddělené lomítkem. Např: Domů / Jak to funguje?' },
      { key: 'heading', label: 'Nadpis (H1)', type: 'text' },
      { key: 'lead', label: 'Podnadpis', type: 'textarea' },
      { key: 'badges', label: 'Štítky (každý na nový řádek)', type: 'textarea', hint: 'Prázdné = bez štítků' },
    ],
    defaults: { breadcrumb: 'Domů / Stránka', heading: 'Nová stránka', lead: '', badges: '' },
    render: function(p) {
      var parts = p.breadcrumb.split('/');
      var bc = parts.map(function(s, i) {
        return i < parts.length - 1
          ? '<a href="index.html">' + s.trim() + '</a><span>/</span>'
          : s.trim();
      }).join('');
      var badges = '';
      if (p.badges && p.badges.trim()) {
        badges = '<div class="sdileni-badges">' +
          p.badges.split('\n').filter(function(b){return b.trim();}).map(function(b){
            return '<span class="sdileni-badge">' + b.trim() + '</span>';
          }).join('') + '</div>';
      }
      return '<section class="subpage-header"><div class="subpage-header-inner">' +
        '<div class="subpage-breadcrumb">' + bc + '</div>' +
        '<h1 class="subpage-h1">' + p.heading + '</h1>' +
        (p.lead ? '<p class="subpage-lead">' + p.lead + '</p>' : '') +
        badges +
        '</div></section>';
    }
  },

  content_section: {
    label: 'Obsahový blok',
    description: 'Label + odstavce textu',
    schema: [
      { key: 'label', label: 'Nadpis sekce', type: 'text' },
      { key: 'content', label: 'Obsah', type: 'textarea', hint: 'Odstavce oddělte prázdným řádkem. Podporuje <strong>, <a> apod.' },
    ],
    defaults: { label: 'Název sekce', content: 'Text obsahu...' },
    render: function(p) {
      var paragraphs = p.content.split(/\n\n+/).filter(function(s){return s.trim();}).map(function(s){
        return '<p>' + s.trim() + '</p>';
      }).join('\n          ');
      return '<div class="sdileni-block">' +
        '<div class="sdileni-block-label">' + p.label + '</div>' +
        '<div class="sdileni-block-content">' + paragraphs + '</div>' +
        '</div>';
    }
  },

  cta_block: {
    label: 'Výzva k akci (CTA)',
    description: 'Titulek, popis a tlačítka',
    schema: [
      { key: 'title', label: 'Titulek', type: 'text' },
      { key: 'description', label: 'Popis', type: 'text' },
      { key: 'btn1_text', label: 'Primární tlačítko — text', type: 'text' },
      { key: 'btn1_url', label: 'Primární tlačítko — odkaz', type: 'url' },
      { key: 'btn2_text', label: 'Sekundární tlačítko — text', type: 'text', hint: 'Prázdné = bez druhého tlačítka' },
      { key: 'btn2_url', label: 'Sekundární tlačítko — odkaz', type: 'url' },
    ],
    defaults: { title: 'Nadpis CTA', description: 'Krátký popis', btn1_text: 'Primární akce →', btn1_url: '#', btn2_text: '', btn2_url: '#' },
    render: function(p) {
      var btn2 = p.btn2_text ? '<a href="' + p.btn2_url + '" class="sdileni-btn-secondary">' + p.btn2_text + '</a>' : '';
      return '<div class="sdileni-cta-wrap">' +
        '<div class="sdileni-cta-text">' +
        '<div class="sdileni-cta-title">' + p.title + '</div>' +
        '<div class="sdileni-cta-desc">' + p.description + '</div>' +
        '</div>' +
        '<div class="sdileni-cta-btns">' +
        '<a href="' + p.btn1_url + '" class="sdileni-btn-primary">' + p.btn1_text + '</a>' +
        btn2 +
        '</div></div>';
    }
  },

  quote_block: {
    label: 'Citát / zvýraznění',
    description: 'Vizuálně oddělená myšlenka',
    schema: [
      { key: 'text', label: 'Text citátu', type: 'textarea' },
      { key: 'style', label: 'Styl', type: 'select', options: [
        { value: 'large', label: 'Velký (důrazný)' },
        { value: 'small', label: 'Malý (doplňkový)' },
      ]},
    ],
    defaults: { text: 'Text citátu...', style: 'large' },
    render: function(p) {
      var cls = p.style === 'small' ? ' pribeh-break-small' : '';
      var txtCls = p.style === 'small' ? ' pribeh-quote-sm' : '';
      return '<div class="pribeh-break' + cls + '">' +
        '<div class="pribeh-break-inner">' +
        '<div class="pribeh-break-line"></div>' +
        '<blockquote class="pribeh-quote' + txtCls + '">' + p.text + '</blockquote>' +
        '<div class="pribeh-break-line"></div>' +
        '</div></div>';
    }
  },

  raw_html: {
    label: 'Vlastní HTML',
    description: 'Libovolný HTML/JS kód',
    schema: [
      { key: 'code', label: 'HTML kód', type: 'textarea', hint: 'Vloží se přesně jak je — včetně <script> tagů' },
    ],
    defaults: { code: '<div>\n  <!-- Vlastní HTML -->\n</div>' },
    render: function(p) { return p.code; }
  }

};


// ═══════════════════════════════════
//  RENDERER
// ═══════════════════════════════════

function renderBlocksHTML(blocks) {
  return blocks.map(function(b) {
    var reg = BLOCK_REGISTRY[b.type];
    return reg ? reg.render(b.props) : '<!-- unknown block: ' + b.type + ' -->';
  }).join('\n\n      ');
}

function renderPageHTML(page) {
  var blocksHTML = renderBlocksHTML(page.blocks);
  var hasHeader = page.blocks.some(function(b){ return b.type === 'page_header'; });

  return '<!DOCTYPE html>\n' +
    '<html lang="cs">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n' +
    '<title>' + (page.meta.title || '') + '</title>\n' +
    '<meta name="description" content="' + (page.meta.description || '') + '">\n' +
    '<meta name="robots" content="' + (page.meta.robots || 'index, follow') + '">\n' +
    '<link rel="canonical" href="' + (page.meta.canonical || '') + '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<meta property="og:title" content="' + (page.meta.title || '') + '">\n' +
    '<meta property="og:description" content="' + (page.meta.description || '') + '">\n' +
    '<link rel="stylesheet" href="../styles.css">\n' +
    '</head>\n<body>\n' +
    '<div class="nebula" aria-hidden="true">\n' +
    '  <div class="nebula-blob nebula-blob-1"></div>\n' +
    '  <div class="nebula-blob nebula-blob-2"></div>\n' +
    '</div>\n\n' +
    '<!-- Generated by FFY Page Builder -->\n' +
    '<main class="subpage-main">\n\n' +
    '  <section class="sdileni-section">\n' +
    '    <div class="sdileni-inner">\n\n      ' +
    blocksHTML + '\n\n' +
    '    </div>\n  </section>\n\n' +
    '</main>\n\n</body>\n</html>';
}


// ═══════════════════════════════════
//  STORE (localStorage)
// ═══════════════════════════════════

var STORE_KEY = 'ffy-cms-pages';

function loadPages() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch(e) { return []; }
}

function savePages(pages) {
  localStorage.setItem(STORE_KEY, JSON.stringify(pages));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
