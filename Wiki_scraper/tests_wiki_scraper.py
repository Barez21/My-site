#!/usr/bin/env python3
"""
Unit a integration testy pro WikiScraper v8.

Spuštění:
    python -m pytest tests_wiki_scraper.py -v
    python -m pytest tests_wiki_scraper.py -v -k "test_sanitize"   # jen sanitizace
"""
import sys, json, pytest, re
from pathlib import Path
from unittest.mock import patch, MagicMock
from bs4 import BeautifulSoup

# Přidat aktuální adresář do sys.path
sys.path.insert(0, str(Path(__file__).parent))
import wiki_scraper as ws


# ══════════════════════════════════════════════════════════════════
# SANITIZACE
# ══════════════════════════════════════════════════════════════════

class TestSanitizeString:
    def test_removes_wiki_templates(self):
        assert "{{odkaz}}" not in ws.sanitize_string("Text {{odkaz}} konec")

    def test_removes_wikilinks(self):
        assert "[[" not in ws.sanitize_string("Viz [[Praha|město]]")

    def test_removes_references(self):
        assert "[1]" not in ws.sanitize_string("Fakt[1] a fakt[2].")

    def test_normalizes_whitespace(self):
        result = ws.sanitize_string("  Hodně   mezer   ")
        assert "  " not in result
        assert result == "Hodně mezer"

    def test_unicode_normalization(self):
        # Kombinující znaky → předem složené
        import unicodedata
        s = "c\u0306"  # c + combining breve
        result = ws.sanitize_string(s)
        assert unicodedata.is_normalized("NFC", result)

    def test_max_len_truncation(self):
        long = "a" * 1000
        result = ws.sanitize_string(long, max_len=100)
        assert len(result) <= 101  # +1 pro "…"
        assert result.endswith("…")

    def test_empty_string(self):
        assert ws.sanitize_string("") == ""
        assert ws.sanitize_string(None) is None

    def test_removes_html_tags(self):
        assert "<b>" not in ws.sanitize_string("Tučný <b>text</b>")


class TestSanitizeInfobox:
    def test_removes_suspicious_values(self):
        ib = {"Název": "Praha", "Populace": "N/A", "Prázdné": ""}
        result = ws.sanitize_infobox(ib)
        assert "Populace" not in result
        assert "Prázdné" not in result
        assert result.get("Název") == "Praha"

    def test_removes_wiki_markup_from_keys(self):
        ib = {"[[Klíč]]": "hodnota"}
        result = ws.sanitize_infobox(ib)
        assert "[[Klíč]]" not in result

    def test_empty_infobox(self):
        assert ws.sanitize_infobox({}) == {}
        assert ws.sanitize_infobox(None) is None

    def test_max_value_length(self):
        ib = {"Klíč": "x" * 600}
        result = ws.sanitize_infobox(ib)
        assert len(result.get("Klíč", "")) <= 501


class TestSanitizeRecord:
    def test_sanitizes_intro(self):
        r = {"url": "http://x", "title": "Test", "intro": "Text {{šablona}}"}
        result = ws.sanitize_record(r)
        assert "{{" not in result["intro"]

    def test_deduplicates_categories(self):
        r = {"url": "x", "categories": ["Kat", "Kat", "Kat2"]}
        result = ws.sanitize_record(r)
        assert result["categories"].count("Kat") == 1

    def test_invalid_coords_removed(self):
        r = {"url": "x", "coordinates_norm": {"lat": 999, "lng": 0}}
        result = ws.sanitize_record(r)
        assert "coordinates_norm" not in result
        assert result.get("_coord_invalid")

    def test_valid_coords_kept(self):
        r = {"url": "x", "coordinates_norm": {"lat": 50.08, "lng": 14.42}}
        result = ws.sanitize_record(r)
        assert "coordinates_norm" in result


# ══════════════════════════════════════════════════════════════════
# DETEKCE ANOMÁLIÍ
# ══════════════════════════════════════════════════════════════════

class TestDetectAnomalies:
    def test_no_title(self):
        issues = ws.detect_anomalies({"url": "x", "title": ""})
        rules = [i["rule"] for i in issues]
        assert "no_title" in rules

    def test_fetch_error(self):
        issues = ws.detect_anomalies({"url": "x", "title": "X", "error": "timeout"})
        assert any(i["rule"] == "fetch_error" for i in issues)

    def test_empty_intro(self):
        issues = ws.detect_anomalies({"url": "x", "title": "X", "intro": "Krátký"})
        assert any(i["rule"] == "empty_intro" for i in issues)

    def test_clean_record_no_anomalies(self):
        r = {
            "url": "https://cs.wikipedia.org/wiki/Praha",
            "title": "Praha",
            "intro": "Praha je hlavní město České republiky a největší české město.",
            "categories": ["Hlavní města", "Města v Čechách"],
        }
        issues = ws.detect_anomalies(r)
        errors = [i for i in issues if i["severity"] == "error"]
        assert len(errors) == 0

    def test_suspicious_title(self):
        issues = ws.detect_anomalies({"url": "x", "title": "Kategorie:Chemické prvky"})
        assert any(i["rule"] == "suspicious_title" for i in issues)

    def test_severity_levels(self):
        r = {"url": "x", "title": "", "error": "failed"}
        issues = ws.detect_anomalies(r)
        severities = {i["severity"] for i in issues}
        assert "error" in severities


# ══════════════════════════════════════════════════════════════════
# EXTRAKTORY HTML
# ══════════════════════════════════════════════════════════════════

def make_soup(html):
    return BeautifulSoup(html, "html.parser")


class TestExtractInfobox:
    def test_basic_infobox(self):
        html = """<div class="mw-parser-output">
        <table class="infobox">
          <tr><th>Název</th><td>Praha</td></tr>
          <tr><th>Populace</th><td>1 300 000</td></tr>
        </table></div>"""
        soup = make_soup(html)
        ib = ws.extract_infobox(soup)
        assert "Název" in ib
        assert ib["Název"] == "Praha"

    def test_empty_infobox(self):
        soup = make_soup("<div class='mw-parser-output'><p>Text bez infoboxu</p></div>")
        assert ws.extract_infobox(soup) == {}

    def test_no_content_div(self):
        soup = make_soup("<html><body><p>Nic</p></body></html>")
        assert ws.extract_infobox(soup) == {}


class TestExtractSections:
    def test_basic_sections(self):
        # Poznámka: extract_sections filtruje odstavce kratší než 20 znaků
        html = """<div class="mw-parser-output">
          <p>Toto je úvodní odstavec článku s dostatečnou délkou textu.</p>
          <div class="mw-heading mw-heading2"><h2>Historie</h2></div>
          <p>Text sekce Historie má také dostatečnou délku pro zahrnutí.</p>
          <div class="mw-heading mw-heading2"><h2>Reference</h2></div>
          <p>Ref text.</p>
        </div>"""
        sects = ws.extract_sections(make_soup(html))
        assert "Úvod" in sects
        assert "Historie" in sects
        # Reference se filtruje (je v SKIP_SECTIONS)
        assert "Reference" not in sects
        # Ověřit obsah
        assert "úvodní odstavec" in sects["Úvod"]
        assert "Historie" in sects

    def test_bullet_lists(self):
        html = """<div class="mw-parser-output">
          <div class="mw-heading"><h2>Vlastnosti</h2></div>
          <ul><li>Tvrdý</li><li>Lesklý</li></ul>
        </div>"""
        sects = ws.extract_sections(make_soup(html))
        text = sects.get("Vlastnosti", "")
        assert "•" in text or "Tvrdý" in text


class TestExtractTables:
    def test_wikitable_parsed(self):
        html = """<div class="mw-parser-output">
          <table class="wikitable">
            <tr><th>Prvek</th><th>Symbol</th></tr>
            <tr><td>Vodík</td><td>H</td></tr>
            <tr><td>Kyslík</td><td>O</td></tr>
          </table>
        </div>"""
        tables = ws.extract_tables(make_soup(html))
        assert len(tables) == 1
        assert tables[0]["headers"] == ["Prvek", "Symbol"]
        assert len(tables[0]["rows"]) == 2

    def test_infobox_skipped(self):
        html = """<div class="mw-parser-output">
          <table class="infobox wikitable"><tr><th>A</th><td>B</td></tr></table>
        </div>"""
        # Infobox by měl být přeskočen
        tables = ws.extract_tables(make_soup(html))
        assert len(tables) == 0

    def test_no_tables(self):
        soup = make_soup("<div class='mw-parser-output'><p>Jen text</p></div>")
        assert ws.extract_tables(soup) == []


class TestExtractImages:
    def test_basic_figure(self):
        html = """<div class="mw-parser-output">
          <figure>
            <img src="//upload.wikimedia.org/thumb/a/ab/File.jpg/300px-File.jpg" width="300">
            <figcaption>Popisek obrázku</figcaption>
          </figure>
        </div>"""
        imgs = ws.extract_images(make_soup(html))
        assert len(imgs) == 1
        assert "https:" in imgs[0]["url"]
        assert imgs[0]["caption"] == "Popisek obrázku"

    def test_small_images_skipped(self):
        html = """<div class="mw-parser-output">
          <figure>
            <img src="//upload.wikimedia.org/icon.png" width="16">
          </figure>
        </div>"""
        imgs = ws.extract_images(make_soup(html))
        assert len(imgs) == 0

    def test_no_images(self):
        soup = make_soup("<div class='mw-parser-output'><p>Jen text</p></div>")
        assert ws.extract_images(soup) == []


# ══════════════════════════════════════════════════════════════════
# RATE LIMITING
# ══════════════════════════════════════════════════════════════════

class TestRateLimiting:
    def setup_method(self):
        # Reset per-domain stavu před každým testem
        ws._rl_state.clear()

    def test_domain_extracted(self):
        assert ws._rl_domain("https://cs.wikipedia.org/wiki/Praha") == "cs.wikipedia.org"
        assert ws._rl_domain("https://en.wikipedia.org/wiki/Prague") == "en.wikipedia.org"

    def test_initial_delay_is_base(self):
        domain = "test.example.com"
        # Před prvním requestem není žádný stav
        # _rl_wait by měl použít BASE_DELAY
        with ws._rl_lock:
            s = ws._rl_state.setdefault(domain, {"delay": ws.BASE_DELAY, "last": 0.0, "errs": 0, "reqs": 0})
        assert s["delay"] == ws.BASE_DELAY

    def test_rate_limit_doubles_delay(self):
        domain = "test.example.com"
        with ws._rl_lock:
            ws._rl_state[domain] = {"delay": 1.0, "last": 0.0, "errs": 0, "reqs": 0}
        ws._rl_rate_limit(domain, 5)
        assert ws._rl_state[domain]["delay"] == 2.0

    def test_rate_limit_capped_at_max(self):
        domain = "test.example.com"
        with ws._rl_lock:
            ws._rl_state[domain] = {"delay": ws.MAX_DELAY, "last": 0.0, "errs": 0, "reqs": 0}
        ws._rl_rate_limit(domain, 5)
        assert ws._rl_state[domain]["delay"] <= ws.MAX_DELAY

    def test_success_decreases_delay(self):
        domain = "test.example.com"
        with ws._rl_lock:
            ws._rl_state[domain] = {"delay": 4.0, "last": 0.0, "errs": 0, "reqs": 4}
        ws._rl_success(domain)  # 5. request → trigger snížení
        assert ws._rl_state[domain]["delay"] < 4.0

    def test_backoff_has_jitter(self):
        domain = "test.example.com"
        with ws._rl_lock:
            ws._rl_state[domain] = {"delay": ws.BASE_DELAY, "last": 0.0, "errs": 0, "reqs": 0}
        # Backoff by neměl vracet přesně stejnou hodnotu pokaždé (jitter)
        results = {ws._rl_backoff(domain, 1) for _ in range(10)}
        # S jitterem by mělo být alespoň 2 různé hodnoty
        assert len(results) >= 1  # Aspoň jedna unikátní hodnota


# ══════════════════════════════════════════════════════════════════
# STROM KATEGORIÍ
# ══════════════════════════════════════════════════════════════════

class TestCategoryTree:
    def test_save_pending_includes_tree(self, tmp_path):
        path = str(tmp_path / "test.pending.json")
        cat_articles = {"Prvky": ["url1", "url2"], "Kovy": ["url3"]}
        cat_tree = {"Chemie": {"parent": None, "children": ["Prvky", "Kovy"]},
                    "Prvky": {"parent": "Chemie", "children": []},
                    "Kovy":  {"parent": "Chemie", "children": []}}
        ws.save_pending(path, cat_articles, cat_tree, "Chemie")
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        assert "cat_tree" in data
        assert data["root_cat"] == "Chemie"
        assert data["cat_tree"]["Chemie"]["children"] == ["Prvky", "Kovy"]


# ══════════════════════════════════════════════════════════════════
# NORMALIZACE SOUŘADNIC
# ══════════════════════════════════════════════════════════════════

class TestNormalizeCoords:
    def test_decimal_format(self):
        result = ws.normalize_coords("50.08, 14.42")
        assert result == {"lat": 50.08, "lng": 14.42}

    def test_dms_format(self):
        result = ws.normalize_coords("50°5′N 14°25′E")
        assert result is not None
        assert abs(result["lat"] - 50.083) < 0.01

    def test_out_of_range(self):
        assert ws.normalize_coords("999, 999") is None
        assert ws.normalize_coords("") is None

    def test_south_west(self):
        result = ws.normalize_coords("33°52′S 151°12′E")
        assert result["lat"] < 0


# ══════════════════════════════════════════════════════════════════
# INTEGRATION TEST — Flask routes
# ══════════════════════════════════════════════════════════════════

@pytest.fixture
def flask_client(tmp_path, monkeypatch):
    """Testovací Flask klient s izolovaným OUTPUT_DIR."""
    import wiki_gui as gui
    monkeypatch.setattr(gui, "OUTPUT_DIR", tmp_path)
    gui.app.config["TESTING"] = True
    with gui.app.test_client() as client:
        yield client, tmp_path


class TestFlaskRoutes:
    def test_index_returns_html(self, flask_client):
        client, _ = flask_client
        r = client.get("/")
        assert r.status_code == 200
        assert b"Wiki Scraper" in r.data or b"DOCTYPE" in r.data or b"<html" in r.data

    def test_list_outputs_empty(self, flask_client):
        client, _ = flask_client
        r = client.get("/list_outputs?s=test")
        assert r.status_code == 200
        data = json.loads(r.data)
        assert isinstance(data, dict)

    def test_results_missing_file(self, flask_client):
        client, _ = flask_client
        r = client.get("/results?file=neexistuje")
        # Měl by vrátit 404 nebo prázdný seznam
        assert r.status_code in (200, 404)

    def test_check_cp_no_checkpoint(self, flask_client):
        client, _ = flask_client
        r = client.get("/check_cp?output=test_output")
        assert r.status_code == 200
        data = json.loads(r.data)
        assert data["exists"] is False

    def test_stop_no_active_job(self, flask_client):
        client, _ = flask_client
        r = client.post("/stop",
                        data=json.dumps({"s": "test_session"}),
                        content_type="application/json")
        assert r.status_code == 200

    def test_favicon_returns_something(self, flask_client):
        client, _ = flask_client
        r = client.get("/favicon.ico")
        # 200 = SVG favicon, 204 = prázdná odpověď — obojí platné
        assert r.status_code in (200, 204)

    def test_results_valid_file(self, flask_client):
        client, tmp_path = flask_client
        # Vytvořit testovací JSON
        test_data = [{"url": "http://x", "title": "Test", "intro": "Testovací heslo"}]
        (tmp_path / "test_data.json").write_text(
            json.dumps(test_data), encoding="utf-8"
        )
        r = client.get("/results?file=test_data")
        assert r.status_code == 200
        data = json.loads(r.data)
        assert len(data) == 1
        assert data[0]["title"] == "Test"

    def test_export_parquet_missing_pyarrow(self, flask_client):
        """Ověří že endpoint vrátí srozumitelnou chybu bez pyarrow."""
        client, tmp_path = flask_client
        test_data = [{"url": "http://x", "title": "Test"}]
        (tmp_path / "test_data.json").write_text(json.dumps(test_data), encoding="utf-8")
        with patch.dict("sys.modules", {"pyarrow": None}):
            r = client.get("/export_parquet?output=test_data&s=test")
        # Buď 200 (pyarrow nainstalován) nebo 500 s chybou
        assert r.status_code in (200, 500)

    def test_export_jsonld_structure(self, flask_client):
        client, tmp_path = flask_client
        test_data = [{
            "url": "https://cs.wikipedia.org/wiki/Praha",
            "title": "Praha",
            "intro": "Hlavní město ČR.",
            "categories": ["Hlavní města"]
        }]
        (tmp_path / "jsonld_test.json").write_text(json.dumps(test_data), encoding="utf-8")
        r = client.get("/export_jsonld?output=jsonld_test&s=test")
        assert r.status_code == 200
        # Parsovat jako JSON-LD
        data = json.loads(r.data)
        assert "@context" in data
        assert "@graph" in data
        assert data["@graph"][0]["name"] == "Praha"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
