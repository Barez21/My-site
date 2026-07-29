# FFY Builder — PHP Backend

Tato složka (`admin/api/`) obsahuje backend pro editor v2.
Po nasazení začne fungovat nahrávání souborů, globální CSS, GA4, login a publikace.

## Nasazení (5 kroků)

### 1. Nahraj složku na server
Celou složku `admin/api/` nahraj na server tak, aby byla dostupná na
`https://tvujweb.cz/admin/api/`.

### 2. Nastav heslo
Otevři `config.php` a změň:
```php
define('FFY_PASSWORD', 'zmen-toto-heslo');
```
Doporučeně použij hash (bezpečnější) — viz komentář v `login.php`.

### 3. Práva zápisu
Server (PHP) musí mít právo zapisovat do:
- `media/` a `docs/` (nahrávání souborů)
- `styles.css` a `analytics.js` (globální nastavení)
- `admin/backups/` (automatické zálohy — vytvoří se samo)
- jednotlivé `.html` v rootu (publikace)

Na většině hostingů to funguje automaticky. Když ne, nastav práva
složek na `755` a souborů na `644` (nebo dle doporučení hostingu).

### 4. Ověř, že běží Apache s mod_rewrite
Soubor `.htaccess` v této složce mapuje `/api/health` na `health.php`.
Když hosting nepoužívá Apache (např. nginx), přepiš pravidla nebo
volej endpointy s `.php` (a uprav `BASE` v `admin/v2/api-client.js`).

### 5. Otestuj
Otevři v prohlížeči: `https://tvujweb.cz/admin/api/health`
Měl by vrátit: `{"ok":true,"service":"ffy-builder-api","version":1}`

Pak otevři editor `admin/v2/` — hláška „Backend neběží" zmizí.

## Endpointy

| Endpoint | Metoda | Účel |
|---|---|---|
| `/api/health` | GET | Kontrola, že backend běží |
| `/api/login` | POST | Přihlášení (body: `{password}`) |
| `/api/files?dir=media` | GET | Výpis souborů |
| `/api/files?dir=&name=` | DELETE | Smazání souboru |
| `/api/upload` | POST | Nahrání (multipart: file, dir) |
| `/api/global/css` | GET/PUT | Čtení/zápis styles.css |
| `/api/global/ga4` | GET/PUT | Čtení/zápis GTM ID v analytics.js |
| `/api/publish` | POST | Zápis změněných stránek (body: `{pages:[{slug,html}]}`) |

## Bezpečnost

- Všechny endpointy kromě `/health` a `/login` vyžadují přihlášení (session).
- Upload: whitelist přípon, limit velikosti, sanitace názvů, ochrana path traversal.
- Publish: sanitace slug, ochrana path traversal, záloha před přepsáním.
- **Navíc doporučeno:** ochránit celou složku `admin/` přes `.htaccess`
  Basic Auth (viz `admin/.htaccess-TEMPLATE`) jako druhá vrstva.

## Optimalizace obrázků (volitelné)

V `upload.php` je zakomentovaná část pro generování WebP.
Když má hosting GD/Imagick, lze doplnit automatické zmenšeniny a WebP
podle zadání (srcset). Zatím se ukládá originál.
