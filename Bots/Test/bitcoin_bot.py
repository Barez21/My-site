#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════╗
║           BITCOIN SEGMENT BOT – Swing Trading            ║
║  Strategie: Green candle entry + pyramiding + auto exit  ║
╚══════════════════════════════════════════════════════════╝

Spuštění:  python bitcoin_bot.py
Závislosti: pip install python-binance python-dotenv schedule --break-system-packages
"""

import os
import json
import logging
import smtplib
import schedule
import time
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from binance.client import Client
from binance.exceptions import BinanceAPIException
from dotenv import load_dotenv

load_dotenv()  # Načte hodnoty z .env souboru

# ================================================================
#  KONFIGURACE – TADY NASTAVUJEŠ VŠE POTŘEBNÉ
# ================================================================

INITIAL_CAPITAL    = 10_000.0   # Počáteční kapitál segmentu (v USDT)

# ---- EMAIL ----
EMAIL_RECIPIENT    = "tvuj@email.cz"          # ← ŘÁDEK 34: zadej svůj email
EMAIL_SENDER       = "bot.gmail.ucet@gmail.com"  # ← ŘÁDEK 35: Gmail účet bota
EMAIL_APP_PASSWORD = os.getenv("EMAIL_PASSWORD")  # nastav v .env souboru

# ---- BINANCE API ---- (nastav v .env souboru)
API_KEY    = os.getenv("BINANCE_API_KEY")
API_SECRET = os.getenv("BINANCE_SECRET")

# ---- STRATEGIE ----
SYMBOL              = "BTCUSDT"
TIMEFRAME           = Client.KLINE_INTERVAL_1HOUR
VOLUME_LOOKBACK     = 20     # Průměr volume z posledních N svíček
VOLUME_MULTIPLIER   = 1.5    # Volume musí být alespoň 1.5x průměr
PYRAMID_STEP        = 1.05   # Nová pozice při ceně 105 % entry předchozí
TAKE_PROFIT_MULT    = 1.10   # Prodej pozici při +10 % jejího entry
EXIT_TRIGGER_MULT   = 1.01   # Prodej vše pokud cena = 101 % entry poslední pozice
GAP_THRESHOLD       = 0.02   # 2 % skok = gap, drž pozice
MAX_POSITIONS       = 10     # Maximální počet pozic
RISK_PER_TRADE      = 0.005  # 0.5 % objemu segmentu per pozice

# ---- DENNÍ OBJEM ----
PROFIT_REINVEST_RATIO = 0.50  # 50 % zisku reinvestováno
LOSS_PENALTY_RATIO    = 0.90  # Ztrátový den: objem × 0.90

# ---- ZPRÁVY – blackout hodiny (UTC) kdy nepřidáváme pozice ----
# Formát: (den_týdne 0=Pondělí, hodina_UTC)
NEWS_BLACKOUT_HOURS = [
    (2, 18), (2, 19), (2, 20),   # Fed – středa ~19:00 UTC
    (4, 12), (4, 13), (4, 14),   # NFP – pátek ~13:30 UTC
]

# ---- SOUBORY ----
STATE_FILE = "bitcoin_state.json"   # Uložený stav bota
LOG_FILE   = "bitcoin_bot.log"      # Denní log

# ================================================================
#  LOGGING
# ================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# ================================================================
#  SPRÁVA STAVU (ukládá se do JSON souboru)
# ================================================================

def load_state() -> dict:
    """Načte uložený stav ze souboru, nebo vytvoří nový."""
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r") as f:
            return json.load(f)
    return {
        "segment_volume": INITIAL_CAPITAL,
        "positions": [],          # Seznam otevřených pozic
        "daily_profit": 0.0,
        "weekly_log": [],         # Záznamy pro nedělní email
        "last_date": None,
        "in_trade": False,
        "entry_active": False,    # True pokud jsme v aktivní sérii
    }

def save_state(state: dict):
    """Uloží stav do souboru."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2, default=str)

# ================================================================
#  BINANCE – ZÍSKÁNÍ DAT
# ================================================================

def get_client() -> Client:
    return Client(API_KEY, API_SECRET)

def get_candles(client: Client, limit: int = 25) -> list:
    """Vrátí posledních N uzavřených 1H svíček."""
    klines = client.get_klines(symbol=SYMBOL, interval=TIMEFRAME, limit=limit + 1)
    candles = []
    for k in klines[:-1]:  # Poslední svíčka ještě není uzavřená, vynecháme
        candles.append({
            "open":   float(k[1]),
            "high":   float(k[2]),
            "low":    float(k[3]),
            "close":  float(k[4]),
            "volume": float(k[5]),
            "time":   datetime.fromtimestamp(k[0] / 1000)
        })
    return candles

def get_current_price(client: Client) -> float:
    """Vrátí aktuální cenu BTC/USDT."""
    ticker = client.get_symbol_ticker(symbol=SYMBOL)
    return float(ticker["price"])

# ================================================================
#  SIGNÁLY
# ================================================================

def is_green_candle(candle: dict) -> bool:
    """Zelená svíčka = close > open."""
    return candle["close"] > candle["open"]

def has_high_volume(candle: dict, candles: list) -> bool:
    """Volume musí být alespoň VOLUME_MULTIPLIER × průměr posledních N svíček."""
    avg_volume = sum(c["volume"] for c in candles[-VOLUME_LOOKBACK:]) / VOLUME_LOOKBACK
    return candle["volume"] >= avg_volume * VOLUME_MULTIPLIER

def is_gap(candles: list) -> bool:
    """Detekuje gap mezi předposlední a poslední svíčkou."""
    if len(candles) < 2:
        return False
    prev_close = candles[-2]["close"]
    curr_open  = candles[-1]["open"]
    gap_pct = abs(curr_open - prev_close) / prev_close
    return gap_pct >= GAP_THRESHOLD

def is_news_blackout() -> bool:
    """Vrátí True pokud jsme v hodině před důležitou zprávou."""
    now = datetime.utcnow()
    return (now.weekday(), now.hour) in NEWS_BLACKOUT_HOURS

# ================================================================
#  LOGIKA OBCHODOVÁNÍ
# ================================================================

def calculate_trade_size(segment_volume: float) -> float:
    """Vypočítá velikost pozice (0.5 % objemu segmentu)."""
    return segment_volume * RISK_PER_TRADE

def should_open_first_position(candles: list, state: dict) -> bool:
    """Podmínky pro první vstup do obchodu."""
    if state["in_trade"]:
        return False
    if is_news_blackout():
        log.info("📰 News blackout – přeskakuji signál")
        return False
    last_candle = candles[-1]
    return is_green_candle(last_candle) and has_high_volume(last_candle, candles)

def should_open_next_position(current_price: float, state: dict) -> bool:
    """Přidat další pozici pokud cena dosáhla 105 % entry předchozí."""
    if not state["in_trade"]:
        return False
    if len(state["positions"]) >= MAX_POSITIONS:
        return False
    if is_news_blackout():
        return False
    last_entry = state["positions"][-1]["entry_price"]
    return current_price >= last_entry * PYRAMID_STEP

def check_take_profits(current_price: float, state: dict) -> list:
    """Vrátí seznam pozic, které dosáhly take profitu (+10 %)."""
    to_close = []
    for pos in state["positions"]:
        if current_price >= pos["entry_price"] * TAKE_PROFIT_MULT:
            to_close.append(pos)
    return to_close

def should_exit_all(current_price: float, state: dict) -> bool:
    """Prodej vše pokud cena klesla na 101 % entry poslední pozice."""
    if not state["in_trade"] or not state["positions"]:
        return False
    if is_gap(state.get("last_candles", [])):
        log.info("📊 Gap detekován – držím pozice")
        return False
    last_entry = state["positions"][-1]["entry_price"]
    return current_price <= last_entry * EXIT_TRIGGER_MULT

# ================================================================
#  SIMULACE PŘÍKAZŮ (paper trading)
#  Pro ostré obchodování nahraď client.order_market_buy() / sell()
# ================================================================

def execute_buy(client: Client, trade_size_usdt: float, price: float) -> dict:
    """
    PAPER TRADING: Simuluje nákup.
    Pro ostré obchodování:
        order = client.order_market_buy(symbol=SYMBOL, quoteOrderQty=trade_size_usdt)
    """
    quantity = trade_size_usdt / price
    log.info(f"🟢 BUY  {quantity:.6f} BTC @ {price:.2f} USDT  (objem: {trade_size_usdt:.2f} USDT)")
    return {"entry_price": price, "quantity": quantity, "size_usdt": trade_size_usdt, "opened_at": str(datetime.now())}

def execute_sell(client: Client, position: dict, price: float, reason: str) -> float:
    """
    PAPER TRADING: Simuluje prodej, vrátí realizovaný zisk.
    Pro ostré obchodování:
        order = client.order_market_sell(symbol=SYMBOL, quantity=position["quantity"])
    """
    profit = (price - position["entry_price"]) * position["quantity"]
    log.info(f"🔴 SELL {position['quantity']:.6f} BTC @ {price:.2f} USDT | Zisk: {profit:.2f} USDT | Důvod: {reason}")
    return profit

# ================================================================
#  DENNÍ RUTINA – přepočet objemu a log
# ================================================================

def daily_routine(state: dict) -> dict:
    """Spouští se každý den v 00:01. Přepočítá objem a zaznamená den."""
    today = datetime.now().strftime("%Y-%m-%d")
    daily_profit = state.get("daily_profit", 0.0)
    old_volume = state["segment_volume"]

    if daily_profit > 0:
        new_volume = old_volume + daily_profit * PROFIT_REINVEST_RATIO
        log.info(f"📈 Ziskový den: +{daily_profit:.2f} USDT | Nový objem: {new_volume:.2f} USDT")
    elif daily_profit < 0:
        new_volume = old_volume * LOSS_PENALTY_RATIO
        log.info(f"📉 Ztrátový den: {daily_profit:.2f} USDT | Nový objem: {new_volume:.2f} USDT (-10 %)")
    else:
        new_volume = old_volume
        log.info(f"➖ Neutrální den | Objem beze změny: {new_volume:.2f} USDT")

    # Zapiš do týdenního logu
    day_record = {
        "date": today,
        "volume": old_volume,
        "daily_profit": daily_profit,
        "new_volume": new_volume,
        "open_positions": len(state["positions"])
    }
    state["weekly_log"].append(day_record)

    state["segment_volume"] = new_volume
    state["daily_profit"] = 0.0
    state["last_date"] = today
    return state

# ================================================================
#  NEDĚLNÍ EMAIL
# ================================================================

def send_weekly_email(state: dict):
    """Sestaví a odešle týdenní přehled emailem každou neděli."""
    if not state["weekly_log"]:
        log.info("📧 Žádná data pro týdenní email.")
        return

    total_profit = sum(d["daily_profit"] for d in state["weekly_log"])
    start_volume = state["weekly_log"][0]["volume"]
    end_volume   = state["segment_volume"]

    rows = ""
    for d in state["weekly_log"]:
        emoji = "📈" if d["daily_profit"] > 0 else ("📉" if d["daily_profit"] < 0 else "➖")
        rows += f"""
        <tr>
            <td style="padding:8px;border-bottom:1px solid #eee">{d['date']}</td>
            <td style="padding:8px;border-bottom:1px solid #eee">{d['volume']:.2f} USDT</td>
            <td style="padding:8px;border-bottom:1px solid #eee;color:{'green' if d['daily_profit']>=0 else 'red'}">{emoji} {d['daily_profit']:+.2f} USDT</td>
            <td style="padding:8px;border-bottom:1px solid #eee">{d['new_volume']:.2f} USDT</td>
            <td style="padding:8px;border-bottom:1px solid #eee">{d['open_positions']}</td>
        </tr>"""

    html = f"""
    <html><body style="font-family:Arial,sans-serif;max-width:700px;margin:auto">
    <h2 style="color:#1A3A5C">📊 Bitcoin Bot – Týdenní přehled</h2>
    <p style="color:#666">Týden {datetime.now().strftime('%d.%m.%Y')}</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr style="background:#1A3A5C;color:white">
            <th style="padding:10px;text-align:left">Datum</th>
            <th style="padding:10px;text-align:left">Objem</th>
            <th style="padding:10px;text-align:left">Zisk/Ztráta</th>
            <th style="padding:10px;text-align:left">Nový objem</th>
            <th style="padding:10px;text-align:left">Pozice</th>
        </tr>
        {rows}
    </table>

    <table style="width:100%;background:#f5f8ff;padding:15px;border-radius:8px">
        <tr><td><b>Objem na začátku týdne:</b></td><td>{start_volume:.2f} USDT</td></tr>
        <tr><td><b>Objem na konci týdne:</b></td><td>{end_volume:.2f} USDT</td></tr>
        <tr><td><b>Celkový zisk týdne:</b></td>
            <td style="color:{'green' if total_profit>=0 else 'red'}"><b>{total_profit:+.2f} USDT</b></td></tr>
        <tr><td><b>Aktuálně otevřených pozic:</b></td><td>{len(state['positions'])}</td></tr>
    </table>

    <p style="color:#999;font-size:12px;margin-top:20px">
        Bitcoin Bot | Segment BTC/USDT | Generováno automaticky
    </p>
    </body></html>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"📊 Bitcoin Bot – Týdenní přehled {datetime.now().strftime('%d.%m.%Y')}"
        msg["From"]    = EMAIL_SENDER
        msg["To"]      = EMAIL_RECIPIENT
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(EMAIL_SENDER, EMAIL_APP_PASSWORD)
            server.sendmail(EMAIL_SENDER, EMAIL_RECIPIENT, msg.as_string())

        log.info(f"📧 Týdenní email odeslán na {EMAIL_RECIPIENT}")
        state["weekly_log"] = []  # Vymaž po odeslání
    except Exception as e:
        log.error(f"❌ Chyba při odesílání emailu: {e}")

    return state

# ================================================================
#  HLAVNÍ SMYČKA – spouští se každou hodinu
# ================================================================

def run_bot():
    """Hlavní logika bota – spouští se po každé uzavřené 1H svíčce."""
    log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    state = load_state()

    try:
        client        = get_client()
        candles       = get_candles(client, limit=25)
        current_price = get_current_price(client)
        state["last_candles"] = candles  # Pro gap detekci

        log.info(f"💰 BTC cena: {current_price:.2f} USDT | Objem segmentu: {state['segment_volume']:.2f} USDT | Pozice: {len(state['positions'])}")

        # 1. Zkontroluj take profity na všech otevřených pozicích
        positions_to_close = check_take_profits(current_price, state)
        for pos in positions_to_close:
            profit = execute_sell(client, pos, current_price, "Take profit +10%")
            state["daily_profit"] += profit
            state["positions"].remove(pos)

        # 2. Zkontroluj celkový exit (cena na 101 % entry poslední pozice)
        if should_exit_all(current_price, state):
            log.info("🚨 EXIT ALL – cena klesla na úroveň poslední investice")
            for pos in state["positions"]:
                profit = execute_sell(client, pos, current_price, "Exit all trigger")
                state["daily_profit"] += profit
            state["positions"] = []
            state["in_trade"]   = False

        # 3. Zkontroluj přidání další pozice (pyramiding)
        elif should_open_next_position(current_price, state):
            trade_size = calculate_trade_size(state["segment_volume"])
            pos = execute_buy(client, trade_size, current_price)
            state["positions"].append(pos)
            log.info(f"📊 Pyramid: přidána pozice #{len(state['positions'])}")

        # 4. Zkontroluj první vstup
        elif should_open_first_position(candles, state):
            trade_size = calculate_trade_size(state["segment_volume"])
            pos = execute_buy(client, trade_size, current_price)
            state["positions"].append(pos)
            state["in_trade"] = True
            log.info("🚀 První vstup do obchodu")

        else:
            log.info("⏳ Žádný signál – čekám...")

    except BinanceAPIException as e:
        log.error(f"❌ Binance API chyba: {e}")
    except Exception as e:
        log.error(f"❌ Neočekávaná chyba: {e}")

    save_state(state)

# ================================================================
#  SCHEDULER – pravidelné spouštění
# ================================================================

def setup_schedule():
    schedule.every().hour.at(":01").do(run_bot)              # Bot běží každou hodinu
    schedule.every().day.at("00:02").do(lambda: save_state(daily_routine(load_state())))  # Denní rutina
    schedule.every().sunday.at("08:00").do(lambda: send_weekly_email(load_state()))       # Nedělní email

    log.info("✅ Bitcoin Bot spuštěn – čekám na první hodinovou svíčku...")
    log.info(f"   Segment objem:  {load_state()['segment_volume']:.2f} USDT")
    log.info(f"   Max pozic:      {MAX_POSITIONS}")
    log.info(f"   Risk per trade: {RISK_PER_TRADE * 100:.1f} %")
    log.info(f"   Email:          {EMAIL_RECIPIENT}")

    while True:
        schedule.run_pending()
        time.sleep(30)

# ================================================================
#  SPUŠTĚNÍ
# ================================================================

if __name__ == "__main__":
    setup_schedule()
