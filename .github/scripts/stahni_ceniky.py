#!/usr/bin/env python3
"""
Stáhne obchodní ceny všech dodavatelů ze srovnávače ERÚ (srovnavac.eru.gov.cz) pro domácnosti.

  elektřina – distributoři ČEZ, PRE, EG.D × sazby D01d–D61d
  plyn      – distributoři GasNet, EG.D (Gas Distribution), PPD × 6 pásem spotřeby do 63 MWh

Ukládá jen obchodní (tržní) složku: stálý měsíční plat a cenu za MWh (u elektřiny VT a NT).
Regulované ceny bere kalkulačka ze souboru regulovane-ceny-RRRR.json, takže se dají
kdykoli přepočítat pro jinou spotřebu nebo jistič.

Výstup:
  ceniky-eru.json      – aktuální stav
  ceniky-zmeny.json    – historie změn (nový produkt, zrušený produkt, změna ceny)

Srovnávač nemá veřejné API ani export; skript volá stejné JSON rozhraní, které používá jeho webová stránka.
Je to ~50 dotazů s pauzou, celé stažení trvá zhruba minutu.

Spuštění:  python3 stahni_ceniky.py [--slozka FFY-tools/data]
Jen standardní knihovna Pythonu.
"""
import argparse, datetime as dt, json, os, re, secrets, sys, time, urllib.request, urllib.error

BASE = "https://srovnavac.eru.gov.cz"
UA = {"User-Agent": "FFY-ceniky/1.0 (+https://b-place.org/FFY-tools/)", "Accept": "application/json"}
PAUZA = 0.8

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


def http(url, data=None, pokusy=3):
    for i in range(pokusy):
        try:
            req = urllib.request.Request(url, data=data, headers={**UA, **({"Content-Type": "application/json"} if data else {})})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.geturl(), r.read().decode("utf-8")
        except (urllib.error.URLError, TimeoutError):
            if i == pokusy - 1:
                raise
            time.sleep(3 * (i + 1))


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


def slozky(p):
    """Vrátí {kód: jednotková cena} z rozpadu ceny (rámec FrameType 0 = souhrn)."""
    for fr in p.get("productPriceDetails") or []:
        if fr.get("FrameType") == 0:
            return {x["codename"]: x.get("unitPrice") for x in fr.get("FramePrices", [])}
    return {}


def fixace(p):
    m = re.search(r"\d+", p.get("productFixationInMonths") or "")
    return int(m.group()) if m else 0


def stahni(sid, budouci=False):
    el, gas = {}, {}
    for did, dn in EL_DIST.items():
        for tid, sn in SAZBY.items():
            L = produkty(sid, budouci=budouci, powerType=1, productType=1, distributorId=did, tariffId=tid,
                         tariffName=sn.replace("D", "D "), circuitBreaker=JISTIC_3x25,
                         consumption={"consumptionPattern": [], "deliveryDiagramId": 0, "deliveryDiagramRegion": "",
                                      "high": 2, "low": 0 if sn in JEDNOTARIF else 2, "unit": 1})
            for p in L:
                c = slozky(p)
                k = f"{p['supplierName'].strip()}|{p['productName'].strip()}"
                r = el.setdefault(k, {"dodavatel": p["supplierName"].strip(), "produkt": p["productName"].strip(),
                                      "fixace_mes": fixace(p), "id": p.get("productId"), "ceny": {}})
                r["ceny"].setdefault(dn, {})[sn] = [c.get("ETS-01"), c.get("ETP-01"),
                                                     None if sn in JEDNOTARIF else c.get("ETP-02")]
            print(f"  elektřina {dn} {sn}: {len(L)}", flush=True)
            time.sleep(PAUZA)
    for did, dn in GAS_DIST.items():
        for pasmo, mwh in PASMA.items():
            L = produkty(sid, budouci=budouci, powerType=2, productType=6, distributorId=did, circuitBreaker=BEZ_JISTICE,
                         consumption={"consumptionPattern": [], "deliveryDiagramId": 0, "deliveryDiagramRegion": "",
                                      "high": mwh, "low": 0, "unit": 1})
            for p in L:
                c = slozky(p)
                k = f"{p['supplierName'].strip()}|{p['productName'].strip()}"
                r = gas.setdefault(k, {"dodavatel": p["supplierName"].strip(), "produkt": p["productName"].strip(),
                                       "fixace_mes": fixace(p), "id": p.get("productId"), "ceny": {}})
                r["ceny"].setdefault(dn, {})[pasmo] = [c.get("PTS-01"), c.get("PTP-01")]
            print(f"  plyn {dn} {pasmo}: {len(L)}", flush=True)
            time.sleep(PAUZA)
    return el, gas


def rozdil(stare, nove, komodita, datum):
    zmeny = []
    for k in nove.keys() - stare.keys():
        zmeny.append({"datum": datum, "komodita": komodita, "typ": "nový", "dodavatel": nove[k]["dodavatel"], "produkt": nove[k]["produkt"]})
    for k in stare.keys() - nove.keys():
        zmeny.append({"datum": datum, "komodita": komodita, "typ": "zrušen", "dodavatel": stare[k]["dodavatel"], "produkt": stare[k]["produkt"]})
    for k in nove.keys() & stare.keys():
        a, b = stare[k]["ceny"], nove[k]["ceny"]
        detail = []
        for d in b:
            for s in b[d]:
                if a.get(d, {}).get(s) != b[d][s]:
                    detail.append({"distributor": d, "tarif": s, "z": a.get(d, {}).get(s), "na": b[d][s]})
        if detail:
            zmeny.append({"datum": datum, "komodita": komodita, "typ": "změna ceny", "dodavatel": nove[k]["dodavatel"],
                          "produkt": nove[k]["produkt"], "detail": detail[:40]})
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slozka", default="FFY-tools/data")
    a = ap.parse_args()
    os.makedirs(a.slozka, exist_ok=True)
    dnes = dt.date.today().isoformat()
    sid = session_id()

    print("Elektřina a plyn, aktuální ceny", flush=True)
    el, gas = stahni(sid)
    if len(el) < 20 or len(gas) < 20:
        sys.exit(f"Podezřele málo produktů (elektřina {len(el)}, plyn {len(gas)}), nic neukládám.")

    # srovnávač umí i „budoucí ceny“ (např. po vydání regulovaných cen na příští rok)
    budouci = None
    try:
        _, t1 = http(BASE + "/api/v1/products/price-status?powerType=1")
        _, t2 = http(BASE + "/api/v1/products/price-status?powerType=2")
        if json.loads(t1).get("hasUpcomingPrices") or json.loads(t2).get("hasUpcomingPrices"):
            print("Srovnávač má budoucí ceny, stahuji i ty", flush=True)
            bel, bgas = stahni(sid, budouci=True)
            budouci = {"elektrina": list(bel.values()), "plyn": list(bgas.values())}
    except Exception as e:
        print(f"budoucí ceny: {e}", file=sys.stderr)

    p_akt = os.path.join(a.slozka, "ceniky-eru.json")
    p_zm = os.path.join(a.slozka, "ceniky-zmeny.json")
    stare = load(p_akt, {})
    zmeny = load(p_zm, [])
    if stare:
        zmeny += rozdil({f"{x['dodavatel']}|{x['produkt']}": x for x in stare.get("elektrina", [])}, el, "elektřina", dnes)
        zmeny += rozdil({f"{x['dodavatel']}|{x['produkt']}": x for x in stare.get("plyn", [])}, gas, "plyn", dnes)

    out = {
        "zdroj": "Srovnávač ERÚ, srovnavac.eru.gov.cz – domácnosti, standardní produkty",
        "stazeno": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "jednotky": "Kč bez DPH; [stálý plat Kč/měs, cena Kč/MWh] u plynu, [stálý plat Kč/měs, VT Kč/MWh, NT Kč/MWh] u elektřiny",
        "pozn": "Elektřina dotazována s jističem 3x25 A; obchodní ceny na jističi obvykle nezávisí.",
        "elektrina": sorted(el.values(), key=lambda x: (x["dodavatel"], x["produkt"])),
        "plyn": sorted(gas.values(), key=lambda x: (x["dodavatel"], x["produkt"])),
    }
    if budouci:
        out["budouci"] = budouci
    pred = len(load(p_zm, []))
    save(p_akt, out)
    save(p_zm, zmeny[-5000:])
    print(f"Hotovo: elektřina {len(el)} produktů, plyn {len(gas)} produktů, "
          f"{len({x['dodavatel'] for x in out['elektrina'] + out['plyn']})} dodavatelů, změn od minula {len(zmeny) - pred}")


if __name__ == "__main__":
    main()
