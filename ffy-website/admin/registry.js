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
function getInitialPages() {
  var seed = [
    { slug: 'index', title: 'FREE for YOU energie — Stabilní energie z vlastních zdrojů', description: 'Dodáváme elektřinu od roku 2016. Stavíme vlastní solární zdroje na střechách a 50 % zisku reinvestujeme. Kalkulačka, ceníky a transparentní podmínky.', h1: 'Stabilní energie bez zbytečné marže.', lead: '' },
    { slug: 'ceny-aktualni-nabidka', title: 'Aktuální nabídka elektřiny — FREE for YOU energie', description: 'Aktuální ceny silové elektřiny FREE for YOU pro domácnosti. Tarify FIX 2025 pro distribuční území ČEZ, PRE a EG.D.', h1: 'Aktuální nabídka', lead: 'Zde vidíte naše aktuálně nabízené tarify.' },
    { slug: 'ceny-kalkulacka', title: 'Kalkulačka ceny elektřiny — FREE for YOU energie', description: 'Spočítejte si orientační roční náklad za elektřinu u FREE for YOU. Zadejte spotřebu a PSČ — kalkulačka zobrazí celkovou cenu včetně distribuce.', h1: 'Kalkulačka', lead: 'Zadejte loňskou roční spotřebu a zjistěte, kolik byste platili u FREE for YOU.' },
    { slug: 'ceny-ceniky', title: 'Ceníky elektřiny 2026 — FREE for YOU energie', description: 'Kompletní ceníky elektřiny FREE for YOU ke stažení v PDF.', h1: 'Ceníky', lead: 'Vyberte své distribuční území a zobrazte aktuální ceníky.' },
    { slug: 'proc-slevy-za-doporuceni', title: 'Slevy za doporučení — FREE for YOU energie', description: 'Doporučte FREE for YOU a získejte slevu až 500 Kč za smlouvu plus 20 Kč za každou spotřebovanou MWh.', h1: 'Slevy za doporučení', lead: 'Když přivedete přítele, ušetříte oba.' },
    { slug: 'proc-investice-oze', title: 'Investice do obnovitelných zdrojů — FREE for YOU energie', description: 'FREE for YOU reinvestuje 50 % zisku do vlastních solárních elektráren na střechách.', h1: 'Zisk, který pracuje dál.', lead: 'Část toho, co vyděláme, jde rovnou zpátky do vlastní výroby energie.' },
    { slug: 'proc-nas-pribeh', title: 'Náš příběh — FREE for YOU energie', description: 'Jak jsme od dodavatele elektřiny došli ke stavbě vlastních solárních zdrojů.', h1: 'Náš příběh', lead: 'Otázka, která nás nenechala odejít.' },
    { slug: 'proc-reference', title: 'Reference a hodnocení zákazníků — FREE for YOU energie', description: 'Co říkají zákazníci FREE for YOU. Hodnocení z Firmy.cz a Google.', h1: 'Reference zákazníků', lead: 'Co o nás říkají lidé, kteří nám svěřili svou energii.' },
    { slug: 'jak-energobanking', title: 'Energobanking — zákaznický portál FREE for YOU', description: 'Energobanking je váš online přehled spotřeby, faktur, výroby a sdílení elektřiny.', h1: 'Energobanking', lead: 'Zákaznický portál FREE for YOU.' },
    { slug: 'jak-sdileni-elektriny', title: 'Sdílení elektřiny — Elektřina od souseda | FREE for YOU', description: 'Máte solár a přebytky? Prodejte je sousedovi přes FREE for YOU.', h1: 'Sdílení elektřiny', lead: 'Místo prodeje do sítě za výkupní cenu můžete elektřinu prodat přímo sousedovi.' },
    { slug: 'jak-vykup-elektriny', title: 'Prodej elektřiny — FREE for YOU energie', description: 'Prodejte přebytky z fotovoltaiky za tržní cenu.', h1: 'Prodej elektřiny', lead: 'Přebytky nemusí téct zadarmo do sítě.' },
    { slug: 'jak-proudiky', title: 'Proudíky — věrnostní program FREE for YOU energie', description: 'Proudíky jsou body za odběr energie u FREE for YOU.', h1: 'Proudíky', lead: 'Body za odběr energie, podle kterých se rozděluje elektřina z vlastních zdrojů.' },
    { slug: 'podpora-faq', title: 'Časté dotazy — FREE for YOU energie', description: 'Odpovědi na nejčastější otázky o změně dodavatele a službách FREE for YOU.', h1: 'Časté dotazy', lead: 'Nenašli jste odpověď? Napište nebo zavolejte.' },
    { slug: 'podpora-dokumenty', title: 'Dokumenty ke stažení — FREE for YOU energie', description: 'Smlouvy, obchodní podmínky, vzory faktur a plné moci.', h1: 'Dokumenty', lead: 'Všechny důležité dokumenty na jednom místě.' },
    { slug: 'podpora-kontakty', title: 'Kontakty — FREE for YOU energie', description: 'Kontaktujte FREE for YOU. Telefon +420 227 072 292, e-mail info@freeforyou.cz.', h1: 'Kontakty', lead: 'Telefon zvedá člověk. E-mail čteme a odpovídáme do 24 hodin.' },
    { slug: 'podpora-blog', title: 'Blog — novinky ze světa energií | FREE for YOU', description: 'Články o cenách elektřiny, solární energii a změně dodavatele.', h1: 'Blog', lead: 'Novinky a postřehy ze světa energií.' },
    { slug: 'pro-media', title: 'Pro média — FREE for YOU energie', description: 'Loga, základní informace o firmě a kontakt pro novináře.', h1: 'Pro média', lead: 'Loga, základní informace a kontakt pro novináře a partnery.' },
    { slug: 'blog/proc-cena-elektriciny-nesouvisí-s-fakturou', title: 'Proč cena elektřiny na burze nesouvisí s fakturou | FREE for YOU', description: 'Cena elektřiny na burze klesla, ale zálohy zůstávají stejné.', h1: 'Proč cena elektřiny na burze nesouvisí s tím, co platíte na faktuře', lead: '' },
    { slug: 'blog/co-se-deje-s-prebytkovou-elektricinou', title: 'Co se děje s přebytky ze solárů | FREE for YOU', description: 'Solár vyrábí i když nikdo není doma.', h1: 'Co se děje s elektřinou ze solárů, když ji nikdo nespotřebuje', lead: '' },
    { slug: 'blog/zmena-dodavatele-co-se-zmeni', title: 'Změna dodavatele: co se změní a co ne | FREE for YOU', description: 'Dodávka se nepřeruší, zásuvky zůstanou stejné.', h1: 'Změna dodavatele: co se opravdu změní a co zůstane stejné', lead: '' },
  ];

  return seed.map(function(s) {
    var breadcrumb = 'Domů';
    if (s.slug.startsWith('ceny-')) breadcrumb = 'Domů / Naše ceny';
    else if (s.slug.startsWith('proc-')) breadcrumb = 'Domů / Proč FREE for YOU?';
    else if (s.slug.startsWith('jak-')) breadcrumb = 'Domů / Jak to funguje?';
    else if (s.slug.startsWith('podpora-')) breadcrumb = 'Domů / Podpora';
    else if (s.slug.startsWith('blog/')) breadcrumb = 'Domů / Blog';

    return {
      id: generateId(),
      source: 'existing',
      meta: {
        title: s.title,
        description: s.description,
        slug: s.slug,
        canonical: 'https://www.freeforyou.cz/' + s.slug + '.html',
        robots: 'index, follow'
      },
      blocks: [
        { id: generateId(), type: 'page_header', props: { breadcrumb: breadcrumb, heading: s.h1, lead: s.lead || '', badges: '' } }
      ]
    };
  });
}
