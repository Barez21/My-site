#!/usr/bin/env python3
"""
Stáhne obchodní ceny všech dodavatelů ze srovnávače ERÚ (srovnavac.eru.gov.cz) pro domácnosti.

  elektřina – distributoři ČEZ, PRE, EG.D × sazby D01d–D61d, standardní i dynamické produkty
  plyn      – distributoři GasNet, EG.D (Gas Distribution), PPD × 6 pásem spotřeby do 63 MWh, standardní i dynamické

U každého produktu ukládá obchodní (tržní) složku – stálý měsíční plat a cenu za MWh (u elektřiny VT a NT),
všechno bez DPH – a z detailu produktu odkazy na PDF (ceník, obchodní podmínky, vzor smlouvy),
typ zákazníka (noví / stávající / retenční) a délku smlouvy.
Regulované ceny bere kalkulačka ze souboru regulovane-ceny-RRRR.json.

Výstup:
  ceniky-eru.json      – aktuální stav
  ceniky-zmeny.json    – historie změn (nový produkt, zrušený produkt, změna ceny, nový ceník)

Srovnávač nemá veřejné API ani export; skript volá stejné JSON rozhraní, které používá jeho webová stránka.
Produkt se pozná podle productId – to je stejné pro všechny distributory i sazby. Stejný název
může mít víc produktů (např. varianty s fixací na 12, 24 a 36 měsíců).

Celé stažení: ~50 dotazů na ceny + jeden dotaz na detail každého produktu (detaily se obnovují
jednou za DETAIL_DNU dní nebo když se produkt objeví poprvé), běžně 1–3 minuty.
POZOR: detail produktu srovnávač vydá jen hned po vyhledávání, které produkt vrátilo (jinak HTTP 204),
proto se detaily stahují průběžně po každém vyhledávání.

Spuštění:  python3 stahni_ceniky.py [--slozka FFY-tools/data] [--vsechny-detaily]
Jen standardní knihovna Pythonu.
"""
import argparse, datetime as dt, json, os, re, secrets, sys, time, urllib.parse, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import verze_ceniku  # noqa: E402  (historie verzí ceníků, stejná složka)

BASE = "https://srovnavac.eru.gov.cz"
UA = {"User-Agent": "FFY-ceniky/1.1 (+https://b-place.org/FFY-tools/)", "Accept": "application/json"}
PAUZA = 0.5          # mezi dotazy na ceny
PAUZA_DETAIL = 0.35  # mezi dotazy na detail produktu
DETAIL_DNU = 3       # jak často obnovit detail (odkazy na PDF, typ zákazníka) u známého produktu
MAX_DETAILU = 400    # pojistka: nejvýš tolik detailů za běh (běžně ~270 produktů, ERÚ odpovídá v desítkách ms)
LIMIT_MIN = 20       # celkový časový limit běhu; detaily se po jeho vyčerpání přeskočí a uloží se, co je
TIMEOUT = 25         # s na jeden dotaz
START = time.monotonic()


def zbyva():
    return LIMIT_MIN * 60 - (time.monotonic() - START)

EL_DIST = {12: "CEZ", 13: "PRE", 17: "EGD"}
GAS_DIST = {4: "GN", 5: "EGD", 6: "PPD"}
SAZBY = {3922: "D01d", 3923: "D02d", 3924: "D25d", 3925: "D26d", 3926: "D27d",
         3927: "D35d", 3928: "D45d", 3929: "D56d", 3930: "D57d", 3931: "D61d"}
JEDNOTARIF = {"D01d", "D02d"}
# pásmo plynu -> spotřeba, kterou se dotazujeme (uprostřed pásma; ERÚ řadí hranici 15 MWh už do 15–25)
PASMA = {"0-1.89": 1, "1.89-7.56": 5, "7.56-15": 10, "15-25": 20, "25-45": 35, "45-63": 55}
JISTIC_3x25 = {"circuitBreakerBackupId": "3|20,00000|25,00000", "circuitBreakerCategory": -1,
               "circuitBreakerId": 13188, "circuitBreakerValue": 0}
BEZ_JISTICE = {"circuitBreakerBackupId": "", "circuitBreakerCategory": 0, "circuitBreakerId": 0, "circuitBreakerValue": 0}
DOKUMENTY = {"ceník": "cenik", "obchodní podmínky": "vop", "smlouv": "smlouva"}


def http(url, data=None, pokusy=3):
    for i in range(pokusy):
        t0 = time.monotonic()
        try:
            req = urllib.request.Request(url, data=data, headers={**UA, **({"Content-Type": "application/json"} if data else {})})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return r.geturl(), r.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            duvod = f"HTTP {e.code}"
            cekej = 20 if e.code in (429, 503) else 3 * (i + 1)
            ra = e.headers.get("Retry-After") if e.headers else None
            if ra and ra.isdigit():
                cekej = min(int(ra), 60)
            if e.code < 500 and e.code != 429:
                raise                      # 4xx kromě 429 nemá smysl opakovat
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            duvod, cekej = f"{type(e).__name__}: {getattr(e, 'reason', e)}", 3 * (i + 1)
        print(f"    ! {duvod} po {time.monotonic() - t0:.0f} s ({url.split('?')[0][-40:]}), pokus {i + 1}/{pokusy}", flush=True)
        if i == pokusy - 1 or zbyva() < cekej + 30:
            raise RuntimeError(duvod)
        time.sleep(cekej)


def http_bytes(url):
    """Stažení souboru (PDF ceníku) jako bajty, max. 15 MB."""
    req = urllib.request.Request(url, headers={"User-Agent": UA["User-Agent"]})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read(15 * 1024 * 1024)


def session_id():
    """Srovnávač při prvním otevření přesměruje na /calculator?session-id=…"""
    try:
        url, _ = http(BASE + "/")
        m = re.search(r"session-id=([a-z0-9]+)", url)
        if m:
            return m.group(1)
    except Exception as e:
        print(f"session: {e}", file=sys.stderr)
    return secrets.token_hex(13)


def produkty(sid, **kw):
    body = {"userSessionId": sid, "customerType": 1, "useUpcomingPrices": kw.pop("budouci", False),
            "comparePrice": {"productPriceListId": "", "supplierId": ""},
            "filter": {"productBonus": [], "productFixation": 0, "productSuppliers": []},
            "sorter": {"orderBy": [{"columnName": "ProductYearlyPayment", "sortType": 1}]},
            "pagination": {"page": 0, "pageSize": 1000}, **kw}
    _, txt = http(BASE + "/api/v1/products", json.dumps(body).encode())
    return json.loads(txt).get("productResponseList") or []


def detail(sid, pid):
    _, txt = http(f"{BASE}/api/v1/products/{urllib.parse.quote(pid)}?userSessionId={sid}")
    if not txt.strip():
        # HTTP 204: server vydá detail jen pro produkty z posledního vyhledávání v této session
        raise ValueError("prázdná odpověď (produkt není v posledním vyhledávání)")
    d = json.loads(txt)
    info = d.get("productTabInfo") or {}
    par = {}
    for g in info.get("parameterGroups") or []:
        for x in g.get("parameters") or []:
            if x.get("name"):
                par[x["name"].strip()] = str(x.get("value") or "").strip()
    docs = {}
    for doc in info.get("productDocuments") or []:
        nm = (doc.get("documentName") or "").lower()
        for k, v in DOKUMENTY.items():
            if k in nm and doc.get("documentUrl") and v not in docs:
                docs[v] = doc["documentUrl"]
    web = ""
    for x in (d.get("productTabSupplier") or {}).get("parameters") or []:
        if (x.get("name") or "").startswith("Webové"):
            web = str(x.get("value") or "")
    return {"dokumenty": docs, "zakaznici": par.get("Typ zákazníka", ""), "smlouva": par.get("Délka smlouvy", ""),
            "web": web, "detail_ze_dne": dt.date.today().isoformat()}


def slozky(p):
    """Vrátí {kód: jednotková cena} z rozpadu ceny (rámec FrameType 0 = souhrn)."""
    for fr in p.get("productPriceDetails") or []:
        if fr.get("FrameType") == 0:
            return {x["codename"]: x.get("unitPrice") for x in fr.get("FramePrices", [])}
    return {}


def fixace(p):
    m = re.search(r"\d+", p.get("productFixationInMonths") or "")
    return int(m.group()) if m else 0


def zaznam(tab, p):
    pid = p.get("productId") or f"{p['supplierName']}|{p['productName']}"
    return tab.setdefault(pid, {"id": pid, "dodavatel": p["supplierName"].strip(), "produkt": p["productName"].strip(),
                                "fixace_mes": fixace(p), "ceny": {}})


class Detaily:
    """Stahuje detail produktu (PDF, typ zákazníka) hned po vyhledávání, ve kterém se produkt objevil.
    Srovnávač totiž vrací detail jen pro produkty z posledního vyhledávání dané session."""
    POLE = ("dokumenty", "zakaznici", "smlouva", "web", "detail_ze_dne")

    def __init__(self, sid, stare, vse=False):
        self.sid, self.stare, self.vse = sid, stare, vse
        self.hranice = (dt.date.today() - dt.timedelta(days=DETAIL_DNU)).isoformat()
        self.hotovo, self.stazeno, self.chyby, self.odlozeno = {}, 0, 0, set()

    def po_vyhledavani(self, L):
        for p in L:
            pid = p.get("productId")
            if not pid or pid in self.hotovo:
                continue
            s = self.stare.get(pid)
            if s and not self.vse and (s.get("detail_ze_dne") or "") > self.hranice and s.get("dokumenty"):
                self.hotovo[pid] = {k: s.get(k) for k in self.POLE}
                continue
            if self.stazeno >= MAX_DETAILU or zbyva() < 180:
                self.odlozeno.add(pid)
                continue
            try:
                self.hotovo[pid] = detail(self.sid, pid); self.stazeno += 1
            except Exception as e:
                self.chyby += 1
                print(f"  detail {p.get('supplierName')} – {p.get('productName')}: {e}", file=sys.stderr)
            time.sleep(PAUZA_DETAIL)

    def doplnit(self, *tabulky):
        for tab in tabulky:
            for pid, r in tab.items():
                if pid in self.hotovo:
                    r.update(self.hotovo[pid])
                elif pid in self.stare:   # detail se nepodařil, necháme starý
                    r.update({k: self.stare[pid].get(k) for k in self.POLE})
        print(f"Detaily produktů: {self.stazeno} staženo, {len(self.hotovo) - self.stazeno} z minula, {self.chyby} chyb, "
              f"{len(self.odlozeno - set(self.hotovo))} odloženo na příští běh (limit {MAX_DETAILU} za běh)", flush=True)


# Skupiny zákazníků (customerType) a druhy produktů (productType) podle číselníku srovnávače:
#   1 HomeElectricity, 2 CompanyElectricity, 3 HomeSpotElectricity, 10 CompanySpotElectricity,
#   6 HomeGas, 7 CompanyGas, 8 HomeSpotGas, 11 CompanySpotGas
SEGMENTY = {
    "domácnost": {"customerType": 1, "el_typy": {1: False, 3: True}, "gas_typy": {6: False, 8: True},
                  "sazby": SAZBY, "pasma": PASMA},
    "firma": {"customerType": 2, "el_typy": {2: False, 10: True}, "gas_typy": {7: False, 11: True},
              "sazby": {3911: "C01d", 3912: "C02d", 3913: "C03d", 3914: "C25d", 3915: "C26d", 3916: "C27d",
                        3917: "C35d", 3918: "C45d", 3919: "C46d", 3920: "C56d", 3921: "C62d"},
              "pasma": {**PASMA, "63-630": 200}},
}
JEDNOTARIF = JEDNOTARIF | {"C01d", "C02d", "C03d", "C62d"}
_jistice = {}


def jistic(sid, tid, ct, did):
    """ID jističe 3x25 A pro danou sazbu (u sazeb C má jistič jiné ID než u D)."""
    k = (tid, ct)
    if k not in _jistice:
        _jistice[k] = JISTIC_3x25
        try:
            _, t = http(f"{BASE}/api/v1/electricity/circuit-breakers?tariffId={tid}&customerType={ct}&distributorId={did}")
            for c in json.loads(t):
                if re.search(r"nad 3x20 A a do 3x25", c.get("circuitBreakerDisplayText") or ""):
                    _jistice[k] = {"circuitBreakerBackupId": c.get("circuitBreakerBackupId") or "", "circuitBreakerCategory": -1,
                                   "circuitBreakerId": c["circuitBreakerId"], "circuitBreakerValue": 0}
                    break
        except Exception as e:
            print(f"    jistič pro sazbu {tid}: {e}, použiji výchozí", flush=True)
    return _jistice[k]


def ceny_el(c, sn, dyn):
    """[stálý plat, VT, NT, přirážka]; u dynamických je VT = NT = odhad ERÚ (průměrný spot za 12 měs. + přirážka)."""
    if dyn:
        v = c.get("ETP-S")
        return [c.get("ETS-01"), v, None if sn in JEDNOTARIF else v, c.get("ETV-01S")]
    return [c.get("ETS-01"), c.get("ETP-01"), None if sn in JEDNOTARIF else c.get("ETP-02")]


def ceny_gas(c, dyn):
    """[stálý plat, cena za MWh, přirážka]; u dynamických je cena odhad ERÚ (průměrný spot + přirážka)."""
    if dyn:
        return [c.get("PTS-01"), c.get("PTP-01S"), c.get("PTV-01S")]
    return [c.get("PTS-01"), c.get("PTP-01")]


def stahni(sid, budouci=False, det=None):
    """Vrátí (el, gas, nepovedene) – nepovedene je seznam (komodita, distributor, tarif, dynamicky, segment), kde dotaz selhal."""
    el, gas, nepovedene = {}, {}, []
    for seg, S in SEGMENTY.items():
        ct = S["customerType"]
        for pt, dyn in S["el_typy"].items():
            druh = f"{seg} {'dynamické' if dyn else 'standardní'}"
            for did, dn in EL_DIST.items():
                for tid, sn in S["sazby"].items():
                    t0 = time.monotonic()
                    try:
                        L = produkty(sid, budouci=budouci, customerType=ct, powerType=1, productType=pt, distributorId=did, tariffId=tid,
                                     tariffName=sn[0] + " " + sn[1:], circuitBreaker=jistic(sid, tid, ct, did),
                                     consumption={"consumptionPattern": [], "deliveryDiagramId": 0, "deliveryDiagramRegion": "",
                                                  "high": 2, "low": 0 if sn in JEDNOTARIF else 2, "unit": 1})
                    except Exception as e:
                        print(f"  elektřina {druh} {dn} {sn}: CHYBA {e}", flush=True)
                        nepovedene.append(("elektrina", dn, sn, dyn, seg)); continue
                    for p in L:
                        r = zaznam(el, p)
                        r["dynamicky"] = dyn
                        r["segment"] = seg
                        r["ceny"].setdefault(dn, {})[sn] = ceny_el(slozky(p), sn, dyn)
                    if det:
                        det.po_vyhledavani(L)
                    print(f"  elektřina {druh} {dn} {sn}: {len(L)} produktů ({time.monotonic() - t0:.1f} s, celkem {time.monotonic() - START:.0f} s)", flush=True)
                    time.sleep(PAUZA)
        for pt, dyn in S["gas_typy"].items():
            druh = f"{seg} {'dynamické' if dyn else 'standardní'}"
            for did, dn in GAS_DIST.items():
                for pasmo, mwh in S["pasma"].items():
                    t0 = time.monotonic()
                    try:
                        L = produkty(sid, budouci=budouci, customerType=ct, powerType=2, productType=pt, distributorId=did, circuitBreaker=BEZ_JISTICE,
                                     consumption={"consumptionPattern": [], "deliveryDiagramId": 0, "deliveryDiagramRegion": "",
                                                  "high": mwh, "low": 0, "unit": 1})
                    except Exception as e:
                        print(f"  plyn {druh} {dn} {pasmo}: CHYBA {e}", flush=True)
                        nepovedene.append(("plyn", dn, pasmo, dyn, seg)); continue
                    for p in L:
                        r = zaznam(gas, p)
                        r["dynamicky"] = dyn
                        r["segment"] = seg
                        r["ceny"].setdefault(dn, {})[pasmo] = ceny_gas(slozky(p), dyn)
                    if det:
                        det.po_vyhledavani(L)
                    print(f"  plyn {druh} {dn} {pasmo}: {len(L)} produktů ({time.monotonic() - t0:.1f} s, celkem {time.monotonic() - START:.0f} s)", flush=True)
                    time.sleep(PAUZA)
    return el, gas, nepovedene


def rozdil(stare, nove, komodita, datum):
    zmeny = []
    zaklad = lambda r: {"dodavatel": r["dodavatel"], "produkt": r["produkt"], "fixace_mes": r.get("fixace_mes"), "segment": r.get("segment") or "domácnost"}
    for k in nove.keys() - stare.keys():
        zmeny.append({"datum": datum, "komodita": komodita, "typ": "nový", **zaklad(nove[k])})
    for k in stare.keys() - nove.keys():
        zmeny.append({"datum": datum, "komodita": komodita, "typ": "zrušen", **zaklad(stare[k])})
    for k in nove.keys() & stare.keys():
        a, b = stare[k]["ceny"], nove[k]["ceny"]
        detail = []
        # u dynamických se odhad podle spotu i přirážka (často % ze spotu) mění s trhem – za změnu bereme jen stálý plat
        cmp = (lambda c: None if c is None else c[0]) if nove[k].get("dynamicky") else (lambda c: c)
        for d in b:
            for s in b[d]:
                if cmp(a.get(d, {}).get(s)) != cmp(b[d][s]):
                    detail.append({"distributor": d, "tarif": s, "z": a.get(d, {}).get(s), "na": b[d][s]})
        if detail:
            zmeny.append({"datum": datum, "komodita": komodita, "typ": "změna ceny", **zaklad(nove[k]), "detail": detail[:40]})
        ca, cb = (stare[k].get("dokumenty") or {}).get("cenik"), (nove[k].get("dokumenty") or {}).get("cenik")
        if ca and cb and ca != cb:
            zmeny.append({"datum": datum, "komodita": komodita, "typ": "nový ceník", **zaklad(nove[k]), "cenik": cb})
    return zmeny



# ---------- Dodavatelé mimo ERÚ (ručně vedený seznam stránek s ceníky) ----------
class _Odkazy(__import__("html.parser").parser.HTMLParser):
    def __init__(self):
        super().__init__(); self.out, self._a = [], None
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self._a = [dict(attrs).get("href") or "", ""]
    def handle_data(self, data):
        if self._a is not None:
            self._a[1] += data
    def handle_endtag(self, tag):
        if tag == "a" and self._a is not None:
            self.out.append((self._a[0], " ".join(self._a[1].split()))); self._a = None


def nazev_souboru(url):
    n = urllib.parse.unquote(url.split("?")[0].rstrip("/").split("/")[-1])
    n = re.sub(r"\.(pdf|zip|xlsx?|docx?)$", "", n, flags=re.I)
    n = re.sub(r"\.(?=[0-9a-f]*[a-f])[0-9a-f]{8}$", "", n)   # hash ve jménu souboru (např. .475e5650), ne datum 01012026
    return re.sub(r"[-_]+", " ", n).strip()


def segment_souboru(t):
    """Odhad z názvu souboru: 'domácnost', 'firma', nebo '' (obojí / nepoznáno)."""
    t = re.sub(r"[_\-.%20]+", " ", t.lower())
    f = re.search(r"podnikatel|\bmop\b|company|firm[ay]?\b|business|maloodb", t)
    d = re.search(r"dom[aá]cnost|\bdom\b|\bhome\b|\bmoo\b", t)
    return "" if bool(f) == bool(d) else ("firma" if f else "domácnost")


def rok_souboru(t):
    """Nejvyšší rok (2010–2039) v názvu souboru nebo textu odkazu; zachytí i 01012026 nebo 2026-04-01."""
    r = [int(m) for m in re.findall(r"(20[1-3]\d)", t)]
    return max(r) if r else None


def mimo_eru(seznam_path, stare):
    """Projde stránky s ceníky dodavatelů mimo ERÚ.
    soubory = aktuální ceníky, archiv = starší ceníky ze stejné stránky + ceníky, které ze stránky zmizely.
    Je-li u dodavatele "archiv": true, aktuální jsou jen soubory s nejnovějším rokem v názvu (soubory bez roku také)."""
    cfg = load(seznam_path, {}).get("dodavatele", [])
    stare = {x["dodavatel"]: x for x in stare or []}
    dnes = dt.date.today().isoformat()
    out = []
    for d in cfg:
        r = {k: d.get(k) for k in ("dodavatel", "web", "stranka", "komodity", "pozn")}
        s = stare.get(d["dodavatel"]) or {}
        try:
            _, html = http(d["stranka"])
            p = _Odkazy(); p.feed(html)
            fil = re.compile(d.get("filtr") or "cenik", re.I)
            vyn = re.compile(d["vynechat"], re.I) if d.get("vynechat") else None
            vse, videno = [], set()
            for href, text in p.out:
                if not href or href.startswith(("mailto:", "tel:", "#", "javascript:")):
                    continue
                url = urllib.parse.urljoin(d["stranka"], href)
                if not re.search(r"\.(pdf|zip|xlsx?|docx?)(\?|$)", url, re.I) or url in videno:
                    continue
                kde = urllib.parse.unquote(url) + " " + text
                if not fil.search(kde) or (vyn and vyn.search(kde)):
                    continue
                videno.add(url)
                vse.append({"nazev": nazev_souboru(url), "text": text[:120], "url": url, "segment": segment_souboru(kde),
                            "rok": rok_souboru(urllib.parse.unquote(url).split("/")[-1] + " " + text) or rok_souboru(urllib.parse.unquote(url))})
            nej = max([f["rok"] for f in vse if f["rok"]] or [0])
            if d.get("archiv") and nej:
                soubory = [f for f in vse if not f["rok"] or f["rok"] >= nej]
                archiv = [f for f in vse if f["rok"] and f["rok"] < nej]
            else:
                soubory, archiv = vse, []
            # ceníky, které ze stránky zmizely, si necháme v archivu
            ted = {f["url"] for f in vse}
            for f in (s.get("soubory") or []) + (s.get("archiv") or []):
                if f["url"] not in ted:
                    archiv.append({**f, "odstraneno": f.get("odstraneno") or dnes})
            r["soubory"] = soubory
            r["archiv"] = sorted(archiv, key=lambda f: (-(f.get("rok") or 0), f["nazev"]))[:600]
            r["zkontrolovano"] = dnes
            print(f"  mimo ERÚ {d['dodavatel']}: {len(soubory)} aktuálních, {len(r['archiv'])} v archivu", flush=True)
        except Exception as e:
            r["soubory"] = s.get("soubory", [])
            r["archiv"] = s.get("archiv", [])
            r["zkontrolovano"] = s.get("zkontrolovano")
            r["chyba"] = str(e)[:200]
            print(f"  mimo ERÚ {d['dodavatel']}: CHYBA {e}", flush=True)
        time.sleep(0.3)
        out.append(r)
    return out


def rozdil_mimo(stare, nove, datum):
    zmeny, st = [], {x["dodavatel"]: {f["url"] for f in (x.get("soubory") or []) + (x.get("archiv") or [])} for x in stare or []}
    for x in nove:
        if x["dodavatel"] not in st or x.get("chyba"):
            continue
        for f in x.get("soubory") or []:
            if f["url"] not in st[x["dodavatel"]]:
                zmeny.append({"datum": datum, "komodita": "mimo ERÚ", "typ": "nový ceník", "dodavatel": x["dodavatel"],
                              "produkt": f["nazev"], "cenik": f["url"], "segment": f.get("segment") or ""})
    return zmeny


def load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save(path, obj):
    with open(path + ".tmp", "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(path + ".tmp", path)


def podle_id(seznam):
    return {x.get("id") or f"{x['dodavatel']}|{x['produkt']}": x for x in seznam or []}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slozka", default="FFY-tools/data")
    ap.add_argument("--vsechny-detaily", action="store_true", help="stáhnout detail všech produktů znovu")
    a = ap.parse_args()
    os.makedirs(a.slozka, exist_ok=True)
    dnes = dt.date.today().isoformat()
    sid = session_id()
    p_akt = os.path.join(a.slozka, "ceniky-eru.json")
    p_zm = os.path.join(a.slozka, "ceniky-zmeny.json")
    stare = load(p_akt, {})
    s_el, s_gas = podle_id(stare.get("elektrina")), podle_id(stare.get("plyn"))

    print("Elektřina a plyn, aktuální ceny", flush=True)
    det = Detaily(sid, {**s_el, **s_gas}, a.vsechny_detaily)
    el, gas, nepovedene = stahni(sid, det=det)
    celkem_dotazu = sum(len(S["el_typy"]) * len(EL_DIST) * len(S["sazby"]) + len(S["gas_typy"]) * len(GAS_DIST) * len(S["pasma"])
                        for S in SEGMENTY.values())
    if len(nepovedene) > celkem_dotazu // 2 or len(el) < 20 or len(gas) < 20:
        sys.exit(f"Srovnávač ERÚ neodpovídá (nepovedlo se {len(nepovedene)} dotazů, elektřina {len(el)}, plyn {len(gas)} produktů), "
                 "nic neukládám, data zůstávají z minula.")
    if nepovedene:
        # kde dotaz selhal, ponecháme ceny z minula
        for kom, dn, tarif, dyn, seg in nepovedene:
            nove, stara = (el, s_el) if kom == "elektrina" else (gas, s_gas)
            for pid, r in stara.items():
                if bool(r.get("dynamicky")) != dyn or (r.get("segment") or "domácnost") != seg:
                    continue
                c = (r.get("ceny") or {}).get(dn, {}).get(tarif)
                if c is not None and pid in nove:
                    nove[pid]["ceny"].setdefault(dn, {})[tarif] = c
        print(f"Nepovedené dotazy ({len(nepovedene)}), ponechány ceny z minula: " + ", ".join(f"{a} {b} {c}{' dyn.' if d else ''} ({e})" for a, b, c, d, e in nepovedene), flush=True)
    det.doplnit(el, gas)

    # srovnávač umí i „budoucí ceny“ (např. po vydání regulovaných cen na příští rok)
    budouci = None
    try:
        _, t1 = http(BASE + "/api/v1/products/price-status?powerType=1")
        _, t2 = http(BASE + "/api/v1/products/price-status?powerType=2")
        if (json.loads(t1).get("hasUpcomingPrices") or json.loads(t2).get("hasUpcomingPrices")) and zbyva() > 300:
            print("Srovnávač má budoucí ceny, stahuji i ty", flush=True)
            bel, bgas, _ = stahni(sid, budouci=True)
            budouci = {"elektrina": list(bel.values()), "plyn": list(bgas.values())}
    except Exception as e:
        print(f"budoucí ceny: {e}", file=sys.stderr)

    print("Dodavatelé mimo ERÚ", flush=True)
    mimo = mimo_eru(os.path.join(a.slozka, "dodavatele-mimo-eru.json"), stare.get("mimo_eru"))

    zmeny = load(p_zm, [])
    pred = len(zmeny)
    if stare.get("mimo_eru"):
        zmeny += rozdil_mimo(stare.get("mimo_eru"), mimo, dnes)
    if stare:
        # starší formát (klíč dodavatel|produkt bez id) neporovnáváme, jen založíme historii
        if all(x.get("id") for x in stare.get("elektrina", [])[:5]):
            zmeny += rozdil(s_el, el, "elektřina", dnes)
            zmeny += rozdil(s_gas, gas, "plyn", dnes)

    # historie verzí ceníků (od–do), včetně platnosti přečtené z PDF
    p_ver = os.path.join(a.slozka, "ceniky-verze.json")
    V = verze_ceniku.nacti(p_ver)
    urls = [(x.get("dokumenty") or {}).get("cenik") for x in list(el.values()) + list(gas.values())]
    urls += [f["url"] for m in mimo for f in (m.get("soubory") or [])]
    urls += [f["url"] for m in mimo for f in (m.get("archiv") or [])]
    n_pdf = verze_ceniku.precti_pdf(V, urls, http_bytes, limit=200, casovy_limit=lambda: zbyva() < 150)
    print(f"PDF ceníky: přečteno {n_pdf} nových, celkem v paměti {len(V['pdf'])}", flush=True)
    nep_kom = {k for k, *_ in nepovedene}
    verze_ceniku.aktualizuj_eru(V, list(el.values()), "elektřina", dnes, uzavirat="elektrina" not in nep_kom)
    verze_ceniku.aktualizuj_eru(V, list(gas.values()), "plyn", dnes, uzavirat="plyn" not in nep_kom)
    verze_ceniku.aktualizuj_mimo(V, mimo, dnes)
    verze_ceniku.zpresnit_z_pdf(V, dnes)

    srt = lambda t: sorted(t.values(), key=lambda x: (x["dodavatel"].lower(), x["produkt"].lower(), x.get("fixace_mes") or 0))
    out = {
        "verze": 2,
        "zdroj": "Srovnávač ERÚ, srovnavac.eru.gov.cz – domácnosti i podnikatelský maloodběr, standardní a dynamické produkty",
        "segmenty": "segment: 'domácnost' (sazby D, plyn do 63 MWh) nebo 'firma' (podnikatelský maloodběr: sazby C, plyn do 630 MWh, pásmo 63-630).",
        "stazeno": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "dph": 0.21,
        "jednotky": "Kč BEZ DPH; plyn [stálý plat Kč/měs, cena Kč/MWh(, přirážka)], elektřina [stálý plat Kč/měs, VT Kč/MWh, NT Kč/MWh(, přirážka)]",
        "dynamicke": "U dynamických produktů (dynamicky: true) je cena za MWh odhad ERÚ: průměrná spotová cena za posledních 12 měsíců podle typového diagramu + přirážka obchodníka (poslední položka).",
        "pozn": "Elektřina dotazována s jističem 3x25 A; obchodní ceny na jističi obvykle nezávisí.",
        "elektrina": srt(el),
        "plyn": srt(gas),
    }
    if mimo:
        out["mimo_eru"] = mimo
    if budouci:
        out["budouci"] = budouci
    save(p_akt, out)
    save(p_zm, zmeny[-5000:])
    verze_ceniku.uloz(p_ver, V)
    bez_ceniku = sum(1 for x in out["elektrina"] + out["plyn"] if not (x.get("dokumenty") or {}).get("cenik"))
    print(f"Hotovo: elektřina {len(el)} produktů, plyn {len(gas)} produktů, "
          f"{len({x['dodavatel'] for x in out['elektrina'] + out['plyn']})} dodavatelů, bez odkazu na ceník {bez_ceniku}, "
          f"změn od minula {len(zmeny) - pred}")


if __name__ == "__main__":
    main()
