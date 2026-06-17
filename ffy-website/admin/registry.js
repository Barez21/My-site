/* ══════════════════════════════════════════
   FFY CMS — Block Registry, Renderer, Store
   ══════════════════════════════════════════
   Schema field types: text, textarea, url, select, toggle, image, array
   ══════════════════════════════════════════ */

var BLOCK_REGISTRY = {

  page_header: {
    label: 'Záhlaví stránky', description: 'Nadpis, popis a štítky',
    schema: [
      { key: 'breadcrumb', label: 'Breadcrumb', type: 'text' },
      { key: 'heading', label: 'Nadpis (H1)', type: 'text' },
      { key: 'lead', label: 'Podnadpis', type: 'textarea' },
      { key: 'badges', label: 'Štítky (po řádcích)', type: 'textarea', hint: 'Prázdné = bez štítků' },
    ],
    defaults: { breadcrumb: 'Domů / Stránka', heading: 'Nová stránka', lead: '', badges: '' },
    render: function(p) {
      var parts = p.breadcrumb.split('/');
      var bc = parts.map(function(s,i){ return i < parts.length-1 ? '<a href="index.html">'+s.trim()+'</a><span>/</span>' : s.trim(); }).join('');
      var badges = p.badges && p.badges.trim() ? '<div class="sdileni-badges">'+p.badges.split('\n').filter(function(b){return b.trim();}).map(function(b){return '<span class="sdileni-badge">'+b.trim()+'</span>';}).join('')+'</div>' : '';
      return '<section class="subpage-header"><div class="subpage-header-inner"><div class="subpage-breadcrumb">'+bc+'</div><h1 class="subpage-h1">'+p.heading+'</h1>'+(p.lead?'<p class="subpage-lead">'+p.lead+'</p>':'')+badges+'</div></section>';
    }
  },

  content_section: {
    label: 'Obsahový blok', description: 'Label + odstavce',
    schema: [
      { key: 'label', label: 'Nadpis sekce', type: 'text' },
      { key: 'content', label: 'Obsah', type: 'textarea', hint: 'Odstavce oddělte prázdným řádkem.' },
    ],
    defaults: { label: 'Sekce', content: 'Text...' },
    render: function(p) {
      var paras = p.content.split(/\n\n+/).filter(function(s){return s.trim();}).map(function(s){return '<p>'+s.trim()+'</p>';}).join('');
      return '<div class="sdileni-block"><div class="sdileni-block-label">'+p.label+'</div><div class="sdileni-block-content">'+paras+'</div></div>';
    }
  },

  cta_block: {
    label: 'Výzva k akci (CTA)', description: 'Titulek, popis a tlačítka',
    schema: [
      { key: 'title', label: 'Titulek', type: 'text' },
      { key: 'description', label: 'Popis', type: 'text' },
      { key: 'btn1_text', label: 'Primární — text', type: 'text' },
      { key: 'btn1_url', label: 'Primární — odkaz', type: 'url' },
      { key: 'btn2_text', label: 'Sekundární — text', type: 'text', hint: 'Prázdné = bez' },
      { key: 'btn2_url', label: 'Sekundární — odkaz', type: 'url' },
    ],
    defaults: { title: 'CTA', description: '', btn1_text: 'Akce →', btn1_url: '#', btn2_text: '', btn2_url: '#' },
    render: function(p) {
      var btn2 = p.btn2_text ? '<a href="'+p.btn2_url+'" class="sdileni-btn-secondary">'+p.btn2_text+'</a>' : '';
      return '<div class="sdileni-cta-wrap"><div class="sdileni-cta-text"><div class="sdileni-cta-title">'+p.title+'</div><div class="sdileni-cta-desc">'+p.description+'</div></div><div class="sdileni-cta-btns"><a href="'+p.btn1_url+'" class="sdileni-btn-primary">'+p.btn1_text+'</a>'+btn2+'</div></div>';
    }
  },

  quote_block: {
    label: 'Citát', description: 'Zvýrazněná myšlenka',
    schema: [
      { key: 'text', label: 'Text', type: 'textarea' },
      { key: 'style', label: 'Styl', type: 'select', options: [{value:'large',label:'Velký'},{value:'small',label:'Malý'}] },
    ],
    defaults: { text: 'Citát...', style: 'large' },
    render: function(p) {
      var c1 = p.style==='small'?' pribeh-break-small':'', c2 = p.style==='small'?' pribeh-quote-sm':'';
      return '<div class="pribeh-break'+c1+'"><div class="pribeh-break-inner"><div class="pribeh-break-line"></div><blockquote class="pribeh-quote'+c2+'">'+p.text+'</blockquote><div class="pribeh-break-line"></div></div></div>';
    }
  },

  image_block: {
    label: 'Obrázek', description: 'Obrázek s popiskem',
    schema: [
      { key: 'src', label: 'URL obrázku', type: 'image' },
      { key: 'alt', label: 'Alt text', type: 'text' },
      { key: 'caption', label: 'Popisek', type: 'text' },
      { key: 'maxwidth', label: 'Max šířka', type: 'select', options: [{value:'100%',label:'Plná'},{value:'720px',label:'Střední'},{value:'480px',label:'Malá'}] },
    ],
    defaults: { src: '', alt: '', caption: '', maxwidth: '100%' },
    render: function(p) {
      if (!p.src) return '';
      var cap = p.caption ? '<figcaption style="font-size:0.78rem;color:rgba(255,255,255,0.35);margin-top:0.5rem;text-align:center">'+p.caption+'</figcaption>' : '';
      return '<figure style="margin:1.5rem 0;text-align:center"><img src="'+p.src+'" alt="'+p.alt+'" style="max-width:'+p.maxwidth+';width:100%;border-radius:10px" loading="lazy">'+cap+'</figure>';
    }
  },

  faq_block: {
    label: 'Časté dotazy', description: 'Accordion s Q&A',
    schema: [
      { key: 'title', label: 'Název skupiny', type: 'text' },
      { key: 'items', label: 'Otázky', type: 'array', arrayFields: [
        { key: 'q', label: 'Otázka', type: 'text' },
        { key: 'a', label: 'Odpověď', type: 'textarea' },
      ]},
    ],
    defaults: { title: 'FAQ', items: [{q:'Otázka?',a:'Odpověď.'}] },
    render: function(p) {
      var items = (p.items||[]).map(function(i){return '<div class="faq-item"><button class="faq-q" onclick="this.parentElement.classList.toggle(\'open\')">'+i.q+'<span class="faq-arrow">▾</span></button><div class="faq-a">'+i.a+'</div></div>';}).join('');
      return '<div class="faq-group">'+(p.title?'<div class="faq-group-title">'+p.title+'</div>':'')+items+'</div>';
    }
  },

  features_grid: {
    label: 'Grid funkcí', description: 'Karty v mřížce',
    schema: [
      { key: 'section_label', label: 'Nadpis sekce', type: 'text' },
      { key: 'columns', label: 'Sloupce', type: 'select', options: [{value:'2',label:'2'},{value:'3',label:'3'}] },
      { key: 'items', label: 'Položky', type: 'array', arrayFields: [
        { key: 'title', label: 'Název', type: 'text' },
        { key: 'desc', label: 'Popis', type: 'textarea' },
      ]},
    ],
    defaults: { section_label: '', columns: '2', items: [{title:'Funkce',desc:'Popis.'}] },
    render: function(p) {
      var items = (p.items||[]).map(function(i){return '<div class="eb-feature"><div><div class="eb-feature-title">'+i.title+'</div><div class="eb-feature-desc">'+i.desc+'</div></div></div>';}).join('');
      var grid = '<div class="eb-features" style="grid-template-columns:repeat('+(p.columns||'2')+',1fr)">'+items+'</div>';
      return p.section_label ? '<div class="sdileni-block"><div class="sdileni-block-label">'+p.section_label+'</div><div class="sdileni-block-content">'+grid+'</div></div>' : grid;
    }
  },

  stat_row: {
    label: 'Řada statistik', description: 'Zvýrazněné metriky',
    schema: [
      { key: 'items', label: 'Statistiky', type: 'array', arrayFields: [
        { key: 'number', label: 'Hodnota', type: 'text' },
        { key: 'label', label: 'Popisek', type: 'text' },
      ]},
    ],
    defaults: { items: [{number:'50 %',label:'zisku reinvestujeme'}] },
    render: function(p) {
      var items = (p.items||[]).map(function(i){return '<div class="pribeh-stat"><div class="pribeh-stat-num">'+i.number+'</div><div class="pribeh-stat-label">'+i.label+'</div></div>';}).join('');
      return '<div class="pribeh-stats" style="grid-template-columns:repeat('+(p.items||[]).length+',1fr)">'+items+'</div>';
    }
  },

  two_column: {
    label: 'Dva sloupce', description: 'Obsah ve dvou sloupcích',
    schema: [
      { key: 'left', label: 'Levý sloupec', type: 'textarea' },
      { key: 'right', label: 'Pravý sloupec', type: 'textarea' },
      { key: 'ratio', label: 'Poměr', type: 'select', options: [{value:'1fr 1fr',label:'50/50'},{value:'2fr 1fr',label:'66/33'},{value:'1fr 2fr',label:'33/66'}] },
    ],
    defaults: { left: '<p>Levý</p>', right: '<p>Pravý</p>', ratio: '1fr 1fr' },
    render: function(p) {
      return '<div style="display:grid;grid-template-columns:'+p.ratio+';gap:2rem;margin:1.5rem 0"><div>'+p.left+'</div><div>'+p.right+'</div></div>';
    }
  },

  divider: {
    label: 'Oddělovač', description: 'Vizuální čára',
    schema: [
      { key: 'style', label: 'Styl', type: 'select', options: [{value:'line',label:'Čára'},{value:'space',label:'Mezera'},{value:'dots',label:'Tečky'}] },
    ],
    defaults: { style: 'line' },
    render: function(p) {
      if (p.style==='space') return '<div style="height:3rem"></div>';
      if (p.style==='dots') return '<div style="text-align:center;color:rgba(255,255,255,0.15);letter-spacing:0.5em;margin:2rem 0">• • •</div>';
      return '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:2rem 0">';
    }
  },

  raw_html: {
    label: 'Vlastní HTML', description: 'Libovolný HTML/JS kód',
    schema: [
      { key: 'code', label: 'HTML kód', type: 'textarea' },
    ],
    defaults: { code: '<div><!-- HTML --></div>' },
    render: function(p) { return p.code; }
  }
};


// ═══════════════════════════════════
//  RENDERER
// ═══════════════════════════════════

function renderBlocksHTML(blocks) {
  return blocks.map(function(b) {
    var reg = BLOCK_REGISTRY[b.type];
    if (!reg) {
      return '<div style="padding:1.5rem;margin:1rem 0;background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.2);border-radius:10px;text-align:center"><div style="font-size:0.82rem;color:rgba(224,85,85,0.8);font-weight:600">Neznámý blok: '+b.type+'</div></div>';
    }
    try {
      var html = reg.render(b.props);
      if (!html || html.trim() === '') {
        return '<div style="padding:1rem;margin:1rem 0;background:rgba(255,200,50,0.06);border:1px dashed rgba(255,200,50,0.2);border-radius:8px;text-align:center;font-size:0.78rem;color:rgba(255,200,50,0.5)">'+reg.label+' — prázdný blok</div>';
      }
      return html;
    } catch(e) {
      return '<div style="padding:1rem;margin:1rem 0;background:rgba(224,85,85,0.08);border:1px solid rgba(224,85,85,0.2);border-radius:10px;text-align:center"><div style="font-size:0.82rem;color:rgba(224,85,85,0.8)">Chyba: '+reg.label+'</div><div style="font-size:0.72rem;color:rgba(255,255,255,0.3)">'+e.message+'</div></div>';
    }
  }).join('\n');
}

function renderPageHTML(page, inlineCss) {
  var blocksHTML = renderBlocksHTML(page.blocks);
  return '<!DOCTYPE html>\n<html lang="cs">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>'+(page.meta.title||'')+'</title>\n<meta name="description" content="'+(page.meta.description||'')+'">\n'+(inlineCss ? '<style>'+inlineCss+'</style>\n' : '<link rel="stylesheet" href="../styles.css">\n')+(page.customCss ? '<style>'+page.customCss+'</style>\n' : '')+'</head>\n<body>\n<div class="nebula" aria-hidden="true"><div class="nebula-blob nebula-blob-1"></div><div class="nebula-blob nebula-blob-2"></div></div>\n<main class="subpage-main">\n<section class="sdileni-section"><div class="sdileni-inner">\n'+blocksHTML+'\n</div></section>\n</main>\n</body>\n</html>';
}


// ═══════════════════════════════════
//  STORE
// ═══════════════════════════════════

var STORE_KEY = 'ffy-cms-pages';

function loadPages() {
  try {
    var stored = JSON.parse(localStorage.getItem(STORE_KEY));
    if (stored && stored.length > 0) return stored;
  } catch(e) {}
  return getInitialPages();
}

function savePages(pages) {
  localStorage.setItem(STORE_KEY, JSON.stringify(pages));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}


// ═══════════════════════════════════
//  SEED DATA
// ═══════════════════════════════════

var SEED_PAGES = {
  'blog/co-se-deje-s-prebytkovou-elektricinou': {
    title: 'Co se děje s přebytky ze solárů | FREE for YOU', desc: 'Solár vyrábí i když nikdo není doma. Co se stane s přebytkovou elektřinou a jak funguje sdílení v komunitě FREE for YOU.',
    h1: 'Co se děje s elektřinou ze solárů, když ji nikdo nespotřebuje', lead: '',
    blocks: [
      { type: 'content_section', props: { label: 'Elektřina nemizí — jde do sítě', content: 'Obrázek článku Sluneční elektrárna se neřídí tím, jestli jste doma. Vyrábí, když svítí slunce — bez ohledu na to, jestli v tu chvíli někdo vaří nebo spí. Co se stane s elektřinou, kterou nikdo okamžitě nespotre?\n\nPřebytková elektřina se automaticky přelévá do distribuční sítě. Odtud ji čerpají ostatní odběratelé v okolí. Fyzicky jde o tok elektronů — elektřina z vaší střechy může svítit sousedovi dřív, než doputuje z vzdálené elektrárny.\n\nEnergie z vlastních zdrojů FREE for YOU se rozděluje ve třech krocích. Nejdřív za zvýhodněnou cenu dostane zákazník, u kterého zdroj stojí. Pak se rozdělí podle Proudíků — zákazníci, kteří jsou s námi déle a odebírají víc, mají vyšší nárok. Co zbyde, dostane rovným dílem každý zákazník FREE for YOU.\n\nNejde o fyzickou elektřinu — ta teče přes distribuční síť jako vždy. Jde o finanční dopad výroby, který se projeví na vaší faktuře.\n\nČím více vlastní výroby komunita má, tím méně závisí na tržní ceně. Elektrárna postavená dnes bude snižovat cenu i za deset let — protože slunce za svit fakturu nepošle.' } },
    ]
  },
  'blog/proc-cena-elektriciny-nesouvisí-s-fakturou': {
    title: 'Proč cena elektřiny na burze nesouvisí s fakturou | FREE for YOU', desc: 'Cena elektřiny na burze klesla, ale zálohy zůstávají stejné. Vysvětlujeme proč — a jak to řeší FREE for YOU.',
    h1: 'Proč cena elektřiny na burze nesouvisí s tím, co platíte na faktuře', lead: '',
    blocks: [
      { type: 'content_section', props: { label: 'Kde se bere cena na vaší faktuře', content: 'Obrázek článku Když noviny píšou, že cena elektřiny na burze klesla, většina lidí očekává, že se to projeví na jejich faktuře. Nestane se. Aspoň ne hned — a ne automaticky.\n\nFaktura za elektřinu se skládá z několika částí. Největší jsou dvě: <strong>distribuce</strong> a <strong>silová elektřina</strong>. Distribuci platíte svému distributorovi (ČEZ, EG.D nebo PRE) — a ta je regulovaná státem. Na tu burza nemá vliv.\n\nSilová elektřina je ta část, kterou nakupuje váš dodavatel. A tady to zajímavé začíná.\n\nVětšina dodavatelů nekupuje elektřinu den po dni za aktuální burzovní cenu. Nakupují ji dopředu — měsíce nebo roky předem — za takzvané forwardové ceny. Když jste u dodavatele s fixním tarifem, cena vaší elektřiny byla sjednána možná rok před tím, než vám přišla první faktura.\n\nBurza může být levná dnes. Ale váš dodavatel ji koupil draho loni v zimě.\n\nU FREE for YOU vidíte na faktuře přesně, kolik platíte za silovou elektřinu a kolik za distribuci. Nic není schované v globální sazbě. Když ceny na trhu klesají, snažíme se to promítnout do nových smluv co nejdřív — ne za rok, až skončí aktuální smluvní období.\n\nVlastní zdroje, které budujeme, nás od tržní ceny postupně osvobozují. Elektřina vyrobená na vlastní střeše nestojí to, co říká burza.' } },
    ]
  },
  'blog/zmena-dodavatele-co-se-zmeni': {
    title: 'Změna dodavatele: co se změní a co ne | FREE for YOU', desc: 'Dodávka se nepřeruší, zásuvky zůstanou stejné. Vysvětlujeme krok za krokem, jak přechod k FREE for YOU probíhá.',
    h1: 'Změna dodavatele: co se opravdu změní a co zůstane stejné', lead: '',
    blocks: [
      { type: 'content_section', props: { label: 'Co se nezmění', content: 'Obrázek článku Změna dodavatele energií zní složitě. Přitom je to jedna z nejjednodušších administrativních věcí, které za vás dnes někdo jiný celé vyřídí. Pojďme si projít, co se opravdu stane — a co vůbec ne.\n\n<strong>Distribuce.</strong> Elektřina nebo plyn teče do vašeho domu stejnou sítí jako dřív. Distributor (ČEZ, EG.D nebo PRE) zůstává stejný — ten si nevybíráte, závisí na tom, kde bydlíte. Fyzická dodávka se při přechodu nepřerušuje ani na minutu.\n\n<strong>Termíny odečtů</strong> zůstávají stejné. Provádí je distributor, ne dodavatel.\n\n<strong>Vaše zásuvky, kotel, sporák</strong> — nic z toho se nedotýkáme.\n\nZmění se, kdo vám posílá fakturu. A za jakou cenu. A jak s vámi komunikuje.\n\nPřechod trvá standardně 6 až 8 týdnů. Většinu té doby se čeká na lhůty na straně distribuce — administrativní proces, který za vás vyřídíme.\n\nVyplnit formulář. Podepsat smlouvu a plnou moc. To je vše. Výpověď stávajícímu dodavateli, komunikaci s distributorem a přihlášení odběrného místa zařídíme za vás.\n\nNejjednodušší způsob, jak se přesvědčit, je zkusit to. Přechod je možné kdykoliv zrušit — bez sankcí, pokud se stihnete rozhodnout včas.' } },
    ]
  },
  'ceny-aktualni-nabidka': {
    title: 'Aktuální nabídka elektřiny — FREE for YOU energie', desc: 'Aktuální ceny silové elektřiny FREE for YOU pro domácnosti. Tarify FIX 2025 pro distribuční území ČEZ, PRE a EG.D.',
    h1: 'Aktuální nabídka', lead: 'Zde vidíte naše aktuálně nabízené tarify. Vyberte si, co odpovídá vašemu způsobu odběru.',
    blocks: [
      { type: 'features_grid', props: { section_label: '', columns: '2', items: [{ title: 'Fixní tarify', desc: 'Víte přesně, za kolik platíte. Cena je dohodnutá předem a nemění se podle dění na trhu. Vhodné pro ty, kdo chtějí jistotu a klid při plánování výdajů domácnosti.' }, { title: 'Tarif FIX2026', desc: 'Fixní cena elektřiny na celý rok 2026' }, { title: 'Tarif FIX2026', desc: 'Fixní cena plynu na celý rok 2026' }, { title: 'SPOT tarify', desc: 'Cena se mění každou hodinu podle toho, kolik elektřina nebo plyn stojí na burzovním trhu. Když je trh levný — platíte méně. Vhodné pro ty, kdo sledují spotřebu a dokážou ji přizpůsobit době, kdy je energie nejlevnější.' }, { title: 'Tarif SPOT', desc: 'Hodinová cena podle burzovního trhu' }, { title: 'Tarif SPOT', desc: 'Denní cena podle burzovního trhu' }] } },
    ]
  },
  'ceny-ceniky': {
    title: 'Ceníky elektřiny 2026 — FREE for YOU energie', desc: 'Kompletní ceníky elektřiny FREE for YOU ke stažení v PDF. Ceny distribuce, silové elektřiny a poplatků pro všechna distribuční území.',
    h1: 'Ceníky', lead: 'Vyberte své distribuční území a zobrazte aktuální ceníky elektřiny a plynu.',
    blocks: [
      { type: 'content_section', props: { label: 'Ceníky', content: 'Vyberte své distribuční území a zobrazte aktuální ceníky elektřiny a plynu.' } },
    ]
  },
  'ceny-kalkulacka': {
    title: 'Kalkulačka ceny elektřiny — FREE for YOU energie', desc: 'Spočítejte si orientační roční náklad za elektřinu u FREE for YOU. Zadejte spotřebu a PSČ — kalkulačka zobrazí celkovou cenu včetně distribuce.',
    h1: 'Kalkulačka', lead: 'Zadejte loňskou roční spotřebu a zjistěte, kolik byste platili u FREE for YOU.',
    blocks: [
      { type: 'features_grid', props: { section_label: '', columns: '3', items: [{ title: 'Základní odběr', desc: 'Svícení a spotřebiče, bez el. vytápění' }, { title: 'S elektrickým vařením', desc: 'Svícení + sporák nebo trouba na elektřinu' }, { title: 'S vytápěním nebo ohřevem vody', desc: 'Přímotop, tepelné čerpadlo nebo el. bojler' }, { title: 'Váš odhad u FREE for YOU Orientační výpočet. Přesná nabídka po kontaktu s námi. Odhadovaný měsíční náklad —', desc: '—' }, { title: 'FREE for YOU Silová elektřina — — Stálý plat — — Distribuce a poplatky Distribuce za MWh — — Distribuce měsíčně — — Daně a POZE — — Celkem ročně: — · průměrně — / MWh s DPH Distribuce a poplatky jsou regulované státem — stejné u všech dodavatelů. PSČ odběrného místa Podle PSČ zjistíme vaše distribuční území. Distribuční sazba D01d D02d D25d D26d D27d D35d D45d D56d D57d D61d Hlavní jistič do 3×10 A do 3×16 A do 3×20 A do 3×25 A do 3×32 A do 3×40 A do 3×50 A do 3×63 A Spotřeba VT (vysoký tarif) MWh / rok Spotřeba NT (nízký tarif) MWh / rok Spočítat → Váš odhad u FREE for YOU Orientační výpočet včetně distribuce dle sazby a jističe. Odhadovaný měsíční náklad —', desc: '—' }] } },
    ]
  },
  'index': {
    title: 'FREE for YOU energie — Stabilní energie z vlastních zdrojů', desc: 'Dodáváme elektřinu od roku 2016. Stavíme vlastní solární zdroje na střechách a 50 % zisku reinvestujeme. Kalkulačka, ceníky a transparentní podmínky.',
    h1: 'Stabilní energie bez zbytečné marže.', lead: '',
    blocks: [
      { type: 'content_section', props: { label: 'Stabilní energie bez zbytečné marže.', content: 'Polovinu zisku investujeme zpět do vlastních výrobních zdrojů. Čím víc energie vyrobíme sami, tím méně platíte — a tím stabilnější je Vaše cena.' } },
      { type: 'content_section', props: { label: 'Energie bez zbytečných starostí.', content: 'Žádné instalace, žádné výpadky, žádná překvapení na faktuře — jen férová dodávka, o kterou se postaráme za Vás.\n\nZměnu vyřídíme za Vás Celý proces přechodu zajišťujeme od A do Z. Stačí vyplnit formulář a nahrát příslušné dokumenty— o zbytek se staráme my.\n\nBez přerušení dodávky Přechod probíhá plynule. Energie teče nepřetržitě — žádná instalace, žádné výpadky, žádné starosti.\n\nStabilní a dlouhodobá spolupráce Budujeme vlastní výrobní zdroje, aby Vaše cena zůstala stabilní i za deset let — ne jen pár měsíců.' } },
      { type: 'content_section', props: { label: 'Tři kroky. A hotovo.', content: 'Celý přechod zvládnete za pár minut. Zbytek zařídíme my.\n\nPár základních údajů — adresa odběrného místa, aktuální dodavatel a kontakt. A nahrajete nutné dokumenty. Trvá to asi 3 minuty.\n\nPřipravíme vše potřebné, vypovíme stávající smlouvu a zajistíme vše potřebné s distribucí. Za Vás.\n\nOd prvního dne odebíráte elektřinu nebo plyn za transparentní cenu. Bez skrytých poplatků.' } },
      { type: 'content_section', props: { label: 'Ekonomika bez dividend.', content: 'Proč držíme cenu dlouhodobě nízko? Zde je logika za naším modelem.\n\nPlatíte za energii Vaše platby pokrývají náklady na pořízení a dodávku energie. Zisk neslouží k výplatě investorům, ale k rozvoji společnosti.\n\n50 % zisku se reinvestuje Polovinu výsledků hospodaření investujeme zpět do vlastních solárních a jiných výrobních zdrojů.\n\nCena se postupně snižuje Čím více vlastní výroby, tím méně závisíme na tržní ceně. Výroba, která začíná dnes, snižuje náklady i za 10 nebo 20 let.\n\nEnergobanking je zákaznický portál, kde vidíte spotřebu, výrobu, dopad reinvestic a historii plateb — vše na jednom místě. Transparentně, bez skrytých čísel.' } },
      { type: 'content_section', props: { label: 'Jsme regulovaný subjekt s licencí ERÚ.', content: 'Přechod proběhl bez jediného výpadku. Formulář jsem vyplnil odpoledne, za týden mi přišla smlouva — a pak jsem na to zapomněl. Energie prostě tekla dál.\n\nChtěla jsem mít jistotu, jak se moje cena bude vyvíjet. FREE for YOU mi vysvětlili, jak jejich model funguje. Dává smysl — a cena to potvrzuje.\n\nJako firma oceňuju transparentnost. Vidím, odkud energie pochází i kde se vyrábí. Přesně tuhle jistotu jsem hledal.\n\nVaši elektřinu k Vám domů dopravuje stávající distribuční síť — ČEZ Distribuce, EG.D nebo PRE Distribuce. Se všemi třemi máme uzavřenou smlouvu. My jsme obchodník — dodavatel. Distribuci garantuje Váš distributor přesně tak, jak jste zvyklí. Nic se na infrastruktuře nemění.' } },
      { type: 'content_section', props: { label: 'Důležité dokumenty', content: 'Nic neskrýváme. Prohlédněte si vše před podpisem — smlouvu, fakturu i plnou moc.' } },
      { type: 'features_grid', props: { section_label: '', columns: '2', items: [{ title: 'Náhled smlouvy', desc: 'Vzorová smlouva o dodávce energie — přečtěte si podmínky ještě před podpisem.' }, { title: 'Náhled faktury', desc: 'Ukázka faktury — přesně takovou dostanete. Žádné záhadné položky, vše čitelně.' }, { title: 'Plná moc', desc: 'Zmocnění, na základě kterého vyřídíme změnu dodavatele za Vás — bez Vašeho běhání.' }, { title: 'Smlouva o výkupu', desc: 'Podmínky výkupu přebytků z Vaší vlastní výroby — například ze solárních panelů.' }] } },
      { type: 'faq_block', props: { title: '', items: [{ q: 'Je změna složitá?', a: 'Ne. Vyplníte krátký formulář — asi 3 minuty. Zbytek zařídíme my: výpověď stávající smlouvy, přihlášku k distribuci, novou smlouvu. Nemusíte nic volat ani nikam chodit.' }, { q: 'Může se přerušit dodávka energie?', a: 'Ne. Přechod mezi dodavateli nepřerušuje fyzickou dodávku. Elektřina nebo plyn teče nepřetržitě — jen se změní, kdo Vám posílá fakturu. Distribuce zůstává stejná.' }, { q: 'Je cena fixní?', a: 'Podmínky jsou jasně sjednané ve smlouvě. Vždy Vás předem informujeme o jakékoli změně ceníku — bez překvapení na faktuře. Ceny se dlouhodobě snižují díky reinvesticím do vlastní výroby.' }, { q: 'Co když budu chtít odejít?', a: 'Vždy je to Váš svobodný výběr. Podmínky ukončení smlouvy jsou jasně popsané v dokumentech — žádné skryté pokuty, žádné záludnosti. Chceme, aby u nás lidé zůstávali proto, že jim to dává smysl.' }, { q: 'Kdo vlastně FREE for YOU je?', a: 'Jsme regulovaný obchodník s energiemi s licencí Energetického regulačního úřadu (ERÚ). Na trhu fungujeme od roku 1997, elektřinu dodáváme od roku 2016. Dodávky zajišťujeme přes distribuční sítě ČEZ Distribuce, EG.D a PRE Distribuce — se všemi třemi máme uzavřenou smlouvu. Nejsme start-up — jsme zavedená firma s dlouhou historií.' }] } },
      { type: 'content_section', props: { label: 'Ozvěte se nám. Odpovídá člověk.', content: 'Žádná hlasová ústředna. Žádné čekání na frontu. Buď telefon zvedne rovnou kolega — nebo se Vám ozveme obratem.' } },
      { type: 'cta_block', props: { title: 'Vyzkoušejte na 1 měsíc.', description: 'Bez závazků. Bez výpadků. Jen energie za férovějších podmínek — a pak se rozhodněte sami.', btn1_text: 'Chci to vyzkoušet →', btn1_url: '#', btn2_text: '', btn2_url: '#' } },
    ]
  },
  'jak-energobanking': {
    title: 'Energobanking — zákaznický portál FREE for YOU', desc: 'Energobanking je váš online přehled spotřeby, faktur, výroby a sdílení elektřiny. Zdarma pro každého zákazníka FREE for YOU.',
    h1: 'Energobanking', lead: 'Zákaznický portál FREE for YOU. Jedno místo pro spotřebu, výrobu, sdílení, platby i historii — bez zbytečného hledání.',
    blocks: [
      { type: 'content_section', props: { label: 'Co to je', content: 'Energobanking je virtuální účet, který FREE for YOU vytvoří automaticky každému zákazníkovi po registraci. Přístup je zdarma — stačí webový prohlížeč.\n\nFunguje jako rozcestník pro vše, co se u vás děje s energiemi. Vidíte faktury, spotřebu, výrobu ze solárů, sdílení elektřiny i historii plateb — na jednom místě, bez nutnosti psát e-maily nebo volat.' } },
      { type: 'content_section', props: { label: 'Co v něm najdete', content: 'Faktury a platby Historie vyúčtování, aktuální zálohy, přehled plateb. Vše ke stažení jako PDF.' } },
      { type: 'content_section', props: { label: 'Jak se přihlásit', content: 'Energobanking účet vzniká automaticky po podpisu smlouvy s FREE for YOU. Přihlašovací údaje dostanete e-mailem.\n\nPokud jste zákazník a přihlašovací údaje nemáte, napište nám na <a href="mailto:info@freeforyou.cz" class="eb-link">info@freeforyou.cz</a> nebo zavolejte — přístup obnovíme obratem.' } },
      { type: 'cta_block', props: { title: 'Přejít do Energobankingu', description: 'Portál je dostupný online — stačí přihlašovací údaje z e-mailu.', btn1_text: 'Otevřít Energobanking →', btn1_url: 'https://www.energobanking.cz/', btn2_text: 'Potřebuji pomoc', btn2_url: 'podpora-kontakty.html' } },
    ]
  },
  'jak-proudiky': {
    title: 'Proudíky — věrnostní program FREE for YOU energie', desc: 'Proudíky jsou body za odběr energie u FREE for YOU. Podle nich se rozděluje elektřina z vlastních obnovitelných zdrojů. Silver a Gold členství za doporučení.',
    h1: 'Proudíky', lead: 'Body za odběr energie, podle kterých se rozděluje elektřina z našich vlastních zdrojů. Čím víc odebíráte a čím déle jste s námi, tím větší podíl máte.',
    blocks: [
      { type: 'content_section', props: { label: 'Co jsou Proudíky', content: 'FREE for YOU reinvestuje 50 % čistých zisků do obnovitelných zdrojů a akumulačních zařízení. Elektřina z těchto zdrojů se následně rozděluje mezi zákazníky — a Proudíky určují, jaký podíl vám náleží.\n\nProudíky jsou body, které sbíráte odběrem energie u FREE for YOU. Čím více Proudíků máte, tím větší poměrnou část elektřiny z vlastních zdrojů dostanete.' } },
      { type: 'content_section', props: { label: 'Jak je získáváte', content: 'Proudíky se přičítají automaticky za každé odběrné místo zapsané na vaše jméno. Žádné formuláře, žádné přihlašování — prostě odebíráte a body přibývají.' } },
      { type: 'content_section', props: { label: 'Úrovně členství', content: 'Aktivním doporučováním nových zákazníků si můžete vylepšit členství — a tím násobit rychlost, jakou Proudíky sbíráte.' } },
      { type: 'content_section', props: { label: 'K čemu to vede', content: 'Čím více Proudíků nasbíráte, tím větší podíl elektřiny z vlastních zdrojů FREE for YOU vám náleží. Tato elektřina je vyráběná na střechách existujících objektů — a její cena nezávisí na burze.\n\nKaždý nový zdroj, který FREE for YOU postaví, zvyšuje celkový objem elektřiny k rozdělení. A s ním roste i reálný přínos každého Proudíku.' } },
      { type: 'cta_block', props: { title: 'Začněte sbírat Proudíky', description: 'Stačí být zákazníkem FREE for YOU. Body se počítají automaticky od prvního dne odběru.', btn1_text: 'Doporučte a vylepšete členství →', btn1_url: 'proc-slevy-za-doporuceni.html', btn2_text: 'Kontaktujte nás', btn2_url: 'podpora-kontakty.html' } },
    ]
  },
  'jak-sdileni-elektriny': {
    title: 'Sdílení elektřiny — Elektřina od souseda | FREE for YOU', desc: 'Máte solár a přebytky? Prodejte je sousedovi přes FREE for YOU. Cenu určujete vy, vše se řídí přes Energobanking.',
    h1: 'Sdílení elektřiny', lead: 'Máte solár a vyrábíte víc, než spotřebujete? Místo prodeje do sítě za výkupní cenu můžete elektřinu prodat přímo sousedovi — za cenu, kterou si sami určíte.',
    blocks: [
      { type: 'content_section', props: { label: 'Jak to funguje', content: 'Elektřina od souseda je služba, která propojuje zákazníky FREE for YOU s vlastním zdrojem elektřiny s těmi, kteří chtějí nakupovat lokálně vyrobenou elektřinu za výhodnější cenu.\n\nVy jako Výrobce prodáváte přebytky přímo přes FREE for YOU jinému zákazníkovi — Odběrateli. My zajistíme zúčtování, fakturaci a soulad s legislativou. Vy se domluvíte na ceně.' } },
      { type: 'content_section', props: { label: 'Krok za krokem 1 Domluvíte se Najdete si odběratele sami — souseda, příbuzného, kolegu. FREE for YOU propojení zákazníků nezprostředkovává. 2 Nastavíte podmínky v Energobankingu V Energobankingu zvolíte odběratele, nastavíte cenu a datum zahájení sdílení. Odběratel nabídku přijme — nebo ne. Nabídka platí 72 hodin. 3 Sdílení běží automaticky Každou hodinu se vyhodnotí, kolik elektřiny jste vyrobili a kolik odběratel spotřeboval. Přebytky nad jeho potřebu jdou do sítě za standardní výkupní cenu. 4 Dostanete zaplaceno FREE for YOU od odběratele vybere vaši cenu elektřiny, odečte poplatek za službu a rozdíl vám vyplatí. Vše vidíte v Energobankingu. Co si určujete vy', content: 'Cenu elektřiny pro odběratele si nastavujete sami. Jediná podmínka: nesmí být nižší než poplatek FREE for YOU za zprostředkování služby.\n\nCenu můžete jednou za 4 měsíce změnit — stačí nový návrh přes Energobanking. Odběratel má 336 hodin na přijetí. Pokud nesouhlasí, sdílení skončí ke dni před účinností nové ceny.\n\nSdílet můžete neomezenému počtu odběratelů najednou. Určíte poměr rozdělení elektřiny — nebo ji rozdělíte rovným dílem.' } },
      { type: 'content_section', props: { label: 'Co zařídí FREE for YOU', content: 'Zúčtování, fakturaci, komunikaci s distributorem a dodržení legislativy. Prodej přebytků, které odběratel nestihne spotřebovat, probíhá standardně dle vaší smlouvy.\n\nSdílení probíhá na dobu neurčitou. Ukončit ho může kdykoli každá ze stran — přes Energobanking, s výpovědní lhůtou od 1. dne druhého následujícího kalendářního měsíce.' } },
      { type: 'cta_block', props: { title: 'Chcete začít sdílet?', description: 'Vše nastavíte v Energobankingu. Potřebujete jen odběratele a aktivní smlouvu o výkupu přebytků.', btn1_text: 'Přejít do Energobankingu →', btn1_url: 'https://www.energobanking.cz/', btn2_text: 'elektrinaodsouseda.cz', btn2_url: 'https://www.elektrinaodsouseda.cz/' } },
    ]
  },
  'jak-vykup-elektriny': {
    title: 'Prodej elektřiny — FREE for YOU energie', desc: 'Prodejte přebytky z fotovoltaiky za tržní cenu. FREE for YOU vykoupí vaši elektřinu s poplatkem 19 %, minimum 780 Kč.',
    h1: 'Prodej elektřiny', lead: 'Když váš solár, větrník nebo vodní zdroj vyrobí víc, než spotřebujete, přebytky nemusí téct zadarmo do sítě. Můžete je prodat — a investici vrátit rychleji.',
    blocks: [
      { type: 'content_section', props: { label: 'Co se děje s přebytky', content: 'Fotovoltaika, vítr ani voda nevyrábí podle toho, kolik zrovna spotřebujete. Přebytky jdou automaticky do sítě — bez náhrady, pokud nemáte sjednáno jinak.\n\nBaterie jsou jedním řešením. Prodej přebytků FREE for YOU je druhé — a nevyžaduje žádnou investici navíc.' } },
      { type: 'content_section', props: { label: 'Jak to funguje', content: 'Uzavřete s námi smlouvu o výkupu přebytků. Přebytečná elektřina, kterou váš zdroj dodá do sítě, se automaticky zaúčtuje a proplatí za tržní cenu.\n\nZ výkupní ceny odečítáme náš poplatek — <strong>19 % z tržní ceny, minimálně 780 Kč</strong>. Zbytek jde na váš účet. Vše vidíte v Energobankingu: kolik jste vyrobili, kolik prodali a kolik vám přijde.' } },
      { type: 'content_section', props: { label: 'Co z toho máte', content: 'Přebytky přestanou být ztráta a začnou být příjem. Návratnost investice do fotovoltaiky se tím zkracuje — bez toho, abyste museli cokoliv dalšího řešit.\n\nProdej přebytků a sdílení elektřiny přes službu Elektřina od souseda se navzájem nevylučují. Když sdílíte elektřinu přímo odběrateli, řídí se ta část jiným cenovým ujednáním. Co odběratel nestihne spotřebovat, jde do standardního výkupu.' } },
      { type: 'content_section', props: { label: 'Kde to sledujete', content: 'V Energobankingu máte přehled o výrobě, prodeji i výplatách. Vidíte historii po zúčtovacích obdobích a okamžitě víte, na kolik přebytky vyšly.' } },
      { type: 'stat_row', props: { items: [{ number: '19 %', label: 'poplatek z tržní ceny' }, { number: '780 Kč', label: 'minimum za zúčtovací období' }] } },
      { type: 'cta_block', props: { title: 'Chcete začít prodávat přebytky?', description: 'Smlouvu o výkupu vyřídíme s vámi. Začít lze kdykoli — stačí nás kontaktovat.', btn1_text: 'Kontaktujte nás →', btn1_url: 'podpora-kontakty.html', btn2_text: 'Energobanking', btn2_url: 'https://www.energobanking.cz/' } },
    ]
  },
  'podpora-blog': {
    title: 'Blog — novinky ze světa energií | FREE for YOU', desc: 'Články o cenách elektřiny, solární energii a změně dodavatele. Bez zbytečného žargonu.',
    h1: 'Blog', lead: 'Novinky, vysvětlení a postřehy ze světa energií. Bez zbytečného žargonu.',
    blocks: [
      { type: 'content_section', props: { label: 'Proč cena elektřiny na burze nesouvisí s tím, co platíte na faktuře', content: 'Obrázek článku Energetika 5. června 2025 Proč cena elektřiny na burze nesouvisí s tím, co platíte na faktuře Médii pravidelně proletí zpráva, že cena elektřiny na burze klesla na historické minimum. A přesto vaše zálohy zůstávají stejné. Jak je to možné? Vysvětlujeme, co se schovává mezi burzou a vaší zásuvkou.\n\nObrázek článku Solární energie 18. května 2025 Co se děje s elektřinou ze solárů, když ji nikdo nespotřebuje Solární elektrárna vyrábí, i když nikdo doma není. Co se stane s přebytkovou elektřinou a jak funguje sdílení v rámci komunity FREE for YOU?\n\nObrázek článku Prakticky 2. dubna 2025 Změna dodavatele: co se opravdu změní a co zůstane stejné Největší strach lidí při změně dodavatele je, že přijdou o dodávku. Spoiler: nepřijdou. Vysvětlujeme krok za krokem, co přechod obnáší a co si nemusíte řešit vůbec.' } },
    ]
  },
  'podpora-dokumenty': {
    title: 'Dokumenty ke stažení — FREE for YOU energie', desc: 'Smlouvy, obchodní podmínky, vzory faktur a plné moci FREE for YOU. Vše ke stažení nebo náhledu v PDF.',
    h1: 'Dokumenty', lead: 'Všechny důležité dokumenty na jednom místě. Kliknutím sekci rozbalíte a dokument stáhnete.',
    blocks: [
      { type: 'features_grid', props: { section_label: '', columns: '3', items: [{ title: 'Smlouva o dodávce elektřiny PDF · aktuální verze Stáhnout', desc: 'Vzorová smlouva o dodávce plynu' }, { title: 'Vzorová smlouva o výkupu elektřiny PDF · aktuální verze Stáhnout Plné moci ▾', desc: 'Plná moc — změna dodavatele' }, { title: 'Plná moc — přepis odběrného místa PDF · aktuální verze Stáhnout Vzory faktur ▾', desc: 'Vzorová faktura — elektřina' }, { title: 'Vzorová faktura — plyn PDF · ukázka vyúčtování Stáhnout Obchodní podmínky ▾', desc: 'Všeobecné obchodní podmínky' }, { title: 'Podmínky systému FREE for YOU PDF · platné od 1. 11. 2023 Stáhnout', desc: 'Ochrana osobních údajů (GDPR)' }] } },
    ]
  },
  'podpora-faq': {
    title: 'Časté dotazy — FREE for YOU energie', desc: 'Odpovědi na nejčastější otázky o změně dodavatele, fakturaci, distribuci a službách FREE for YOU.',
    h1: 'Časté dotazy', lead: 'Nenašli jste odpověď? Napište nebo zavolejte — odpovídá člověk.',
    blocks: [
      { type: 'faq_block', props: { title: 'Přechod k FREE for YOU', items: [{ q: 'Přijdu při přechodu o dodávku elektřiny nebo plynu?', a: 'Ne. Přechod mezi dodavateli probíhá čistě administrativně — fyzická dodávka se nepřerušuje ani na minutu. Elektřina nebo plyn teče dál stejnou sítí, mění se jen to, kdo vám posílá fakturu.' }, { q: 'Jak dlouho přechod trvá?', a: 'Standardně 6 až 8 týdnů od podpisu smlouvy. Většinu té doby běží lhůty na straně distribuce — my mezitím zařizujeme vše potřebné. Vy čekáte, my pracujeme.' }, { q: 'Co musím udělat já a co zařídíte vy?', a: 'Vy vyplníte krátký formulář a podepíšete smlouvu a plnou moc. Zbytek — výpověď stávající smlouvy, komunikace s distributorem, přihlášení odběrného místa — zařídíme za vás.' }, { q: 'Jaké dokumenty potřebuji k přechodu?', a: 'Stačí poslední vyúčtování od současného dodavatele a podepsaná plná moc. To je vše, co od vás potřebujeme, abychom mohli začít.' }, { q: 'Mohu přejít, i když mám smlouvu s výpovědní lhůtou?', a: 'Ano. Smlouvu za vás vypovíme a přechod naplánujeme tak, aby navazoval přesně na konec výpovědní lhůty. Nic neplatíte dvakrát.' }, { q: 'Mohu přejít jen s elektřinou, nebo musím i s plynem?', a: 'Přejít můžete s elektřinou, s plynem, nebo s obojím — záleží jen na vás. Každá komodita se řeší samostatně.' }, { q: 'Co když budu chtít odejít?', a: 'Podmínky ukončení smlouvy jsou jasně popsané ve smlouvě. Žádné skryté pokuty. Když se rozhodnete odejít, řeknete nám to a projdeme postup společně.' }] } },
      { type: 'faq_block', props: { title: 'Ceny a produkty', items: [{ q: 'Jaký je rozdíl mezi fixním a SPOT tarifem?', a: 'U fixního tarifu víte předem přesně, za kolik platíte — cena je dohodnutá na celé smluvní období. U SPOT tarifu se cena mění každou hodinu podle burzovního trhu. Když je trh levný, platíte méně. Když je drahý, platíte více. SPOT se vyplatí těm, kdo sledují spotřebu a dokážou ji přizpůsobit době, kdy je energie nejlevnější.' }, { q: 'Jak se tvoří cena energie u FREE for YOU?', a: 'Cena se skládá ze dvou částí — regulované složky (distribuce, daně, poplatky — stejné u všech dodavatelů) a obchodní složky, kterou stanovuje FREE for YOU. Část zisku z obchodní složky reinvestujeme do vlastních zdrojů. Když vlastní výroba roste, klesá naše závislost na tržní ceně — a to se časem projeví i na ceně pro vás.' }, { q: 'Co je Energobanking a musím ho používat?', a: 'Energobanking je váš zákaznický účet, kde vidíte faktury, spotřebu, historii plateb a dopad výroby komunity. Není povinný, ale doporučujeme ho — přehled o vlastní energii se hodí. Přístup dostanete automaticky po přechodu.' }, { q: 'Jak funguje systém slev za doporučení?', a: 'Když doporučíte FREE for YOU někomu dalšímu a ten přejde, získávají obě strany slevu na energii. Systém je nastaven tak, aby měl smysl jak pro toho, kdo doporučuje, tak pro toho, kdo přichází. Konkrétní podmínky a modelový příklad najdete na stránce Slevy za doporučení .' }, { q: 'Mění se cena v průběhu smlouvy?', a: 'U fixního tarifu ne — cena je garantovaná po celou dobu smluvního období. U SPOT tarifu se mění každou hodinu podle trhu. O jakékoli změně ceníku vás vždy informujeme předem.' }, { q: 'Jsou v ceně zahrnuty i poplatky za distribuci?', a: 'Poplatky za distribuci jsou součástí vaší faktury, ale nejde o naši marži — jde o regulované platby, které odvádíme distributorovi ve vaší oblasti. Jsou stejné u každého dodavatele. Na faktuře je vždy vidíte odděleně.' }] } },
      { type: 'faq_block', props: { title: 'Pro stávající zákazníky', items: [{ q: 'Kdy probíhají odečty?', a: 'Odečty provádí váš distributor podle distribučního území — ne FREE for YOU. Při přechodu k nám se termíny odečtů nemění, stejně jako se nemění distributor. Ten závisí na tom, kde bydlíte, a nelze ho zvolit.' }, { q: 'Proč mohu mít dvě zálohy splatné ve stejném měsíci?', a: 'Zálohy FREE for YOU platíte vždy na následující kalendářní měsíc. Při přechodu proto může nastat situace, kdy vám přijdou dvě zálohy ve stejném měsíci — jedna za aktuální měsíc u původního dodavatele, jedna za následující u nás. Pokud si nejste jisti, jak váš rozpis záloh vypadá, projdeme ho s vámi.' }, { q: 'Vracíte přeplatky automaticky?', a: 'Ano, vždy automaticky. Přeplatek vám vrátíme do data splatnosti faktury na účet, ze kterého platíte zálohy. Nic nepožadujeme, nic nemusíte žádat.' }, { q: 'Kde najdu svoje smlouvy a faktury?', a: 'Všechny dokumenty — smlouvy, faktury, vyúčtování — najdete ve svém Energobankingu . Obecné dokumenty a ceníky jsou k dispozici na stránce Dokumenty .' }, { q: 'Jak probíhá přepis odběrného místa?', a: 'Přepis řešíte při prodeji nebo pronájmu nemovitosti, kdy se mění odběratel. Kontaktujte nás — projdeme s vámi, co budete potřebovat od původního i nového odběratele, a celý proces zorganizujeme.' }, { q: 'Co dělat, když se stěhuji?', a: 'Napište nebo zavolejte co nejdříve — ideálně pár týdnů před stěhováním. Podle situace buď převedeme smlouvu na novou adresu, nebo zajistíme ukončení a případně nové připojení. Každé stěhování je trochu jiné, proto je nejjednodušší to probrat přímo.' }] } },
    ]
  },
  'podpora-kontakty': {
    title: 'Kontakty — FREE for YOU energie', desc: 'Kontaktujte FREE for YOU. Telefon +420 227 072 292, e-mail info@freeforyou.cz. Sídlo Českomoravská 2255/12a, Praha 9.',
    h1: 'Kontakty', lead: 'Telefon zvedá člověk. E-mail čteme a odpovídáme v pracovní dny do 24 hodin.',
    blocks: [
      { type: 'content_section', props: { label: 'Kontakty', content: 'Telefon zvedá člověk. E-mail čteme a odpovídáme v pracovní dny do 24 hodin.' } },
    ]
  },
  'pro-media': {
    title: 'Pro média — FREE for YOU energie', desc: 'Loga, základní informace o firmě a kontakt pro novináře. FREE for YOU s.r.o. — dodavatel elektřiny od roku 2016.',
    h1: 'Pro média', lead: 'Loga, základní informace a kontakt pro novináře a partnery.',
    blocks: [
      { type: 'content_section', props: { label: 'O společnosti', content: '<strong>FREE for YOU s.r.o.</strong> je český dodavatel elektřiny a plynu, který od roku 2016 buduje vlastní obnovitelné zdroje energie. Společnost reinvestuje 50 % zisku do výstavby solárních elektráren na střechách existujících objektů — bez záboru zemědělské půdy.\n\nZákazníkům FREE for YOU nabízí transparentní cenotvorbu, komunitní model sdílení elektřiny a postupné snižování závislosti na tržní ceně díky vlastní výrobě.' } },
      { type: 'content_section', props: { label: 'Fakta Název společnosti FREE for YOU s.r.o. IČ 25336665 Sídlo Českomoravská 2255/12a, 190 00 Praha 9 – Libeň Obchodní rejstřík SZ C 260212, Městský soud v Praze Licence Obchod s elektřinou č. 141634108 Dodávky elektřiny od 2016 Distribuční území ČEZ Distribuce, EG.D, PRE Distribuce Reinvestice do OZE 50 % zisku Loga ke stažení', content: 'Logo FREE for YOU ve všech variantách. Používejte prosím vždy v dostatečné velikosti a s přiměřenou ochrannou zónou kolem.' } },
      { type: 'content_section', props: { label: 'Boilerplate', content: 'FREE for YOU s.r.o. je český dodavatel elektřiny a plynu se sídlem v Praze. Společnost dodává energii od roku 2016 a buduje vlastní solární zdroje na střechách existujících objektů. Polovina zisku je reinvestována do rozšiřování výrobních kapacit s cílem trvale snižovat cenu energie pro zákazníky. Více informací na <a href="https://www.freeforyou.cz/" target="_blank">www.freeforyou.cz</a>.' } },
      { type: 'content_section', props: { label: 'Kontakt pro média', content: 'Jméno Tomáš Alvarez Pozice Marketing a komunikace E-mail info@freeforyou.cz Telefon +420 227 072 292' } },
    ]
  },
  'proc-investice-oze': {
    title: 'Investice do obnovitelných zdrojů — FREE for YOU energie', desc: 'FREE for YOU reinvestuje 50 % zisku do vlastních solárních elektráren na střechách. Jak to funguje a proč to děláme.',
    h1: 'Zisk, který pracuje dál.', lead: 'Část toho, co vyděláme, jde rovnou zpátky do vlastní výroby energie. Tady je proč — a co to znamená pro vaši cenu.',
    blocks: [
      { type: 'content_section', props: { label: 'Proč zdroje', content: 'Věříme, že každý by měl mít ideálně vlastní zdroj energie. Ne jako luxus, ale jako samozřejmost.\n\nEnergie nakoupená na trhu závisí na tom, co trh zrovna dělá. Energie vyrobená vlastním zdrojem závisí na slunci. Když část spotřeby pokryjeme sami, trh nás ovlivňuje méně — a to se postupně projeví na ceně.' } },
      { type: 'content_section', props: { label: 'Jak to funguje', content: 'Ve stanovách FREE for YOU je zakotveno, že padesát procent zisku každý rok jde do výstavby solárních elektráren.\n\nNení to dobrovolné gesto. Je to pravidlo, které platí bez ohledu na to, co se děje na trhu.' } },
      { type: 'content_section', props: { label: 'Kdo má z výroby prospěch', content: 'Energie z vlastních zdrojů se rozděluje ve třech krocích.' } },
      { type: 'content_section', props: { label: 'Kde jsme teď', content: 'První vlastní zdroj se aktuálně realizuje. Jsou rozjednané tři lokality — na jedné z nich brzy vyroste první solární elektrárna FREE for YOU.\n\nJakmile bude místo potvrzené, dáme vědět.' } },
      { type: 'stat_row', props: { items: [{ number: '50 %', label: 'zisku každý rok do vlastních zdrojů — zakotveno ve stanovách' }] } },
    ]
  },
  'proc-nas-pribeh': {
    title: 'Náš příběh — FREE for YOU energie', desc: 'Jak jsme od dodavatele elektřiny došli ke stavbě vlastních solárních zdrojů. Příběh FREE for YOU — od otázky po odpověď.',
    h1: 'Náš příběh', lead: 'Otázka, která nás nenechala odejít.',
    blocks: [
      { type: 'content_section', props: { label: 'Slepé uličky', content: 'Prošli jsme všechny známé cesty.\n\nJaderná energie je stabilní, ale pomalá v čase, který žijeme. Vodní energie je silná, ale vázaná na krajinu a její rovnováhu, která není jen technická. Větrná energie naráží na proměnlivost prostředí i společenské přijetí. Každá z těchto cest je reálná — a zároveň omezená svými vlastními podmínkami.\n\nNešlo o ideologii. Šlo o hranice reality.\n\nA právě v těchto hranicích se objevilo něco, co bylo překvapivě jednoduché.' } },
      { type: 'content_section', props: { label: 'Průlom', content: 'A právě v těchto hranicích se objevilo něco, co bylo překvapivě jednoduché. Ne zemědělská půda, ne nová zátěž krajiny, ne další zásah do prostoru, který už tak nese dost.\n\n<strong>Střechy.</strong> Povrchy, které už existují. Místa, která dnes často jen pasivně stojí nad tím, co by mohlo být využito.\n\nSolární energie není nová myšlenka. Nové je jen rozhodnutí, kam ji zasadit.' } },
      { type: 'content_section', props: { label: 'Co nás vede', content: 'Základní přesvědčení, které nás vede, je prosté a zároveň radikální: <strong>každý člověk by měl mít možnost mít vlastní zdroj energie.</strong>\n\nNe jako futuristický ideál. Ale jako reálný směr, kterým se dá postupně posouvat.\n\nNe proto, aby svět přestal být propojený. Ale aby se vztah mezi lidmi a energií stal méně vzdáleným, méně závislým, méně nečitelným.\n\nKaždá instalovaná střecha, každá vyrobená kilowatthodina z vlastního zdroje, každý krok směrem k lokální výrobě — není izolovaný projekt. Je to posun v tom, odkud energie přichází a komu patří její stabilita.' } },
      { type: 'content_section', props: { label: 'Pomalá transformace', content: 'Nehledáme rychlou změnu. Budujeme pomalou transformaci, která se neprojevuje jedním rozhodnutím, ale dlouhým řetězcem malých přesunů směrem k větší autonomii.\n\nA pokud má mít energie v budoucnu jinou podobu, nezačne to velkým gestem.' } },
      { type: 'quote_block', props: { text: 'Elektřina se stále musí někde nakoupit. A to znamená, že její cena nikdy není úplně naše.', style: 'large' } },
      { type: 'quote_block', props: { text: 'Energie nemá vznikat na úkor prostoru. Má vznikat v jeho rámci.', style: 'small' } },
      { type: 'quote_block', props: { text: 'Začne to tím, že se přestane brát jen zvenčí.', style: 'large' } },
      { type: 'cta_block', props: { title: 'Chcete být součástí toho?', description: 'Každý zákazník FREE for YOU je součástí modelu — výroba, která roste, pracuje pro celou komunitu.', btn1_text: 'Spočítat moji cenu →', btn1_url: 'ceny-kalkulacka.html', btn2_text: 'Kontaktujte nás', btn2_url: 'podpora-kontakty.html' } },
    ]
  },
  'proc-reference': {
    title: 'Reference a hodnocení zákazníků — FREE for YOU energie', desc: 'Co říkají zákazníci FREE for YOU. Hodnocení z Firmy.cz a Google — ověřitelné recenze s přímými odkazy na profily.',
    h1: 'Reference zákazníků', lead: 'Co o nás říkají lidé, kteří nám svěřili svou energii.',
    blocks: [
      { type: 'content_section', props: { label: '', content: 'Jsme odběratelem 6 let. Ceny jsou přijatelné, dodavatel pravidelně informuje o veškerých změnách. Jsme velice spokojeni a vřele všem doporučujeme.\n\nSlužby FREE for You jsou na vysoké úrovni. Jejich zaměstnanci se snaží vždy pomoct a hlavně všichni vystupují slušně a profesionálně. Vše do sebe dobře zapadá, což na člověka působí velice příjemně.\n\nZa mě spokojenost, ceny přiměřené, nikdy mi nebylo odmítnuto mimořádné vyúčtování, skvělá komunikace. Rovněž tak přeplatky v termínu vždy vráceny.\n\nDoporučuji! Přechod proběhl naprosto bez problémů, vše zařídili za mě. Od té doby žádné starosti s energiemi.\n\nJsem zákazníkem přes 4 roky, vždy korektní jednání, transparentní faktury. Oceňuji, že se telefon zvedá skutečně rychle a mluví s vámi člověk, ne automat.\n\nPřešel jsem od velkého dodavatele a nelituji. Ceny srovnatelné, ale přístup naprosto jiný — osobní, rychlý, bez čekání na lince.\n\nEnergobanking je skvělá věc — vše přehledně online, faktury dostupné okamžitě. Líbí se mi, že firma jde s dobou a nečeká se na papírové výpisy.\n\nMáme u FREE for YOU jak domácnost, tak firmu. Везде spokojenost, komunikace funguje, smlouvy jasné. Doporučuji bez výhrad.\n\nSolidní dodavatel, ceny odpovídají situaci na trhu. Oceňuji přehledný zákaznický portál a to, že na e-mail vždy odpoví do druhého dne.\n\nPřechod proběhl hladce, bez přerušení dodávky. Zákaznická péče profesionální a ochotná. Rád doporučuji dál.' } },
      { type: 'content_section', props: { label: '', content: 'Google <a href="https://www.google.com/search?q=FREE+for+YOU+Recenze" target="_blank" class="reviews-source-link">Zobrazit na Google →</a> ★★★★★ Musím říct, že jsem vděčný, že mi byl doporučen právě menší dodavatel, jako je Free For You. Komunikace se zákaznickou podporou je na špičkové úrovni. Naštěstí je tam naprosto lidský přístup. A o cenové politice — FFY rozhodně patří k tomu nejlepšímu na trhu.\n\nKonečně společnost, kde si připadáte jako vážený zákazník, komunikujete s konkrétní osobou, žádné telefonní automaty. Na počátku energetické krize jsem odešla k ČEZu a velice ráda jsem se po roce vrátila. U FFY jsem na tom o hodně líp.\n\nDodavatel s prozákaznickým přístupem. Vyzdvihuji především portál pro zákazníky Energobanking kde vidím vše přehledně, faktury a vysvětlivky. Lepší zkušenost než s velkými dodavateli, doporučuji dále.\n\nSkvěle se snaží pracovat pro zákazníky. Rozhodl jsem se opravdu pochválit všechny z FREE for YOU. Díky za jejich služby a přístup.\n\nZa mě nejlepší dodavatel. Rychlá a skvělá komunikace. Odpověď na e-mail takřka okamžitě. Doporučuju.\n\nMám u Free For You jak barák tak kanceláře a jsem spokojený. Perfektní přístup i případné řešení. Už jen to, že se dovolám bez 10minutového čekání — to samo o sobě stojí za to.\n\nS firmou jsem velice spokojen. Paní Veronika Krbcová jako obchodní zástupkyně odvádí skvělou práci — vše srozumitelně vysvětlí a dokáže poradit, jaký produkt je pro klienta nejvýhodnější.\n\nPo přechodu jsem čekal, že nastane nějaký chaos. Nestalo se nic — elektřina tekla dál, smlouva přišla mailem, vše hotovo za týden. Přesně jak slibovali.\n\nOceňuji transparentní faktury — přesně vím za co platím. Žádné skryté poplatky, žádná překvapení. A pokud mám dotaz, vždy dostanou rychlou odpověď.\n\nPřešel jsem před rokem a jsem spokojený. Ceny rozumné, Energobanking přehledný. Jednou jsem potřeboval řešit změnu sazby — vyřídili to za mě, bez papírování.' } },
    ]
  },
  'proc-slevy-za-doporuceni': {
    title: 'Slevy za doporučení — FREE for YOU energie', desc: 'Doporučte FREE for YOU a získejte slevu až 500 Kč za smlouvu plus 20 Kč za každou spotřebovanou MWh. Sleva se přenáší až do 5. stupně.',
    h1: 'Slevy za doporučení', lead: 'Když přivedete přítele, ušetříte oba. A když ten přítel přivede dalšího — ušetříte ještě víc. Systém je jednoduchý a průhledný.',
    blocks: [
      { type: 'content_section', props: { label: '', content: 'Sleva se odečítá automaticky. Nemusíte o nic žádat. Vše vidíte v Energobankingu.\n\nSleva se nenačítá najednou — načítá se postupně, každý den, po dobu jednoho roku. Za každý den odběru vašeho přítele vám přibude 1/365 z roční předpokládané slevy.' } },
      { type: 'features_grid', props: { section_label: '', columns: '2', items: [{ title: 'Jak to funguje 1', desc: 'Zaregistrujete se' }, { title: 'Doporučíte přítele', desc: 'Přítel při registraci zadá vaši přezdívku. Tím se zařadí do vaší sítě.' }, { title: 'Sleva se načítá', desc: 'Od 11. dne jeho odběru se vám začíná automaticky načítat sleva na vaší faktuře.' }, { title: 'Jak se sleva načítá Sleva se nenačítá najednou — načítá se postupně, každý den, po dobu jednoho roku. Za každý den odběru vašeho přítele vám přibude 1/365 z roční předpokládané slevy. Roční sleva za přímého přítele 500 Kč ÷ 365 dní Načítá se každý den ≈ 1,37 Kč / den Sleva začíná nabíhat od 11. dne odběru. Na fakturu se odečítá průběžně — jakmile dosáhne minimálně 100 Kč. Sleva za každou novou smlouvu Za každého přítele — a každého přítele vašeho přítele — získáváte slevu za uzavřenou smlouvu. Funguje to až do 5 stupňů doporučení. Stupeň Kdo to je Sleva / smlouva 1. Váš přímý přítel 500 Kč 2. Přítel vašeho přítele 250 Kč 3. 3. úroveň sítě 200 Kč 4. 4. úroveň sítě 150 Kč 5. 5. úroveň sítě 100 Kč Sleva ze spotřeby Vedle jednorázové slevy za smlouvu získáváte průběžnou slevu z každé nasmlouvané MWh. Stupeň Kdo to je Sleva / MWh 1. Přímý přítel 20 Kč 2. 2. úroveň 10 Kč 3. 3. úroveň 5 Kč 4. 4. úroveň 5 Kč 5. 5. úroveň 5 Kč Modelový příklad Jak vaše síť roste a co to znamená pro vaši slevu. Slevy za doporučení — FREE for YOU energie Hierarchická síť tří stupňů doporučení .sn-line { stroke: rgba(255,255,255,0.15); stroke-width: 0.5; stroke-dasharray: 4 3; fill: none; } .sn-line-2 { stroke: rgba(255,255,255,0.1); stroke-width: 0.5; stroke-dasharray: 3 3; fill: none; } .sn-you-c { fill: #44e6a3; stroke: rgba(69,231,163,0.6); stroke-width: 0.5; } .sn-you-t { font-family: Ubuntu,sans-serif; font-size: 13px; font-weight: 700; fill: #122d4f; text-anchor: middle; dominant-baseline: central; } .sn-l1-c { fill: rgba(69,231,163,0.12); stroke: #44e6a3; stroke-width: 1; } .sn-l1-t { font-family: Ubuntu,sans-serif; font-size: 12px; font-weight: 600; fill: #44e6a3; text-anchor: middle; dominant-baseline: central; } .sn-l2-c { fill: rgba(255,255,255,0.04); stroke: rgba(255,255,255,0.18); stroke-width: 0.5; } .sn-l2-t { font-family: Ubuntu,sans-serif; font-size: 11px; font-weight: 400; fill: rgba(255,255,255,0.35); text-anchor: middle; dominant-baseline: central; } .sn-lbl { font-family: Ubuntu,sans-serif; font-size: 12px; fill: rgba(255,255,255,0.35); dominant-baseline: central; } .sn-lead { stroke: rgba(255,255,255,0.12); stroke-width: 0.5; fill: none; } Vy A B C D E F G H I Vy 1. stupeň 2. stupeň Vy → musíte sami aktivně odebírat 1. stupeň — 3 přátelé = 3 × 500 Kč = 1 500 Kč / rok 2. stupeň — 6 přátel přátel = 6 × 250 Kč = 1 500 Kč / rok Celkem ze dvou úrovní: 3 000 Kč / rok Co je potřeba vědět Musíte sami aktivně odebírat energii od FREE for YOU Sleva se načítá od 11. dne odběru doporučeného zákazníka Minimum pro vyplacení slevy na faktuře je 100 Kč Platnost nárokovatelné slevy je 14 měsíců od vzniku Slevu lze převést do Energobankingu jiného zákazníka (poplatek 4 %) Chcete začít doporučovat?', desc: 'Svou přezdívku najdete po přihlášení v Energobankingu. Stačí ji sdílet.' }] } },
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
      breadcrumb: bc, heading: s.h1 || s.title.split('—')[0].trim(), lead: s.lead || '', badges: '' }};
    var content = (s.blocks || []).map(function(b) {
      var props = {};
      for (var k in b.props) {
        props[k] = Array.isArray(b.props[k]) ? b.props[k].map(function(i){return Object.assign({},i);}) : b.props[k];
      }
      return { id: generateId(), type: b.type, props: props };
    });
    pages.push({
      id: generateId(), source: 'existing',
      meta: { title: s.title, description: s.desc, slug: slug,
              canonical: 'https://www.freeforyou.cz/'+slug+'.html', robots: 'index, follow' },
      blocks: [header].concat(content)
    });
  }
  return pages;
}
