/* ════════════════════════════════════════════
   FREE for YOU — Analytics (GTM + dataLayer události)
   ════════════════════════════════════════════
   Vkládá se na všechny stránky:
   <script src="analytics.js" defer></script>

   NASTAVENÍ (pro IT):
   1. Doplňte GTM ID níže (řádek GTM_ID).
   2. GTM se načte AŽ po souhlasu s analytickými cookies
      (napojeno na cookie-consent.js přes window.ffyOnConsent).

   Tento skript pushuje do window.dataLayer pojmenované
   události. V GTM si je odchytíte jako „Custom Event"
   triggery a napojíte na GA4. Seznam událostí je dole.
   ════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── NASTAVENÍ ──
  var GTM_ID = 'GTM-XXXXXXX'; // ← IT: doplňte reálné ID

  window.dataLayer = window.dataLayer || [];

  // ── Načtení GTM (spustí se po souhlasu) ──
  var gtmLoaded = false;
  function loadGTM() {
    if (gtmLoaded || !GTM_ID || GTM_ID === 'GTM-XXXXXXX') return;
    gtmLoaded = true;
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = document.getElementsByTagName('script')[0];
    var j = document.createElement('script');
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
    f.parentNode.insertBefore(j, f);
  }

  // Napojení na cookie consent — GTM jen při souhlasu s analytikou
  var prevConsent = window.ffyOnConsent;
  window.ffyOnConsent = function (categories) {
    if (typeof prevConsent === 'function') { try { prevConsent(categories); } catch (e) {} }
    if (categories && categories.analytics) loadGTM();
  };
  // Pokud už souhlas padl dřív (consent uložený), zkus načíst hned
  try {
    var saved = JSON.parse(localStorage.getItem('ffy-cookie-consent'));
    if (saved && saved.categories && saved.categories.analytics) loadGTM();
  } catch (e) {}

  // ── Pomocná funkce pro push události ──
  function track(event, params) {
    var payload = Object.assign({ event: event }, params || {});
    window.dataLayer.push(payload);
  }
  // Veřejně dostupné (kalkulačka apod. mohou volat ffyTrack)
  window.ffyTrack = track;

  // ════════════════════════════════════════
  //  AUTOMATICKÉ ODCHYTÁVÁNÍ UDÁLOSTÍ
  // ════════════════════════════════════════

  function initTracking() {

    // ── 1. Kliky na CTA tlačítka ──
    // Cílíme na tlačítka s třídami: sdileni-btn-primary, nav-cta,
    // tarif-cta, kform-submit, final CTA, a obecně .btn-primary
    document.addEventListener('click', function (e) {
      var btn = e.target.closest(
        '.sdileni-btn-primary, .nav-cta, .tarif-cta, .cta-primary, ' +
        '.final-cta-btn, .hero-cta, [data-cta]'
      );
      if (btn) {
        track('cta_klik', {
          cta_text: (btn.textContent || '').trim().slice(0, 80),
          cta_cil: btn.getAttribute('href') || '',
          cta_umisteni: btn.className || ''
        });
      }

      // ── 2. Stažení dokumentů ──
      var dl = e.target.closest('a[href$=".pdf"], a[href$=".xlsx"], a[href$=".docx"], a[href$=".zip"], .doc-row-dl, .cenik-card');
      if (dl) {
        var href = dl.getAttribute('href') || '';
        var name = (dl.textContent || '').trim().slice(0, 80) || href.split('/').pop();
        track('stazeni_dokumentu', {
          dokument_nazev: name,
          dokument_url: href
        });
      }

      // ── 3. Kliky na Energobanking ──
      var eb = e.target.closest('a[href*="energobanking"]');
      if (eb) {
        track('energobanking_klik', { cil: eb.getAttribute('href') || '' });
      }

      // ── 3b. Odeslání kontaktního formuláře (zatím bez <form> tagu) ──
      var formBtn = e.target.closest('.kform-submit');
      if (formBtn) {
        track('odeslani_formulare', { formular_typ: 'kontaktni_formular' });
        track('konverze_kontakt', {});
      }
    });

    // ── 4. Odeslání formulářů ──
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM') return;
      var formType = form.getAttribute('data-form-type') ||
        (form.className.indexOf('kform') >= 0 ? 'kontaktni_formular' : 'formular');
      track('odeslani_formulare', {
        formular_typ: formType
      });
      // Konverze (zadání: odeslání kontaktního formuláře)
      if (formType === 'kontaktni_formular') {
        track('konverze_kontakt', {});
      }
    });

    // ── 5. Scroll měření (25/50/75/90 %) ──
    var scrollMarks = { 25: false, 50: false, 75: false, 90: false };
    var scrollTimer = null;
    window.addEventListener('scroll', function () {
      if (scrollTimer) return;
      scrollTimer = setTimeout(function () {
        scrollTimer = null;
        var h = document.documentElement;
        var scrolled = (h.scrollTop || document.body.scrollTop);
        var height = h.scrollHeight - h.clientHeight;
        var pct = height > 0 ? Math.round((scrolled / height) * 100) : 0;
        [25, 50, 75, 90].forEach(function (mark) {
          if (pct >= mark && !scrollMarks[mark]) {
            scrollMarks[mark] = true;
            track('scroll', { hloubka_procenta: mark });
          }
        });
      }, 200);
    }, { passive: true });

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTracking);
  } else {
    initTracking();
  }

  // ════════════════════════════════════════
  //  KALKULAČKA — pomocné funkce
  // ════════════════════════════════════════
  // Kalkulačka volá:
  //   window.ffyKalkulackaPouzita()   — uživatel začal počítat
  //   window.ffyKalkulackaDokoncena(vysledek) — výpočet dokončen
  var kalkUsedFired = false;
  window.ffyKalkulackaPouzita = function () {
    if (kalkUsedFired) return; // jen poprvé za návštěvu
    kalkUsedFired = true;
    track('kalkulacka_pouzita', {});
    track('konverze_kalkulacka_start', {});
  };
  window.ffyKalkulackaDokoncena = function (vysledek) {
    track('kalkulacka_dokoncena', {
      vysledek_mesicni: (vysledek && vysledek.mesicni) || null,
      vysledek_rocni: (vysledek && vysledek.rocni) || null
    });
    track('konverze_kalkulacka_dokonceni', {});
  };

})();

/* ════════════════════════════════════════════
   SEZNAM UDÁLOSTÍ (pro nastavení v GTM)
   ════════════════════════════════════════════
   Event name           | Kdy se spustí                | Parametry
   ---------------------|------------------------------|---------------------------
   cta_klik             | klik na CTA tlačítko         | cta_text, cta_cil, cta_umisteni
   stazeni_dokumentu    | klik na PDF/XLSX/ceník       | dokument_nazev, dokument_url
   energobanking_klik   | klik na odkaz Energobanking  | cil
   odeslani_formulare   | submit formuláře             | formular_typ
   scroll               | scroll 25/50/75/90 %         | hloubka_procenta
   kalkulacka_pouzita   | start kalkulačky             | —
   kalkulacka_dokoncena | dokončený výpočet            | vysledek_mesicni, vysledek_rocni

   KONVERZE (zadání):
   konverze_kalkulacka_start      — použití kalkulačky
   konverze_kalkulacka_dokonceni  — dokončení kalkulačky
   konverze_kontakt               — odeslání kontaktního formuláře

   V GTM: vytvořte Custom Event trigger pro každý event name,
   napojte na GA4 Event tag. Konverze označte v GA4 jako klíčové události.
   ════════════════════════════════════════════ */
