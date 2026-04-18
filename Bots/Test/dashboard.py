#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════╗
║              BITCOIN BOT – DASHBOARD SERVER              ║
║  Spusť:  python dashboard.py                             ║
║  Pak otevři v prohlížeči:  http://localhost:5000         ║
║  (nebo http://IP-serveru:5000 z jiného počítače)         ║
╚══════════════════════════════════════════════════════════╝

Závislosti: pip install flask requests --break-system-packages
"""

import json
import os
import requests
from datetime import datetime
from flask import Flask, jsonify, render_template_string

app = Flask(__name__)

STATE_FILE = "bitcoin_state.json"
LOG_FILE   = "bitcoin_bot.log"

# ── Pomocné funkce ──────────────────────────────────────────────

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE) as f:
            return json.load(f)
    return {
        "segment_volume": 10000,
        "positions": [],
        "daily_profit": 0,
        "in_trade": False,
        "last_date": None,
        "weekly_log": []
    }

def load_logs(lines=80):
    if not os.path.exists(LOG_FILE):
        return []
    with open(LOG_FILE, encoding="utf-8") as f:
        all_lines = f.readlines()
    return [l.strip() for l in all_lines[-lines:] if l.strip()]

def get_btc_price():
    try:
        r = requests.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT", timeout=5)
        return float(r.json()["price"])
    except:
        return None

def get_btc_candles_24h():
    """Posledních 24 hodinových svíček pro mini-chart."""
    try:
        r = requests.get(
            "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24",
            timeout=5
        )
        candles = r.json()
        return [{"t": c[0], "o": float(c[1]), "h": float(c[2]), "l": float(c[3]), "c": float(c[4]), "v": float(c[5])} for c in candles]
    except:
        return []

# ── API endpointy ───────────────────────────────────────────────

@app.route("/api/state")
def api_state():
    state = load_state()
    price = get_btc_price()
    candles = get_btc_candles_24h()

    # Přidej P&L k pozicím
    positions = state.get("positions", [])
    if price:
        for pos in positions:
            pos["current_price"] = price
            pos["pnl_pct"] = ((price - pos["entry_price"]) / pos["entry_price"]) * 100
            pos["pnl_usdt"] = (price - pos["entry_price"]) * pos["quantity"]
            pos["tp_price"] = pos["entry_price"] * 1.10
            pos["exit_price"] = pos["entry_price"] * 1.01

    return jsonify({
        "price": price,
        "candles": candles,
        "state": state,
        "positions": positions,
        "timestamp": datetime.now().strftime("%H:%M:%S")
    })

@app.route("/api/logs")
def api_logs():
    logs = load_logs(100)
    parsed = []
    for line in reversed(logs):
        level = "INFO"
        if "[ERROR]" in line: level = "ERROR"
        elif "🟢 BUY"  in line: level = "BUY"
        elif "🔴 SELL" in line: level = "SELL"
        elif "🚨"      in line: level = "EXIT"
        elif "🚀"      in line: level = "ENTRY"
        parsed.append({"raw": line, "level": level})
    return jsonify(parsed[:60])

# ── HTML Dashboard ──────────────────────────────────────────────

HTML = """<!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BTC BOT // DASHBOARD</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Barlow+Condensed:wght@300;400;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<style>
  :root {
    --bg:       #0a0c0f;
    --bg2:      #0f1318;
    --bg3:      #141920;
    --border:   #1e2730;
    --border2:  #263040;
    --text:     #c8d4e0;
    --dim:      #4a6070;
    --gold:     #f0b429;
    --gold2:    #ffd060;
    --green:    #00d4a0;
    --green2:   #00ff9d;
    --red:      #ff4560;
    --red2:     #ff7a8a;
    --blue:     #2196f3;
    --mono:     'IBM Plex Mono', monospace;
    --sans:     'Barlow Condensed', sans-serif;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--mono);
    font-size: 13px;
    min-height: 100vh;
    overflow-x: hidden;
  }

  /* Noise texture overlay */
  body::before {
    content: '';
    position: fixed; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
    pointer-events: none; z-index: 0; opacity: 0.4;
  }

  /* ── TOPBAR ── */
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px;
    height: 52px;
    border-bottom: 1px solid var(--border);
    background: var(--bg2);
    position: sticky; top: 0; z-index: 100;
  }
  .topbar-left { display: flex; align-items: center; gap: 24px; }
  .logo {
    font-family: var(--sans); font-weight: 700; font-size: 18px;
    letter-spacing: 3px; color: var(--gold);
    text-transform: uppercase;
  }
  .logo span { color: var(--dim); font-weight: 300; }
  .pair-tag {
    font-size: 11px; letter-spacing: 2px; color: var(--dim);
    border: 1px solid var(--border2); padding: 3px 10px; border-radius: 2px;
  }

  .price-hero {
    font-size: 28px; font-weight: 600; color: var(--gold2);
    letter-spacing: -0.5px;
    transition: color 0.3s;
  }
  .price-hero.up   { color: var(--green2); }
  .price-hero.down { color: var(--red2); }

  .price-change {
    font-size: 12px; margin-left: 10px;
    padding: 2px 8px; border-radius: 2px;
  }
  .price-change.up   { color: var(--green); background: rgba(0,212,160,0.1); }
  .price-change.down { color: var(--red);   background: rgba(255,69,96,0.1); }

  .clock { font-size: 11px; color: var(--dim); letter-spacing: 1px; }
  .status-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--green2);
    box-shadow: 0 0 8px var(--green2);
    animation: pulse 2s infinite;
    display: inline-block; margin-right: 8px;
  }
  @keyframes pulse {
    0%,100% { opacity: 1; } 50% { opacity: 0.4; }
  }

  /* ── LAYOUT ── */
  .grid {
    display: grid;
    grid-template-columns: 1fr 380px;
    grid-template-rows: auto auto;
    gap: 1px;
    background: var(--border);
    padding: 1px;
    min-height: calc(100vh - 52px);
  }

  .panel {
    background: var(--bg2);
    padding: 20px 24px;
    position: relative;
  }
  .panel-title {
    font-family: var(--sans); font-size: 11px; font-weight: 600;
    letter-spacing: 3px; text-transform: uppercase;
    color: var(--dim); margin-bottom: 16px;
    display: flex; align-items: center; gap: 10px;
  }
  .panel-title::after {
    content: ''; flex: 1; height: 1px; background: var(--border);
  }

  /* ── CHART ── */
  .chart-wrap {
    position: relative; height: 220px;
  }

  /* ── STATS BAR ── */
  .stats-bar {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 1px; background: var(--border);
    margin: 1px 0 0 0;
  }
  .stat-cell {
    background: var(--bg3); padding: 16px 20px;
  }
  .stat-label {
    font-size: 10px; letter-spacing: 2px; color: var(--dim);
    text-transform: uppercase; margin-bottom: 6px;
    font-family: var(--sans); font-weight: 600;
  }
  .stat-value {
    font-size: 22px; font-weight: 600; color: var(--text);
    font-family: var(--sans); letter-spacing: -0.5px;
  }
  .stat-value.green { color: var(--green); }
  .stat-value.red   { color: var(--red); }
  .stat-value.gold  { color: var(--gold); }
  .stat-sub { font-size: 10px; color: var(--dim); margin-top: 3px; }

  /* ── POSITIONS ── */
  .positions-list { display: flex; flex-direction: column; gap: 8px; }
  .position-card {
    background: var(--bg3);
    border: 1px solid var(--border2);
    border-left: 3px solid var(--gold);
    padding: 12px 14px;
    border-radius: 2px;
    transition: border-color 0.3s;
  }
  .position-card.profit { border-left-color: var(--green); }
  .position-card.loss   { border-left-color: var(--red); }

  .pos-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .pos-num    { font-size: 10px; color: var(--dim); letter-spacing: 1px; }
  .pos-pnl    { font-size: 13px; font-weight: 600; }
  .pos-pnl.profit { color: var(--green2); }
  .pos-pnl.loss   { color: var(--red2); }

  .pos-prices { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
  .pos-price-item { }
  .pos-price-label { font-size: 9px; color: var(--dim); letter-spacing: 1px; margin-bottom: 2px; font-family: var(--sans); }
  .pos-price-val   { font-size: 12px; color: var(--text); }

  .pos-bar-wrap { margin-top: 8px; height: 3px; background: var(--border2); border-radius: 2px; overflow: hidden; }
  .pos-bar { height: 100%; background: var(--green); transition: width 0.5s, background 0.3s; }
  .pos-bar.loss { background: var(--red); }

  .no-positions {
    text-align: center; padding: 40px 0;
    color: var(--dim); font-size: 12px; letter-spacing: 1px;
  }
  .no-positions .icon { font-size: 32px; margin-bottom: 10px; opacity: 0.4; }

  /* ── LOG ── */
  .log-list {
    height: 340px; overflow-y: auto;
    font-size: 11px; line-height: 1.7;
    scrollbar-width: thin; scrollbar-color: var(--border2) transparent;
  }
  .log-line { padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.02); }
  .log-line.BUY   { color: var(--green); }
  .log-line.SELL  { color: var(--red2); }
  .log-line.EXIT  { color: var(--red); font-weight: 600; }
  .log-line.ENTRY { color: var(--gold); }
  .log-line.ERROR { color: var(--red); opacity: 0.7; }
  .log-line.INFO  { color: var(--dim); }

  /* ── WEEKLY LOG TABLE ── */
  .week-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .week-table th {
    text-align: left; padding: 6px 8px;
    color: var(--dim); font-size: 9px; letter-spacing: 2px;
    border-bottom: 1px solid var(--border2);
    font-family: var(--sans); font-weight: 600;
    text-transform: uppercase;
  }
  .week-table td { padding: 7px 8px; border-bottom: 1px solid rgba(255,255,255,0.03); }
  .week-table tr:hover td { background: rgba(255,255,255,0.02); }

  .badge {
    display: inline-block; font-size: 9px; padding: 2px 7px;
    border-radius: 2px; letter-spacing: 1px; font-family: var(--sans); font-weight: 600;
    text-transform: uppercase;
  }
  .badge.green { background: rgba(0,212,160,0.15); color: var(--green); }
  .badge.red   { background: rgba(255,69,96,0.15);  color: var(--red); }
  .badge.dim   { background: var(--border); color: var(--dim); }

  /* ── SCROLLBAR ── */
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  /* ── REFRESH BAR ── */
  .refresh-bar {
    position: fixed; bottom: 0; left: 0; right: 0;
    height: 2px; background: var(--border);
  }
  .refresh-progress {
    height: 100%; background: var(--gold);
    width: 0%; transition: width linear;
  }

  /* ── ANIMATIONS ── */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-in { animation: fadeIn 0.4s ease forwards; }

  .blink { animation: blink 1s step-end 3; }
  @keyframes blink { 50% { opacity: 0; } }
</style>
</head>
<body>

<!-- TOPBAR -->
<div class="topbar">
  <div class="topbar-left">
    <div class="logo">BTC<span>/</span>BOT</div>
    <div class="pair-tag">BTC / USDT</div>
    <div>
      <span class="status-dot"></span>
      <span style="font-size:10px;color:var(--dim);letter-spacing:1px">LIVE</span>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:16px">
    <div>
      <span class="price-hero" id="price-hero">--</span>
      <span class="price-change" id="price-change-badge"></span>
    </div>
    <div class="clock" id="clock">--:--:--</div>
  </div>
</div>

<!-- STATS BAR -->
<div class="stats-bar">
  <div class="stat-cell">
    <div class="stat-label">Objem segmentu</div>
    <div class="stat-value gold" id="stat-volume">--</div>
    <div class="stat-sub">USDT celkem</div>
  </div>
  <div class="stat-cell">
    <div class="stat-label">Dnešní zisk</div>
    <div class="stat-value" id="stat-daily">--</div>
    <div class="stat-sub">realizovaný P&L</div>
  </div>
  <div class="stat-cell">
    <div class="stat-label">Otevřené pozice</div>
    <div class="stat-value" id="stat-positions">--</div>
    <div class="stat-sub">max. 10</div>
  </div>
  <div class="stat-cell">
    <div class="stat-label">Stav bota</div>
    <div class="stat-value" id="stat-status">--</div>
    <div class="stat-sub" id="stat-date">--</div>
  </div>
</div>

<!-- MAIN GRID -->
<div class="grid">

  <!-- LEFT: CHART + WEEKLY LOG -->
  <div style="display:flex;flex-direction:column;gap:1px;background:var(--border)">

    <div class="panel">
      <div class="panel-title">Cenový graf · 24H · 1H svíčky</div>
      <div class="chart-wrap">
        <canvas id="priceChart"></canvas>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">Týdenní přehled</div>
      <div style="overflow-x:auto">
        <table class="week-table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Objem</th>
              <th>Zisk / Ztráta</th>
              <th>Nový objem</th>
              <th>Pozice</th>
            </tr>
          </thead>
          <tbody id="week-tbody">
            <tr><td colspan="5" style="color:var(--dim);text-align:center;padding:20px">Žádná data</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- RIGHT: POSITIONS + LOG -->
  <div style="display:flex;flex-direction:column;gap:1px;background:var(--border)">

    <div class="panel">
      <div class="panel-title">Otevřené pozice</div>
      <div class="positions-list" id="positions-list">
        <div class="no-positions">
          <div class="icon">◌</div>
          Žádné otevřené pozice
        </div>
      </div>
    </div>

    <div class="panel" style="flex:1">
      <div class="panel-title">Log aktivit</div>
      <div class="log-list" id="log-list">
        <div style="color:var(--dim);text-align:center;padding:20px">Načítám...</div>
      </div>
    </div>

  </div>

</div>

<!-- REFRESH BAR -->
<div class="refresh-bar">
  <div class="refresh-progress" id="refresh-bar"></div>
</div>

<script>
// ── State ───────────────────────────────────────────────────────
let chart = null;
let prevPrice = null;
const REFRESH_INTERVAL = 30000; // 30s

// ── Clock ───────────────────────────────────────────────────────
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('cs-CZ');
}
setInterval(updateClock, 1000);
updateClock();

// ── Refresh progress bar ────────────────────────────────────────
function startRefreshBar() {
  const bar = document.getElementById('refresh-bar');
  bar.style.transition = 'none';
  bar.style.width = '0%';
  setTimeout(() => {
    bar.style.transition = `width ${REFRESH_INTERVAL}ms linear`;
    bar.style.width = '100%';
  }, 50);
}

// ── Format helpers ──────────────────────────────────────────────
const fmt  = (n, d=2) => n != null ? Number(n).toLocaleString('cs-CZ', {minimumFractionDigits:d, maximumFractionDigits:d}) : '--';
const fmtP = (n) => (n >= 0 ? '+' : '') + fmt(n, 2) + ' %';
const fmtU = (n) => (n >= 0 ? '+' : '') + fmt(n, 2) + ' USDT';

// ── Price chart ─────────────────────────────────────────────────
function initChart(candles) {
  const ctx = document.getElementById('priceChart').getContext('2d');
  const labels = candles.map(c => {
    const d = new Date(c.t);
    return d.getHours().toString().padStart(2,'0') + ':00';
  });
  const closes = candles.map(c => c.c);
  const vols   = candles.map(c => c.v);

  // Gradient fill
  const grad = ctx.createLinearGradient(0, 0, 0, 200);
  grad.addColorStop(0,   'rgba(240,180,41,0.25)');
  grad.addColorStop(1,   'rgba(240,180,41,0.00)');

  const data = {
    labels,
    datasets: [
      {
        label: 'BTC/USDT',
        data: closes,
        borderColor: '#f0b429',
        borderWidth: 2,
        backgroundColor: grad,
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#f0b429',
        yAxisID: 'y',
      },
      {
        label: 'Volume',
        data: vols,
        type: 'bar',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        yAxisID: 'yVol',
      }
    ]
  };

  const config = {
    type: 'line',
    data,
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 600 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#141920',
          borderColor: '#1e2730',
          borderWidth: 1,
          titleColor: '#4a6070',
          bodyColor: '#c8d4e0',
          callbacks: {
            label: ctx => ctx.datasetIndex === 0
              ? ' ' + fmt(ctx.raw, 0) + ' USDT'
              : ' Vol: ' + fmt(ctx.raw, 0)
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: { color: '#4a6070', font: { family: 'IBM Plex Mono', size: 10 }, maxTicksLimit: 8 }
        },
        y: {
          position: 'right',
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#4a6070', font: { family: 'IBM Plex Mono', size: 10 },
                   callback: v => '$' + Number(v).toLocaleString() }
        },
        yVol: {
          position: 'left', display: false,
          max: Math.max(...vols) * 5,
        }
      }
    }
  };

  if (chart) {
    chart.data = data;
    chart.update('none');
  } else {
    chart = new Chart(ctx, config);
  }
}

// ── Update state ─────────────────────────────────────────────────
function updateState(data) {
  const { price, candles, state, positions } = data;

  // Price hero
  if (price) {
    const hero = document.getElementById('price-hero');
    const badge = document.getElementById('price-change-badge');
    hero.textContent = '$' + fmt(price, 0);
    if (prevPrice !== null) {
      const diff = price - prevPrice;
      const pct  = (diff / prevPrice * 100).toFixed(2);
      if (diff > 0) {
        hero.className = 'price-hero up blink';
        badge.className = 'price-change up';
        badge.textContent = '+' + pct + '%';
      } else if (diff < 0) {
        hero.className = 'price-hero down blink';
        badge.className = 'price-change down';
        badge.textContent = pct + '%';
      }
    }
    prevPrice = price;
  }

  // Stats
  document.getElementById('stat-volume').textContent = fmt(state.segment_volume, 0) + ' USDT';

  const dp = state.daily_profit || 0;
  const dpEl = document.getElementById('stat-daily');
  dpEl.textContent = fmtU(dp);
  dpEl.className = 'stat-value ' + (dp >= 0 ? 'green' : 'red');

  const posEl = document.getElementById('stat-positions');
  posEl.textContent = (state.positions || []).length + ' / 10';
  posEl.className = 'stat-value ' + ((state.positions || []).length > 0 ? 'gold' : '');

  const statusEl = document.getElementById('stat-status');
  statusEl.textContent = state.in_trade ? 'V OBCHODU' : 'ČEKÁM';
  statusEl.className = 'stat-value ' + (state.in_trade ? 'green' : '');
  document.getElementById('stat-date').textContent = state.last_date || '--';

  // Chart
  if (candles && candles.length) initChart(candles);

  // Positions
  const listEl = document.getElementById('positions-list');
  if (!positions || positions.length === 0) {
    listEl.innerHTML = `<div class="no-positions"><div class="icon">◌</div>Žádné otevřené pozice</div>`;
  } else {
    listEl.innerHTML = positions.map((pos, i) => {
      const pnl     = pos.pnl_pct || 0;
      const pnlU    = pos.pnl_usdt || 0;
      const cls     = pnl >= 0 ? 'profit' : 'loss';
      const progress = Math.min(Math.max((pnl / 10) * 100, 0), 100);
      return `
      <div class="position-card ${cls} fade-in">
        <div class="pos-header">
          <span class="pos-num">POZICE #${i+1} · ${pos.opened_at ? pos.opened_at.slice(0,16) : '--'}</span>
          <span class="pos-pnl ${cls}">${fmtP(pnl)} · ${fmtU(pnlU)}</span>
        </div>
        <div class="pos-prices">
          <div class="pos-price-item">
            <div class="pos-price-label">Vstup</div>
            <div class="pos-price-val">$${fmt(pos.entry_price,0)}</div>
          </div>
          <div class="pos-price-item">
            <div class="pos-price-label">Take Profit</div>
            <div class="pos-price-val" style="color:var(--green)">$${fmt(pos.tp_price,0)}</div>
          </div>
          <div class="pos-price-item">
            <div class="pos-price-label">Exit trigger</div>
            <div class="pos-price-val" style="color:var(--red)">$${fmt(pos.exit_price,0)}</div>
          </div>
        </div>
        <div class="pos-bar-wrap">
          <div class="pos-bar ${pnl < 0 ? 'loss' : ''}" style="width:${progress}%"></div>
        </div>
      </div>`;
    }).join('');
  }

  // Weekly log
  const weekRows = (state.weekly_log || []).slice(-7).reverse();
  const tbody = document.getElementById('week-tbody');
  if (!weekRows.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:var(--dim);text-align:center;padding:20px">Žádná data</td></tr>`;
  } else {
    tbody.innerHTML = weekRows.map(d => {
      const p = d.daily_profit || 0;
      const badgeCls = p > 0 ? 'green' : (p < 0 ? 'red' : 'dim');
      return `<tr>
        <td>${d.date}</td>
        <td>${fmt(d.volume,0)} USDT</td>
        <td><span class="badge ${badgeCls}">${fmtU(p)}</span></td>
        <td>${fmt(d.new_volume,0)} USDT</td>
        <td>${d.open_positions}</td>
      </tr>`;
    }).join('');
  }
}

// ── Update logs ──────────────────────────────────────────────────
function updateLogs(logs) {
  const el = document.getElementById('log-list');
  if (!logs || !logs.length) {
    el.innerHTML = '<div style="color:var(--dim);text-align:center;padding:20px">Prázdný log</div>';
    return;
  }
  el.innerHTML = logs.map(l =>
    `<div class="log-line ${l.level}">${l.raw}</div>`
  ).join('');
}

// ── Fetch & refresh ──────────────────────────────────────────────
async function refresh() {
  try {
    const [stateRes, logRes] = await Promise.all([
      fetch('/api/state'),
      fetch('/api/logs')
    ]);
    const stateData = await stateRes.json();
    const logData   = await logRes.json();
    updateState(stateData);
    updateLogs(logData);
  } catch (e) {
    console.error('Chyba při načítání dat:', e);
  }
  startRefreshBar();
}

// ── Init ─────────────────────────────────────────────────────────
refresh();
setInterval(refresh, REFRESH_INTERVAL);
</script>
</body>
</html>"""

@app.route("/")
def dashboard():
    return render_template_string(HTML)

if __name__ == "__main__":
    print("╔══════════════════════════════════════════╗")
    print("║  BTC BOT Dashboard spuštěn               ║")
    print("║  Otevři:  http://localhost:5000           ║")
    print("╚══════════════════════════════════════════╝")
    app.run(host="0.0.0.0", port=5000, debug=False)
