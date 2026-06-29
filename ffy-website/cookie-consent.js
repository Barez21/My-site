/* ════════════════════════════════════════════
   FREE for YOU — Cookie Consent
   Samostatný skript, vloží se na všechny stránky:
   <script src="cookie-consent.js" defer></script>

   Ukládá volbu do localStorage. Při souhlasu spustí
   callback window.ffyOnConsent(categories) — sem IT
   napojí Google Tag Manager / GA4.
   ════════════════════════════════════════════ */
(function () {
  'use strict';

  var STORAGE_KEY = 'ffy-cookie-consent';
  var CONSENT_VERSION = 1; // bump při změně kategorií → znovu se zeptá

  // Načti uloženou volbu
  function loadConsent() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw && raw.version === CONSENT_VERSION) return raw;
    } catch (e) {}
    return null;
  }

  function saveConsent(categories) {
    var data = {
      version: CONSENT_VERSION,
      date: new Date().toISOString(),
      categories: categories
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) {}
    fireConsent(categories);
  }

  // Spustí napojení na GTM/GA (IT doplní window.ffyOnConsent)
  function fireConsent(categories) {
    if (typeof window.ffyOnConsent === 'function') {
      try { window.ffyOnConsent(categories); } catch (e) {}
    }
    // Standardní dataLayer signál pro Google Consent Mode v2
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'ffy_consent_update',
      consent: categories
    });
  }

  // ── Styly ──
  var css = '' +
    '.ffy-cc{position:fixed;left:0;right:0;bottom:0;z-index:99999;font-family:Ubuntu,system-ui,sans-serif;' +
      'background:rgba(10,16,26,0.97);backdrop-filter:blur(12px);border-top:1px solid rgba(69,231,163,0.2);' +
      'padding:1.25rem 1.5rem;transform:translateY(110%);transition:transform .4s cubic-bezier(.16,1,.3,1)}' +
    '.ffy-cc.show{transform:translateY(0)}' +
    '.ffy-cc-inner{max-width:1100px;margin:0 auto;display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap}' +
    '.ffy-cc-text{flex:1;min-width:240px;color:rgba(255,255,255,0.75);font-size:0.85rem;line-height:1.5}' +
    '.ffy-cc-text strong{color:#fff;font-weight:600;display:block;margin-bottom:0.2rem;font-size:0.92rem}' +
    '.ffy-cc-text a{color:#45e7a3;text-decoration:none}' +
    '.ffy-cc-text a:hover{text-decoration:underline}' +
    '.ffy-cc-actions{display:flex;gap:0.6rem;flex-wrap:wrap;align-items:center}' +
    '.ffy-cc-btn{font-family:inherit;font-size:0.82rem;font-weight:600;padding:0.6rem 1.3rem;border-radius:100px;' +
      'cursor:pointer;border:none;transition:all .15s;white-space:nowrap}' +
    '.ffy-cc-btn-accept{background:#45e7a3;color:#0a0f18}' +
    '.ffy-cc-btn-accept:hover{background:#5cf0b3;transform:translateY(-1px)}' +
    '.ffy-cc-btn-nec{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.85)}' +
    '.ffy-cc-btn-nec:hover{background:rgba(255,255,255,0.14)}' +
    '.ffy-cc-btn-set{background:none;color:rgba(255,255,255,0.55);padding:0.6rem 0.8rem}' +
    '.ffy-cc-btn-set:hover{color:rgba(255,255,255,0.85)}' +
    /* Settings panel */
    '.ffy-cc-panel{max-width:1100px;margin:0 auto 1rem;display:none}' +
    '.ffy-cc.settings-open .ffy-cc-panel{display:block}' +
    '.ffy-cc.settings-open .ffy-cc-actions .ffy-cc-btn-set{display:none}' +
    '.ffy-cc-cat{display:flex;align-items:flex-start;gap:0.75rem;padding:0.75rem 0;border-bottom:1px solid rgba(255,255,255,0.06)}' +
    '.ffy-cc-cat-info{flex:1}' +
    '.ffy-cc-cat-name{color:#fff;font-size:0.85rem;font-weight:600;margin-bottom:0.15rem}' +
    '.ffy-cc-cat-desc{color:rgba(255,255,255,0.5);font-size:0.76rem;line-height:1.4}' +
    '.ffy-cc-toggle{position:relative;width:42px;height:24px;flex-shrink:0;margin-top:2px}' +
    '.ffy-cc-toggle input{opacity:0;width:0;height:0;position:absolute}' +
    '.ffy-cc-slider{position:absolute;inset:0;background:rgba(255,255,255,0.15);border-radius:24px;transition:.2s;cursor:pointer}' +
    '.ffy-cc-slider:before{content:"";position:absolute;width:18px;height:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:.2s}' +
    '.ffy-cc-toggle input:checked+.ffy-cc-slider{background:#45e7a3}' +
    '.ffy-cc-toggle input:checked+.ffy-cc-slider:before{transform:translateX(18px)}' +
    '.ffy-cc-toggle input:disabled+.ffy-cc-slider{opacity:0.5;cursor:not-allowed}' +
    '@media(max-width:600px){.ffy-cc-inner{flex-direction:column;align-items:stretch}.ffy-cc-actions{justify-content:stretch}.ffy-cc-btn-accept,.ffy-cc-btn-nec{flex:1}}';

  // ── HTML ──
  function buildBanner() {
    var el = document.createElement('div');
    el.className = 'ffy-cc';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Souhlas s cookies');
    el.innerHTML = '' +
      '<div class="ffy-cc-panel">' +
        cat('necessary', 'Nezbytné cookies', 'Potřebné pro základní fungování webu. Nelze vypnout.', true, true) +
        cat('analytics', 'Analytické cookies', 'Pomáhají nám pochopit, jak web používáte (Google Analytics).', false, false) +
        cat('marketing', 'Marketingové cookies', 'Umožňují personalizaci a měření reklamních kampaní.', false, false) +
      '</div>' +
      '<div class="ffy-cc-inner">' +
        '<div class="ffy-cc-text"><strong>Používáme cookies</strong>' +
          'Pro správné fungování webu, analýzu návštěvnosti a zlepšování služeb. ' +
          '<a href="podpora-dokumenty.html">Více o zpracování údajů</a></div>' +
        '<div class="ffy-cc-actions">' +
          '<button class="ffy-cc-btn ffy-cc-btn-set" data-act="settings">Nastavení</button>' +
          '<button class="ffy-cc-btn ffy-cc-btn-nec" data-act="necessary">Jen nezbytné</button>' +
          '<button class="ffy-cc-btn ffy-cc-btn-accept" data-act="accept">Přijmout vše</button>' +
        '</div>' +
      '</div>';
    return el;
  }

  function cat(id, name, desc, checked, disabled) {
    return '<div class="ffy-cc-cat"><div class="ffy-cc-cat-info">' +
      '<div class="ffy-cc-cat-name">' + name + '</div>' +
      '<div class="ffy-cc-cat-desc">' + desc + '</div></div>' +
      '<label class="ffy-cc-toggle"><input type="checkbox" data-cat="' + id + '"' +
      (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
      '<span class="ffy-cc-slider"></span></label></div>';
  }

  // ── Init ──
  function init() {
    var existing = loadConsent();
    if (existing) {
      // Souhlas už dán — jen spusť napojení, banner nezobrazuj
      fireConsent(existing.categories);
      return;
    }

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var banner = buildBanner();
    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.classList.add('show'); });

    banner.addEventListener('click', function (e) {
      var act = e.target.getAttribute('data-act');
      if (act === 'settings') {
        banner.classList.toggle('settings-open');
      } else if (act === 'necessary') {
        saveConsent({ necessary: true, analytics: false, marketing: false });
        hide(banner);
      } else if (act === 'accept') {
        // Pokud je otevřené nastavení, respektuj přepínače; jinak vše
        if (banner.classList.contains('settings-open')) {
          var cats = { necessary: true };
          banner.querySelectorAll('input[data-cat]').forEach(function (cb) {
            cats[cb.getAttribute('data-cat')] = cb.checked;
          });
          saveConsent(cats);
        } else {
          saveConsent({ necessary: true, analytics: true, marketing: true });
        }
        hide(banner);
      }
    });
  }

  function hide(banner) {
    banner.classList.remove('show');
    setTimeout(function () { banner.remove(); }, 400);
  }

  // Veřejná funkce pro znovuotevření z patičky ("Nastavení cookies")
  window.ffyOpenCookieSettings = function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    location.reload();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
