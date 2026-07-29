/* ════════════════════════════════════════════
   FFY Builder v2 — API klient
   Mluví s backendem (když běží), jinak lokální fallback.

   BACKEND (pro IT): implementujte tyto endpointy pod /api/.
   Když nejsou dostupné, editor funguje lokálně (localStorage
   + ruční export souborů). Detaily viz POZNAMKY-PRO-IT.md.

   Endpointy:
     GET    /api/files?dir=media        → [{name,url,size,date}]
     GET    /api/files?dir=docs         → [{name,url,size,date}]
     POST   /api/upload  (multipart)     → {name,url}   (pole: file, dir)
     DELETE /api/files?dir=&name=        → {ok:true}
     GET    /api/global/css             → text (obsah styles.css)
     PUT    /api/global/css  (body:text)→ {ok:true}
     GET    /api/global/ga4             → {gtm_id:"GTM-XXXX"}
     PUT    /api/global/ga4  (json)      → {ok:true}
   ════════════════════════════════════════════ */

var FFYApi = (function () {
  var BASE = '/api';
  var available = null; // null = neznámo, true/false = zjištěno

  // Zjisti, zda backend běží (health check)
  function checkAvailable() {
    if (available !== null) return Promise.resolve(available);
    return fetch(BASE + '/health', { method: 'GET' })
      .then(function (r) { available = r.ok; return available; })
      .catch(function () { available = false; return false; });
  }

  // ── Soubory (média / dokumenty) ──
  function listFiles(dir) {
    return checkAvailable().then(function (ok) {
      if (ok) {
        return fetch(BASE + '/files?dir=' + encodeURIComponent(dir))
          .then(function (r) { return r.json(); })
          .catch(function () { return localList(dir); });
      }
      return localList(dir);
    });
  }

  function uploadFile(dir, file) {
    return checkAvailable().then(function (ok) {
      if (ok) {
        var fd = new FormData();
        fd.append('file', file);
        fd.append('dir', dir);
        return fetch(BASE + '/upload', { method: 'POST', body: fd })
          .then(function (r) { return r.json(); });
      }
      // Lokální fallback: ulož jako base64 do localStorage
      return localUpload(dir, file);
    });
  }

  function deleteFile(dir, name) {
    return checkAvailable().then(function (ok) {
      if (ok) {
        return fetch(BASE + '/files?dir=' + encodeURIComponent(dir) + '&name=' + encodeURIComponent(name), { method: 'DELETE' })
          .then(function (r) { return r.json(); });
      }
      return localDelete(dir, name);
    });
  }

  // ── Globální CSS ──
  function getGlobalCss() {
    return checkAvailable().then(function (ok) {
      if (ok) {
        return fetch(BASE + '/global/css').then(function (r) { return r.text(); })
          .catch(function () { return localGetCss(); });
      }
      return localGetCss();
    });
  }

  function saveGlobalCss(css) {
    return checkAvailable().then(function (ok) {
      if (ok) {
        return fetch(BASE + '/global/css', { method: 'PUT', headers: { 'Content-Type': 'text/css' }, body: css })
          .then(function (r) { return r.json(); });
      }
      localStorage.setItem('ffy-global-css', css);
      return Promise.resolve({ ok: true, local: true });
    });
  }

  // ── GA4 / GTM ──
  function getGA4() {
    return checkAvailable().then(function (ok) {
      if (ok) {
        return fetch(BASE + '/global/ga4').then(function (r) { return r.json(); })
          .catch(function () { return localGetGA4(); });
      }
      return localGetGA4();
    });
  }

  function saveGA4(gtmId) {
    return checkAvailable().then(function (ok) {
      if (ok) {
        return fetch(BASE + '/global/ga4', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gtm_id: gtmId }) })
          .then(function (r) { return r.json(); });
      }
      localStorage.setItem('ffy-ga4-id', gtmId);
      return Promise.resolve({ ok: true, local: true });
    });
  }

  // ── Lokální fallbacky ──
  function localKey(dir) { return 'ffy-files-' + dir; }
  function localList(dir) {
    try { return Promise.resolve(JSON.parse(localStorage.getItem(localKey(dir))) || []); }
    catch (e) { return Promise.resolve([]); }
  }
  function localUpload(dir, file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () {
        localList(dir).then(function (files) {
          var item = { name: file.name, url: reader.result, size: file.size, date: Date.now(), local: true };
          files.push(item);
          localStorage.setItem(localKey(dir), JSON.stringify(files));
          resolve(item);
        });
      };
      reader.readAsDataURL(file);
    });
  }
  function localDelete(dir, name) {
    return localList(dir).then(function (files) {
      var next = files.filter(function (f) { return f.name !== name; });
      localStorage.setItem(localKey(dir), JSON.stringify(next));
      return { ok: true, local: true };
    });
  }
  function localGetCss() { return Promise.resolve(localStorage.getItem('ffy-global-css') || ''); }
  function localGetGA4() { return Promise.resolve({ gtm_id: localStorage.getItem('ffy-ga4-id') || 'GTM-XXXXXXX', local: true }); }

  // ── Login ──
  // DEMO heslo pro lokální režim. IT nahradí serverovým ověřením (/api/login).
  var LOCAL_DEMO_PASSWORD = 'ffy2026';
  function login(pwd) {
    return checkAvailable().then(function (ok) {
      if (ok) {
        return fetch(BASE + '/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd })
        }).then(function (r) {
          return r.json().then(function (data) { return { ok: r.ok && data.ok, message: data.message }; });
        }).catch(function () {
          return { ok: false, message: 'Chyba spojení se serverem' };
        });
      }
      // Lokální fallback (jen pro náhled — NENÍ bezpečné)
      if (pwd === LOCAL_DEMO_PASSWORD) {
        return { ok: true, local: true };
      }
      return { ok: false, message: 'Nesprávné heslo (lokální demo: ffy2026)' };
    });
  }

  // ── Publikace (deploy změněných stránek) ──
  function publish(pagesPayload) {
    return checkAvailable().then(function (ok) {
      if (ok) {
        return fetch(BASE + '/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages: pagesPayload })
        }).then(function (r) { return r.json(); })
          .catch(function () { return { ok: false, local: true }; });
      }
      return { ok: false, local: true };
    });
  }

  return {
    checkAvailable: checkAvailable,
    listFiles: listFiles,
    uploadFile: uploadFile,
    deleteFile: deleteFile,
    getGlobalCss: getGlobalCss,
    saveGlobalCss: saveGlobalCss,
    getGA4: getGA4,
    saveGA4: saveGA4,
    login: login,
    publish: publish,
    isLocal: function () { return available === false; },
  };
})();
