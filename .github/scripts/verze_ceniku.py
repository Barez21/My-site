#!/usr/bin/env python3
"""
Historie verzí ceníků pro nástroj „Ceníky dodavatelů“ → FFY-tools/data/ceniky-verze.json

  eru   – pro každý produkt ze srovnávače ERÚ (klíč = productId) seznam verzí:
          nová verze vzniká, když dodavatel nahraje nový ceník (jiný odkaz na PDF), nebo když se ve srovnávači
          změní cena (u dynamických produktů jen stálý plat – odhad podle spotu i přirážka se mění s trhem).
          U verze: od, do, odkaz na ceník, ceny (stejný tvar jako v ceniky-eru.json), proč skončila.
  mimo  – dodavatelé mimo ERÚ: každý soubor s ceníkem, platnost od–do (z názvu souboru, z PDF, nebo kdy jsme ho viděli).
  pdf   – co se našlo v textu PDF ceníku (platnost od / do), aby se každé PDF četlo jen jednou.

Platnost „od“: z textu PDF („platný od 1. 1. 2026“), z názvu souboru (01012026, 2026-04-01 …), jinak den,
kdy skript ceník poprvé uviděl (od_zdroj = "videno", na stránce „nejpozději od“).
Platnost „do“: den před začátkem další verze, nebo den, kdy produkt / soubor zmizel.

Jednorázový dopočet z historie (denní snímky ceniky-eru.json, např. z git commitů):
  python3 verze_ceniku.py --z-historie 2026-11-12=snimek1.json 2026-11-13=snimek2.json … --vystup ceniky-verze.json
"""
import argparse, datetime as dt, io, json, os, re, sys, time, urllib.parse

MESICE = {"ledna": 1, "února": 2, "unora": 2, "března": 3, "brezna": 3, "dubna": 4, "května": 5, "kvetna": 5, "června": 6,
          "cervna": 6, "července": 7, "cervence": 7, "srpna": 8, "září": 9, "zari": 9, "října": 10, "rijna": 10,
          "listopadu": 11, "prosince": 12}
DATUM = (r"(?:(\d{1,2})\s*\.\s*(\d{1,2})\s*\.\s*(20\d\d)"                 # 1. 1. 2026 / 01.01.2026
         r"|(\d{1,2})\s*\.?\s*(" + "|".join(MESICE) + r")\s+(20\d\d))")   # 1. ledna 2026


def _d(y, m, d):
    try:
        return dt.date(int(y), int(m), int(d)).isoformat()
    except ValueError:
        return None


def datum_z_shody(g):
    if g[0]:
        return _d(g[2], g[1], g[0])
    return _d(g[5], MESICE.get(g[4].lower(), 0), g[3])


def platnost_z_textu(t):
    """(od, do) z textu ceníku – hledá formulace typu „platný od …“, „s účinností od …“, „platnost od … do …“."""
    t = re.sub(r"\s+", " ", t)
    od = do = None
    m = re.search(r"(?:platn\w*|účinnost\w*|ucinnost\w*)[^.]{0,40}?\bod(?:e dne)?\s*:?\s*" + DATUM, t, re.I)
    if m:
        od = datum_z_shody(m.groups())
        m2 = re.match(r"\s*(?:do|až do|-|–)\s*" + DATUM, t[m.end():m.end() + 40], re.I)
        if m2:
            do = datum_z_shody(m2.groups())
    if not od:
        m = re.search(r"(?:ceník|cenik)[^.]{0,60}?\bod\s+" + DATUM, t, re.I)
        if m:
            od = datum_z_shody(m.groups())
    if od and not do:
        m = re.search(r"(?:platn\w*|účinnost\w*)[^.]{0,40}?\bdo\s+" + DATUM, t, re.I)
        if m:
            d2 = datum_z_shody(m.groups())
            if d2 and d2 > od:
                do = d2
    return od, do


def datumy_v_nazvu(n):
    """Data v názvu souboru: 01012026, 2026-04-01, 01-01-2026, 1.7.2024 … → seřazený seznam ISO dat."""
    n = urllib.parse.unquote(n)
    out, obsazeno = [], []
    vzory = [(r"(?<!\d)(20\d\d)[-_.](\d\d)[-_.](\d\d)(?!\d)", (1, 2, 3)),
             (r"(?<!\d)(\d{1,2})[-_. ](\d{1,2})[-_. ](20\d\d)(?!\d)", (3, 2, 1)),
             (r"(?<!\d)(\d\d)(\d\d)(20\d\d)(?!\d)", (3, 2, 1))]
    for vzor, (iy, im, idd) in vzory:
        for m in re.finditer(vzor, n):
            if any(a < m.end() and m.start() < b for a, b in obsazeno):
                continue                      # překrývá se s už nalezeným datem (2026-04-01-2026-12-31)
            obsazeno.append((m.start(), m.end()))
            out.append((m.start(), _d(m.group(iy), m.group(im), m.group(idd))))
    return [d for _, d in sorted(out) if d]


def platnost_pdf(obsah):
    """Přečte první 3 strany PDF a vrátí (od, do). Bez pypdf vrátí (None, None)."""
    try:
        from pypdf import PdfReader
    except ImportError:
        return None, None
    r = PdfReader(io.BytesIO(obsah))
    text = " ".join((p.extract_text() or "") for p in r.pages[:3])
    return platnost_z_textu(text)


def _cmp(r):
    """Co se porovnává pro „změnu ceny“. U dynamických jen stálý plat – odhad podle spotu i přirážka
    (u části dodavatelů procento ze spotu) se mění s trhem každý den."""
    c = r.get("ceny") or {}
    if r.get("dynamicky"):
        return {d: {t: v[0] if v else None for t, v in x.items()} for d, x in c.items()}
    return c


def _den_pred(iso):
    return (dt.date.fromisoformat(iso) - dt.timedelta(days=1)).isoformat()


def _od_z_pdf(V, url, dnes, min_od=None):
    """Datum začátku z PDF, pokud je rozumné (ne v budoucnu, ne před min_od)."""
    p = (V["pdf"].get(url) or {}) if url else {}
    od = p.get("od")
    if od and od <= dnes and (not min_od or od > min_od):
        return od, "pdf"
    return dnes, "videno"


def aktualizuj_eru(V, produkty, komodita, dnes, uzavirat=True):
    """produkty = seznam záznamů z ceniky-eru.json (elektrina nebo plyn) z jednoho stažení."""
    E = V["eru"]
    videno = set()
    for r in produkty:
        pid = r.get("id")
        if not pid:
            continue
        videno.add(pid)
        cenik = (r.get("dokumenty") or {}).get("cenik")
        meta = {"komodita": komodita, "segment": r.get("segment") or "domácnost", "dodavatel": r["dodavatel"],
                "produkt": r["produkt"], "fixace_mes": r.get("fixace_mes"), "dynamicky": bool(r.get("dynamicky")),
                "zakaznici": r.get("zakaznici")}
        z = E.get(pid)
        if not z:
            od, src = _od_z_pdf(V, cenik, dnes)
            E[pid] = {**meta, "aktivni": True, "naposledy": dnes,
                      "verze": [{"od": od, "od_zdroj": src, "do": None, "cenik": cenik, "ceny": r.get("ceny")}]}
            continue
        z.update(meta)
        z["naposledy"] = dnes
        cur = z["verze"][-1]
        if not z.get("aktivni"):                                   # produkt se vrátil
            z["aktivni"] = True
            z["verze"].append({"od": dnes, "od_zdroj": "videno", "do": None, "cenik": cenik, "ceny": r.get("ceny")})
            continue
        if cenik and not cur.get("cenik"):                         # detail se dřív nestáhl – doplníme, není to změna
            cur["cenik"] = cenik
        novy_cenik = bool(cenik and cur.get("cenik") and cenik != cur["cenik"])
        nova_cena = _cmp({"ceny": cur.get("ceny"), "dynamicky": meta["dynamicky"]}) != _cmp(r)
        if novy_cenik or nova_cena:
            od, src = _od_z_pdf(V, cenik, dnes, cur.get("od")) if novy_cenik else (dnes, "zmena")
            cur["do"] = _den_pred(od) if od > cur["od"] else cur["od"]
            cur["konec"] = "nový ceník" if novy_cenik else "změna ceny"
            z["verze"].append({"od": od, "od_zdroj": src, "do": None, "cenik": cenik or cur.get("cenik"), "ceny": r.get("ceny")})
        else:
            cur["ceny"] = r.get("ceny")          # u dynamických se tím obnoví odhad podle spotu
    if uzavirat:
        for pid, z in E.items():
            if z.get("komodita") == komodita and z.get("aktivni") and pid not in videno:
                cur = z["verze"][-1]
                cur["do"] = _den_pred(dnes) if dnes > cur["od"] else cur["od"]
                cur["konec"] = "produkt zrušen"
                z["aktivni"] = False


def komodita_souboru(t, komodity=None):
    t = urllib.parse.unquote(t).lower()
    if re.search(r"plyn|gas|\bpl\b|_pl_|ppas|ppd|gasnet", t):
        return "plyn"
    if re.search(r"elektr|\bele\b|_ele|_el_|\bel\b|ez distrib|cez|egd|pre\b|vt|nt", t):
        return "elektřina"
    return komodity[0] if komodity and len(komodity) == 1 else ""


def aktualizuj_mimo(V, mimo, dnes):
    """mimo = seznam dodavatelů z ceniky-eru.json → mimo_eru (soubory = aktuální, archiv = starší)."""
    M = V["mimo"]
    for d in mimo or []:
        if d.get("chyba"):
            continue                                                 # stránka se nenačetla, nic neuzavírat
        D = M.setdefault(d["dodavatel"], {})
        ted = {}
        for f, akt in [(f, True) for f in d.get("soubory") or []] + [(f, False) for f in d.get("archiv") or [] if not f.get("odstraneno")]:
            ted[f["url"]] = (f, akt)
        for url, (f, akt) in ted.items():
            z = D.get(url)
            dat = datumy_v_nazvu(url.split("/")[-1]) or datumy_v_nazvu(f.get("text") or "")
            if not z:
                z = D[url] = {"nazev": f.get("nazev"), "text": f.get("text"), "segment": f.get("segment") or "", "rok": f.get("rok"),
                              "prvni": dnes, "naposledy": dnes}
            z.update({"nazev": f.get("nazev"), "segment": f.get("segment") or "", "rok": f.get("rok"), "naposledy": dnes, "aktivni": akt,
                      "komodita": komodita_souboru(url + " " + (f.get("text") or ""), d.get("komodity"))})
            z.pop("zmizel", None)
            # platnost: název souboru > PDF > kdy jsme ho viděli
            if dat:
                z["od"], z["od_zdroj"] = dat[0], "nazev"
                if len(dat) > 1 and dat[-1] > dat[0]:
                    z["do"], z["do_zdroj"] = dat[-1], "nazev"
            p = V["pdf"].get(url) or {}
            if p.get("od") and z.get("od_zdroj") != "nazev":
                z["od"], z["od_zdroj"] = p["od"], "pdf"
                if p.get("do"):
                    z["do"], z["do_zdroj"] = p["do"], "pdf"
            if not z.get("od") and akt:
                z["od"], z["od_zdroj"] = z["prvni"], "videno"
        for url, z in D.items():
            if url not in ted and not z.get("zmizel"):
                z["zmizel"] = dnes
                z["aktivni"] = False
                if not z.get("do") or z.get("do_zdroj") == "videno":
                    z["do"], z["do_zdroj"] = _den_pred(dnes), "zmizel"


def precti_pdf(V, urls, stahni, limit=150, casovy_limit=None):
    """Stáhne a přečte PDF, která ještě nemáme (nejvýš limit za běh). stahni(url) -> bytes."""
    n = 0
    for url in urls:
        if not url or url in V["pdf"] or not re.search(r"\.pdf(\?|$)", url, re.I):
            continue
        if n >= limit or (casovy_limit and casovy_limit()):
            break
        n += 1
        try:
            od, do = platnost_pdf(stahni(url))
            V["pdf"][url] = {"od": od, "do": do, "precteno": dt.date.today().isoformat()}
        except Exception as e:
            V["pdf"][url] = {"od": None, "do": None, "precteno": dt.date.today().isoformat(), "chyba": str(e)[:120]}
    return n


def zpresnit_z_pdf(V, dnes):
    """Doplní platnost z PDF i zpětně: u verzí, jejichž začátek známe jen z data, kdy jsme je viděli."""
    for z in V["eru"].values():
        for i, v in enumerate(z["verze"]):
            p = V["pdf"].get(v.get("cenik") or "") or {}
            if v.get("od_zdroj") == "videno" and p.get("od") and p["od"] <= v["od"]:
                if i == 0 or p["od"] > (z["verze"][i - 1].get("od") or ""):
                    v["od"], v["od_zdroj"] = p["od"], "pdf"
                    if i > 0 and z["verze"][i - 1].get("do") and z["verze"][i - 1]["do"] >= p["od"]:
                        z["verze"][i - 1]["do"] = _den_pred(p["od"])
            if p.get("do"):
                v["do_cenik"] = p["do"]


def nova():
    return {"popis": __doc__.strip().split("\n\n")[1] if __doc__ else "", "eru": {}, "mimo": {}, "pdf": {}}


def nacti(path):
    try:
        with open(path, encoding="utf-8") as f:
            V = json.load(f)
        for k in ("eru", "mimo", "pdf"):
            V.setdefault(k, {})
        return V
    except (FileNotFoundError, json.JSONDecodeError):
        return nova()


def uloz(path, V):
    V["aktualizace"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes")
    with open(path + ".tmp", "w", encoding="utf-8") as f:
        json.dump(V, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(path + ".tmp", path)


def main():
    ap = argparse.ArgumentParser(description="Dopočet historie verzí z denních snímků ceniky-eru.json")
    ap.add_argument("--z-historie", nargs="+", required=True, metavar="DATUM=SOUBOR")
    ap.add_argument("--vystup", required=True)
    a = ap.parse_args()
    V = nacti(a.vystup)
    for arg in sorted(a.z_historie):
        datum, soubor = arg.split("=", 1)
        with open(soubor, encoding="utf-8") as f:
            S = json.load(f)
        if not all(x.get("id") for x in S.get("elektrina", [])[:5]):
            print(f"{datum}: starý formát bez id, přeskakuji"); continue
        aktualizuj_eru(V, S.get("elektrina", []), "elektřina", datum)
        aktualizuj_eru(V, S.get("plyn", []), "plyn", datum)
        aktualizuj_mimo(V, S.get("mimo_eru"), datum)
        print(f"{datum}: {len(V['eru'])} produktů, {sum(len(z['verze']) for z in V['eru'].values())} verzí")
    uloz(a.vystup, V)


if __name__ == "__main__":
    main()
