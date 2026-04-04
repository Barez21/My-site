#!/usr/bin/env python3
"""
Wikipedia Recursive Scraper v8 — rate limiting s backoff, sanitizace a validace dat
"""
import sys, json, csv, time, argparse, re, os, random
import threading
import unicodedata
import logging
import datetime
from logging.handlers import RotatingFileHandler

# ─── STRUKTUROVANÉ LOGOVÁNÍ ──────────────────────────────────────────────────
class _ScrapeJsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "ts":    datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00","Z"),
            "level": record.levelname,
            "msg":   record.getMessage(),
        }, ensure_ascii=False)

def setup_file_logging(output_prefix: str = "wiki_output/scraper"):
    """Zapne souborové logování do wiki_output/ se rotací. Volat z main()."""
    import os; os.makedirs(os.path.dirname(output_prefix) or ".", exist_ok=True)
    fh = RotatingFileHandler(
        output_prefix + ".log", maxBytes=5*1024*1024, backupCount=3, encoding="utf-8"
    )
    fh.setFormatter(_ScrapeJsonFormatter())
    fh.setLevel(logging.DEBUG)
    _file_logger.addHandler(fh)

_file_logger = logging.getLogger("wikiscraper")
_file_logger.setLevel(logging.DEBUG)
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urljoin, urlparse, unquote
from collections import deque
import requests
from bs4 import BeautifulSoup

HEADERS = {"User-Agent": "WikiScraper/1.0 (educational)"}
BASE_DELAY  = 0.5
MAX_DELAY   = 30.0
MAX_RETRIES = 4
REQUEST_TIMEOUT = 15
CHECKPOINT_INTERVAL = 10
PHASE1_CHECKPOINT_INTERVAL = 20
AVG_SECONDS_PER_ARTICLE = 1.5

_log_lock = threading.Lock()

# Windows cp1252 nezna emoji — vynutit UTF-8 na stdout
if sys.stdout.encoding and sys.stdout.encoding.lower() not in ("utf-8","utf8"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def log(msg: str, level: str = "info"):
    """Loguje na stdout (pro SSE stream) i do souboru (strukturovaně)."""
    with _log_lock:
        try:
            print(msg, flush=True)
        except UnicodeEncodeError:
            print(msg.encode("ascii", errors="replace").decode("ascii"), flush=True)
    # Souborové logování
    lv = {"debug": logging.DEBUG, "info": logging.INFO,
          "warn": logging.WARNING, "error": logging.ERROR}.get(level, logging.INFO)
    _file_logger.log(lv, msg)

def log_debug(msg: str): log(msg, "debug")
def log_warn(msg: str):  log(msg, "warn")
def log_error(msg: str): log(msg, "error")

_session = requests.Session()
_session.headers.update(HEADERS)

# ─── RATE LIMITING — per-domain adaptivní backoff ─────────────────────────────
# Každá doména si drží vlastní delay, počet chyb a čas posledního requestu.
# Paralelní vlákna sdílí stav přes _rl_lock.

_rl_state = {}   # {domain: {"delay": float, "last": float, "errs": int, "reqs": int}}
_rl_lock  = threading.Lock()

def _rl_domain(url: str) -> str:
    return urlparse(url).netloc

def _rl_wait(domain: str):
    """Počká potřebnou dobu od posledního requestu na danou doménu."""
    with _rl_lock:
        s = _rl_state.setdefault(domain, {"delay": BASE_DELAY, "last": 0.0, "errs": 0, "reqs": 0})
        gap  = time.monotonic() - s["last"]
        wait = max(0.0, s["delay"] - gap)
        s["last"] = time.monotonic() + wait   # rezervovat slot
    if wait > 0:
        time.sleep(wait)

def _rl_success(domain: str):
    """Zaznamená úspěch — po 5 úspěších bez chyby pomalu snižuje delay."""
    with _rl_lock:
        s = _rl_state.get(domain, {})
        s["reqs"] = s.get("reqs", 0) + 1
        s["errs"] = max(0, s.get("errs", 0) - 1)
        if s.get("delay", BASE_DELAY) > BASE_DELAY and s["reqs"] % 5 == 0:
            prev = s["delay"]
            s["delay"] = max(BASE_DELAY, s["delay"] * 0.80)
            if round(prev, 1) != round(s["delay"], 1):
                log(f"DELAYOK:{s['delay']:.2f}")

def _rl_rate_limit(domain: str, retry_after: int) -> float:
    """Zaznamená 429 — zdvojnásobí delay, vrátí dobu čekání."""
    with _rl_lock:
        s = _rl_state.setdefault(domain, {"delay": BASE_DELAY, "last": 0.0, "errs": 0, "reqs": 0})
        old = s["delay"]
        s["delay"] = min(s["delay"] * 2.0, MAX_DELAY)
        s["errs"]  = s.get("errs", 0) + 3
        log(f"RATELIMIT:{old:.1f}:{s['delay']:.1f}:{retry_after}")
    return float(retry_after)

def _rl_backoff(domain: str, attempt: int) -> float:
    """Zaznamená chybu, vrátí exponential backoff s ±20% jitterem."""
    with _rl_lock:
        s = _rl_state.setdefault(domain, {"delay": BASE_DELAY, "last": 0.0, "errs": 0, "reqs": 0})
        s["errs"] = s.get("errs", 0) + 1
    base = min(2 ** attempt, 16)
    return max(0.5, base * (1.0 + 0.2 * (random.random() * 2 - 1)))

# ─── HTTP ─────────────────────────────────────────────────────────────────────

def fetch(url: str):
    """GET → BeautifulSoup. Per-domain rate limit, exponential backoff, retry."""
    domain = _rl_domain(url)
    for attempt in range(MAX_RETRIES):
        _rl_wait(domain)
        try:
            r = _session.get(url, timeout=REQUEST_TIMEOUT)

            if r.status_code == 429:
                ra = int(r.headers.get("Retry-After", max(_rl_state.get(domain, {}).get("delay", 5) * 2, 5)))
                wait = _rl_rate_limit(domain, ra)
                time.sleep(wait)
                continue

            if r.status_code == 503:
                wait = _rl_backoff(domain, attempt)
                log(f"  ⚠ 503 ({domain}), čekám {wait:.1f}s (pokus {attempt+1}/{MAX_RETRIES})")
                time.sleep(wait)
                continue

            r.raise_for_status()
            r.encoding = "utf-8"
            _rl_success(domain)
            return BeautifulSoup(r.text, "html.parser")

        except requests.exceptions.Timeout:
            wait = _rl_backoff(domain, attempt)
            if attempt < MAX_RETRIES - 1:
                log(f"  ⚠ Timeout ({domain}), čekám {wait:.1f}s")
                time.sleep(wait)
            else:
                log(f"  ✗ Timeout po {MAX_RETRIES} pokusech: {url[:80]}")
                return None

        except requests.exceptions.ConnectionError:
            wait = _rl_backoff(domain, attempt)
            if attempt < MAX_RETRIES - 1:
                log(f"  ⚠ Chyba spojení ({domain}), čekám {wait:.1f}s")
                time.sleep(wait)
            else:
                log(f"  ✗ Chyba spojení po {MAX_RETRIES} pokusech: {url[:80]}")
                return None

        except requests.RequestException as e:
            wait = _rl_backoff(domain, attempt)
            if attempt < MAX_RETRIES - 1:
                time.sleep(wait)
            else:
                log(f"  ✗ HTTP chyba po {MAX_RETRIES} pokusech: {e}")
                return None
    return None

def nice_name(url):
    return unquote(url.split("/wiki/")[-1], encoding="utf-8").replace("_", " ")

def get_base(url):
    p = urlparse(url)
    return f"{p.scheme}://{p.netloc}"

def is_category(url, soup):
    path = urlparse(url).path.lower()
    for prefix in ("kategorie:", "category:", "catégorie:", "categoría:", "categoria:"):
        if prefix in path: return True
    if soup and (soup.find("div", id="mw-subcategories") or soup.find("div", id="mw-pages")):
        return True
    return False

def is_list(url, soup):
    h1 = soup.find("h1", id="firstHeading")
    return bool(h1 and h1.get_text().lower().startswith(
        ("list of","seznam ","liste ","lista ","elenco ")))

# ─── MediaWiki API ────────────────────────────────────────────────────────────

def api_base(url):
    p = urlparse(url)
    return f"{p.scheme}://{p.netloc}/w/api.php"

def api_get(base, params):
    """MediaWiki API GET s per-domain rate limitingem a backoff."""
    domain = _rl_domain(base)
    params = {"format": "json", "utf8": 1, **params}
    for attempt in range(MAX_RETRIES):
        _rl_wait(domain)
        try:
            r = _session.get(base, params=params, timeout=REQUEST_TIMEOUT)
            if r.status_code == 429:
                ra = int(r.headers.get("Retry-After", 10))
                wait = _rl_rate_limit(domain, ra)
                time.sleep(wait)
                continue
            r.raise_for_status()
            _rl_success(domain)
            return r.json()
        except Exception as e:
            wait = _rl_backoff(domain, attempt)
            if attempt < MAX_RETRIES - 1:
                time.sleep(wait)
            else:
                return None
    return None

def fetch_via_api(url, fields):
    """Stáhne heslo přes MediaWiki API místo HTML parsování."""
    base = api_base(url)
    title = unquote(urlparse(url).path.split("/wiki/")[-1])
    result = {"url": url, "title": title.replace("_", " ")}

    props = ["revisions", "categories", "coordinates", "pageprops"]
    if "infobox" in fields or "intro" in fields or "full_text" in fields or "sections" in fields:
        props.append("extracts")

    data = api_get(base, {
        "action": "query", "titles": title,
        "prop": "|".join(props),
        "exintro": "" if "intro" in fields and "full_text" not in fields else None,
        "explaintext": 1,
        "exsectionformat": "wiki",
        "cllimit": 20,
        "coprop": "type|name|dim|country|region|globe",
        "redirects": 1,
    })
    if not data:
        result["error"] = "api fetch failed"
        return result

    pages = (data.get("query") or {}).get("pages", {})
    page = next(iter(pages.values()), {})
    if page.get("missing") is not None:
        result["error"] = "page not found"
        return result

    # Sledovat redirect
    redirects = (data.get("query") or {}).get("redirects", [])
    if redirects:
        result["redirected_from"] = url
        result["url"] = urljoin(url, "/wiki/" + redirects[-1].get("to","").replace(" ","_"))

    # Nadpis
    result["title"] = page.get("title", title.replace("_"," "))

    # Text
    extract = page.get("extract", "")
    if "intro" in fields and extract:
        # První odstavec
        for para in extract.split("\n"):
            if len(para.strip()) > 50:
                result["intro"] = re.sub(r"\[\d+\]", "", para.strip())
                break
        else:
            result["intro"] = ""

    if "full_text" in fields and extract:
        result["full_text"] = extract

    if "sections" in fields and extract:
        sects = {}
        current = "Úvod"
        parts = []
        SKIP_SECTS = {"Odkazy", "Reference", "Literatura", "Poznámky",
                      "External links", "References", "Notes", "See also", "Further reading"}
        for line in extract.split("\n"):
            if line.startswith("==") and line.endswith("=="):
                if parts:
                    sects[current] = "\n".join(parts).strip()
                current = line.strip("= ").strip()
                parts = []
            elif line.strip():
                l = line.strip()
                # API vrací odrážky jako "* text" nebo "** text" — převést na bullet
                if l.startswith("** "):
                    l = "  • " + l[3:]
                elif l.startswith("* "):
                    l = "• " + l[2:]
                parts.append(l)
        if parts:
            sects[current] = "\n".join(parts).strip()
        # Odfiltrovat technické sekce
        result["sections"] = {k: v for k, v in sects.items() if k not in SKIP_SECTS}

    # Kategorie
    if "categories" in fields:
        cats = [c["title"].split(":", 1)[-1] for c in page.get("categories", [])
                if not c["title"].lower().startswith(("hidden ", "skrytá "))]
        result["categories"] = cats[:20]
        if any("stub" in c.lower() for c in cats):
            result["is_stub"] = True

    # Souřadnice
    if "coordinates" in fields:
        coord_list = page.get("coordinates", [])
        if coord_list:
            c = coord_list[0]
            result["coordinates"] = f"{c.get('lat',0)}°N {c.get('lon',0)}°E"
            result["coordinates_norm"] = {
                "lat": round(float(c.get("lat", 0)), 6),
                "lng": round(float(c.get("lon", 0)), 6)
            }

    # Infobox, images a tables — API je nevrací přímo, fallback na HTML
    needs_html = ("infobox" in fields or "images" in fields or "tables" in fields)
    html_soup = None
    if needs_html:
        html_soup = fetch(url)

    if "infobox" in fields:
        result["infobox"] = extract_infobox(html_soup) if html_soup else {}

    if "images" in fields:
        if html_soup:
            base = get_base(url)
            imgs = extract_images(html_soup, base)
            if imgs:
                meta = fetch_image_metadata([i["url"] for i in imgs], url)
                for img in imgs:
                    if img["url"] in meta:
                        img.update(meta[img["url"]])
            result["images"] = imgs
        else:
            result["images"] = []

    if "tables" in fields:
        result["tables"] = extract_tables(html_soup) if html_soup else []

    result["is_stub"] = result.get("is_stub", False)
    result["_quality"] = compute_quality(result)
    return result


# ─── Smart depth heuristic ────────────────────────────────────────────────────

def is_relevant_subcat(cat_name: str, root_name: str) -> bool:
    """Heuristika: je podkategorie relevantní ke kořenové?
    Vrátí False pro příliš obecné kategorie (osoby, ocenění, sport...)."""
    GENERIC_PATTERNS = [
        r"\bocenění\b", r"\bpocty\b", r"\bsportovci\b", r"\bsportovkyně\b",
        r"\bnarodilí\b", r"\bzemřelí\b", r"\bváleční\b", r"\bhráči\b",
        r"\bbazény\b", r"\bfotbalist\b", r"\bhokejist\b",
        r"awards?$", r"deaths?$", r"births?$", r"sportspeople",
        r"athletes", r"players", r"alumni", r"politicians",
    ]
    name_lower = cat_name.lower()
    for pat in GENERIC_PATTERNS:
        if re.search(pat, name_lower):
            return False
    # Heuristika: pokud název kategorie sdílí alespoň jedno slovo s root, je relevantní
    root_words = set(root_name.lower().split())
    cat_words  = set(name_lower.split())
    if root_words & cat_words:
        return True
    # Povolíme pokud je hloubka stromu malá (rozhoduje volající)
    return True


# ─── Wikidata obohacení ───────────────────────────────────────────────────────

WIKIDATA_PROPS = {
    "P31":  "instance_of",      "P17":  "country",
    "P131": "admin_region",     "P571": "inception",
    "P576": "dissolved",        "P856": "official_website",
    "P625": "coordinates_wd",   "P1566":"geonames_id",
    "P18":  "image",            "P27":  "citizenship",
}

def enrich_wikidata(records: list, lang: str = "cs") -> list:
    """Doplní Wikidata properties do existujících záznamů. In-place."""
    log("🌐 Wikidata obohacení…")
    # Batch: max 50 titulů najednou
    base = "https://www.wikidata.org/w/api.php"

    def get_qids_batch(titles):
        wiki = f"{lang}wiki"
        data = api_get(f"https://{lang}.wikipedia.org/w/api.php", {
            "action": "query", "titles": "|".join(titles),
            "prop": "pageprops", "ppprop": "wikibase_item",
        })
        if not data: return {}
        result = {}
        for page in (data.get("query") or {}).get("pages", {}).values():
            qid = (page.get("pageprops") or {}).get("wikibase_item")
            if qid:
                result[page.get("title","").replace(" ","_")] = qid
        return result

    def get_wd_data(qids):
        data = api_get(base, {
            "action": "wbgetentities", "ids": "|".join(qids),
            "props": "claims|labels", "languages": lang,
        })
        if not data: return {}
        return (data.get("entities") or {})

    BATCH = 40
    for i in range(0, len(records), BATCH):
        batch = records[i:i+BATCH]
        titles = [r.get("title","") for r in batch if r.get("title")]
        qid_map = get_qids_batch(titles)
        if not qid_map: continue

        qids = list(set(qid_map.values()))
        wd_data = get_wd_data(qids)

        for rec in batch:
            title_key = rec.get("title","").replace(" ","_")
            qid = qid_map.get(title_key)
            if not qid or qid not in wd_data: continue
            claims = wd_data[qid].get("claims", {})
            wd = {"qid": qid}
            for prop, name in WIKIDATA_PROPS.items():
                if prop in claims:
                    val = claims[prop][0].get("mainsnak",{}).get("datavalue",{}).get("value")
                    if isinstance(val, dict):
                        val = val.get("id") or val.get("text") or str(val)
                    if val:
                        wd[name] = str(val)
            if wd:
                rec["wikidata"] = wd
        time.sleep(0.3)
        log(f"  Wikidata: {min(i+BATCH, len(records))}/{len(records)}")

    return records


# ─── Incremental update ───────────────────────────────────────────────────────

def get_page_timestamp(url: str) -> str | None:
    """Vrátí timestamp poslední revize přes API."""
    base = api_base(url)
    title = unquote(urlparse(url).path.split("/wiki/")[-1])
    data = api_get(base, {
        "action": "query", "titles": title,
        "prop": "revisions", "rvprop": "timestamp", "rvlimit": 1,
    })
    if not data: return None
    pages = (data.get("query") or {}).get("pages", {})
    page = next(iter(pages.values()), {})
    revs = page.get("revisions", [])
    return revs[0].get("timestamp") if revs else None

def filter_updated(article_urls: list, existing_json_path: str, fields) -> tuple:
    """Vrátí (url_to_fetch, existing_records) kde url_to_fetch = jen změněné."""
    if not os.path.exists(existing_json_path):
        return article_urls, []
    with open(existing_json_path, encoding="utf-8") as f:
        existing = json.load(f)
    # Index existujících záznamů
    existing_map = {r["url"]: r for r in existing}
    to_fetch = []
    for url in article_urls:
        if url not in existing_map:
            to_fetch.append(url)
            continue
        ts = get_page_timestamp(url)
        # Porovnat s uloženým _fetched_at pokud existuje
        old_ts = existing_map[url].get("_fetched_at", "")
        if ts and old_ts and ts <= old_ts:
            pass  # nezměněno
        else:
            to_fetch.append(url)
    unchanged = [r for r in existing if r["url"] not in set(to_fetch)]
    log(f"📅 Incremental: {len(to_fetch)} nových/změněných, {len(unchanged)} beze změny")
    return to_fetch, unchanged


# ─── Fuzzy dedup ──────────────────────────────────────────────────────────────

def levenshtein(a: str, b: str) -> int:
    if len(a) < len(b): a, b = b, a
    prev = list(range(len(b)+1))
    for i, ca in enumerate(a):
        curr = [i+1]
        for j, cb in enumerate(b):
            curr.append(min(prev[j]+(0 if ca==cb else 1), curr[-1]+1, prev[j+1]+1))
        prev = curr
    return prev[-1]

def fuzzy_dedup(records: list, threshold: int = 3) -> tuple:
    """Najde potenciální duplicity podle podobnosti titulů.
    Vrátí (clean_records, duplicate_pairs)."""
    titles = [(i, r.get("title","").lower()) for i, r in enumerate(records)]
    pairs = []
    for i, (idx_a, ta) in enumerate(titles):
        for idx_b, tb in titles[i+1:]:
            if abs(len(ta)-len(tb)) > threshold*2: continue
            d = levenshtein(ta[:40], tb[:40])
            if 0 < d <= threshold:
                pairs.append((records[idx_a]["title"], records[idx_b]["title"], d))
    return records, pairs


# ─── Auto-tagy ────────────────────────────────────────────────────────────────

TAG_RULES = [
    # (tag, patterns v kategoriích nebo titulu)
    ("prvek",       [r"chemick[éý] prvk", r"element"]),
    ("sloučenina",  [r"sloučenin", r"compound"]),
    ("minerál",     [r"minerál", r"mineral"]),
    ("město",       [r"měst[ao]", r"obec", r"city", r"town", r"village"]),
    ("hora",        [r"hory?", r"vrchol", r"mountain", r"peak"]),
    ("řeka",        [r"řek[ay]", r"river", r"stream"]),
    ("stát",        [r"stát[yů]?", r"country", r"nation"]),
    ("osoba",       [r"narozen[íý]", r"životopis", r"biography", r"born"]),
    ("zvíře",       [r"živočich", r"animal", r"fauna", r"druh"]),
    ("rostlina",    [r"rostlin", r"plant", r"flora"]),
    ("film",        [r"film[yům]?", r"movie"]),
    ("budova",      [r"budov", r"stavb", r"building", r"architektur"]),
    ("sport",       [r"sport", r"fotbal", r"hokej", r"tenni"]),
    ("věda",        [r"věd[ca]", r"výzkum", r"science", r"research"]),
    ("technologie", [r"technologi", r"software", r"hardware", r"počítač"]),
]

def compute_tags(record: dict) -> list:
    cats = " ".join(record.get("categories", []) or []).lower()
    title = (record.get("title","") or "").lower()
    text = cats + " " + title
    tags = []
    for tag, patterns in TAG_RULES:
        for pat in patterns:
            if re.search(pat, text, re.IGNORECASE):
                tags.append(tag)
                break
    return tags



# ─── SANITIZACE DAT ───────────────────────────────────────────────────────────

_WIKI_MARKUP_RE = re.compile(
    r"\{\{[^}]*\}\}"        # {{šablony}}
    r"|\[\[[^\]]*\]\]"      # [[wikilinky]]
    r"|\[http[^\]]*\]"      # [externí odkaz]
    r"|<[a-zA-Z][^>]*>"     # HTML tagy
    r"|'{2,3}",             # ''bold'' / '''italic'''
    re.IGNORECASE
)
_SUSPICIOUS_VAL_RE = re.compile(
    r"^\s*$"
    r"|^(N/A|n\.a\.|neznámý|unknown|—|–|-|\?+|\.{3})$"
    r"|\[\[|\]\]|\{\{",
    re.IGNORECASE
)

def sanitize_string(s: str, max_len: int = 0) -> str:
    """Odstraní wiki markup, normalizuje unicode a whitespace, ořízne délku."""
    if not isinstance(s, str) or not s:
        return s
    s = _WIKI_MARKUP_RE.sub("", s)
    s = re.sub(r"\[\d+\]", "", s)       # reference [1]
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"[ \t]+", " ", s)         # více mezer → jedna
    s = re.sub(r"\n{3,}", "\n\n", s)    # více prázdných řádků → dva
    s = s.strip()
    if max_len and len(s) > max_len:
        s = s[:max_len].rstrip() + "…"
    return s

def sanitize_infobox(ib: dict) -> dict:
    """Vyčistí infobox — klíče i hodnoty, odstraní podezřelé záznamy."""
    if not ib:
        return ib
    clean = {}
    for k, v in ib.items():
        k2 = sanitize_string(str(k), max_len=100)
        v2 = sanitize_string(str(v), max_len=500)
        if not k2 or not v2:
            continue
        if _SUSPICIOUS_VAL_RE.match(v2):
            continue
        clean[k2] = v2
    return clean

def sanitize_record(r: dict) -> dict:
    """Sanitizuje celý záznam před uložením."""
    r = dict(r)
    for field in ("title", "intro", "full_text"):
        if r.get(field):
            r[field] = sanitize_string(r[field])
    if r.get("infobox"):
        r["infobox"] = sanitize_infobox(r["infobox"])
    if r.get("categories"):
        cats = [sanitize_string(c) for c in r["categories"]]
        r["categories"] = list(dict.fromkeys(c for c in cats if c))
    if r.get("sections"):
        r["sections"] = {
            sanitize_string(k): sanitize_string(v)
            for k, v in r["sections"].items()
            if k and v
        }
    # Validovat souřadnice
    if r.get("coordinates_norm"):
        cn = r["coordinates_norm"]
        lat, lng = cn.get("lat", 999), cn.get("lng", 999)
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            r.pop("coordinates_norm", None)
            r["_coord_invalid"] = True
    return r


# ─── DETEKCE ANOMÁLIÍ ─────────────────────────────────────────────────────────

# Každé pravidlo: (id, podmínka(record)→bool, zpráva, závažnost)
_ANOMALY_RULES = [
    ("no_title",
     lambda r: not r.get("title"),
     "Heslo nemá název", "error"),

    ("fetch_error",
     lambda r: bool(r.get("error")),
     "Heslo se nepodařilo stáhnout", "error"),

    ("suspicious_title",
     lambda r: bool(r.get("title") and re.match(
         r"(Wikipedie|Wikipedia|Kategorie|Category|File|Soubor|Šablona|Template):",
         r["title"], re.I)),
     "Název vypadá jako systémová stránka Wikipedie", "error"),

    ("empty_intro",
     lambda r: "intro" in r and len((r.get("intro") or "").strip()) < 20,
     "Velmi krátký nebo prázdný perex (< 20 znaků)", "warn"),

    ("wiki_markup_in_intro",
     lambda r: bool(r.get("intro") and _WIKI_MARKUP_RE.search(r["intro"])),
     "Perex obsahuje nezparsovaný wiki markup", "warn"),

    ("infobox_all_suspicious",
     lambda r: bool(r.get("infobox")) and len(r["infobox"]) > 0 and all(
         _SUSPICIOUS_VAL_RE.match(str(v)) for v in r["infobox"].values()),
     "Všechny hodnoty infoboxu jsou podezřelé (N/A, prázdné…)", "warn"),

    ("no_categories",
     lambda r: "categories" in r and not r.get("categories"),
     "Heslo nemá žádné kategorie", "warn"),

    ("coord_invalid",
     lambda r: r.get("_coord_invalid"),
     "Souřadnice mimo platný rozsah — odstraněny", "warn"),

    ("very_short_sections",
     lambda r: bool(r.get("sections")) and
               all(len(v) < 50 for v in r["sections"].values()),
     "Všechny sekce jsou extrémně krátké (< 50 znaků)", "info"),

    ("no_content",
     lambda r: not r.get("intro") and not r.get("full_text") and not r.get("sections"),
     "Heslo nemá žádný textový obsah", "warn"),
]

def detect_anomalies(r: dict) -> list:
    """Detekuje anomálie v záznamu. Vrátí list {rule, message, severity}."""
    issues = []
    for rule_id, cond, msg, sev in _ANOMALY_RULES:
        try:
            if cond(r):
                issues.append({"rule": rule_id, "message": msg, "severity": sev})
        except Exception:
            pass
    return issues

def validate_and_sanitize(records: list) -> tuple:
    """
    Sanitizuje každý záznam a detekuje anomálie.
    Vrátí (clean_records, anomaly_report).
    anomaly_report = {url_nebo_title: [anomalies]}
    """
    clean = []
    report = {}
    n_err = n_warn = 0

    for r in records:
        r2 = sanitize_record(r)
        issues = detect_anomalies(r2)
        if issues:
            key = r2.get("url") or r2.get("title") or "?"
            report[key] = issues
            n_err  += sum(1 for i in issues if i["severity"] == "error")
            n_warn += sum(1 for i in issues if i["severity"] == "warn")
            r2["_anomalies"] = issues
        clean.append(r2)

    total = len(records)
    flagged = len(report)
    if flagged:
        log(f"🔍 Sanitizace: {total} hesel, {flagged} s anomáliemi "
            f"({n_err} chyb, {n_warn} varování)")
    else:
        log(f"✅ Sanitizace: {total} hesel — vše čisté")

    return clean, report

# ─── Validační report ─────────────────────────────────────────────────────────

def build_validation_report(records: list) -> dict:
    issues = {
        "no_intro":        [],
        "short_intro":     [],
        "no_infobox":      [],
        "no_categories":   [],
        "duplicate_titles":[],
        "coord_anomaly":   [],
        "long_ib_value":   [],
        "errors":          [],
        "stubs":           [],
        "low_quality":     [],
    }
    title_counts: dict = {}
    for r in records:
        t = r.get("title","")
        title_counts[t] = title_counts.get(t, 0) + 1

        if r.get("error"):
            issues["errors"].append(t)
        intro = r.get("intro","") or ""
        if not intro:
            issues["no_intro"].append(t)
        elif len(intro) < 100:
            issues["short_intro"].append(t)
        if not r.get("infobox"):
            issues["no_infobox"].append(t)
        if not r.get("categories"):
            issues["no_categories"].append(t)
        if r.get("is_stub"):
            issues["stubs"].append(t)
        q = r.get("_quality")
        if isinstance(q, dict) and q.get("score", 100) < 40:
            issues["low_quality"].append(t)
        cn = r.get("coordinates_norm")
        if cn:
            lat, lng = cn.get("lat",0), cn.get("lng",0)
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                issues["coord_anomaly"].append(t)
        for v in (r.get("infobox") or {}).values():
            if len(str(v)) > 400:
                issues["long_ib_value"].append(t)
                break

    issues["duplicate_titles"] = [t for t, n in title_counts.items() if n > 1]
    return {k: v[:50] for k, v in issues.items()}  # cap at 50 per category




def collect_urls_from_category(start_url, max_depth, limit, phase1_cp_path=None):
    """Vrátí dict {cat_name: [article_urls]} — každý článek jen jednou, u první kategorie kde byl nalezen."""
    base = get_base(start_url)
    visited_cats = set()
    seen_articles = set()
    root_name = nice_name(start_url)
    cat_queue = deque([(start_url, 0, None)])  # (url, depth, parent_name)
    s = {"cats": 0, "subcats": 0, "articles": 0}
    cat_articles = {}
    cat_tree = {root_name: {"parent": None, "children": []}}

    # Resume z phase1 checkpointu pokud existuje
    if phase1_cp_path and os.path.exists(phase1_cp_path):
        try:
            with open(phase1_cp_path, encoding="utf-8") as f:
                cp = json.load(f)
            cat_articles = cp["cat_articles"]
            cat_tree     = cp.get("cat_tree", {root_name: {"parent": None, "children": []}})
            visited_cats = set(cp["visited_cats"])
            raw_q        = cp["cat_queue"]
            cat_queue    = deque([(x[0], x[1], x[2] if len(x)>2 else None) for x in raw_q])
            s            = cp["stats"]
            for urls in cat_articles.values():
                seen_articles.update(urls)
            log(f"♻ Obnovuji fázi 1 z checkpointu: {s['cats']} kat, {s['articles']} hesel, fronta: {len(cat_queue)}")
        except Exception as e:
            log(f"⚠ Nelze načíst phase1 checkpoint: {e} — začínám od nuly")

    while cat_queue:
        cat_url, depth, parent_name = cat_queue.popleft()
        if cat_url in visited_cats: continue
        visited_cats.add(cat_url)
        s["cats"] += 1
        cat_name = nice_name(cat_url)
        log(f"PHASE1:CAT:{s['cats']}:{s['subcats']}:{s['articles']}:{cat_name[:60]}")

        # Registrovat do stromu
        if cat_name not in cat_tree:
            cat_tree[cat_name] = {"parent": parent_name, "children": []}
        if parent_name and parent_name in cat_tree:
            if cat_name not in cat_tree[parent_name]["children"]:
                cat_tree[parent_name]["children"].append(cat_name)

        soup = fetch(cat_url)
        if not soup: continue
        time.sleep(DELAY)

        if depth < max_depth:
            subcat_div = soup.find("div", id="mw-subcategories")
            if subcat_div:
                new = 0
                for a in subcat_div.find_all("a", href=True):
                    href = a["href"]
                    if "/wiki/" in href and ":" in href:
                        full = urljoin(base, href)
                        if full not in visited_cats:
                            sub_name = nice_name(full)
                            cat_queue.append((full, depth + 1, cat_name))
                            new += 1
                if new:
                    s["subcats"] += new

        pages_div = soup.find("div", id="mw-pages")
        page_new = []
        if pages_div:
            for a in pages_div.find_all("a", href=True):
                href = a["href"]
                slug = href.split("/wiki/")[-1] if "/wiki/" in href else ""
                if href.startswith("/wiki/") and ":" not in slug and slug:
                    full = urljoin(base, href)
                    if full not in seen_articles:
                        seen_articles.add(full)
                        page_new.append(full)
                        s["articles"] += 1

        if page_new:
            cat_articles[cat_name] = cat_articles.get(cat_name, []) + page_new

        for a in soup.find_all("a", href=True):
            txt = a.get_text().strip().lower()
            if txt in ("next page","další stránka","página siguiente","nächste seite"):
                nxt = urljoin(base, a["href"])
                if nxt not in visited_cats:
                    cat_queue.appendleft((nxt, depth))

        # Průběžný checkpoint fáze 1
        if phase1_cp_path and s["cats"] % PHASE1_CHECKPOINT_INTERVAL == 0:
            save_phase1_checkpoint(phase1_cp_path, cat_articles,
                                   visited_cats, list(cat_queue), s, cat_tree)

        if limit and s["articles"] >= limit:
            break

    # Oříznout na limit
    if limit:
        trimmed = {}
        count = 0
        for cat, urls in cat_articles.items():
            remaining = limit - count
            if remaining <= 0: break
            trimmed[cat] = urls[:remaining]
            count += len(trimmed[cat])
        cat_articles = trimmed

    return cat_articles, cat_tree


def collect_urls_from_list(url, soup, limit):
    base = get_base(url)
    content = soup.find("div", id="mw-content-text") or soup.find("div", {"class": "mw-parser-output"})
    if not content: return {nice_name(url): []}  # fix: vždy vracet dict
    seen, results = set(), []
    for a in content.find_all("a", href=True):
        href = a["href"]
        slug = href.split("/wiki/")[-1] if "/wiki/" in href else ""
        if href.startswith("/wiki/") and ":" not in slug and slug and not slug.startswith("#"):
            full = urljoin(base, href)
            if full not in seen:
                seen.add(full)
                results.append(full)
                log(f"PHASE1:LIST:{len(results)}:{nice_name(full)[:60]}")
                if limit and len(results) >= limit: break
    # Return same dict format as category version
    page_title = nice_name(url)
    return {page_title: results}


# ─── FÁZE 2: Extrakce dat ─────────────────────────────────────────────────────

def extract_infobox(soup):
    data = {}
    box = soup.find("table", {"class": re.compile(r"infobox", re.I)})
    if not box: return data
    for row in box.find_all("tr"):
        cells = row.find_all(["th", "td"])
        if len(cells) == 2:
            k = re.sub(r"\s+", " ", cells[0].get_text(separator=" ", strip=True))[:80]
            v = re.sub(r"\s+", " ", cells[1].get_text(separator=" ", strip=True))[:300]
            if k and v: data[k] = v
    return data


def extract_sections(soup):
    """Vrátí text rozdělený do sekcí: {"Úvod": "...", "Výskyt": "...", ...}
    Podporuje moderní Wikipedia strukturu kde h2/h3 jsou obaleny v <div class="mw-heading">.
    """
    content = soup.find("div", {"class": "mw-parser-output"})
    if not content: return {}

    SKIP_SECTIONS = {"Odkazy", "Reference", "Literatura", "Poznámky",
                     "External links", "References", "Notes", "See also",
                     "Further reading", "Zdroje"}

    sections = {}
    current_section = "Úvod"
    current_parts = []

    def flush():
        text = "\n\n".join(current_parts).strip()
        if text and current_section not in SKIP_SECTIONS:
            sections[current_section] = text

    for elem in content.children:
        if not hasattr(elem, "name") or not elem.name:
            continue

        # Moderní Wikipedia: <div class="mw-heading mw-heading2"> obsahuje <h2>
        is_heading = False
        heading_text = None
        if elem.name in ("h2", "h3"):
            is_heading = True
            heading_text = elem.get_text()
        elif elem.name == "div" and elem.get("class"):
            classes = " ".join(elem.get("class", []))
            if "mw-heading" in classes:
                h = elem.find(["h2", "h3", "h4"])
                if h:
                    is_heading = True
                    heading_text = h.get_text()

        if is_heading and heading_text:
            flush()
            current_section = re.sub(r"\[.*?\]", "", heading_text).strip()
            current_parts = []
        elif elem.name == "p":
            t = re.sub(r"\[\d+\]", "", elem.get_text(strip=True))
            if len(t) > 20:
                current_parts.append(t)
        elif elem.name in ("ul", "ol"):
            items = []
            for li in elem.find_all("li", recursive=False):
                t = re.sub(r"\[\d+\]", "", li.get_text(strip=True))
                if len(t) > 5:
                    items.append("• " + t)
            if items:
                current_parts.append("\n".join(items))

    flush()
    return sections



def extract_images(soup, base_url=""):
    """Vrati seznam obrazku z clanku: url, thumb, caption."""
    content = soup.find("div", {"class": "mw-parser-output"})
    if not content: return []
    images = []
    seen = set()

    containers = list(content.find_all("figure"))
    for d in content.find_all("div"):
        cls = " ".join(d.get("class", []))
        if "thumb" in cls or "mw-halign" in cls:
            containers.append(d)

    for container in containers:
        img = container.find("img")
        if not img: continue
        src = img.get("src", "")
        if not src or src in seen: continue
        try:
            if int(img.get("width", 0)) < 50: continue
        except (ValueError, TypeError):
            pass
        seen.add(src)

        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            src = base_url.rstrip("/") + src

        full_url = re.sub(r"/thumb(/.*?)(/[^/]+)$", r"\1", src)
        if not full_url.startswith("http"):
            full_url = src

        thumb_url = re.sub(r"(/\d+)px-([^/]+)$", "/300px-\\2", src)

        cap_el = container.find("figcaption") or container.find(class_="thumbcaption")
        caption = cap_el.get_text(strip=True) if cap_el else ""
        caption = re.sub(r"\[\d+\]", "", caption)[:200]

        images.append({"url": full_url, "thumb": thumb_url, "caption": caption})

    return images[:20]


def fetch_image_metadata(image_urls, base_url):
    """Pro seznam URL stahne metadata z Wikimedia API (licence, autor)."""
    if not image_urls: return {}
    api = api_base(base_url)

    def url_to_filename(u):
        m = re.search(r"/([^/]+\.(jpe?g|png|gif|svg|webp|tiff?))[^/]*$", u, re.I)
        return ("File:" + unquote(m.group(1))) if m else None

    file_names = [url_to_filename(u) for u in image_urls if url_to_filename(u)]
    if not file_names: return {}

    data = api_get(api, {
        "action": "query",
        "titles": "|".join(file_names[:10]),
        "prop": "imageinfo",
        "iiprop": "extmetadata",
        "iiextmetadatafilter": "LicenseShortName|Artist",
    })
    if not data: return {}

    meta = {}
    for page in (data.get("query") or {}).get("pages", {}).values():
        ii = (page.get("imageinfo") or [{}])[0]
        emd = ii.get("extmetadata", {})
        licence = emd.get("LicenseShortName", {}).get("value", "")
        author  = re.sub(r"<[^>]+>", "", emd.get("Artist", {}).get("value", "")).strip()[:100]
        meta[page.get("title", "")] = {"licence": licence, "author": author}

    result = {}
    for u in image_urls:
        fn = url_to_filename(u)
        if fn and fn in meta:
            result[u] = meta[fn]
    return result


def extract_tables(soup):
    """Vrati seznam wikitable tabulek jako strukturovana data."""
    content = soup.find("div", {"class": "mw-parser-output"})
    if not content: return []
    tables = []

    for tbl in content.find_all("table"):
        classes = " ".join(tbl.get("class", []))
        if "wikitable" not in classes: continue
        if re.search(r"\binfobox\b", classes, re.I): continue

        cap_el = tbl.find("caption")
        caption = re.sub(r"\[\d+\]", "", cap_el.get_text(strip=True) if cap_el else "")[:150]

        headers = []
        header_row = tbl.find("tr")
        if header_row:
            headers = [re.sub(r"\[\d+\]", "", th.get_text(separator=" ", strip=True))[:80]
                       for th in header_row.find_all(["th", "td"])]

        rows = []
        for row in tbl.find_all("tr")[1 if headers else 0:]:
            cells = row.find_all(["td", "th"])
            if not cells: continue
            row_data = [re.sub(r"\[\d+\]", "", c.get_text(separator=" ", strip=True))[:200]
                        for c in cells]
            if any(cell.strip() for cell in row_data):
                rows.append(row_data)

        if rows:
            tables.append({"caption": caption, "headers": headers, "rows": rows[:100]})

    return tables[:10]



def extract_external_links(soup):
    """Vrátí seznam externích odkazů (ne-Wikipedia)."""
    content = soup.find("div", {"class": "mw-parser-output"})
    if not content: return []
    links = []
    seen = set()
    for a in content.find_all("a", href=True):
        href = a["href"]
        if href.startswith("http") and "wikipedia.org" not in href:
            if href not in seen:
                seen.add(href)
                text = a.get_text(strip=True)[:80]
                links.append({"url": href, "text": text})
    return links[:50]


def normalize_coords(raw: str) -> dict | None:
    """Normalizuje souřadnice na {lat, lng} jako čísla. Vrátí None pokud nelze parsovat."""
    if not raw: return None
    # Zkusit čisté desetinné číslo: "50.08, 14.42" nebo "50.08 14.42"
    m = re.search(r'([-−]?\d+\.?\d*)[,\s]+([-−]?\d+\.?\d*)', raw.replace('−', '-'))
    if m:
        lat, lng = float(m.group(1)), float(m.group(2))
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            return {"lat": round(lat, 6), "lng": round(lng, 6)}
    # Zkusit DMS formát: 50°5′N 14°25′E
    def dms(deg, min_=0, sec=0, hem='N'):
        v = float(deg) + float(min_)/60 + float(sec)/3600
        return -v if hem in ('S', 'W') else v
    m = re.search(
        r'(\d+)[°\u00b0](\d+)?[′\u2019\']?(\d+)?[″"]?\s*([NS])[,\s]+(\d+)[°\u00b0](\d+)?[′\u2019\']?(\d+)?[″"]?\s*([EW])',
        raw, re.IGNORECASE)
    if m:
        g = m.groups()
        lat = dms(g[0], g[1] or 0, g[2] or 0, g[3])
        lng = dms(g[4], g[5] or 0, g[6] or 0, g[7])
        return {"lat": round(lat, 6), "lng": round(lng, 6)}
    return None


def compute_quality(record: dict) -> dict:
    """Vrátí quality score 0-100 a breakdown důvodů."""
    score = 0
    details = []

    intro_len = len(record.get("intro", "") or "")
    if intro_len >= 300:
        score += 30; details.append("perex OK")
    elif intro_len >= 100:
        score += 15; details.append("perex krátký")
    else:
        details.append("perex chybí/příliš krátký")

    ib = record.get("infobox", {})
    if isinstance(ib, dict) and len(ib) >= 3:
        score += 25; details.append("infobox OK")
    elif isinstance(ib, dict) and len(ib) > 0:
        score += 10; details.append("infobox nekompletní")
    else:
        details.append("infobox chybí")

    if record.get("coordinates"):
        score += 15; details.append("souřadnice OK")

    cats = record.get("categories", [])
    if isinstance(cats, list) and len(cats) >= 2:
        score += 15; details.append("kategorie OK")
    elif isinstance(cats, list) and cats:
        score += 7; details.append("málo kategorií")

    if record.get("sections") and len(record["sections"]) >= 2:
        score += 10; details.append("sekce OK")
    elif record.get("full_text") and len(record.get("full_text","")) > 500:
        score += 10; details.append("text OK")

    if record.get("is_stub"):
        score = max(0, score - 20); details.append("⚠ stub")
    if record.get("error"):
        score = 0; details.append("chyba stažení")

    return {"score": min(100, score), "details": details}


def extract_article(url, fields):
    global _session
    # Detekce redirect — sledovat konečnou URL
    try:
        resp = _session.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        final_url = resp.url
        if resp.status_code == 429:
            time.sleep(5)
            resp = _session.get(url, timeout=REQUEST_TIMEOUT, allow_redirects=True)
            final_url = resp.url
        resp.encoding = "utf-8"
        soup = BeautifulSoup(resp.text, "html.parser")
    except Exception:
        soup = fetch(url)
        final_url = url

    if not soup: return {"url": url, "error": "fetch failed"}
    time.sleep(DELAY)

    result = {"url": final_url}
    # Pokud byl redirect, zachovat původní URL také
    if final_url != url:
        result["redirected_from"] = url

    # Název vždy
    h1 = soup.find("h1", id="firstHeading") or soup.find("h1")
    result["title"] = h1.get_text(strip=True) if h1 else nice_name(url)

    # Detekce stub
    content_div = soup.find("div", {"class": "mw-parser-output"})
    is_stub = False
    if content_div:
        stub_templates = content_div.find_all("div", {"class": re.compile(r"stub", re.I)})
        if stub_templates:
            is_stub = True
        # Také kontrola kategorií obsahujících "stub"
    result["is_stub"] = is_stub

    if "intro" in fields:
        intro = ""
        if content_div:
            for p in content_div.find_all("p", recursive=False):
                t = p.get_text(strip=True)
                if len(t) > 50:
                    intro = re.sub(r"\[\d+\]", "", t); break
        result["intro"] = intro

    # full_text a sections sdílí průchod DOM
    if "full_text" in fields or "sections" in fields:
        if content_div:
            if "full_text" in fields:
                parts = []
                for elem in content_div.find_all(["p", "ul", "ol"]):
                    if elem.name == "p":
                        t = re.sub(r"\[\d+\]", "", elem.get_text(strip=True))
                        if len(t) > 20:
                            parts.append(t)
                    elif elem.name in ("ul", "ol"):
                        items = []
                        for li in elem.find_all("li", recursive=False):
                            t = re.sub(r"\[\d+\]", "", li.get_text(strip=True))
                            if len(t) > 5:
                                items.append("• " + t)
                        if items:
                            parts.append("\n".join(items))
                result["full_text"] = "\n\n".join(parts)
            if "sections" in fields:
                result["sections"] = extract_sections(soup)
        else:
            if "full_text" in fields: result["full_text"] = ""
            if "sections" in fields:  result["sections"] = {}

    if "infobox" in fields:
        result["infobox"] = extract_infobox(soup)

    if "categories" in fields:
        cats_div = soup.find("div", id="mw-normal-catlinks")
        cats = [a.get_text(strip=True) for a in cats_div.find_all("a")[1:]][:20] if cats_div else []
        result["categories"] = cats
        # Detekce stub přes kategorie
        if any("stub" in c.lower() for c in cats):
            result["is_stub"] = True

    if "coordinates" in fields:
        coords_span = soup.find("span", id="coordinates") or soup.find("span", {"class": "geo"})
        if coords_span:
            raw = coords_span.get_text(strip=True)
            result["coordinates"] = raw
            norm = normalize_coords(raw)
            if norm:
                result["coordinates_norm"] = norm

    if "links" in fields:
        result["links"] = extract_external_links(soup)

    if "images" in fields:
        base = get_base(url)
        imgs = extract_images(soup, base)
        # Doplnit metadata (licence, autor) z Wikimedia API
        if imgs:
            meta = fetch_image_metadata([i["url"] for i in imgs], url)
            for img in imgs:
                if img["url"] in meta:
                    img.update(meta[img["url"]])
        result["images"] = imgs

    if "tables" in fields:
        result["tables"] = extract_tables(soup)

    # Quality score — vždy počítat
    result["_quality"] = compute_quality(result)

    return result


# ─── Checkpoint ───────────────────────────────────────────────────────────────

def save_checkpoint(path, article_urls, done_set, results):
    cp = {"article_urls": article_urls, "done_urls": list(done_set),
          "results": results, "saved_at": time.strftime("%Y-%m-%d %H:%M:%S")}
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cp, f, ensure_ascii=False)
    os.replace(tmp, path)

def load_checkpoint(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_phase1_checkpoint(path, cat_articles, visited_cats, cat_queue_list, stats, cat_tree=None):
    """Uloží průběžný stav fáze 1 — lze obnovit po přerušení."""
    cp = {
        "cat_articles": cat_articles,
        "cat_tree": cat_tree or {},
        "visited_cats": list(visited_cats),
        "cat_queue": cat_queue_list,   # list of [url, depth, parent_name]
        "stats": stats,
        "saved_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cp, f, ensure_ascii=False)
    os.replace(tmp, path)
    log(f"PHASE1_CP:{stats['cats']}:{stats['articles']}")


def save_parquet(data: list, path: str):
    """Uloží data jako Parquet soubor — nejlepší formát pro pandas/polars."""
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ImportError:
        log("⚠ Parquet: chybí pyarrow — nainstaluj: pip install pyarrow", "warn")
        return

    # Zploštit infobox a categories (nested → string/list pro Parquet)
    rows = []
    for r in data:
        row = {}
        for k, v in r.items():
            if k == "infobox" and isinstance(v, dict):
                # Infobox jako JSON string (zachová strukturu)
                row["infobox_json"] = json.dumps(v, ensure_ascii=False)
            elif k == "categories" and isinstance(v, list):
                row["categories"] = v  # list<string> — Parquet nativně podporuje
            elif k in ("images", "tables", "sections", "links", "_anomalies", "wikidata"):
                row[k + "_json"] = json.dumps(v, ensure_ascii=False) if v else None
            elif isinstance(v, (str, int, float, bool)) or v is None:
                row[k] = v
            else:
                row[k] = str(v)
        rows.append(row)

    # Sjednotit schéma přes všechny řádky
    all_keys = list(dict.fromkeys(k for row in rows for k in row))
    for row in rows:
        for k in all_keys:
            row.setdefault(k, None)

    table = pa.table({k: [row[k] for row in rows] for k in all_keys})
    pq.write_table(table, path, compression="snappy")
    log(f"✅ Parquet: {path}  ({len(data)} hesel)")


def save_jsonld(data: list, path: str, source_url: str = ""):
    """Uloží data jako JSON-LD se schema.org anotacemi."""
    graph = []
    for r in data:
        obj = {
            "@type":       "Thing",
            "@id":         r.get("url", ""),
            "name":        r.get("title", ""),
            "description": r.get("intro", ""),
            "url":         r.get("url", ""),
            "sameAs":      r.get("url", ""),
        }
        if r.get("categories"):
            obj["keywords"] = ", ".join(r["categories"])
        if r.get("coordinates_norm"):
            cn = r["coordinates_norm"]
            obj["geo"] = {
                "@type":     "GeoCoordinates",
                "latitude":  cn.get("lat"),
                "longitude": cn.get("lng"),
            }
        if r.get("infobox"):
            obj["additionalProperty"] = [
                {"@type": "PropertyValue", "name": k, "value": v}
                for k, v in list(r["infobox"].items())[:20]
            ]
        if r.get("images"):
            obj["image"] = [{"@type": "ImageObject", "url": img["url"],
                              "caption": img.get("caption","")} for img in r["images"][:3]]
        graph.append(obj)

    doc = {
        "@context": "https://schema.org",
        "@graph":   graph,
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    log(f"✅ JSON-LD: {path}  ({len(data)} hesel)")


# ─── Pending soubor ───────────────────────────────────────────────────────────

def save_pending(path, cat_articles, cat_tree=None, root_cat=None):
    """Uloží výsledky fáze 1: {cat_name: [urls]} pro review v GUI."""
    total = sum(len(v) for v in cat_articles.values())
    data = {
        "cat_articles": cat_articles,
        "cat_tree": cat_tree or {},
        "root_cat": root_cat or "",
        "total": total,
        "saved_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    log(f"PENDING_SAVED:{total}:{path}")


# ─── Výstup ───────────────────────────────────────────────────────────────────

def save_json(data, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    log(f"✅ JSON: {path}  ({len(data)} hesel)")

def save_csv(data, path):
    if not data: return
    base_fields = ["title","url","intro","coordinates","categories","infobox","links"]
    has_sections  = any("sections"   in d for d in data)
    has_full_text = any("full_text"  in d for d in data)

    fieldnames = [f for f in base_fields if f != "sections"]
    if has_sections:  fieldnames.append("sections")
    if has_full_text: fieldnames.append("full_text")

    flat = []
    for d in data:
        row = {}
        for k in fieldnames:
            v = d.get(k, "")
            if isinstance(v, list):
                if k == "categories": v = " | ".join(v)
                elif k == "links": v = json.dumps(v, ensure_ascii=False)
                else: v = str(v)
            elif isinstance(v, dict):
                v = json.dumps(v, ensure_ascii=False)
            row[k] = v
        flat.append(row)

    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(flat)
    log(f"✅ CSV: {path}  ({len(flat)} hesel)")


def save_sqlite(data, path):
    """Uloží data do SQLite — tabulky articles + infobox_values."""
    import sqlite3
    conn = sqlite3.connect(path)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS articles (
            id       INTEGER PRIMARY KEY,
            url      TEXT UNIQUE,
            title    TEXT,
            intro    TEXT,
            categories TEXT,
            coordinates TEXT,
            coordinates_lat REAL,
            coordinates_lng REAL,
            is_stub  INTEGER,
            quality_score INTEGER,
            full_text TEXT,
            error    TEXT
        );
        CREATE TABLE IF NOT EXISTS infobox_values (
            article_id INTEGER REFERENCES articles(id),
            key        TEXT,
            value      TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_ib_key ON infobox_values(key);
        CREATE INDEX IF NOT EXISTS idx_ib_article ON infobox_values(article_id);
    """)
    for rec in data:
        cats = rec.get("categories", [])
        cats_str = " | ".join(cats) if isinstance(cats, list) else str(cats)
        coords_norm = rec.get("coordinates_norm", {})
        q = rec.get("_quality", {})
        c.execute("""
            INSERT OR REPLACE INTO articles
            (url, title, intro, categories, coordinates, coordinates_lat,
             coordinates_lng, is_stub, quality_score, full_text, error)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)
        """, (
            rec.get("url",""), rec.get("title",""), rec.get("intro",""),
            cats_str, rec.get("coordinates",""),
            coords_norm.get("lat") if coords_norm else None,
            coords_norm.get("lng") if coords_norm else None,
            1 if rec.get("is_stub") else 0,
            q.get("score", 0) if isinstance(q, dict) else 0,
            rec.get("full_text",""), rec.get("error","")
        ))
        art_id = c.lastrowid
        for k, v in (rec.get("infobox") or {}).items():
            c.execute("INSERT INTO infobox_values (article_id, key, value) VALUES (?,?,?)",
                      (art_id, k[:80], str(v)[:500]))
    conn.commit()
    conn.close()
    log(f"✅ SQLite: {path}  ({len(data)} hesel)")


def save_readme(data, path, source_url, output_name, fields_used):
    """Vygeneruje README.md vedle datových souborů."""
    total = len(data)
    with_ib    = sum(1 for r in data if r.get("infobox") and len(r.get("infobox",{})) > 0)
    with_coords= sum(1 for r in data if r.get("coordinates"))
    with_err   = sum(1 for r in data if r.get("error"))
    stubs      = sum(1 for r in data if r.get("is_stub"))
    q_scores   = [r["_quality"]["score"] for r in data if isinstance(r.get("_quality"), dict)]
    avg_q      = round(sum(q_scores) / len(q_scores)) if q_scores else 0

    lines = [
        f"# Wiki Scraper — {output_name}",
        f"",
        f"Automaticky vygenerováno nástrojem **WikiScraper v5**",
        f"",
        f"## Zdroj",
        f"- **URL:** {source_url}",
        f"- **Datum:** {time.strftime('%Y-%m-%d %H:%M:%S')}",
        f"- **Pole:** {', '.join(sorted(fields_used))}",
        f"",
        f"## Statistiky",
        f"| Metrika | Hodnota |",
        f"|---------|---------|",
        f"| Celkem hesel | {total} |",
        f"| S infoboxem | {with_ib} ({round(with_ib/total*100) if total else 0}%) |",
        f"| Se souřadnicemi | {with_coords} ({round(with_coords/total*100) if total else 0}%) |",
        f"| Stub články | {stubs} ({round(stubs/total*100) if total else 0}%) |",
        f"| Chyby stažení | {with_err} |",
        f"| Průměrné quality skóre | {avg_q}/100 |",
        f"",
        f"## Soubory",
        f"- `{output_name}.json` — kompletní data (UTF-8)",
        f"- `{output_name}.csv` — tabulková forma",
        f"- `{output_name}.db` — SQLite databáze (tabulky: articles, infobox_values)",
        f"- `{output_name}.README.md` — tento soubor",
        f"",
        f"## Schéma",
        f"```json",
        f'{{',
        f'  "url": "https://...",',
        f'  "title": "Název hesla",',
        f'  "intro": "První odstavec...",',
        f'  "infobox": {{"klíč": "hodnota", ...}},',
        f'  "categories": ["Kat1", "Kat2"],',
        f'  "coordinates": "50°5′N 14°25′E",',
        f'  "coordinates_norm": {{"lat": 50.08, "lng": 14.42}},',
        f'  "is_stub": false,',
        f'  "_quality": {{"score": 85, "details": ["perex OK", "infobox OK"]}}',
        f'}}',
        f"```",
    ]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    log(f"✅ README: {path}")




def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("-o", "--output",      default="wiki_data")
    parser.add_argument("-f", "--format",      choices=["json","csv","both","all"], default="both")
    parser.add_argument("-d", "--depth",       type=int,   default=5)
    parser.add_argument("-l", "--limit",       type=int,   default=0)
    parser.add_argument("-v", "--verbose",     action="store_true")
    parser.add_argument("--delay",             type=float, default=0.5)
    parser.add_argument("--resume",            action="store_true")
    parser.add_argument("--phase1-only",       action="store_true",
                        help="Jen sbírej URL, ulož pending soubor a skonči")
    parser.add_argument("--url-file",          default="",
                        help="Přeskočit fázi 1, načíst URL seznam z JSON souboru (flat list)")
    parser.add_argument("--fields",            default="title,intro,infobox,categories,coordinates")
    parser.add_argument("--workers",           type=int, default=1,
                        help="Počet paralelních vláken pro fázi 2 (1=sekvenční, 2-5=paralelní)")
    parser.add_argument("--api",               action="store_true",
                        help="Použít MediaWiki API místo HTML parsování (rychlejší)")
    parser.add_argument("--wikidata",          action="store_true",
                        help="Po fázi 2 obohatit záznamy o Wikidata properties")
    parser.add_argument("--incremental",       action="store_true",
                        help="Stáhnout jen hesla změněná od posledního scrapingu")
    parser.add_argument("--tags",              action="store_true",
                        help="Automaticky přidat _tags podle kategorií")
    parser.add_argument("--validate",          action="store_true",
                        help="Generovat validační report po dokončení")
    args = parser.parse_args()

    global BASE_DELAY, DELAY
    BASE_DELAY = args.delay
    DELAY = args.delay

    fields = set(f.strip() for f in args.fields.split(",") if f.strip())
    fields.add("title")

    setup_file_logging(args.output)
    log(f"📚 WIKI SCRAPER v8")
    if not args.url_file:
        log(f"URL: {args.url}")
    log(f"Hloubka: {args.depth} | Limit: {args.limit or '∞'} | Delay: {DELAY}s")

    checkpoint_path  = f"{args.output}.checkpoint.json"
    pending_path     = f"{args.output}.pending.json"
    phase1_cp_path   = f"{args.output}.phase1_cp.json"

    # ══════════════════════════════════════════════════════
    # Režim A: načíst URL ze souboru (po review v GUI)
    # ══════════════════════════════════════════════════════
    if args.url_file:
        log(f"📋 Načítám URL seznam: {args.url_file}")
        with open(args.url_file, encoding="utf-8") as f:
            article_urls = json.load(f)
        total = len(article_urls)
        eta_s = total * (AVG_SECONDS_PER_ARTICLE + DELAY)
        log(f"PHASE1_DONE:{total}:0:{eta_s:.0f}")
        done_set, results = set(), []

    # ══════════════════════════════════════════════════════
    # Režim B: resume z checkpointu
    # ══════════════════════════════════════════════════════
    elif args.resume and os.path.exists(checkpoint_path):
        log("♻ Načítám checkpoint...")
        cp = load_checkpoint(checkpoint_path)
        article_urls = cp["article_urls"]
        done_set     = set(cp["done_urls"])
        results      = cp["results"]
        remaining    = len(article_urls) - len(done_set)
        eta_s        = remaining * (AVG_SECONDS_PER_ARTICLE + DELAY)
        log(f"PHASE1_DONE:{len(article_urls)}:{len(done_set)}:{eta_s:.0f}")

    # ══════════════════════════════════════════════════════
    # Režim C: fáze 1 — sbírání URL
    # ══════════════════════════════════════════════════════
    else:
        if args.resume:
            log("⚠ Checkpoint nenalezen, začínám od nuly")

        log("PHASE:1")
        log("🔍 Načítám startovní stránku...")
        soup = fetch(args.url)
        if not soup:
            log("❌ Nepodařilo se načíst URL.")
            sys.exit(1)
        time.sleep(DELAY)

        if is_category(args.url, soup):
            log("📁 Typ: Kategorie")
            cat_articles, cat_tree = collect_urls_from_category(args.url, args.depth, args.limit, phase1_cp_path)
        elif is_list(args.url, soup):
            log("📋 Typ: Seznam hesel")
            cat_articles = collect_urls_from_list(args.url, soup, args.limit)
            cat_tree = {}
        else:
            log("❓ Nerozpoznáno — zkouším jako seznam")
            cat_articles = collect_urls_from_list(args.url, soup, args.limit)
            cat_tree = {}

        # Flat seznam pro fázi 2 (zachovat pořadí, deduplikovat)
        seen, article_urls = set(), []
        for urls in cat_articles.values():
            for u in urls:
                if u not in seen:
                    seen.add(u); article_urls.append(u)

        total = len(article_urls)
        eta_s = total * (AVG_SECONDS_PER_ARTICLE + DELAY)

        # Uložit pending soubor vždy (GUI ho přečte pro review)
        save_pending(pending_path, cat_articles, cat_tree, nice_name(args.url))

        log(f"PHASE1_DONE:{total}:0:{eta_s:.0f}")

        if not total:
            log("⚠ Žádná hesla nenalezena.")
            sys.exit(0)

        # Pokud jen fáze 1, skonči
        if args.phase1_only:
            # Smazat phase1 checkpoint — fáze 1 je hotová
            if os.path.exists(phase1_cp_path):
                os.remove(phase1_cp_path)
            log("✅ Fáze 1 dokončena. Čeká na výběr kategorií v GUI.")
            sys.exit(0)

        done_set, results = set(), []

    # ══════════════════════════════════════════════════════
    # FÁZE 2: stahování článků
    # ══════════════════════════════════════════════════════
    log("PHASE:2")
    workers = max(1, min(getattr(args, 'workers', 1), 8))
    use_api = getattr(args, 'api', False)
    incremental = getattr(args, 'incremental', False)
    do_tags = getattr(args, 'tags', False)
    do_wikidata = getattr(args, 'wikidata', False)
    do_validate = getattr(args, 'validate', False)

    if use_api:
        log(f"⚡ Režim: MediaWiki API (workers={workers})")
    else:
        log(f"🌐 Režim: HTML scraping (workers={workers})")

    # Incremental — načíst jen změněná hesla
    existing_results = []
    if incremental:
        json_out = f"{args.output}.json"
        article_urls, existing_results = filter_updated(article_urls, json_out, fields)
        if not article_urls:
            log("✅ Žádné změny od posledního scrapingu.")
            results = existing_results
            # přeskočit na výstup
            goto_output = True
        else:
            goto_output = False
    else:
        goto_output = False

    total = len(article_urls)

    if not goto_output:
        fetch_fn = (lambda u, f: fetch_via_api(u, f)) if use_api else (lambda u, f: extract_article(u, f))
        _progress_lock = threading.Lock()
        _done_count = [0]

        def fetch_one(idx_url):
            idx, url = idx_url
            if url in done_set:
                return idx, url, None  # přeskočeno
            result = fetch_fn(url, fields)
            # Přidat timestamp
            result["_fetched_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
            if do_tags:
                result["_tags"] = compute_tags(result)
            with _progress_lock:
                _done_count[0] += 1
                done = _done_count[0]
                remaining_items = total - done
                eta_s = remaining_items * ((AVG_SECONDS_PER_ARTICLE + DELAY) / max(workers, 1))
                log(f"PROGRESS:{done}:{total}:{eta_s:.0f}:{(result.get('title') or nice_name(url))[:60]}")
            return idx, url, result

        if workers == 1:
            # Sekvenční — původní chování
            for i, url in enumerate(article_urls, 1):
                if url in done_set:
                    log(f"PROGRESS:{i}:{total}:-1:{nice_name(url)[:60]} [přeskočeno]")
                    continue
                remaining_items = total - i
                eta_s = remaining_items * (AVG_SECONDS_PER_ARTICLE + DELAY)
                log(f"PROGRESS:{i}:{total}:{eta_s:.0f}:{nice_name(url)[:60]}")
                r = fetch_fn(url, fields)
                r["_fetched_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
                if do_tags: r["_tags"] = compute_tags(r)
                results.append(r)
                done_set.add(url)
                if i % CHECKPOINT_INTERVAL == 0:
                    save_checkpoint(checkpoint_path, article_urls, done_set, results)
                    log(f"💾 Checkpoint ({len(done_set)}/{total})")
        else:
            # Paralelní
            ordered = {url: None for url in article_urls}
            with ThreadPoolExecutor(max_workers=workers) as ex:
                futures = {ex.submit(fetch_one, (i, url)): url
                           for i, url in enumerate(article_urls) if url not in done_set}
                cp_counter = 0
                for fut in as_completed(futures):
                    try:
                        idx, url, rec = fut.result()
                        if rec is not None:
                            ordered[url] = rec
                            done_set.add(url)
                            cp_counter += 1
                            if cp_counter % CHECKPOINT_INTERVAL == 0:
                                partial = [v for v in ordered.values() if v is not None]
                                save_checkpoint(checkpoint_path, article_urls, done_set, partial)
                                log(f"💾 Checkpoint ({len(done_set)}/{total})")
                    except Exception as e:
                        log(f"  ✗ Chyba vlákna: {e}")
            results = [v for v in ordered.values() if v is not None]

        # Přidat zachovaná hesla z incremental
        results = results + existing_results

    log(f"\n📦 Hotovo: {len(results)} hesel")

    # Sanitizace a validace anomálií — vždy, i bez --validate flagu
    results, anomaly_report = validate_and_sanitize(results)

    # Deduplikace podle redirect URL
    seen_finals: set = set()
    deduped = []
    dupes = 0
    for r in results:
        fu = r.get("url", r.get("redirected_from", ""))
        if fu not in seen_finals:
            seen_finals.add(fu)
            deduped.append(r)
        else:
            dupes += 1
    if dupes:
        log(f"🔄 Odstraněno {dupes} redirect duplikátů")
        results = deduped

    # Fuzzy dedup report
    results, fuzzy_pairs = fuzzy_dedup(results)
    if fuzzy_pairs:
        log(f"⚠ Nalezeno {len(fuzzy_pairs)} potenciálních fuzzy duplikátů:")
        for a, b, d in fuzzy_pairs[:10]:
            log(f"  '{a}' ≈ '{b}' (vzdálenost={d})")

    # Wikidata obohacení
    if do_wikidata:
        lang = urlparse(args.url).netloc.split(".")[0] if args.url != "placeholder" else "cs"
        results = enrich_wikidata(results, lang)

    # Validační report — kombinuje anomaly_report ze sanitizace + build_validation_report
    if do_validate:
        legacy_report = build_validation_report(results)
        # Sloučit: anomaly_report (per-záznam) + legacy_report (per-kategorie problémů)
        combined = {"anomalies": anomaly_report, "summary": legacy_report}
        report_path = f"{args.output}.validation.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(combined, f, ensure_ascii=False, indent=2)
        log(f"📋 Validační report: {report_path}")
        for k, v in legacy_report.items():
            if v:
                log(f"  {k}: {len(v)} hesel")

    if args.format in ("json","both","all","parquet","jsonld"): save_json(results, f"{args.output}.json")
    if args.format in ("csv","both","all"):   save_csv(results,  f"{args.output}.csv")
    if args.format in ("parquet","all"):     save_parquet(results, f"{args.output}.parquet")
    if args.format in ("jsonld","all"):      save_jsonld(results,  f"{args.output}.jsonld", args.url)
    if args.format == "all":
        save_sqlite(results, f"{args.output}.db")
        save_readme(results, f"{args.output}.README.md",
                    args.url, os.path.basename(args.output), fields)

    if os.path.exists(checkpoint_path):
        os.remove(checkpoint_path)
        log("🗑 Checkpoint smazán")
    if os.path.exists(phase1_cp_path):
        os.remove(phase1_cp_path)

if __name__ == "__main__":
    main()
