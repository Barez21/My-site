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
    description: 'Karty s ikonou, názvem a popisem',
    schema: [
      { key: 'columns', label: 'Sloupce', type: 'select', options: [
        { value: '2', label: '2 sloupce' },
        { value: '3', label: '3 sloupce' },
      ]},
      { key: 'items', label: 'Funkce', type: 'array', arrayFields: [
        { key: 'title', label: 'Název', type: 'text' },
        { key: 'desc', label: 'Popis', type: 'textarea' },
      ]},
    ],
    defaults: { columns: '2', items: [{ title: 'Funkce 1', desc: 'Popis funkce.' }] },
    render: function(p) {
      var cols = p.columns || '2';
      var items = (p.items || []).map(function(item) {
        return '<div class="eb-feature"><div><div class="eb-feature-title">' + item.title + '</div>' +
          '<div class="eb-feature-desc">' + item.desc + '</div></div></div>';
      }).join('\n');
      return '<div class="eb-features" style="grid-template-columns:repeat(' + cols + ',1fr)">' + items + '</div>';
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
    return reg ? reg.render(b.props) : '<!-- unknown block: ' + b.type + ' -->';
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
function getInitialPages() {
  var SEED_CONTENT = {
    'jak-energobanking': [
      { type: 'content_section', props: { label: 'Co to je', content: 'Energobanking je virtuální účet, který FREE for YOU vytvoří automaticky každému zákazníkovi po registraci. Přístup je zdarma — stačí webový prohlížeč.\n\nFunguje jako rozcestník pro vše, co se u vás děje s energiemi.' }},
      { type: 'content_section', props: { label: 'Jak se přihlásit', content: 'Energobanking účet vzniká automaticky po podpisu smlouvy s FREE for YOU. Přihlašovací údaje dostanete e-mailem.' }},
      { type: 'cta_block', props: { title: 'Přejít do Energobankingu', description: 'Portál je dostupný online.', btn1_text: 'Otevřít Energobanking →', btn1_url: 'https://www.energobanking.cz/', btn2_text: 'Potřebuji pomoc', btn2_url: 'podpora-kontakty.html' }},
    ],
    'jak-proudiky': [
      { type: 'content_section', props: { label: 'Co jsou Proudíky', content: 'FREE for YOU reinvestuje 50 % čistých zisků do obnovitelných zdrojů. Elektřina z těchto zdrojů se rozděluje mezi zákazníky — a Proudíky určují, jaký podíl vám náleží.' }},
      { type: 'content_section', props: { label: 'Jak je získáváte', content: 'Proudíky se přičítají automaticky za každé odběrné místo zapsané na vaše jméno.' }},
      { type: 'content_section', props: { label: 'Úrovně členství', content: 'Aktivním doporučováním nových zákazníků si můžete vylepšit členství — a tím násobit rychlost, jakou Proudíky sbíráte.' }},
      { type: 'content_section', props: { label: 'K čemu to vede', content: 'Čím více Proudíků nasbíráte, tím větší podíl elektřiny z vlastních zdrojů FREE for YOU vám náleží.' }},
      { type: 'cta_block', props: { title: 'Začněte sbírat Proudíky', description: 'Body se počítají automaticky od prvního dne odběru.', btn1_text: 'Doporučte a vylepšete členství →', btn1_url: 'proc-slevy-za-doporuceni.html', btn2_text: 'Kontaktujte nás', btn2_url: 'podpora-kontakty.html' }},
    ],
    'jak-sdileni-elektriny': [
      { type: 'content_section', props: { label: 'Jak to funguje', content: 'Elektřina od souseda propojuje zákazníky FREE for YOU s vlastním zdrojem elektřiny s těmi, kteří chtějí nakupovat lokálně vyrobenou elektřinu.' }},
      { type: 'content_section', props: { label: 'Co si určujete vy', content: 'Cenu elektřiny pro odběratele si nastavujete sami. Cenu můžete jednou za 4 měsíce změnit.' }},
      { type: 'content_section', props: { label: 'Co zařídí FREE for YOU', content: 'Zúčtování, fakturaci, komunikaci s distributorem a dodržení legislativy.' }},
      { type: 'cta_block', props: { title: 'Chcete začít sdílet?', description: 'Vše nastavíte v Energobankingu.', btn1_text: 'Přejít do Energobankingu →', btn1_url: 'https://www.energobanking.cz/', btn2_text: 'elektrinaodsouseda.cz', btn2_url: 'https://www.elektrinaodsouseda.cz/' }},
    ],
    'jak-vykup-elektriny': [
      { type: 'content_section', props: { label: 'Co se děje s přebytky', content: 'Fotovoltaika, vítr ani voda nevyrábí podle toho, kolik zrovna spotřebujete. Přebytky jdou do sítě bez náhrady, pokud nemáte sjednáno jinak.' }},
      { type: 'content_section', props: { label: 'Jak to funguje', content: 'Uzavřete s námi smlouvu o výkupu přebytků. Přebytečná elektřina se automaticky zaúčtuje a proplatí za tržní cenu.\n\nZ výkupní ceny odečítáme náš poplatek — 19 % z tržní ceny, minimálně 780 Kč.' }},
      { type: 'content_section', props: { label: 'Co z toho máte', content: 'Přebytky přestanou být ztráta a začnou být příjem.' }},
      { type: 'cta_block', props: { title: 'Chcete začít prodávat přebytky?', description: 'Smlouvu o výkupu vyřídíme s vámi.', btn1_text: 'Kontaktujte nás →', btn1_url: 'podpora-kontakty.html', btn2_text: 'Energobanking', btn2_url: 'https://www.energobanking.cz/' }},
    ],
    'podpora-faq': [
      { type: 'faq_block', props: { title: 'Přechod k FREE for YOU', items: [{ q: 'Přijdu při přechodu o dodávku elektřiny nebo plynu?', a: 'Ne. Přechod probíhá čistě administrativně — fyzická dodávka se nepřerušuje.' }, { q: 'Jak dlouho přechod trvá?', a: 'Standardně 6 až 8 týdnů od podpisu smlouvy.' }, { q: 'Co musím udělat já a co zařídíte vy?', a: 'Vy vyplníte formulář a podepíšete smlouvu a plnou moc. Zbytek zařídíme za vás.' }, { q: 'Jaké dokumenty potřebuji?', a: 'Stačí poslední vyúčtování a podepsaná plná moc.' }, { q: 'Mohu přejít s výpovědní lhůtou?', a: 'Ano. Smlouvu za vás vypovíme a přechod naplánujeme na konec lhůty.' }, { q: 'Mohu přejít jen s elektřinou?', a: 'Ano, přejít můžete s elektřinou, plynem, nebo obojím.' }, { q: 'Co když budu chtít odejít?', a: 'Podmínky ukončení jsou ve smlouvě. Žádné skryté pokuty.' }] }},
      { type: 'faq_block', props: { title: 'Ceny a produkty', items: [{ q: 'Jaký je rozdíl mezi fixním a SPOT tarifem?', a: 'Fix = dohodnutá cena na celé období. SPOT = cena se mění každou hodinu podle burzy.' }, { q: 'Jak se tvoří cena u FREE for YOU?', a: 'Regulovaná složka (distribuce, daně) + obchodní složka. Část zisku reinvestujeme do vlastních zdrojů.' }, { q: 'Co je Energobanking?', a: 'Zákaznický účet s fakturami, spotřebou a historií plateb. Přístup automaticky po přechodu.' }, { q: 'Jak fungují slevy za doporučení?', a: 'Doporučíte někoho, oba získáte slevu na energii. Funguje do 5 stupňů.' }, { q: 'Mění se cena v průběhu smlouvy?', a: 'U fixního tarifu ne. U SPOT se mění každou hodinu.' }, { q: 'Jsou v ceně zahrnuty poplatky za distribuci?', a: 'Jsou na faktuře, ale jde o regulované platby distributorovi — stejné u všech dodavatelů.' }] }},
      { type: 'faq_block', props: { title: 'Pro stávající zákazníky', items: [{ q: 'Kdy probíhají odečty?', a: 'Odečty provádí distributor, ne FREE for YOU. Termíny se nemění.' }, { q: 'Proč dvě zálohy ve stejném měsíci?', a: 'Při přechodu může přijít záloha za aktuální měsíc od starého dodavatele a za další od nás.' }, { q: 'Vracíte přeplatky automaticky?', a: 'Ano, vždy automaticky na váš účet.' }, { q: 'Kde najdu smlouvy a faktury?', a: 'V Energobankingu. Obecné dokumenty na stránce Dokumenty.' }, { q: 'Jak probíhá přepis odběrného místa?', a: 'Kontaktujte nás — projdeme postup a vše zorganizujeme.' }, { q: 'Co dělat, když se stěhuji?', a: 'Napište co nejdříve. Převedeme smlouvu nebo zajistíme ukončení.' }] }},
    ],
    'proc-nas-pribeh': [
      { type: 'content_section', props: { label: '', content: 'Energie, jak ji dnes známe, není něco, co by lidé drželi v rukou. Přichází z dálky — z trhu, z rozhodnutí jiných.\n\nCena je v tomto systému nejviditelnější pravda. Všechno ostatní je až za ní.' }},
      { type: 'quote_block', props: { text: 'Elektřina se stále musí někde nakoupit. A to znamená, že její cena nikdy není úplně naše.', style: 'large' }},
      { type: 'content_section', props: { label: 'Slepé uličky', content: 'Prošli jsme všechny známé cesty.\n\nJaderná energie je stabilní, ale pomalá. Vodní energie je silná, ale vázaná na krajinu. Větrná energie naráží na proměnlivost prostředí.\n\nNešlo o ideologii. Šlo o hranice reality.' }},
      { type: 'content_section', props: { label: 'Průlom', content: 'Střechy. Povrchy, které už existují.\n\nSolární energie není nová myšlenka. Nové je jen rozhodnutí, kam ji zasadit.' }},
      { type: 'quote_block', props: { text: 'Energie nemá vznikat na úkor prostoru. Má vznikat v jeho rámci.', style: 'small' }},
      { type: 'content_section', props: { label: 'Co nás vede', content: 'Každý člověk by měl mít možnost mít vlastní zdroj energie.\n\nKaždá instalovaná střecha, každá vyrobená kilowatthodina — není izolovaný projekt. Je to posun v tom, odkud energie přichází.' }},
      { type: 'content_section', props: { label: 'Pomalá transformace', content: 'Nehledáme rychlou změnu. Budujeme pomalou transformaci.' }},
      { type: 'quote_block', props: { text: 'Začne to tím, že se přestane brát jen zvenčí.', style: 'large' }},
      { type: 'cta_block', props: { title: 'Chcete být součástí toho?', description: 'Každý zákazník FREE for YOU je součástí modelu.', btn1_text: 'Spočítat moji cenu →', btn1_url: 'ceny-kalkulacka.html', btn2_text: 'Kontaktujte nás', btn2_url: 'podpora-kontakty.html' }},
    ],
  };

  var seed = [
    { slug: 'index', title: 'FREE for YOU energie — Stabilní energie z vlastních zdrojů', description: 'Dodáváme elektřinu od roku 2016. Stavíme vlastní solární zdroje na střechách.', h1: 'Stabilní energie bez zbytečné marže.', lead: '', managed: true },
    { slug: 'ceny-aktualni-nabidka', title: 'Aktuální nabídka elektřiny — FREE for YOU', description: 'Aktuální ceny silové elektřiny FREE for YOU pro domácnosti.', h1: 'Aktuální nabídka', lead: 'Naše aktuálně nabízené tarify.', managed: true },
    { slug: 'ceny-kalkulacka', title: 'Kalkulačka ceny elektřiny — FREE for YOU', description: 'Spočítejte si náklad za elektřinu u FREE for YOU.', h1: 'Kalkulačka', lead: 'Zadejte spotřebu a zjistěte cenu.', managed: true },
    { slug: 'ceny-ceniky', title: 'Ceníky elektřiny 2026 — FREE for YOU', description: 'Ceníky elektřiny ke stažení v PDF.', h1: 'Ceníky', lead: 'Ceníky dle distribučního území.', managed: true },
    { slug: 'proc-slevy-za-doporuceni', title: 'Slevy za doporučení — FREE for YOU', description: 'Doporučte FREE for YOU a získejte slevu.', h1: 'Slevy za doporučení', lead: 'Když přivedete přítele, ušetříte oba.', managed: true },
    { slug: 'proc-investice-oze', title: 'Investice do OZE — FREE for YOU', description: 'Reinvestujeme 50 % zisku do solárních elektráren.', h1: 'Zisk, který pracuje dál.', lead: '', managed: true },
    { slug: 'proc-nas-pribeh', title: 'Náš příběh — FREE for YOU', description: 'Od dodavatele ke stavbě vlastních zdrojů.', h1: 'Náš příběh', lead: 'Otázka, která nás nenechala odejít.' },
    { slug: 'proc-reference', title: 'Reference — FREE for YOU', description: 'Hodnocení zákazníků z Firmy.cz a Google.', h1: 'Reference zákazníků', lead: '', managed: true },
    { slug: 'jak-energobanking', title: 'Energobanking — FREE for YOU', description: 'Zákaznický portál pro správu energie.', h1: 'Energobanking', lead: 'Zákaznický portál FREE for YOU.' },
    { slug: 'jak-sdileni-elektriny', title: 'Sdílení elektřiny — FREE for YOU', description: 'Prodejte přebytky sousedovi.', h1: 'Sdílení elektřiny', lead: '' },
    { slug: 'jak-vykup-elektriny', title: 'Prodej elektřiny — FREE for YOU', description: 'Prodejte přebytky za tržní cenu.', h1: 'Prodej elektřiny', lead: '' },
    { slug: 'jak-proudiky', title: 'Proudíky — FREE for YOU', description: 'Věrnostní program.', h1: 'Proudíky', lead: 'Body za odběr energie.' },
    { slug: 'podpora-faq', title: 'Časté dotazy — FREE for YOU', description: 'Odpovědi na nejčastější otázky.', h1: 'Časté dotazy', lead: '', managed: true },
    { slug: 'podpora-dokumenty', title: 'Dokumenty — FREE for YOU', description: 'Smlouvy, VOP, vzory faktur.', h1: 'Dokumenty', lead: '', managed: true },
    { slug: 'podpora-kontakty', title: 'Kontakty — FREE for YOU', description: 'Telefon, e-mail, adresa.', h1: 'Kontakty', lead: '', managed: true },
    { slug: 'podpora-blog', title: 'Blog — FREE for YOU', description: 'Články ze světa energií.', h1: 'Blog', lead: '', managed: true },
    { slug: 'pro-media', title: 'Pro média — FREE for YOU', description: 'Loga a informace pro novináře.', h1: 'Pro média', lead: '', managed: true },
    { slug: 'blog/proc-cena-elektriciny', title: 'Proč cena na burze nesouvisí s fakturou', description: '', h1: 'Proč cena elektřiny na burze nesouvisí s fakturou', lead: '', managed: true },
    { slug: 'blog/co-se-deje-s-prebytkovou-elektricinou', title: 'Co se děje s přebytky ze solárů', description: '', h1: 'Co se děje s přebytkovou elektřinou', lead: '', managed: true },
    { slug: 'blog/zmena-dodavatele', title: 'Změna dodavatele: co se změní', description: '', h1: 'Změna dodavatele', lead: '', managed: true },
  ];

  return seed.map(function(s) {
    var bc = 'Domů';
    if (s.slug.startsWith('ceny-')) bc = 'Domů / Naše ceny';
    else if (s.slug.startsWith('proc-')) bc = 'Domů / Proč FREE for YOU?';
    else if (s.slug.startsWith('jak-')) bc = 'Domů / Jak to funguje?';
    else if (s.slug.startsWith('podpora-')) bc = 'Domů / Podpora';
    else if (s.slug.startsWith('blog/')) bc = 'Domů / Blog';

    var header = { id: generateId(), type: 'page_header', props: { breadcrumb: bc, heading: s.h1, lead: s.lead || '', badges: '' } };
    var extra = (SEED_CONTENT[s.slug] || []).map(function(b) {
      return { id: generateId(), type: b.type, props: Object.assign({}, b.props) };
    });

    return {
      id: generateId(),
      source: s.managed ? 'managed' : 'existing',
      meta: { title: s.title, description: s.description, slug: s.slug, canonical: 'https://www.freeforyou.cz/' + s.slug + '.html', robots: 'index, follow' },
      blocks: [header].concat(extra)
    };
  });
}
