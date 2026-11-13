#!/usr/bin/env python3
"""
Stáhne obchodní ceny všech dodavatelů ze srovnávače ERÚ (srovnavac.eru.gov.cz) pro domácnosti.

  elektřina – distributoři ČEZ, PRE, EG.D × sazby D01d–D61d
  plyn      – distributoři GasNet, EG.D (Gas Distribution), PPD × 6 pásem spotřeby do 63 MWh

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

BASE = "https://srovnavac.eru.gov.cz"
UA = {"User-Agent": "FFY-ceniky/1.1 (+https://b-place.org/FFY-tools/)", "Accept": "application/json"}
PAUZA = 0.8          # mezi dotazy na ceny
PAUZA_DETAIL = 0.35  # mezi dotazy na detail produktu
DETAIL_DNU = 3       # jak často obnovit detail (odkazy na PDF, typ zákazníka) u známého produktu
MAX_DETAILU = 400    # pojistka: nejvýš tolik detailů za běh (běžně ~270 produktů, ERÚ odpovídá v desítkách ms)
LIMIT_MIN = 12       # celkový časový limit běhu; detaily se po jeho vyčerpání přeskočí a uloží se, co je
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


def stahni(sid, budouci=False, det=None):
    """Vrátí (el, gas, nepovedene) – nepovedene je seznam (komodita, distributor, tarif), kde dotaz selhal."""
    el, gas, nepovedene = {}, {}, []
    for did, dn in EL_DIST.items():
        for tid, sn in SAZBY.items():
            t0 = time.monotonic()
            try:
                L = produkty(sid, budouci=budouci, powerType=1, productType=1, distributorId=did, tariffId=tid,
                             tariffName=sn.replace("D", "D "), circuitBreaker=JISTIC_3x25,
                             consumption={"consumptionPattern": [], "deliveryDiagramId": 0, "deliveryDiagramRegion": "",
                                          "high": 2, "low": 0 if sn in JEDNOTARIF else 2, "unit": 1})
            except Exception as e:
                print(f"  elektřina {dn} {sn}: CHYBA {e}", flush=True)
                nepovedene.append(("elektrina", dn, sn)); continue
            for p in L:
                c = slozky(p)
                zaznam(el, p)["ceny"].setdefault(dn, {})[sn] = [c.get("ETS-01"), c.get("ETP-01"),
                                                                 None if sn in JEDNOTARIF else c.get("ETP-02")]
            if det:
                det.po_vyhledavani(L)
            print(f"  elektřina {dn} {sn}: {len(L)} produktů ({time.monotonic() - t0:.1f} s, celkem {time.monotonic() - START:.0f} s)", flush=True)
            time.sleep(PAUZA)
    for did, dn in GAS_DIST.items():
        for pasmo, mwh in PASMA.items():
            t0 = time.monotonic()
            try:
                L = produkty(sid, budouci=budouci, powerType=2, productType=6, distributorId=did, circuitBreaker=BEZ_JISTICE,
                             consumption={"consumptionPattern": [], "deliveryDiagramId": 0, "deliveryDiagramRegion": "",
                                          "high": mwh, "low": 0, "unit": 1})
            except Exception as e:
                print(f"  plyn {dn} {pasmo}: CHYBA {e}", flush=True)
                nepovedene.append(("plyn", dn, pasmo)); continue
            for p in L:
                c = slozky(p)
                zaznam(gas, p)["ceny"].setdefault(dn, {})[pasmo] = [c.get("PTS-01"), c.get("PTP-01")]
            if det:
                det.po_vyhledavani(L)
            print(f"  plyn {dn} {pasmo}: {len(L)} produktů ({time.monotonic() - t0:.1f} s, celkem {time.monotonic() - START:.0f} s)", flush=True)
            time.sleep(PAUZA)
    return el, gas, nepovedene


def rozdil(stare, nove, komodita, datum):
    zmeny = []
    zaklad = lambda r: {"dodavatel": r["dodavatel"], "produkt": r["produkt"], "fixace_mes": r.get("fixace_mes")}
    for k in nove.keys() - stare.keys():
        zmeny.append({"datum": datum, "komodita": komodita, "typ": "nový", **zaklad(nove[k])})
    for k in stare.keys() - nove.keys():
        zmeny.append({"datum": datum, "komodita": komodita, "typ": "zrušen", **zaklad(stare[k])})
    for k in nove.keys() & stare.keys():
        a, b = stare[k]["ceny"], nove[k]["ceny"]
        detail = []
        for d in b:
            for s in b[d]:
                if a.get(d, {}).get(s) != b[d][s]:
                    detail.append({"distributor": d, "tarif": s, "z": a.get(d, {}).get(s), "na": b[d][s]})
        if detail:
            zmeny.append({"datum": datum, "komodita": komodita, "typ": "změna ceny", **zaklad(nove[k]), "detail": detail[:40]})
        ca, cb = (stare[k].get("dokumenty") or {}).get("cenik"), (nove[k].get("dokumenty") or {}).get("cenik")
        if ca and cb and ca != cb:
            zmeny.append({"datum": datum, "komodita": komodita, "typ": "nový ceník", **zaklad(nove[k]), "cenik": cb})
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
    if len(nepovedene) > (len(EL_DIST) * len(SAZBY) + len(GAS_DIST) * len(PASMA)) // 2 or len(el) < 20 or len(gas) < 20:
        sys.exit(f"Srovnávač ERÚ neodpovídá (nepovedlo se {len(nepovedene)} dotazů, elektřina {len(el)}, plyn {len(gas)} produktů), "
                 "nic neukládám, data zůstávají z minula.")
    if nepovedene:
        # kde dotaz selhal, ponecháme ceny z minula
        for kom, dn, tarif in nepovedene:
            nove, stara = (el, s_el) if kom == "elektrina" else (gas, s_gas)
            for pid, r in stara.items():
                c = (r.get("ceny") or {}).get(dn, {}).get(tarif)
                if c is not None and pid in nove:
                    nove[pid]["ceny"].setdefault(dn, {})[tarif] = c
        print(f"Nepovedené dotazy ({len(nepovedene)}), ponechány ceny z minula: " + ", ".join(f"{a} {b} {c}" for a, b, c in nepovedene), flush=True)
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

    zmeny = load(p_zm, [])
    pred = len(zmeny)
    if stare:
        # starší formát (klíč dodavatel|produkt bez id) neporovnáváme, jen založíme historii
        if all(x.get("id") for x in stare.get("elektrina", [])[:5]):
            zmeny += rozdil(s_el, el, "elektřina", dnes)
            zmeny += rozdil(s_gas, gas, "plyn", dnes)

    srt = lambda t: sorted(t.values(), key=lambda x: (x["dodavatel"].lower(), x["produkt"].lower(), x.get("fixace_mes") or 0))
    out = {
        "verze": 2,
        "zdroj": "Srovnávač ERÚ, srovnavac.eru.gov.cz – domácnosti, standardní produkty",
        "stazeno": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "dph": 0.21,
        "jednotky": "Kč BEZ DPH; plyn [stálý plat Kč/měs, cena Kč/MWh], elektřina [stálý plat Kč/měs, VT Kč/MWh, NT Kč/MWh]",
        "pozn": "Elektřina dotazována s jističem 3x25 A; obchodní ceny na jističi obvykle nezávisí.",
        "elektrina": srt(el),
        "plyn": srt(gas),
    }
    if budouci:
        out["budouci"] = budouci
    save(p_akt, out)
    save(p_zm, zmeny[-5000:])
    bez_ceniku = sum(1 for x in out["elektrina"] + out["plyn"] if not (x.get("dokumenty") or {}).get("cenik"))
    print(f"Hotovo: elektřina {len(el)} produktů, plyn {len(gas)} produktů, "
          f"{len({x['dodavatel'] for x in out['elektrina'] + out['plyn']})} dodavatelů, bez odkazu na ceník {bez_ceniku}, "
          f"změn od minula {len(zmeny) - pred}")


if __name__ == "__main__":
    main()
