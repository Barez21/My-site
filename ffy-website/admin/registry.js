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
     image    — URL input + upload souboru s náhledem
     array    — opakovatelná skupina polí (vyžaduje arrayFields[])
   
   Každý field: { key, label, type, hint?, options?, arrayFields? }
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
  },

  image_block: {
    label: 'Obrázek',
    description: 'Obrázek s popiskem a alt textem',
    schema: [
      { key: 'src', label: 'URL obrázku', type: 'image', hint: 'Relativní cesta (img/foto.jpg) nebo plná URL' },
      { key: 'alt', label: 'Alt text', type: 'text', hint: 'Popis obrázku pro čtečky a SEO' },
      { key: 'caption', label: 'Popisek pod obrázkem', type: 'text', hint: 'Volitelné' },
      { key: 'maxwidth', label: 'Maximální šířka', type: 'select', options: [
        { value: '100%', label: 'Plná šířka' },
        { value: '720px', label: 'Střední (720px)' },
        { value: '480px', label: 'Malá (480px)' },
      ]},
    ],
    defaults: { src: '', alt: '', caption: '', maxwidth: '100%' },
    render: function(p) {
      if (!p.src) return '<!-- image: no src -->';
      var caption = p.caption ? '<figcaption style="font-size:0.78rem;color:rgba(255,255,255,0.35);margin-top:0.5rem;text-align:center">' + p.caption + '</figcaption>' : '';
      return '<figure style="margin:1.5rem 0;text-align:center">' +
        '<img src="' + p.src + '" alt="' + p.alt + '" style="max-width:' + p.maxwidth + ';width:100%;border-radius:10px;display:block;margin:0 auto" loading="lazy">' +
        caption + '</figure>';
    }
  },

  faq_block: {
    label: 'Často kladené dotazy',
    description: 'Accordion s otázkami a odpověďmi',
    schema: [
      { key: 'title', label: 'Název skupiny', type: 'text', hint: 'Např: Přechod k FREE for YOU' },
      { key: 'items', label: 'Otázky', type: 'array', arrayFields: [
        { key: 'q', label: 'Otázka', type: 'text' },
        { key: 'a', label: 'Odpověď', type: 'textarea' },
      ]},
    ],
    defaults: { title: 'Otázky a odpovědi', items: [{ q: 'Otázka?', a: 'Odpověď.' }] },
    render: function(p) {
      var items = (p.items || []).map(function(item) {
        return '<div class="faq-item">' +
          '<button class="faq-q" onclick="this.parentElement.classList.toggle(\'open\')">' + item.q + '<span class="faq-arrow">▾</span></button>' +
          '<div class="faq-a">' + item.a + '</div></div>';
      }).join('\n');
      var titleHtml = p.title ? '<div class="faq-group-title">' + p.title + '</div>' : '';
      return '<div class="faq-group">' + titleHtml + items + '</div>';
    }
  },

  features_grid: {
    label: 'Grid funkcí',
    description: 'Karty s názvem a popisem v mřížce',
    schema: [
      { key: 'section_label', label: 'Nadpis sekce', type: 'text', hint: 'Volitelné — zelený label nad gridem' },
      { key: 'columns', label: 'Sloupce', type: 'select', options: [
        { value: '2', label: '2 sloupce' },
        { value: '3', label: '3 sloupce' },
      ]},
      { key: 'items', label: 'Funkce', type: 'array', arrayFields: [
        { key: 'title', label: 'Název', type: 'text' },
        { key: 'desc', label: 'Popis', type: 'textarea' },
      ]},
    ],
    defaults: { section_label: '', columns: '2', items: [{ title: 'Funkce 1', desc: 'Popis funkce.' }] },
    render: function(p) {
      var cols = p.columns || '2';
      var items = (p.items || []).map(function(item) {
        return '<div class="eb-feature"><div><div class="eb-feature-title">' + item.title + '</div>' +
          '<div class="eb-feature-desc">' + item.desc + '</div></div></div>';
      }).join('\n');
      var label = p.section_label ? '<div class="sdileni-block-label">' + p.section_label + '</div>' : '';
      var grid = '<div class="eb-features" style="grid-template-columns:repeat(' + cols + ',1fr)">' + items + '</div>';
      if (label) {
        return '<div class="sdileni-block">' + label + '<div class="sdileni-block-content">' + grid + '</div></div>';
      }
      return grid;
    }
  },

  stat_row: {
    label: 'Řada čísel / statistik',
    description: 'Zvýrazněné metriky vedle sebe',
    schema: [
      { key: 'items', label: 'Statistiky', type: 'array', arrayFields: [
        { key: 'number', label: 'Číslo / hodnota', type: 'text' },
        { key: 'label', label: 'Popisek', type: 'text' },
      ]},
    ],
    defaults: { items: [{ number: '50 %', label: 'zisku reinvestujeme' }, { number: '2016', label: 'dodáváme od' }] },
    render: function(p) {
      var items = (p.items || []).map(function(item) {
        return '<div class="pribeh-stat"><div class="pribeh-stat-num">' + item.number + '</div>' +
          '<div class="pribeh-stat-label">' + item.label + '</div></div>';
      }).join('\n');
      return '<div class="pribeh-stats" style="grid-template-columns:repeat(' + (p.items || []).length + ',1fr)">' + items + '</div>';
    }
  },

  two_column: {
    label: 'Dva sloupce',
    description: 'Obsah ve dvou sloupcích',
    schema: [
      { key: 'left', label: 'Levý sloupec (HTML)', type: 'textarea' },
      { key: 'right', label: 'Pravý sloupec (HTML)', type: 'textarea' },
      { key: 'ratio', label: 'Poměr', type: 'select', options: [
        { value: '1fr 1fr', label: '50 / 50' },
        { value: '2fr 1fr', label: '66 / 33' },
        { value: '1fr 2fr', label: '33 / 66' },
      ]},
    ],
    defaults: { left: '<p>Levý sloupec</p>', right: '<p>Pravý sloupec</p>', ratio: '1fr 1fr' },
    render: function(p) {
      return '<div style="display:grid;grid-template-columns:' + p.ratio + ';gap:2rem;margin:1.5rem 0">' +
        '<div>' + p.left + '</div><div>' + p.right + '</div></div>';
    }
  },

  divider: {
    label: 'Oddělovač',
    description: 'Vizuální čára mezi bloky',
    schema: [
      { key: 'style', label: 'Styl', type: 'select', options: [
        { value: 'line', label: 'Tenká čára' },
        { value: 'space', label: 'Prázdné místo' },
        { value: 'dots', label: 'Tečky' },
      ]},
    ],
    defaults: { style: 'line' },
    render: function(p) {
      if (p.style === 'space') return '<div style="height:3rem"></div>';
      if (p.style === 'dots') return '<div style="text-align:center;color:rgba(255,255,255,0.15);letter-spacing:0.5em;margin:2rem 0">• • •</div>';
      return '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:2rem 0">';
    }
  }

};


// ═══════════════════════════════════
//  RENDERER
// ═══════════════════════════════════

function renderBlocksHTML(blocks) {
  return blocks.map(function(b) {
    var reg = BLOCK_REGISTRY[b.type];
    if (!reg) {
      return '<div style="padding:1.5rem;margin:1rem 0;background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.2);border-radius:10px;text-align:center">' +
        '<div style="font-size:0.82rem;color:rgba(224,85,85,0.8);font-weight:600">Neznámý blok: ' + b.type + '</div>' +
        '<div style="font-size:0.72rem;color:rgba(255,255,255,0.3);margin-top:0.3rem">Tento typ bloku není v registru. Přidejte ho do BLOCK_REGISTRY.</div></div>';
    }
    try {
      var html = reg.render(b.props);
      if (!html || html.trim() === '') {
        return '<div style="padding:1rem;margin:1rem 0;background:rgba(255,200,50,0.06);border:1px dashed rgba(255,200,50,0.2);border-radius:8px;text-align:center;font-size:0.78rem;color:rgba(255,200,50,0.5)">' +
          reg.label + ' — prázdný blok</div>';
      }
      return html;
    } catch(e) {
      return '<div style="padding:1rem;margin:1rem 0;background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.2);border-radius:10px;text-align:center">' +
        '<div style="font-size:0.82rem;color:rgba(224,85,85,0.8)">Chyba v bloku: ' + reg.label + '</div>' +
        '<div style="font-size:0.72rem;color:rgba(255,255,255,0.3);margin-top:0.3rem">' + e.message + '</div></div>';
    }
  }).join('\n\n      ');
}

function renderPageHTML(page, inlineCss) {
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
    (inlineCss ? '<style>' + inlineCss + '</style>\n' : '<link rel="stylesheet" href="../styles.css">\n') +
    (page.customCss ? '<style>' + page.customCss + '</style>\n' : '') +
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
  try {
    var stored = JSON.parse(localStorage.getItem(STORE_KEY));
    if (stored && stored.length > 0) return stored;
  } catch(e) {}
  // First run — seed with existing site pages
  return getInitialPages();
}

function savePages(pages) {
  localStorage.setItem(STORE_KEY, JSON.stringify(pages));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ── Seed data — existing pages ──────────

// ═══════════════════════════════════
//  SEED DATA (auto-generated from HTML)
// ═══════════════════════════════════

var SEED_PAGES = {
  'blog/co-se-deje-s-prebytkovou-elektricinou': {
    title: 'Co se děje s přebytky ze solárů | FREE for YOU',
    desc: 'Solár vyrábí i když nikdo není doma. Co se stane s přebytkovou elektřinou a jak funguje sdílení v komunitě FREE for YOU.',
    h1: 'Co se děje s elektřinou ze solárů, když ji nikdo nespotřebuje',
    lead: '',
    blocks: [
      { type: 'raw_html', props: { code: '<section class="post-section">\n    <div class="post-inner">\n\n      <div class="post-hero-img">\n        <div class="blog-img-placeholder post-img-placeholder">\n          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>\n          <span>Obrázek článku</span>\n        </div>\n      </div>\n\n      <div class="post-body">\n        \n          <p>Sluneční elektrárna se neřídí tím, jestli jste doma. Vyrábí, když svítí slunce — bez ohledu na to, jestli v tu chvíli někdo vaří nebo spí. Co se stane s elektřinou, kterou nikdo okamžitě nespotre?</p>\n\n          <h2>Elektřina nemizí — jde do sítě</h2>\n          <p>Přebytková elektřina se automaticky přelévá do distribuční sítě. Odtud ji čerpají ostatní odběratelé v okolí. Fyzicky jde o tok elektronů — elektřina z vaší střechy může svítit sousedovi dřív, než doputuje z vzdálené elektrárny.</p>\n\n          <h2>Jak to funguje u FREE for YOU</h2>\n          <p>Energie z vlastních zdrojů FREE for YOU se rozděluje ve třech krocích. Nejdřív za zvýhodněnou cenu dostane zákazník, u kterého zdroj stojí. Pak se rozdělí podle Proudíků — zákazníci, kteří jsou s námi déle a odebírají víc, mají vyšší nárok. Co zbyde, dostane rovným dílem každý zákazník FREE for YOU.</p>\n          <p>Nejde o fyzickou elektřinu — ta teče přes distribuční síť jako vždy. Jde o finanční dopad výroby, který se projeví na vaší faktuře.</p>\n\n          <h2>Proč to dělá rozdíl</h2>\n          <p>Čím více vlastní výroby komunita má, tím méně závisí na tržní ceně. Elektrárna postavená dnes bude snižovat cenu i za deset let — protože slunce za svit fakturu nepošle.</p>\n        \n      </div>\n\n      <div class="post-back">\n        <a href="../podpora-blog.html" class="post-back-link">← Zpět na blog</a>\n      </div>\n\n    </div>\n  </section>' } },
    ]
  },
  'blog/proc-cena-elektriciny-nesouvisí-s-fakturou': {
    title: 'Proč cena elektřiny na burze nesouvisí s fakturou | FREE for YOU',
    desc: 'Cena elektřiny na burze klesla, ale zálohy zůstávají stejné. Vysvětlujeme proč — a jak to řeší FREE for YOU.',
    h1: 'Proč cena elektřiny na burze nesouvisí s tím, co platíte na faktuře',
    lead: '',
    blocks: [
      { type: 'raw_html', props: { code: '<section class="post-section">\n    <div class="post-inner">\n\n      <div class="post-hero-img">\n        <div class="blog-img-placeholder post-img-placeholder">\n          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>\n          <span>Obrázek článku</span>\n        </div>\n      </div>\n\n      <div class="post-body">\n        \n          <p>Když noviny píšou, že cena elektřiny na burze klesla, většina lidí očekává, že se to projeví na jejich faktuře. Nestane se. Aspoň ne hned — a ne automaticky.</p>\n\n          <h2>Kde se bere cena na vaší faktuře</h2>\n          <p>Faktura za elektřinu se skládá z několika částí. Největší jsou dvě: <strong>distribuce</strong> a <strong>silová elektřina</strong>. Distribuci platíte svému distributorovi (ČEZ, EG.D nebo PRE) — a ta je regulovaná státem. Na tu burza nemá vliv.</p>\n          <p>Silová elektřina je ta část, kterou nakupuje váš dodavatel. A tady to zajímavé začíná.</p>\n\n          <h2>Dodavatelé nenakupují na spotě každý den</h2>\n          <p>Většina dodavatelů nekupuje elektřinu den po dni za aktuální burzovní cenu. Nakupují ji dopředu — měsíce nebo roky předem — za takzvané forwardové ceny. Když jste u dodavatele s fixním tarifem, cena vaší elektřiny byla sjednána možná rok před tím, než vám přišla první faktura.</p>\n          <p>Burza může být levná dnes. Ale váš dodavatel ji koupil draho loni v zimě.</p>\n\n          <h2>Jak to funguje u FREE for YOU</h2>\n          <p>U FREE for YOU vidíte na faktuře přesně, kolik platíte za silovou elektřinu a kolik za distribuci. Nic není schované v globální sazbě. Když ceny na trhu klesají, snažíme se to promítnout do nových smluv co nejdřív — ne za rok, až skončí aktuální smluvní období.</p>\n          <p>Vlastní zdroje, které budujeme, nás od tržní ceny postupně osvobozují. Elektřina vyrobená na vlastní střeše nestojí to, co říká burza.</p>\n        \n      </div>\n\n      <div class="post-back">\n        <a href="../podpora-blog.html" class="post-back-link">← Zpět na blog</a>\n      </div>\n\n    </div>\n  </section>' } },
    ]
  },
  'blog/zmena-dodavatele-co-se-zmeni': {
    title: 'Změna dodavatele: co se změní a co ne | FREE for YOU',
    desc: 'Dodávka se nepřeruší, zásuvky zůstanou stejné. Vysvětlujeme krok za krokem, jak přechod k FREE for YOU probíhá.',
    h1: 'Změna dodavatele: co se opravdu změní a co zůstane stejné',
    lead: '',
    blocks: [
      { type: 'raw_html', props: { code: '<section class="post-section">\n    <div class="post-inner">\n\n      <div class="post-hero-img">\n        <div class="blog-img-placeholder post-img-placeholder">\n          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>\n          <span>Obrázek článku</span>\n        </div>\n      </div>\n\n      <div class="post-body">\n        \n          <p>Změna dodavatele energií zní složitě. Přitom je to jedna z nejjednodušších administrativních věcí, které za vás dnes někdo jiný celé vyřídí. Pojďme si projít, co se opravdu stane — a co vůbec ne.</p>\n\n          <h2>Co se nezmění</h2>\n          <p><strong>Distribuce.</strong> Elektřina nebo plyn teče do vašeho domu stejnou sítí jako dřív. Distributor (ČEZ, EG.D nebo PRE) zůstává stejný — ten si nevybíráte, závisí na tom, kde bydlíte. Fyzická dodávka se při přechodu nepřerušuje ani na minutu.</p>\n          <p><strong>Termíny odečtů</strong> zůstávají stejné. Provádí je distributor, ne dodavatel.</p>\n          <p><strong>Vaše zásuvky, kotel, sporák</strong> — nic z toho se nedotýkáme.</p>\n\n          <h2>Co se změní</h2>\n          <p>Změní se, kdo vám posílá fakturu. A za jakou cenu. A jak s vámi komunikuje.</p>\n          <p>Přechod trvá standardně 6 až 8 týdnů. Většinu té doby se čeká na lhůty na straně distribuce — administrativní proces, který za vás vyřídíme.</p>\n\n          <h2>Co musíte udělat vy</h2>\n          <p>Vyplnit formulář. Podepsat smlouvu a plnou moc. To je vše. Výpověď stávajícímu dodavateli, komunikaci s distributorem a přihlášení odběrného místa zařídíme za vás.</p>\n          <p>Nejjednodušší způsob, jak se přesvědčit, je zkusit to. Přechod je možné kdykoliv zrušit — bez sankcí, pokud se stihnete rozhodnout včas.</p>\n        \n      </div>\n\n      <div class="post-back">\n        <a href="../podpora-blog.html" class="post-back-link">← Zpět na blog</a>\n      </div>\n\n    </div>\n  </section>' } },
    ]
  },
  'ceny-aktualni-nabidka': {
    title: 'Aktuální nabídka elektřiny — FREE for YOU energie',
    desc: 'Aktuální ceny silové elektřiny FREE for YOU pro domácnosti. Tarify FIX 2025 pro distribuční území ČEZ, PRE a EG.D.',
    h1: 'Aktuální nabídka',
    lead: 'Zde vidíte naše aktuálně nabízené tarify. Vyberte si, co odpovídá vašemu způsobu odběru.',
    blocks: [
      { type: 'raw_html', props: { code: '<!-- TARIFY -->\n  <section class="tarify-section">\n    <div class="tarify-inner">\n\n      <!-- FIX TARIFY -->\n      <div class="tarify-group">\n        <div class="tarify-group-label">\n          <div class="tarify-group-title">Fixní tarify</div>\n          <div class="tarify-group-desc">Víte přesně, za kolik platíte. Cena je dohodnutá předem a nemění se podle dění na trhu. Vhodné pro ty, kdo chtějí jistotu a klid při plánování výdajů domácnosti.</div>\n        </div>\n\n        <div class="tarify-cards">\n\n          <!-- FIX elektřina -->\n          <div class="tarif-card tarif-elektrina">\n            <div class="tarif-card-header">\n              <div class="tarif-type-label">Elektřina</div>\n              <div class="tarif-name">Tarif FIX2026</div>\n              <div class="tarif-subtitle">Fixní cena elektřiny na celý rok 2026</div>\n            </div>\n            <div class="tarif-price-block">\n              <div class="tarif-price-main">\n                <span class="tarif-price-num">X,XX</span>\n                <span class="tarif-price-unit">Kč / kWh s DPH</span>\n              </div>\n              <div class="tarif-price-sub">X,XX Kč / kWh bez DPH</div>\n            </div>\n            <div class="tarif-card-footer">\n              <a href="index.html#final-cta" class="tarif-cta">Chci tento tarif →</a>\n            </div>\n          </div>\n\n          <!-- FIX plyn -->\n          <div class="tarif-card tarif-plyn">\n            <div class="tarif-card-header">\n              <div class="tarif-type-label">Plyn</div>\n              <div class="tarif-name">Tarif FIX2026</div>\n              <div class="tarif-subtitle">Fixní cena plynu na celý rok 2026</div>\n            </div>\n            <div class="tarif-price-block">\n              <div class="tarif-price-main">\n                <span class="tarif-price-num">X,XX</span>\n                <span class="tarif-price-unit">Kč / kWh s DPH</span>\n              </div>\n              <div class="tarif-price-sub">X,XX Kč / kWh bez DPH</div>\n            </div>\n            <div class="tarif-card-footer">\n              <a href="index.html#final-cta" class="tarif-cta">Chci tento tarif →</a>\n            </div>\n          </div>\n\n        </div>\n      </div>\n\n      <!-- DIVIDER -->\n      <div class="tarify-divider"></div>\n\n      <!-- SPOT TARIFY -->\n      <div class="tarify-group">\n        <div class="tarify-group-label">\n          <div class="tarify-group-title">SPOT tarify</div>\n          <div class="tarify-group-desc">Cena se mění každou hodinu podle toho, kolik elektřina nebo plyn stojí na burzovním trhu. Když je trh levný — platíte méně. Vhodné pro ty, kdo sledují spotřebu a dokážou ji přizpůsobit době, kdy je energie nejlevnější.</div>\n        </div>\n\n        <div class="tarify-cards">\n\n          <!-- SPOT elektřina -->\n          <div class="tarif-card tarif-elektrina tarif-spot">\n            <div class="tarif-card-header">\n              <div class="tarif-type-label">Elektřina</div>\n              <div class="tarif-name">Tarif SPOT</d' } },
    ]
  },
  'ceny-ceniky': {
    title: 'Ceníky elektřiny 2026 — FREE for YOU energie',
    desc: 'Kompletní ceníky elektřiny FREE for YOU ke stažení v PDF. Ceny distribuce, silové elektřiny a poplatků pro všechna distribuční území.',
    h1: 'Ceníky',
    lead: 'Vyberte své distribuční území a zobrazte aktuální ceníky elektřiny a plynu.',
    blocks: [
      { type: 'raw_html', props: { code: '<section class="ceniky-section">\n    <div class="ceniky-inner">\n\n      <div class="ceniky-selectors">\n        <!-- Komodita -->\n        <div class="distrib-selector">\n          <div class="distrib-label">Komodita</div>\n          <div class="komodita-pills">\n            <button class="komodita-tab active" data-komodita="elektrina">Elektřina</button>\n            <button class="komodita-tab" data-komodita="plyn">Plyn</button>\n          </div>\n        </div>\n\n        <!-- Distributor -->\n        <div class="distrib-selector">\n          <div class="distrib-label">Distribuční území</div>\n          <div class="distrib-pills">\n            <button class="distrib-tab active" data-distrib="cez">ČEZ Distribuce</button>\n            <button class="distrib-tab" data-distrib="egd">EG.D</button>\n            <button class="distrib-tab" data-distrib="pre">PRE</button>\n          </div>\n        </div>\n      </div>\n\n      <!-- ČEZ panel -->\n      <div class="ceniky-panel active" id="panel-cez">\n        <div class="ceniky-panel-header">\n          <div class="ceniky-panel-title">ČEZ Distribuce</div>\n          <button class="archive-toggle" data-target="archive-cez">Archivní ceníky</button>\n        </div>\n\n        <div class="ceniky-grid">\n          <a href="#" class="cenik-card">\n            <div class="cenik-card-body">\n              <div class="cenik-card-meta meta-elektrina">Elektřina · platný od 1. 1. 2026</div>\n              <div class="cenik-card-name">Ceník elektřiny FIX2026 — ČEZ</div>\n            </div>\n            <div class="cenik-card-footer"><span class="cenik-card-size">PDF · 284 kB</span><span class="cenik-card-btn">Stáhnout</span></div>\n          </a>\n          <a href="#" class="cenik-card">\n            <div class="cenik-card-body">\n              <div class="cenik-card-meta meta-plyn">Plyn · platný od 1. 1. 2026</div>\n              <div class="cenik-card-name">Ceník plynu FIX2026 — ČEZ</div>\n            </div>\n            <div class="cenik-card-footer"><span class="cenik-card-size">PDF · 196 kB</span><span class="cenik-card-btn">Stáhnout</span></div>\n          </a>\n          <a href="#" class="cenik-card">\n            <div class="cenik-card-body">\n              <div class="cenik-card-meta meta-elektrina">Elektřina · platný od 1. 1. 2026</div>\n              <div class="cenik-card-name">Ceník elektřiny SPOT — ČEZ</div>\n            </div>\n            <div class="cenik-card-footer"><span class="cenik-card-size">PDF · 211 kB</span><span class="cenik-card-btn">Stáhnout</span></div>\n          </a>\n          <a href="#" class="cenik-card">\n            <div class="cenik-card-body">\n              <div class="cenik-card-meta meta-plyn">Plyn · platný od 1. 1. 2026</div>\n              <div class="cenik-card-name">Ceník plynu SPOT — ČEZ</div>\n            </div>\n            <div class="cenik-card-footer"><span class="cenik-card-size">PDF · 178 kB</span><span class="cenik-card-btn">Stáhnout</span></div>\n          </a>\n          <a href="#" class="cenik-card">\n         ' } },
    ]
  },
  'ceny-kalkulacka': {
    title: 'Kalkulačka ceny elektřiny — FREE for YOU energie',
    desc: 'Spočítejte si orientační roční náklad za elektřinu u FREE for YOU. Zadejte spotřebu a PSČ — kalkulačka zobrazí celkovou cenu včetně distribuce.',
    h1: 'Kalkulačka',
    lead: 'Zadejte loňskou roční spotřebu a zjistěte, kolik byste platili u FREE for YOU.',
    blocks: [
      { type: 'raw_html', props: { code: '<section class="kalk-section">\n    <div class="kalk-card">\n      <div class="kalk-tabs-nav">\n        <button class="kalk-tab-btn active" data-tab="jednoducha">Jednoduchá</button>\n        <button class="kalk-tab-btn" data-tab="slozita">Přesná</button>\n        <div class="kalk-tab-slider" id="kalk-tab-slider"></div>\n      </div>\n\n    <!-- JEDNODUCHÁ -->\n    <div class="kalk-tab-panel active" id="tab-jednoducha">\n      <div class="kalk-wide-inner">\n\n        <div class="kalk-form-row">\n\n          <!-- Levý sloupec: spotřeba + distributor + srovnání -->\n          <div class="kalk-form-col">\n\n            <div class="kalk-step">\n              <div class="kalk-step-label">Loňská roční spotřeba elektřiny</div>\n              <div class="kalk-input-row">\n                <input type="number" id="spotreba" class="kalk-input" placeholder="např. 3,5" min="0" max="1000" step="0.1">\n                <span class="kalk-input-unit">MWh / rok</span>\n              </div>\n              <div class="kalk-hint">Najdete ji na loňském vyúčtování. 1 MWh = 1 000 kWh</div>\n            </div>\n\n            <div class="kalk-step">\n              <div class="kalk-step-label">PSČ odběrného místa</div>\n              <div class="kalk-psc-row">\n                <input type="text" id="psc-j" class="kalk-input kalk-input-psc" placeholder="např. 12000" maxlength="5" inputmode="numeric" pattern="[0-9]{5}">\n                <div class="kalk-psc-result" id="psc-j-result"><svg class="psc-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span class="psc-text"></span></div>\n              </div>\n              <div class="kalk-hint">Podle PSČ automaticky zjistíme vaše distribuční území.</div>\n            </div>\n\n<button class="kalk-submit" id="kalk-btn">Spočítat →</button>\n\n          </div>\n\n          <!-- Pravý sloupec: výběr tarifu -->\n          <div class="kalk-form-col">\n            <div class="kalk-step">\n              <div class="kalk-step-label">Váš odběr odpovídá</div>\n              <div class="kalk-tarify" id="tarif-pills">\n                <button class="kalk-tarif active" data-tarif="24">\n                  <div class="kalk-tarif-name">Základní odběr</div>\n                  <div class="kalk-tarif-desc">Svícení a spotřebiče, bez el. vytápění</div>\n                  <div class="kalk-tarif-code">D01d / D02d</div>\n                </button>\n                <button class="kalk-tarif" data-tarif="aku8">\n                  <div class="kalk-tarif-name">S elektrickým vařením</div>\n                  <div class="kalk-tarif-desc">Svícení + sporák nebo trouba na elektřinu</div>\n                  <div class="kalk-tarif-code">D25d / D26d / D27d</div>\n                </button>\n                <button class="kalk-tarif" data-tarif="aku16">\n                  <div class="kalk-tarif-name">S vytápěním nebo ohřevem vody</div>\n                  <div class="kalk-tarif-desc">Přímotop, tepelné čerpadlo ' } },
    ]
  },
  'index': {
    title: 'FREE for YOU energie — Stabilní energie z vlastních zdrojů',
    desc: 'Dodáváme elektřinu od roku 2016. Stavíme vlastní solární zdroje na střechách a 50 % zisku reinvestujeme. Kalkulačka, ceníky a transparentní podmínky.',
    h1: 'Stabilní energiebez zbytečné marže.',
    lead: '',
    blocks: [
      { type: 'raw_html', props: { code: '<!-- BENEFITS -->\n<section id="benefits">\n  <div class="section-inner">\n    <div class="section-label">Proč FREE for YOU</div>\n    <h2 class="section-title">Energie bez zbytečných starostí.</h2>\n    <p class="section-sub" style="margin-bottom:2.5rem;">Žádné instalace, žádné výpadky, žádná překvapení na faktuře — jen férová dodávka, o kterou se postaráme za Vás.</p>\n    <div class="benefits-grid">\n      <div class="benefit-card">\n        <div class="benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h13l-3-3M21 16H8l3 3"/></svg></div>\n        <div class="benefit-title">Změnu vyřídíme za Vás</div>\n        <p class="benefit-desc">Celý proces přechodu zajišťujeme od A do Z. Stačí vyplnit formulář a nahrát příslušné dokumenty— o zbytek se staráme my.</p>\n      </div>\n      <div class="benefit-card">\n        <div class="benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg></div>\n        <div class="benefit-title">Bez přerušení dodávky</div>\n        <p class="benefit-desc">Přechod probíhá plynule. Energie teče nepřetržitě — žádná instalace, žádné výpadky, žádné starosti.</p>\n      </div>\n      <div class="benefit-card">\n        <div class="benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 5 6v5c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg></div>\n        <div class="benefit-title">Stabilní a dlouhodobá spolupráce</div>\n        <p class="benefit-desc">Budujeme vlastní výrobní zdroje, aby Vaše cena zůstala stabilní i za deset let — ne jen pár měsíců.</p>\n      </div>\n    </div>\n    <div class="benefits-cta">\n      <a href="ceny-kalkulacka.html" class="btn-primary">Spočítat nabídku</a>\n    </div>\n  </div>\n</section>\n\n<!-- HOW IT WORKS -->\n<section id="how">\n  <div class="section-inner">\n    <div class="section-label">Jak to funguje</div>\n    <h2 class="section-title light">Tři kroky. A hotovo.</h2>\n    <p class="section-sub light">Celý přechod zvládnete za pár minut. Zbytek zařídíme my.</p>\n\n    <div class="steps-grid">\n      <div class="step-card">\n        <div class="step-num">01</div>\n        <div class="step-title">Vyplníte krátký formulář</div>\n        <p class="step-desc">Pár základních údajů — adresa odběrného místa, aktuální dodavatel a kontakt. A nahrajete nutné dokumenty. Trvá to asi 3 minuty.</p>\n      </div>\n      <div class="step-card">\n        <div class="step-num">02</div>\n        <div class="step-title">Připravíme smlouvu a vyřídíme změnu</div>\n        <p class="step-desc">Připravíme vše potřebné, vypovíme stávající smlouvu a zajistíme vše potřebné s distribucí. Za Vás.</p>\n      </div>\n      <div class="step-card">\n        <div class="step-num">03</div>\n        <div class="step-title">Odebí' } },
    ]
  },
  'jak-energobanking': {
    title: 'Energobanking — zákaznický portál FREE for YOU',
    desc: 'Energobanking je váš online přehled spotřeby, faktur, výroby a sdílení elektřiny. Zdarma pro každého zákazníka FREE for YOU.',
    h1: 'Energobanking',
    lead: 'Zákaznický portál FREE for YOU. Jedno místo pro spotřebu, výrobu, sdílení, platby i historii — bez zbytečného hledání.',
    blocks: [
      { type: 'content_section', props: { label: 'Co to je', content: 'Energobanking je virtuální účet, který FREE for YOU vytvoří automaticky každému zákazníkovi po registraci. Přístup je zdarma — stačí webový prohlížeč.\n\nFunguje jako rozcestník pro vše, co se u vás děje s energiemi. Vidíte faktury, spotřebu, výrobu ze solárů, sdílení elektřiny i historii plateb — na jednom místě, bez nutnosti psát e-maily nebo volat.' } },
      { type: 'content_section', props: { label: 'Co v něm najdete', content: 'Faktury a platby\n                Historie vyúčtování, aktuální zálohy, přehled plateb. Vše ke stažení jako PDF.' } },
      { type: 'content_section', props: { label: 'Jak se přihlásit', content: 'Energobanking účet vzniká automaticky po podpisu smlouvy s FREE for YOU. Přihlašovací údaje dostanete e-mailem.\n\nPokud jste zákazník a přihlašovací údaje nemáte, napište nám na <a href="mailto:info@freeforyou.cz" class="eb-link">info@freeforyou.cz</a> nebo zavolejte — přístup obnovíme obratem.' } },
      { type: 'cta_block', props: { title: 'Přejít do Energobankingu', description: 'Portál je dostupný online — stačí přihlašovací údaje z e-mailu.', btn1_text: 'Otevřít Energobanking →', btn1_url: 'https://www.energobanking.cz/', btn2_text: 'Potřebuji pomoc', btn2_url: 'podpora-kontakty.html' } },
    ]
  },
  'jak-proudiky': {
    title: 'Proudíky — věrnostní program FREE for YOU energie',
    desc: 'Proudíky jsou body za odběr energie u FREE for YOU. Podle nich se rozděluje elektřina z vlastních obnovitelných zdrojů. Silver a Gold členství za doporučení.',
    h1: 'Proudíky',
    lead: 'Body za odběr energie, podle kterých se rozděluje elektřina z našich vlastních zdrojů. Čím víc odebíráte a čím déle jste s námi, tím větší podíl máte.',
    blocks: [
      { type: 'content_section', props: { label: 'Co jsou Proudíky', content: 'FREE for YOU reinvestuje 50 % čistých zisků do obnovitelných zdrojů a akumulačních zařízení. Elektřina z těchto zdrojů se následně rozděluje mezi zákazníky — a Proudíky určují, jaký podíl vám náleží.\n\nProudíky jsou body, které sbíráte odběrem energie u FREE for YOU. Čím více Proudíků máte, tím větší poměrnou část elektřiny z vlastních zdrojů dostanete.' } },
      { type: 'content_section', props: { label: 'Jak je získáváte', content: 'Proudíky se přičítají automaticky za každé odběrné místo zapsané na vaše jméno. Žádné formuláře, žádné přihlašování — prostě odebíráte a body přibývají.' } },
      { type: 'content_section', props: { label: 'Úrovně členství', content: 'Aktivním doporučováním nových zákazníků si můžete vylepšit členství — a tím násobit rychlost, jakou Proudíky sbíráte.' } },
      { type: 'content_section', props: { label: 'K čemu to vede', content: 'Čím více Proudíků nasbíráte, tím větší podíl elektřiny z vlastních zdrojů FREE for YOU vám náleží. Tato elektřina je vyráběná na střechách existujících objektů — a její cena nezávisí na burze.\n\nKaždý nový zdroj, který FREE for YOU postaví, zvyšuje celkový objem elektřiny k rozdělení. A s ním roste i reálný přínos každého Proudíku.' } },
      { type: 'cta_block', props: { title: 'Začněte sbírat Proudíky', description: 'Stačí být zákazníkem FREE for YOU. Body se počítají automaticky od prvního dne odběru.', btn1_text: 'Doporučte a vylepšete členství →', btn1_url: 'proc-slevy-za-doporuceni.html', btn2_text: 'Kontaktujte nás', btn2_url: 'podpora-kontakty.html' } },
    ]
  },
  'jak-sdileni-elektriny': {
    title: 'Sdílení elektřiny — Elektřina od souseda | FREE for YOU',
    desc: 'Máte solár a přebytky? Prodejte je sousedovi přes FREE for YOU. Cenu určujete vy, vše se řídí přes Energobanking.',
    h1: 'Sdílení elektřiny',
    lead: 'Máte solár a vyrábíte víc, než spotřebujete? Místo prodeje do sítě za výkupní cenu můžete elektřinu prodat přímo sousedovi — za cenu, kterou si sami určíte.',
    blocks: [
      { type: 'content_section', props: { label: 'Jak to funguje', content: 'Elektřina od souseda je služba, která propojuje zákazníky FREE for YOU s vlastním zdrojem elektřiny s těmi, kteří chtějí nakupovat lokálně vyrobenou elektřinu za výhodnější cenu.\n\nVy jako Výrobce prodáváte přebytky přímo přes FREE for YOU jinému zákazníkovi — Odběrateli. My zajistíme zúčtování, fakturaci a soulad s legislativou. Vy se domluvíte na ceně.' } },
      { type: 'content_section', props: { label: 'Co si určujete vy', content: 'Cenu elektřiny pro odběratele si nastavujete sami. Jediná podmínka: nesmí být nižší než poplatek FREE for YOU za zprostředkování služby.\n\nCenu můžete jednou za 4 měsíce změnit — stačí nový návrh přes Energobanking. Odběratel má 336 hodin na přijetí. Pokud nesouhlasí, sdílení skončí ke dni před účinností nové ceny.\n\nSdílet můžete neomezenému počtu odběratelů najednou. Určíte poměr rozdělení elektřiny — nebo ji rozdělíte rovným dílem.' } },
      { type: 'content_section', props: { label: 'Co zařídí FREE for YOU', content: 'Zúčtování, fakturaci, komunikaci s distributorem a dodržení legislativy. Prodej přebytků, které odběratel nestihne spotřebovat, probíhá standardně dle vaší smlouvy.\n\nSdílení probíhá na dobu neurčitou. Ukončit ho může kdykoli každá ze stran — přes Energobanking, s výpovědní lhůtou od 1. dne druhého následujícího kalendářního měsíce.' } },
      { type: 'cta_block', props: { title: 'Chcete začít sdílet?', description: 'Vše nastavíte v Energobankingu. Potřebujete jen odběratele a aktivní smlouvu o výkupu přebytků.', btn1_text: 'Přejít do Energobankingu →', btn1_url: 'https://www.energobanking.cz/', btn2_text: 'elektrinaodsouseda.cz', btn2_url: 'https://www.elektrinaodsouseda.cz/' } },
    ]
  },
  'jak-vykup-elektriny': {
    title: 'Prodej elektřiny — FREE for YOU energie',
    desc: 'Prodejte přebytky z fotovoltaiky za tržní cenu. FREE for YOU vykoupí vaši elektřinu s poplatkem 19 %, minimum 780 Kč.',
    h1: 'Prodej elektřiny',
    lead: 'Když váš solár, větrník nebo vodní zdroj vyrobí víc, než spotřebujete, přebytky nemusí téct zadarmo do sítě. Můžete je prodat — a investici vrátit rychleji.',
    blocks: [
      { type: 'content_section', props: { label: 'Co se děje s přebytky', content: 'Fotovoltaika, vítr ani voda nevyrábí podle toho, kolik zrovna spotřebujete. Přebytky jdou automaticky do sítě — bez náhrady, pokud nemáte sjednáno jinak.\n\nBaterie jsou jedním řešením. Prodej přebytků FREE for YOU je druhé — a nevyžaduje žádnou investici navíc.' } },
      { type: 'content_section', props: { label: 'Jak to funguje', content: 'Uzavřete s námi smlouvu o výkupu přebytků. Přebytečná elektřina, kterou váš zdroj dodá do sítě, se automaticky zaúčtuje a proplatí za tržní cenu.\n\nZ výkupní ceny odečítáme náš poplatek — <strong>19 % z tržní ceny, minimálně 780 Kč</strong>. Zbytek jde na váš účet. Vše vidíte v Energobankingu: kolik jste vyrobili, kolik prodali a kolik vám přijde.' } },
      { type: 'content_section', props: { label: 'Co z toho máte', content: 'Přebytky přestanou být ztráta a začnou být příjem. Návratnost investice do fotovoltaiky se tím zkracuje — bez toho, abyste museli cokoliv dalšího řešit.\n\nProdej přebytků a sdílení elektřiny přes službu Elektřina od souseda se navzájem nevylučují. Když sdílíte elektřinu přímo odběrateli, řídí se ta část jiným cenovým ujednáním. Co odběratel nestihne spotřebovat, jde do standardního výkupu.' } },
      { type: 'content_section', props: { label: 'Kde to sledujete', content: 'V Energobankingu máte přehled o výrobě, prodeji i výplatách. Vidíte historii po zúčtovacích obdobích a okamžitě víte, na kolik přebytky vyšly.' } },
      { type: 'cta_block', props: { title: 'Chcete začít prodávat přebytky?', description: 'Smlouvu o výkupu vyřídíme s vámi. Začít lze kdykoli — stačí nás kontaktovat.', btn1_text: 'Kontaktujte nás →', btn1_url: 'podpora-kontakty.html', btn2_text: 'Energobanking', btn2_url: 'https://www.energobanking.cz/' } },
    ]
  },
  'podpora-blog': {
    title: 'Blog — novinky ze světa energií | FREE for YOU',
    desc: 'Články o cenách elektřiny, solární energii a změně dodavatele. Bez zbytečného žargonu.',
    h1: 'Blog',
    lead: 'Novinky, vysvětlení a postřehy ze světa energií. Bez zbytečného žargonu.',
    blocks: [
      { type: 'raw_html', props: { code: '<section class="blog-section">\n    <div class="blog-inner">\n\n      <!-- FEATURED article -->\n      <a href="blog/proc-cena-elektriciny-nesouvisí-s-fakturou.html" class="blog-card blog-card-featured">\n        <div class="blog-card-img blog-card-img-featured">\n          <div class="blog-img-placeholder">\n            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>\n            <span>Obrázek článku</span>\n          </div>\n        </div>\n        <div class="blog-card-body">\n          <div class="blog-card-meta">\n            <span class="blog-tag">Energetika</span>\n            <span class="blog-date">5. června 2025</span>\n          </div>\n          <h2 class="blog-card-title">Proč cena elektřiny na burze nesouvisí s tím, co platíte na faktuře</h2>\n          <p class="blog-card-excerpt">Médii pravidelně proletí zpráva, že cena elektřiny na burze klesla na historické minimum. A přesto vaše zálohy zůstávají stejné. Jak je to možné? Vysvětlujeme, co se schovává mezi burzou a vaší zásuvkou.</p>\n          <div class="blog-card-read">Číst článek →</div>\n        </div>\n      </a>\n\n      <!-- Grid of smaller articles -->\n      <div class="blog-grid">\n\n        <a href="blog/co-se-deje-s-prebytkovou-elektricinou.html" class="blog-card">\n          <div class="blog-card-img">\n            <div class="blog-img-placeholder">\n              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>\n              <span>Obrázek článku</span>\n            </div>\n          </div>\n          <div class="blog-card-body">\n            <div class="blog-card-meta">\n              <span class="blog-tag">Solární energie</span>\n              <span class="blog-date">18. května 2025</span>\n            </div>\n            <h2 class="blog-card-title">Co se děje s elektřinou ze solárů, když ji nikdo nespotřebuje</h2>\n            <p class="blog-card-excerpt">Solární elektrárna vyrábí, i když nikdo doma není. Co se stane s přebytkovou elektřinou a jak funguje sdílení v rámci komunity FREE for YOU?</p>\n            <div class="blog-card-read">Číst článek →</div>\n          </div>\n        </a>\n\n        <a href="blog/zmena-dodavatele-co-se-zmeni.html" class="blog-card">\n          <div class="blog-card-img">\n            <div class="blog-img-placeholder">\n              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>\n              <span>Obrázek článku</span>\n            </div>\n          </div>\n          <div class="blog-card-body">\n            <div class="blog-card-meta">\n              <span class="blog-tag">Prakticky</span>\n              <span class="blog-date">2. dubna 2025</span>\n            </div>\n            <h2 class="blog-card-title">Změna dodavatele: co se opravdu změní a co zůstane stejné</h2>\n            <p class="blog-card-excerpt">Největší strach lidí při změně dodavatele je, že přijdou o dodávku. Spoiler: nepřijdou. Vysvětlujeme krok za krokem, co přechod obnáší a co si nemusíte řešit vůbec.</p>\n            <div class="blog-card-read">Číst článek →</div>\n          </div>\n        </a>\n\n      </div>\n\n    </div>\n  </section>' } },
    ]
  },
  'podpora-dokumenty': {
    title: 'Dokumenty ke stažení — FREE for YOU energie',
    desc: 'Smlouvy, obchodní podmínky, vzory faktur a plné moci FREE for YOU. Vše ke stažení nebo náhledu v PDF.',
    h1: 'Dokumenty',
    lead: 'Všechny důležité dokumenty na jednom místě. Kliknutím sekci rozbalíte a dokument stáhnete.',
    blocks: [
      { type: 'raw_html', props: { code: '<section class="docs-list-section">\n    <div class="docs-list-inner">\n      <div class="faq-item">\n        <button class="faq-q" onclick="toggleFaq(this)">\n          Smlouvy\n          <span class="faq-arrow">▾</span>\n        </button>\n        <div class="faq-a docs-faq-body">\n          <a onclick="openPdfModal(\'docs/smlouvy/smlouva-elektrina-fo.pdf\', \'Smlouva o dodávce elektřiny\')" href="#" class="doc-row">\n            <div class="doc-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>\n            <div class="doc-row-body"><div class="doc-row-name">Smlouva o dodávce elektřiny</div><div class="doc-row-meta">PDF · aktuální verze</div></div>\n            <div class="doc-row-dl">Stáhnout</div>\n          </a>\n          <a href="#" class="doc-row doc-row-disabled">\n            <div class="doc-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>\n            <div class="doc-row-body"><div class="doc-row-name">Vzorová smlouva o dodávce plynu</div><div class="doc-row-meta">PDF · aktuální verze</div></div>\n            <div class="doc-row-dl">Stáhnout</div>\n          </a>\n          <a href="#" class="doc-row doc-row-disabled">\n            <div class="doc-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 14l2 2 4-4"/></svg></div>\n            <div class="doc-row-body"><div class="doc-row-name">Vzorová smlouva o výkupu elektřiny</div><div class="doc-row-meta">PDF · aktuální verze</div></div>\n            <div class="doc-row-dl">Stáhnout</div>\n          </a>\n        </div>\n      </div>\n\n      <div class="faq-item">\n        <button class="faq-q" onclick="toggleFaq(this)">\n          Plné moci\n          <span class="faq-arrow">▾</span>\n        </button>\n        <div class="faq-a docs-faq-body">\n          <a href="#" class="doc-row doc-row-disabled">\n            <div class="doc-row-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 14l2 2 4-4"/></svg></div>\n            <div class="doc-row-body"><div class="doc-row-name">Plná moc — změna dodavatele</div><div class="doc-row-meta">PDF · aktuální verze</div></div>\n            <div class="' } },
    ]
  },
  'podpora-faq': {
    title: 'Časté dotazy — FREE for YOU energie',
    desc: 'Odpovědi na nejčastější otázky o změně dodavatele, fakturaci, distribuci a službách FREE for YOU.',
    h1: 'Časté dotazy',
    lead: 'Nenašli jste odpověď? Napište nebo zavolejte — odpovídá člověk.',
    blocks: [
      { type: 'faq_block', props: { title: 'Přechod k FREE for YOU', items: [{ q: 'Přijdu při přechodu o dodávku elektřiny nebo plynu?', a: 'Ne. Přechod mezi dodavateli probíhá čistě administrativně — fyzická dodávka se nepřerušuje ani na minutu. Elektřina nebo plyn teče dál stejnou sítí, mění se jen to, kdo vám posílá fakturu.' }, { q: 'Jak dlouho přechod trvá?', a: 'Standardně 6 až 8 týdnů od podpisu smlouvy. Většinu té doby běží lhůty na straně distribuce — my mezitím zařizujeme vše potřebné. Vy čekáte, my pracujeme.' }, { q: 'Co musím udělat já a co zařídíte vy?', a: 'Vy vyplníte krátký formulář a podepíšete smlouvu a plnou moc. Zbytek — výpověď stávající smlouvy, komunikace s distributorem, přihlášení odběrného místa — zařídíme za vás.' }, { q: 'Jaké dokumenty potřebuji k přechodu?', a: 'Stačí poslední vyúčtování od současného dodavatele a podepsaná plná moc. To je vše, co od vás potřebujeme, abychom mohli začít.' }, { q: 'Mohu přejít, i když mám smlouvu s výpovědní lhůtou?', a: 'Ano. Smlouvu za vás vypovíme a přechod naplánujeme tak, aby navazoval přesně na konec výpovědní lhůty. Nic neplatíte dvakrát.' }, { q: 'Mohu přejít jen s elektřinou, nebo musím i s plynem?', a: 'Přejít můžete s elektřinou, s plynem, nebo s obojím — záleží jen na vás. Každá komodita se řeší samostatně.' }, { q: 'Co když budu chtít odejít?', a: 'Podmínky ukončení smlouvy jsou jasně popsané ve smlouvě. Žádné skryté pokuty. Když se rozhodnete odejít, řeknete nám to a projdeme postup společně.' }] } },
      { type: 'faq_block', props: { title: 'Ceny a produkty', items: [{ q: 'Jaký je rozdíl mezi fixním a SPOT tarifem?', a: 'U fixního tarifu víte předem přesně, za kolik platíte — cena je dohodnutá na celé smluvní období. U SPOT tarifu se cena mění každou hodinu podle burzovního trhu. Když je trh levný, platíte méně. Když je drahý, platíte více. SPOT se vyplatí těm, kdo sledují spotřebu a dokážou ji přizpůsobit době, kdy je energie nejlevnější.' }, { q: 'Jak se tvoří cena energie u FREE for YOU?', a: 'Cena se skládá ze dvou částí — regulované složky (distribuce, daně, poplatky — stejné u všech dodavatelů) a obchodní složky, kterou stanovuje FREE for YOU. Část zisku z obchodní složky reinvestujeme do vlastních zdrojů. Když vlastní výroba roste, klesá naše závislost na tržní ceně — a to se časem projeví i na ceně pro vás.' }, { q: 'Co je Energobanking a musím ho používat?', a: 'Energobanking je váš zákaznický účet, kde vidíte faktury, spotřebu, historii plateb a dopad výroby komunity. Není povinný, ale doporučujeme ho — přehled o vlastní energii se hodí. Přístup dostanete automaticky po přechodu.' }, { q: 'Jak funguje systém slev za doporučení?', a: 'Když doporučíte FREE for YOU někomu dalšímu a ten přejde, získávají obě strany slevu na energii. Systém je nastaven tak, aby měl smysl jak pro toho, kdo doporučuje, tak pro toho, kdo přichází. Konkrétní podmínky a modelový příklad najdete na stránce <a href="proc-slevy-za-doporuceni.html" class="faq-link">Slevy za doporučení</a>.' }, { q: 'Mění se cena v průběhu smlouvy?', a: 'U fixního tarifu ne — cena je garantovaná po celou dobu smluvního období. U SPOT tarifu se mění každou hodinu podle trhu. O jakékoli změně ceníku vás vždy informujeme předem.' }, { q: 'Jsou v ceně zahrnuty i poplatky za distribuci?', a: 'Poplatky za distribuci jsou součástí vaší faktury, ale nejde o naši marži — jde o regulované platby, které odvádíme distributorovi ve vaší oblasti. Jsou stejné u každého dodavatele. Na faktuře je vždy vidíte odděleně.' }] } },
      { type: 'faq_block', props: { title: 'Pro stávající zákazníky', items: [{ q: 'Kdy probíhají odečty?', a: 'Odečty provádí váš distributor podle distribučního území — ne FREE for YOU. Při přechodu k nám se termíny odečtů nemění, stejně jako se nemění distributor. Ten závisí na tom, kde bydlíte, a nelze ho zvolit.' }, { q: 'Proč mohu mít dvě zálohy splatné ve stejném měsíci?', a: 'Zálohy FREE for YOU platíte vždy na následující kalendářní měsíc. Při přechodu proto může nastat situace, kdy vám přijdou dvě zálohy ve stejném měsíci — jedna za aktuální měsíc u původního dodavatele, jedna za následující u nás. Pokud si nejste jisti, jak váš rozpis záloh vypadá, projdeme ho s vámi.' }, { q: 'Vracíte přeplatky automaticky?', a: 'Ano, vždy automaticky. Přeplatek vám vrátíme do data splatnosti faktury na účet, ze kterého platíte zálohy. Nic nepožadujeme, nic nemusíte žádat.' }, { q: 'Kde najdu svoje smlouvy a faktury?', a: 'Všechny dokumenty — smlouvy, faktury, vyúčtování — najdete ve svém <a href="https://www.energobanking.cz/" target="_blank" class="faq-link">Energobankingu</a>. Obecné dokumenty a ceníky jsou k dispozici na stránce <a href="podpora-dokumenty.html" class="faq-link">Dokumenty</a>.' }, { q: 'Jak probíhá přepis odběrného místa?', a: 'Přepis řešíte při prodeji nebo pronájmu nemovitosti, kdy se mění odběratel. Kontaktujte nás — projdeme s vámi, co budete potřebovat od původního i nového odběratele, a celý proces zorganizujeme.' }, { q: 'Co dělat, když se stěhuji?', a: 'Napište nebo zavolejte co nejdříve — ideálně pár týdnů před stěhováním. Podle situace buď převedeme smlouvu na novou adresu, nebo zajistíme ukončení a případně nové připojení. Každé stěhování je trochu jiné, proto je nejjednodušší to probrat přímo.' }] } },
    ]
  },
  'podpora-kontakty': {
    title: 'Kontakty — FREE for YOU energie',
    desc: 'Kontaktujte FREE for YOU. Telefon +420 227 072 292, e-mail info@freeforyou.cz. Sídlo Českomoravská 2255/12a, Praha 9.',
    h1: 'Kontakty',
    lead: 'Telefon zvedá člověk. E-mail čteme a odpovídáme v pracovní dny do 24 hodin.',
    blocks: [
      { type: 'raw_html', props: { code: '<!-- KONTAKT GRID -->\n  <section class="kontakt-section">\n    <div class="kontakt-inner">\n\n      <div class="kontakt-grid">\n\n        <!-- LEFT: channels + form -->\n        <div class="kontakt-left">\n\n          <div class="kontakt-channels">\n\n            <a href="tel:+420227072290" class="kontakt-channel ch-phone">\n              <div class="ch-icon">\n                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.1 12.36 19.79 19.79 0 0 1 1.07 3.64 2 2 0 0 1 3.07 1.45h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 9.09a16 16 0 0 0 5.83 5.83l1.61-1.61a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.46 15.5z"/></svg>\n              </div>\n              <div class="ch-body">\n                <div class="ch-label">Telefon</div>\n                <div class="ch-value">+420 227 072 290</div>\n                <div class="ch-note">Po–Pá 8–16:30 · Zvedá člověk</div>\n              </div>\n              <div class="ch-badge">Doporučujeme</div>\n            </a>\n\n            <a href="https://wa.me/420227072290" target="_blank" class="kontakt-channel ch-whatsapp">\n              <div class="ch-icon ch-icon-wa">\n                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>\n              </div>\n              <div class="ch-body">\n                <div class="ch-label">WhatsApp</div>\n                <div class="ch-value">Napsat zprávu</div>\n                <div class="ch-note">Kdykoli</div>\n              </div>\n            </a>\n\n            <a href="mailto:info@freeforyou.cz" class="kontakt-channel ch-email">\n              <div class="ch-icon">\n                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="rou' } },
    ]
  },
  'pro-media': {
    title: 'Pro média — FREE for YOU energie',
    desc: 'Loga, základní informace o firmě a kontakt pro novináře. FREE for YOU s.r.o. — dodavatel elektřiny od roku 2016.',
    h1: 'Pro média',
    lead: 'Loga, základní informace a kontakt pro novináře a partnery.',
    blocks: [
      { type: 'content_section', props: { label: 'O společnosti', content: '<strong>FREE for YOU s.r.o.</strong> je český dodavatel elektřiny a plynu, který od roku 2016 buduje vlastní obnovitelné zdroje energie. Společnost reinvestuje 50 % zisku do výstavby solárních elektráren na střechách existujících objektů — bez záboru zemědělské půdy.\n\nZákazníkům FREE for YOU nabízí transparentní cenotvorbu, komunitní model sdílení elektřiny a postupné snižování závislosti na tržní ceně díky vlastní výrobě.' } },
      { type: 'content_section', props: { label: 'Loga ke stažení', content: 'Logo FREE for YOU ve všech variantách. Používejte prosím vždy v dostatečné velikosti a s přiměřenou ochrannou zónou kolem.' } },
      { type: 'content_section', props: { label: 'Boilerplate', content: 'FREE for YOU s.r.o. je český dodavatel elektřiny a plynu se sídlem v Praze. Společnost dodává energii od roku 2016 a buduje vlastní solární zdroje na střechách existujících objektů. Polovina zisku je reinvestována do rozšiřování výrobních kapacit s cílem trvale snižovat cenu energie pro zákazníky. Více informací na <a href="https://www.freeforyou.cz/" target="_blank">www.freeforyou.cz</a>.' } },
    ]
  },
  'proc-investice-oze': {
    title: 'Investice do obnovitelných zdrojů — FREE for YOU energie',
    desc: 'FREE for YOU reinvestuje 50 % zisku do vlastních solárních elektráren na střechách. Jak to funguje a proč to děláme.',
    h1: 'Zisk, který pracuje dál.',
    lead: 'Část toho, co vyděláme, jde rovnou zpátky do vlastní výroby energie. Tady je proč — a co to znamená pro vaši cenu.',
    blocks: [
      { type: 'raw_html', props: { code: '<section class="oze-section">\n    <div class="oze-inner">\n\n      <div class="oze-blocks">\n\n        <div class="oze-block">\n          <div class="oze-block-label">Proč zdroje</div>\n          <div class="oze-block-content">\n            <p>Věříme, že každý by měl mít ideálně vlastní zdroj energie. Ne jako luxus, ale jako samozřejmost.</p>\n            <p>Energie nakoupená na trhu závisí na tom, co trh zrovna dělá. Energie vyrobená vlastním zdrojem závisí na slunci. Když část spotřeby pokryjeme sami, trh nás ovlivňuje méně — a to se postupně projeví na ceně.</p>\n          </div>\n        </div>\n\n        <div class="oze-block">\n          <div class="oze-block-label">Jak to funguje</div>\n          <div class="oze-block-content">\n            <p>Ve stanovách FREE for YOU je zakotveno, že padesát procent zisku každý rok jde do výstavby solárních elektráren.</p>\n            <p>Není to dobrovolné gesto. Je to pravidlo, které platí bez ohledu na to, co se děje na trhu.</p>\n          </div>\n          <div class="oze-stat">\n            <div class="oze-stat-num">50 %</div>\n            <div class="oze-stat-label">zisku každý rok do vlastních zdrojů — zakotveno ve stanovách</div>\n          </div>\n        </div>\n\n        <div class="oze-block">\n          <div class="oze-block-label">Kdo má z výroby prospěch</div>\n          <div class="oze-block-content">\n            <p>Energie z vlastních zdrojů se rozděluje ve třech krocích.</p>\n          </div>\n          <div class="oze-steps">\n            <div class="oze-step">\n              <div class="oze-step-n">1</div>\n              <div class="oze-step-body">\n                <div class="oze-step-title">Ten, u koho zdroj stojí</div>\n                <div class="oze-step-desc">Za zvýhodněnou cenu dostane energii zákazník, u kterého zdroj stojí — jako poděkování za to, že svůj prostor sdílí.</div>\n              </div>\n            </div>\n            <div class="oze-step">\n              <div class="oze-step-n">2</div>\n              <div class="oze-step-body">\n                <div class="oze-step-title">Podle Proudíků</div>\n                <div class="oze-step-desc">Zbytek se rozdělí podle věrnostního systému, který odráží délku a objem odběru. Čím déle jste s námi, tím víc.</div>\n              </div>\n            </div>\n            <div class="oze-step">\n              <div class="oze-step-n">3</div>\n              <div class="oze-step-body">\n                <div class="oze-step-title">Rovným dílem všem</div>\n                <div class="oze-step-desc">Pokud ještě něco zbyde, dostane stejný díl každý zákazník FREE for YOU. Žádné výjimky.</div>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <div class="oze-block oze-block-status">\n          <div class="oze-block-label">Kde jsme teď</div>\n          <div class="oze-block-content">\n            <p>První vlastní zdroj se aktuálně realizuje. Jsou rozjednané tři lokality — na jedné z nich brzy vyroste první solární elektrárna FREE for YOU.</p>\n            <p>Jakmile bude místo potvrzené, dáme vědět.</p>\n          </div>\n          <div class="oze-status-badge">\n            <div class="oze-status-dot"></div>\n            V realizaci\n          </div>\n        </div>\n\n      </div>\n\n    </div>\n  </section>' } },
    ]
  },
  'proc-nas-pribeh': {
    title: 'Náš příběh — FREE for YOU energie',
    desc: 'Jak jsme od dodavatele elektřiny došli ke stavbě vlastních solárních zdrojů. Příběh FREE for YOU — od otázky po odpověď.',
    h1: 'Náš příběh',
    lead: 'Otázka, která nás nenechala odejít.',
    blocks: [
      { type: 'content_section', props: { label: 'Slepé uličky', content: 'Prošli jsme všechny známé cesty.\n\nJaderná energie je stabilní, ale pomalá v čase, který žijeme. Vodní energie je silná, ale vázaná na krajinu a její rovnováhu, která není jen technická. Větrná energie naráží na proměnlivost prostředí i společenské přijetí. Každá z těchto cest je reálná — a zároveň omezená svými vlastními podmínkami.\n\nNešlo o ideologii. Šlo o hranice reality.\n\nA právě v těchto hranicích se objevilo něco, co bylo překvapivě jednoduché.' } },
      { type: 'content_section', props: { label: 'Průlom', content: 'A právě v těchto hranicích se objevilo něco, co bylo překvapivě jednoduché. Ne zemědělská půda, ne nová zátěž krajiny, ne další zásah do prostoru, který už tak nese dost.\n\n<strong>Střechy.</strong> Povrchy, které už existují. Místa, která dnes často jen pasivně stojí nad tím, co by mohlo být využito.\n\nSolární energie není nová myšlenka. Nové je jen rozhodnutí, kam ji zasadit.' } },
      { type: 'content_section', props: { label: 'Co nás vede', content: 'Základní přesvědčení, které nás vede, je prosté a zároveň radikální: <strong>každý člověk by měl mít možnost mít vlastní zdroj energie.</strong>\n\nNe jako futuristický ideál. Ale jako reálný směr, kterým se dá postupně posouvat.\n\nNe proto, aby svět přestal být propojený. Ale aby se vztah mezi lidmi a energií stal méně vzdáleným, méně závislým, méně nečitelným.\n\nKaždá instalovaná střecha, každá vyrobená kilowatthodina z vlastního zdroje, každý krok směrem k lokální výrobě — není izolovaný projekt. Je to posun v tom, odkud energie přichází a komu patří její stabilita.' } },
      { type: 'content_section', props: { label: 'Pomalá transformace', content: 'Nehledáme rychlou změnu. Budujeme pomalou transformaci, která se neprojevuje jedním rozhodnutím, ale dlouhým řetězcem malých přesunů směrem k větší autonomii.\n\nA pokud má mít energie v budoucnu jinou podobu, nezačne to velkým gestem.' } },
      { type: 'content_section', props: { label: '', content: 'Energie, jak ji dnes známe, není něco, co by lidé drželi v rukou. Přichází z dálky — z trhu, z rozhodnutí jiných, z proměnlivých sil, které nikdo z běžných odběratelů nevidí ani neřídí. A přesto na ní stojí každodenní život.\n\nCena je v tomto systému nejviditelnější pravda. Všechno ostatní je až za ní.\n\nDlouho jsme se snažili pochopit, jestli v tom existuje prostor pro skutečnou změnu. Ne kosmetickou. Ne změnu marže. Ale změnu samotné logiky, podle které energie vzniká a dostává se k lidem.\n\nTradiční model dodávky energie má své hranice. Může být efektivnější, může být levnější v rámci systému — ale nemůže zrušit jeho základní závislosti. Elektřina se stále musí někde nakoupit. A to znamená, že její cena nikdy není úplně naše.' } },
      { type: 'quote_block', props: { text: 'Elektřina se stále musí někde nakoupit. A to znamená, že její cena nikdy není úplně naše.', style: 'large' } },
      { type: 'quote_block', props: { text: 'Energie nemá vznikat na úkor prostoru. Má vznikat v jeho rámci.', style: 'small' } },
      { type: 'quote_block', props: { text: 'Začne to tím, že se přestane brát jen zvenčí.', style: 'large' } },
      { type: 'cta_block', props: { title: 'Chcete být součástí toho?', description: 'Každý zákazník FREE for YOU je součástí modelu — výroba, která roste, pracuje pro celou komunitu.', btn1_text: 'Spočítat moji cenu →', btn1_url: 'ceny-kalkulacka.html', btn2_text: 'Kontaktujte nás', btn2_url: 'podpora-kontakty.html' } },
      { type: 'raw_html', props: { code: '<div class="pribeh-team">\n        <div class="pribeh-chapter-label">Kdo za tím stojí</div>\n\n        <div class="pribeh-team-main">\n          <div class="pribeh-team-card pribeh-team-card-main">\n            <div class="pribeh-team-avatar">\n              <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="18" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M6 42c0-9.941 8.059-18 18-18s18 8.059 18 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>\n            </div>\n            <div class="pribeh-team-info">\n              <div class="pribeh-team-name">Lukáš Artur Vagner</div>\n              <div class="pribeh-team-role">Jednatel</div>\n              <div class="pribeh-team-bio">Více než 12 let v energetice — od obchodníka přes vedení obchodního týmu až po vybudování vlastní firmy.</div>\n            </div>\n          </div>' } },
    ]
  },
  'proc-reference': {
    title: 'Reference a hodnocení zákazníků — FREE for YOU energie',
    desc: 'Co říkají zákazníci FREE for YOU. Hodnocení z Firmy.cz a Google — ověřitelné recenze s přímými odkazy na profily.',
    h1: 'Reference zákazníků',
    lead: 'Co o nás říkají lidé, kteří nám svěřili svou energii.',
    blocks: [
      { type: 'raw_html', props: { code: '<!-- FIRMY.CZ CAROUSEL -->\n  <section class="reviews-section">\n    <div class="reviews-inner">\n      <div class="reviews-section-header">\n        <div class="reviews-source">\n          <div class="reviews-source-logo firmy-logo">firmy.cz</div>\n          <a href="https://www.firmy.cz/detail/13169716-free-for-you-s-r-o-praha-liben.html" target="_blank" class="reviews-source-link">Zobrazit profil →</a>\n        </div>\n      </div>\n\n      <div class="carousel" id="carousel-firmy">\n        <div class="carousel-track" id="track-firmy">\n\n          <div class="review-card">\n            <div class="review-stars">★★★★★</div>\n            <p class="review-text">Jsme odběratelem 6 let. Ceny jsou přijatelné, dodavatel pravidelně informuje o veškerých změnách. Jsme velice spokojeni a vřele všem doporučujeme.</p>\n            <div class="review-author">Věra Škvárová</div>\n            <div class="review-date">Listopad 2024</div>\n            <a href="https://www.firmy.cz/detail/13169716-free-for-you-s-r-o-praha-liben.html" target="_blank" class="review-source-link">Ověřit na firmy.cz →</a>\n          </div>\n\n          <div class="review-card">\n            <div class="review-stars">★★★★★</div>\n            <p class="review-text">Služby FREE for You jsou na vysoké úrovni. Jejich zaměstnanci se snaží vždy pomoct a hlavně všichni vystupují slušně a profesionálně. Vše do sebe dobře zapadá, což na člověka působí velice příjemně.</p>\n            <div class="review-author">Josef Kučera</div>\n            <div class="review-date">Říjen 2024</div>\n            <a href="https://www.firmy.cz/detail/13169716-free-for-you-s-r-o-praha-liben.html" target="_blank" class="review-source-link">Ověřit na firmy.cz →</a>\n          </div>\n\n          <div class="review-card">\n            <div class="review-stars">★★★★★</div>\n            <p class="review-text">Za mě spokojenost, ceny přiměřené, nikdy mi nebylo odmítnuto mimořádné vyúčtování, skvělá komunikace. Rovněž tak přeplatky v termínu vždy vráceny.</p>\n            <div class="review-author">Věra Škvárová</div>\n            <div class="review-date">2023</div>\n            <a href="https://www.firmy.cz/detail/13169716-free-for-you-s-r-o-praha-liben.html" target="_blank" class="review-source-link">Ověřit na firmy.cz →</a>\n          </div>\n\n          <div class="review-card">\n            <div class="review-stars">★★★★★</div>\n            <p class="review-text">Doporučuji! Přechod proběhl naprosto bez problémů, vše zařídili za mě. Od té doby žádné starosti s energiemi.</p>\n            <div class="review-author">Martin Dvořák</div>\n            <div class="review-date">2024</div>\n            <a href="https://www.firmy.cz/detail/13169716-free-for-you-s-r-o-praha-liben.html" target="_blank" class="review-source-link">Ověřit na firmy.cz →</a>\n          </div>\n\n          <div class="review-card">\n            <div class="review-stars">★★★★★</div>\n            <p class="review-text">Jsem zákazníkem přes 4 roky, vždy korektní jednání, transparentní faktury.' } },
    ]
  },
  'proc-slevy-za-doporuceni': {
    title: 'Slevy za doporučení — FREE for YOU energie',
    desc: 'Doporučte FREE for YOU a získejte slevu až 500 Kč za smlouvu plus 20 Kč za každou spotřebovanou MWh. Sleva se přenáší až do 5. stupně.',
    h1: 'Slevy za doporučení',
    lead: 'Když přivedete přítele, ušetříte oba. A když ten přítel přivede dalšího — ušetříte ještě víc. Systém je jednoduchý a průhledný.',
    blocks: [
      { type: 'raw_html', props: { code: '<!-- JAK TO FUNGUJE -->\n  <section class="slevy-section">\n    <div class="slevy-inner">\n\n      <div class="slevy-how">\n        <div class="slevy-how-title">Jak to funguje</div>\n        <div class="slevy-steps">\n          <div class="slevy-step">\n            <div class="slevy-step-num">1</div>\n            <div class="slevy-step-body">\n              <div class="slevy-step-title">Zaregistrujete se</div>\n              <div class="slevy-step-desc">Vytvoříte si přezdívku v Energobankingu. Ta slouží jako váš doporučovací kód.</div>\n            </div>\n          </div>\n          <div class="slevy-step-arrow">→</div>\n          <div class="slevy-step">\n            <div class="slevy-step-num">2</div>\n            <div class="slevy-step-body">\n              <div class="slevy-step-title">Doporučíte přítele</div>\n              <div class="slevy-step-desc">Přítel při registraci zadá vaši přezdívku. Tím se zařadí do vaší sítě.</div>\n            </div>\n          </div>\n          <div class="slevy-step-arrow">→</div>\n          <div class="slevy-step">\n            <div class="slevy-step-num">3</div>\n            <div class="slevy-step-body">\n              <div class="slevy-step-title">Sleva se načítá</div>\n              <div class="slevy-step-desc">Od 11. dne jeho odběru se vám začíná automaticky načítat sleva na vaší faktuře.</div>\n            </div>\n          </div>\n        </div>\n        <p class="slevy-note">Sleva se odečítá automaticky. Nemusíte o nic žádat. Vše vidíte v Energobankingu.</p>\n\n        <div class="slevy-accrual">\n          <div class="slevy-accrual-title">Jak se sleva načítá</div>\n          <p class="slevy-accrual-text">Sleva se nenačítá najednou — načítá se postupně, každý den, po dobu jednoho roku. Za každý den odběru vašeho přítele vám přibude 1/365 z roční předpokládané slevy.</p>\n          <div class="slevy-accrual-example">\n            <div class="sae-item">\n              <span class="sae-label">Roční sleva za přímého přítele</span>\n              <span class="sae-val">500 Kč</span>\n            </div>\n            <div class="sae-divider">÷ 365 dní</div>\n            <div class="sae-item">\n              <span class="sae-label">Načítá se každý den</span>\n              <span class="sae-val accent">≈ 1,37 Kč / den</span>\n            </div>\n          </div>\n          <p class="slevy-accrual-note">Sleva začíná nabíhat od 11. dne odběru. Na fakturu se odečítá průběžně — jakmile dosáhne minimálně 100 Kč.</p>\n        </div>\n      </div>\n\n      <!-- DVA SLOUPCE: slevy tabulka + vizuál sítě -->\n      <div class="slevy-grid">\n\n        <div class="slevy-col">\n          <div class="slevy-col-title">Sleva za každou novou smlouvu</div>\n          <p class="slevy-col-desc">Za každého přítele — a každého přítele vašeho přítele — získáváte slevu za uzavřenou smlouvu. Funguje to až do 5 stupňů doporučení.</p>\n\n          <div class="slevy-table">\n            <div class="slevy-table-row slevy-table-head">\n              <span>Stupeň</span>\n              <span>Kdo to je' } },
    ]
  },
};
function getInitialPages() {
  var pages = [];
  var slugs = Object.keys(SEED_PAGES);
  for (var i = 0; i < slugs.length; i++) {
    var slug = slugs[i];
    var s = SEED_PAGES[slug];
    
    var bc = 'Domů';
    if (slug.startsWith('ceny-')) bc = 'Domů / Naše ceny';
    else if (slug.startsWith('proc-')) bc = 'Domů / Proč FREE for YOU?';
    else if (slug.startsWith('jak-')) bc = 'Domů / Jak to funguje?';
    else if (slug.startsWith('podpora-')) bc = 'Domů / Podpora';
    else if (slug.startsWith('blog/')) bc = 'Domů / Blog';
    else if (slug === 'pro-media') bc = 'Domů / O nás';
    
    var header = { id: generateId(), type: 'page_header', props: {
      breadcrumb: bc, heading: s.h1 || s.title.split('—')[0].trim(), lead: s.lead || '', badges: ''
    }};
    
    var content = s.blocks.map(function(b) {
      var props = {};
      for (var k in b.props) {
        if (Array.isArray(b.props[k])) {
          props[k] = b.props[k].map(function(item) { return Object.assign({}, item); });
        } else {
          props[k] = b.props[k];
        }
      }
      return { id: generateId(), type: b.type, props: props };
    });
    
    pages.push({
      id: generateId(),
      source: 'existing',
      meta: {
        title: s.title,
        description: s.desc,
        slug: slug,
        canonical: 'https://www.freeforyou.cz/' + slug + '.html',
        robots: 'index, follow'
      },
      blocks: [header].concat(content)
    });
  }
  return pages;
}
