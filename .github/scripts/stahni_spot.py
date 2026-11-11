#!/usr/bin/env python3
"""
Stáhne spotové ceny z OTE a kurz EUR/CZK z ČNB do JSON souborů pro nástroj „Spotové ceny“.

  elektřina – denní trh OTE, cena za každou hodinu (do 30. 9. 2025) nebo čtvrthodinu (od 1. 10. 2025)
  plyn      – vnitrodenní trh OTE, denní index (EUR/MWh)
  kurz      – denní kurz EUR/CZK z ČNB

Stahuje jen to, co ještě chybí (plus posledních pár dní pro jistotu), takže denní běh trvá pár vteřin.
První spuštění stáhne celé období (výchozí 2 roky) a trvá zhruba 5–10 minut.

Spuštění:   python3 stahni_spot.py [--dny 730] [--slozka FFY-tools/data]
Jen standardní knihovna Pythonu, nic se neinstaluje.
"""
import argparse, datetime as dt, json, os, sys, time, urllib.request, urllib.error

OTE_EL  = "https://www.ote-cr.cz/cs/kratkodobe-trhy/elektrina/denni-trh/@@chart-data?report_date={d}"
OTE_GAS = "https://www.ote-cr.cz/cs/kratkodobe-trhy/plyn/vnitrodenni-trh/@@chart-data?report_date={d}"
CNB_ROK = "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/rok.txt?rok={y}"
UA = {"User-Agent": "FFY-spot-ceny/1.0 (+https://b-place.org/FFY-tools/)"}
PAUZA = 0.4          # vteřin mezi dotazy, ať OTE nezatěžujeme
ZNOVU_DNU = 3        # posledních N dní se stahuje vždy znovu (opravy, zítřejší denní trh)


def get(url, pokusy=3):
    for i in range(pokusy):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read().decode("utf-8")
        except (urllib.error.URLError, TimeoutError) as e:
            if i == pokusy - 1:
                raise
            time.sleep(2 * (i + 1))


def load(path, default):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, path)


def cena_line(j, prefer):
    """Vybere řadu s cenou. U elektřiny od 10/2025 jsou dvě – 15min a 60min, bereme 15min."""
    lines = j.get("data", {}).get("dataLine", [])
    for p in prefer:
        for l in lines:
            if l.get("title", "").lower().startswith(p):
                return l
    return None


def el_den(d):
    j = json.loads(get(OTE_EL.format(d=d.isoformat())))
    l = cena_line(j, ["15min cena", "cena"])
    if not l or not l.get("point"):
        return None
    pts = sorted(l["point"], key=lambda p: int(p["x"]))
    ceny = [round(float(p["y"]), 2) if p["y"] is not None else None for p in pts]
    n = len(ceny)
    res = 15 if n > 30 else 60          # 92/96/100 = čtvrthodiny, 23/24/25 = hodiny
    return {"r": res, "p": ceny}


def plyn_mesic(d):
    j = json.loads(get(OTE_GAS.format(d=d.isoformat())))
    l = cena_line(j, ["cena"])
    out = {}
    for p in (l or {}).get("point", []):
        if p.get("y") is not None:
            out[p["x"][:10]] = round(float(p["y"]), 2)
    return out


def kurz_rok(y):
    out = {}
    lines = get(CNB_ROK.format(y=y)).strip().splitlines()
    head = lines[0].split("|")
    i = head.index("1 EUR")
    for row in lines[1:]:
        c = row.split("|")
        if len(c) > i and c[0][:2].isdigit():
            den = dt.datetime.strptime(c[0], "%d.%m.%Y").date().isoformat()
            out[den] = float(c[i].replace(",", "."))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dny", type=int, default=730, help="kolik dní historie držet (výchozí 730 = 2 roky)")
    ap.add_argument("--slozka", default="FFY-tools/data")
    a = ap.parse_args()
    os.makedirs(a.slozka, exist_ok=True)
    dnes = dt.date.today()
    zitra = dnes + dt.timedelta(days=1)          # denní trh na zítřek je známý od cca 13:00
    od = dnes - dt.timedelta(days=a.dny)
    nyni = dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes")

    # ---- Elektřina ----
    p_el = os.path.join(a.slozka, "spot-elektrina.json")
    el = load(p_el, {"zdroj": "OTE, denní trh", "jednotka": "EUR/MWh", "dny": {}})
    dny = el["dny"]
    chybi = [od + dt.timedelta(days=i) for i in range((zitra - od).days + 1)]
    chybi = [d for d in chybi if d.isoformat() not in dny or d > dnes - dt.timedelta(days=ZNOVU_DNU)]
    print(f"Elektřina: stahuji {len(chybi)} dní", flush=True)
    for k, d in enumerate(chybi, 1):
        try:
            v = el_den(d)
            if v:
                dny[d.isoformat()] = v
        except Exception as e:
            print(f"  {d}: {e}", file=sys.stderr)
        if k % 50 == 0:
            print(f"  {k}/{len(chybi)}", flush=True)
            save(p_el, el)              # průběžně, ať se při přerušení neztratí
        time.sleep(PAUZA)
    el["dny"] = {k: dny[k] for k in sorted(dny) if k >= od.isoformat()}
    el["aktualizace"] = nyni
    save(p_el, el)

    # ---- Plyn (OTE vrací celý měsíc najednou) ----
    p_gas = os.path.join(a.slozka, "spot-plyn.json")
    gas = load(p_gas, {"zdroj": "OTE, vnitrodenní trh s plynem – index", "jednotka": "EUR/MWh", "dny": {}})
    mesice, m = [], dt.date(od.year, od.month, 1)
    while m <= dnes:
        mesice.append(m)
        m = dt.date(m.year + (m.month == 12), m.month % 12 + 1, 1)
    hotove = {k[:7] for k in gas["dny"]}
    mesice = [m for m in mesice if m.strftime("%Y-%m") not in hotove or m >= dt.date(dnes.year, dnes.month, 1) - dt.timedelta(days=1)]
    print(f"Plyn: stahuji {len(mesice)} měsíců", flush=True)
    for m in mesice:
        try:
            gas["dny"].update(plyn_mesic(m + dt.timedelta(days=14)))
        except Exception as e:
            print(f"  {m:%Y-%m}: {e}", file=sys.stderr)
        time.sleep(PAUZA)
    gas["dny"] = {k: gas["dny"][k] for k in sorted(gas["dny"]) if k >= od.isoformat()}
    gas["aktualizace"] = nyni
    save(p_gas, gas)

    # ---- Kurz EUR/CZK ----
    p_k = os.path.join(a.slozka, "kurz-eur.json")
    kurz = load(p_k, {"zdroj": "ČNB", "dny": {}})
    for y in range(od.year, dnes.year + 1):
        if y < dnes.year and any(k.startswith(str(y)) for k in kurz["dny"]):
            continue
        try:
            kurz["dny"].update(kurz_rok(y))
        except Exception as e:
            print(f"  kurz {y}: {e}", file=sys.stderr)
        time.sleep(PAUZA)
    kurz["dny"] = {k: kurz["dny"][k] for k in sorted(kurz["dny"]) if k >= (od - dt.timedelta(days=10)).isoformat()}
    kurz["aktualizace"] = nyni
    save(p_k, kurz)

    print(f"Hotovo: elektřina {len(el['dny'])} dní, plyn {len(gas['dny'])} dní, kurz {len(kurz['dny'])} dní")


if __name__ == "__main__":
    main()
