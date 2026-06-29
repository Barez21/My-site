/* ════════════════════════════════════════════
   FREE for YOU — Graf cen elektřiny (OTE denní trh)
   ════════════════════════════════════════════
   Vykreslí SVG graf denních průměrných cen za rok.

   NAPOJENÍ NA REÁLNÁ DATA (pro IT):
   Graf se snaží načíst data z window.FFY_PRICE_DATA,
   nebo z URL v atributu data-source na #ffy-price-chart.
   Očekávaný formát JSON: [{"date":"2026-06-29","price":127.51}, ...]
   (price = denní průměr EUR/MWh)

   OTE poskytuje data per den na:
   https://www.ote-cr.cz/cs/kratkodobe-trhy/elektrina/denni-trh?date=YYYY-MM-DD
   IT připraví serverový agregátor který stáhne rok dat
   a vystaví je jako jeden JSON endpoint (kvůli CORS nelze z prohlížeče).
   ════════════════════════════════════════════ */
(function () {
  'use strict';

  // Demo data (denní průměr EUR/MWh za poslední rok)
  var DEMO_DATA = [{"date": "2025-06-30", "price": 119.6}, {"date": "2025-07-01", "price": 119.0}, {"date": "2025-07-02", "price": 119.29}, {"date": "2025-07-03", "price": 102.58}, {"date": "2025-07-04", "price": 117.67}, {"date": "2025-07-05", "price": 106.38}, {"date": "2025-07-06", "price": 112.58}, {"date": "2025-07-07", "price": 120.73}, {"date": "2025-07-08", "price": 122.06}, {"date": "2025-07-09", "price": 214.82}, {"date": "2025-07-10", "price": 114.97}, {"date": "2025-07-11", "price": 107.78}, {"date": "2025-07-12", "price": 100.08}, {"date": "2025-07-13", "price": 107.01}, {"date": "2025-07-14", "price": 99.83}, {"date": "2025-07-15", "price": 103.58}, {"date": "2025-07-16", "price": 127.96}, {"date": "2025-07-17", "price": 114.09}, {"date": "2025-07-18", "price": 98.14}, {"date": "2025-07-19", "price": 84.13}, {"date": "2025-07-20", "price": 108.2}, {"date": "2025-07-21", "price": 116.99}, {"date": "2025-07-22", "price": 114.74}, {"date": "2025-07-23", "price": 119.25}, {"date": "2025-07-24", "price": 105.72}, {"date": "2025-07-25", "price": 121.59}, {"date": "2025-07-26", "price": 113.5}, {"date": "2025-07-27", "price": 90.37}, {"date": "2025-07-28", "price": 110.72}, {"date": "2025-07-29", "price": 104.12}, {"date": "2025-07-30", "price": 101.03}, {"date": "2025-07-31", "price": 98.55}, {"date": "2025-08-01", "price": 111.31}, {"date": "2025-08-02", "price": 85.91}, {"date": "2025-08-03", "price": 93.08}, {"date": "2025-08-04", "price": 116.75}, {"date": "2025-08-05", "price": 101.15}, {"date": "2025-08-06", "price": 123.7}, {"date": "2025-08-07", "price": 98.04}, {"date": "2025-08-08", "price": 109.07}, {"date": "2025-08-09", "price": 89.92}, {"date": "2025-08-10", "price": 106.56}, {"date": "2025-08-11", "price": 113.19}, {"date": "2025-08-12", "price": 145.56}, {"date": "2025-08-13", "price": 109.78}, {"date": "2025-08-14", "price": 105.44}, {"date": "2025-08-15", "price": 99.42}, {"date": "2025-08-16", "price": 89.81}, {"date": "2025-08-17", "price": 55.85}, {"date": "2025-08-18", "price": 171.99}, {"date": "2025-08-19", "price": 95.06}, {"date": "2025-08-20", "price": 87.21}, {"date": "2025-08-21", "price": 110.04}, {"date": "2025-08-22", "price": 108.0}, {"date": "2025-08-23", "price": 90.89}, {"date": "2025-08-24", "price": 77.11}, {"date": "2025-08-25", "price": 118.9}, {"date": "2025-08-26", "price": 85.02}, {"date": "2025-08-27", "price": 91.82}, {"date": "2025-08-28", "price": 92.28}, {"date": "2025-08-29", "price": 154.99}, {"date": "2025-08-30", "price": 152.56}, {"date": "2025-08-31", "price": 96.49}, {"date": "2025-09-01", "price": 78.95}, {"date": "2025-09-02", "price": 115.02}, {"date": "2025-09-03", "price": 73.39}, {"date": "2025-09-04", "price": 111.44}, {"date": "2025-09-05", "price": 101.07}, {"date": "2025-09-06", "price": 62.03}, {"date": "2025-09-07", "price": 78.84}, {"date": "2025-09-08", "price": 83.65}, {"date": "2025-09-09", "price": 94.32}, {"date": "2025-09-10", "price": 93.1}, {"date": "2025-09-11", "price": 99.34}, {"date": "2025-09-12", "price": 75.54}, {"date": "2025-09-13", "price": 78.94}, {"date": "2025-09-14", "price": 64.54}, {"date": "2025-09-15", "price": 101.04}, {"date": "2025-09-16", "price": 102.23}, {"date": "2025-09-17", "price": 93.76}, {"date": "2025-09-18", "price": 88.88}, {"date": "2025-09-19", "price": 81.91}, {"date": "2025-09-20", "price": 71.4}, {"date": "2025-09-21", "price": 75.72}, {"date": "2025-09-22", "price": 63.29}, {"date": "2025-09-23", "price": 87.12}, {"date": "2025-09-24", "price": 93.51}, {"date": "2025-09-25", "price": 89.87}, {"date": "2025-09-26", "price": 79.76}, {"date": "2025-09-27", "price": 48.85}, {"date": "2025-09-28", "price": 57.24}, {"date": "2025-09-29", "price": 87.01}, {"date": "2025-09-30", "price": 85.08}, {"date": "2025-10-01", "price": 92.01}, {"date": "2025-10-02", "price": 79.42}, {"date": "2025-10-03", "price": 106.14}, {"date": "2025-10-04", "price": 59.84}, {"date": "2025-10-05", "price": 61.88}, {"date": "2025-10-06", "price": 104.55}, {"date": "2025-10-07", "price": 71.94}, {"date": "2025-10-08", "price": 68.54}, {"date": "2025-10-09", "price": 77.17}, {"date": "2025-10-10", "price": 50.76}, {"date": "2025-10-11", "price": 84.65}, {"date": "2025-10-12", "price": 48.14}, {"date": "2025-10-13", "price": 78.36}, {"date": "2025-10-14", "price": 56.52}, {"date": "2025-10-15", "price": 67.53}, {"date": "2025-10-16", "price": 89.21}, {"date": "2025-10-17", "price": 70.28}, {"date": "2025-10-18", "price": 72.89}, {"date": "2025-10-19", "price": 63.25}, {"date": "2025-10-20", "price": 89.1}, {"date": "2025-10-21", "price": 97.5}, {"date": "2025-10-22", "price": 56.77}, {"date": "2025-10-23", "price": 61.22}, {"date": "2025-10-24", "price": 77.98}, {"date": "2025-10-25", "price": 49.98}, {"date": "2025-10-26", "price": 41.53}, {"date": "2025-10-27", "price": 77.84}, {"date": "2025-10-28", "price": 75.24}, {"date": "2025-10-29", "price": 87.83}, {"date": "2025-10-30", "price": 64.5}, {"date": "2025-10-31", "price": 60.1}, {"date": "2025-11-01", "price": 65.7}, {"date": "2025-11-02", "price": 59.38}, {"date": "2025-11-03", "price": 75.73}, {"date": "2025-11-04", "price": 71.75}, {"date": "2025-11-05", "price": 85.91}, {"date": "2025-11-06", "price": 50.83}, {"date": "2025-11-07", "price": 76.81}, {"date": "2025-11-08", "price": 36.03}, {"date": "2025-11-09", "price": 51.17}, {"date": "2025-11-10", "price": 65.6}, {"date": "2025-11-11", "price": 51.98}, {"date": "2025-11-12", "price": 42.22}, {"date": "2025-11-13", "price": 78.26}, {"date": "2025-11-14", "price": 75.68}, {"date": "2025-11-15", "price": 49.42}, {"date": "2025-11-16", "price": 42.99}, {"date": "2025-11-17", "price": 39.81}, {"date": "2025-11-18", "price": 67.56}, {"date": "2025-11-19", "price": 135.57}, {"date": "2025-11-20", "price": 69.95}, {"date": "2025-11-21", "price": 63.92}, {"date": "2025-11-22", "price": 69.99}, {"date": "2025-11-23", "price": 54.98}, {"date": "2025-11-24", "price": 65.47}, {"date": "2025-11-25", "price": 43.3}, {"date": "2025-11-26", "price": 58.66}, {"date": "2025-11-27", "price": 72.23}, {"date": "2025-11-28", "price": 72.42}, {"date": "2025-11-29", "price": 66.47}, {"date": "2025-11-30", "price": 30.28}, {"date": "2025-12-01", "price": 81.68}, {"date": "2025-12-02", "price": 77.58}, {"date": "2025-12-03", "price": 59.98}, {"date": "2025-12-04", "price": 60.27}, {"date": "2025-12-05", "price": 86.74}, {"date": "2025-12-06", "price": 123.7}, {"date": "2025-12-07", "price": 36.5}, {"date": "2025-12-08", "price": 89.37}, {"date": "2025-12-09", "price": 68.85}, {"date": "2025-12-10", "price": 56.63}, {"date": "2025-12-11", "price": 81.97}, {"date": "2025-12-12", "price": 48.51}, {"date": "2025-12-13", "price": 40.77}, {"date": "2025-12-14", "price": 53.34}, {"date": "2025-12-15", "price": 73.71}, {"date": "2025-12-16", "price": 67.23}, {"date": "2025-12-17", "price": 75.71}, {"date": "2025-12-18", "price": 64.35}, {"date": "2025-12-19", "price": 81.29}, {"date": "2025-12-20", "price": 49.92}, {"date": "2025-12-21", "price": 59.25}, {"date": "2025-12-22", "price": 65.65}, {"date": "2025-12-23", "price": 77.19}, {"date": "2025-12-24", "price": 75.5}, {"date": "2025-12-25", "price": 56.36}, {"date": "2025-12-26", "price": 58.97}, {"date": "2025-12-27", "price": 138.8}, {"date": "2025-12-28", "price": 72.15}, {"date": "2025-12-29", "price": 64.78}, {"date": "2025-12-30", "price": 49.41}, {"date": "2025-12-31", "price": 85.1}, {"date": "2026-01-01", "price": 76.86}, {"date": "2026-01-02", "price": 80.64}, {"date": "2026-01-03", "price": 39.24}, {"date": "2026-01-04", "price": 44.94}, {"date": "2026-01-05", "price": 77.07}, {"date": "2026-01-06", "price": 45.73}, {"date": "2026-01-07", "price": 84.71}, {"date": "2026-01-08", "price": 63.77}, {"date": "2026-01-09", "price": 119.29}, {"date": "2026-01-10", "price": 42.72}, {"date": "2026-01-11", "price": 64.09}, {"date": "2026-01-12", "price": 64.92}, {"date": "2026-01-13", "price": 76.0}, {"date": "2026-01-14", "price": 75.48}, {"date": "2026-01-15", "price": 66.74}, {"date": "2026-01-16", "price": 66.85}, {"date": "2026-01-17", "price": 51.46}, {"date": "2026-01-18", "price": 55.89}, {"date": "2026-01-19", "price": 119.94}, {"date": "2026-01-20", "price": 52.58}, {"date": "2026-01-21", "price": 79.69}, {"date": "2026-01-22", "price": 71.05}, {"date": "2026-01-23", "price": 71.12}, {"date": "2026-01-24", "price": 140.49}, {"date": "2026-01-25", "price": 80.22}, {"date": "2026-01-26", "price": 88.02}, {"date": "2026-01-27", "price": 86.39}, {"date": "2026-01-28", "price": 75.16}, {"date": "2026-01-29", "price": 78.99}, {"date": "2026-01-30", "price": 59.1}, {"date": "2026-01-31", "price": 71.15}, {"date": "2026-02-01", "price": 41.52}, {"date": "2026-02-02", "price": 64.65}, {"date": "2026-02-03", "price": 78.96}, {"date": "2026-02-04", "price": 68.19}, {"date": "2026-02-05", "price": 98.43}, {"date": "2026-02-06", "price": 71.18}, {"date": "2026-02-07", "price": 68.87}, {"date": "2026-02-08", "price": 86.15}, {"date": "2026-02-09", "price": 77.81}, {"date": "2026-02-10", "price": 78.14}, {"date": "2026-02-11", "price": 84.07}, {"date": "2026-02-12", "price": 96.43}, {"date": "2026-02-13", "price": 88.66}, {"date": "2026-02-14", "price": 90.33}, {"date": "2026-02-15", "price": 59.94}, {"date": "2026-02-16", "price": 96.22}, {"date": "2026-02-17", "price": 65.67}, {"date": "2026-02-18", "price": 101.51}, {"date": "2026-02-19", "price": 102.21}, {"date": "2026-02-20", "price": 131.59}, {"date": "2026-02-21", "price": 76.04}, {"date": "2026-02-22", "price": 52.52}, {"date": "2026-02-23", "price": 91.31}, {"date": "2026-02-24", "price": 76.98}, {"date": "2026-02-25", "price": 151.83}, {"date": "2026-02-26", "price": 105.69}, {"date": "2026-02-27", "price": 87.66}, {"date": "2026-02-28", "price": 83.2}, {"date": "2026-03-01", "price": 77.62}, {"date": "2026-03-02", "price": 93.2}, {"date": "2026-03-03", "price": 112.64}, {"date": "2026-03-04", "price": 99.1}, {"date": "2026-03-05", "price": 107.84}, {"date": "2026-03-06", "price": 100.86}, {"date": "2026-03-07", "price": 83.56}, {"date": "2026-03-08", "price": 71.56}, {"date": "2026-03-09", "price": 165.66}, {"date": "2026-03-10", "price": 104.23}, {"date": "2026-03-11", "price": 89.56}, {"date": "2026-03-12", "price": 114.36}, {"date": "2026-03-13", "price": 101.58}, {"date": "2026-03-14", "price": 104.6}, {"date": "2026-03-15", "price": 99.34}, {"date": "2026-03-16", "price": 115.03}, {"date": "2026-03-17", "price": 96.41}, {"date": "2026-03-18", "price": 83.85}, {"date": "2026-03-19", "price": 103.72}, {"date": "2026-03-20", "price": 98.37}, {"date": "2026-03-21", "price": 91.91}, {"date": "2026-03-22", "price": 91.99}, {"date": "2026-03-23", "price": 117.4}, {"date": "2026-03-24", "price": 103.1}, {"date": "2026-03-25", "price": 100.57}, {"date": "2026-03-26", "price": 91.49}, {"date": "2026-03-27", "price": 117.23}, {"date": "2026-03-28", "price": 79.99}, {"date": "2026-03-29", "price": 95.84}, {"date": "2026-03-30", "price": 98.19}, {"date": "2026-03-31", "price": 98.54}, {"date": "2026-04-01", "price": 109.54}, {"date": "2026-04-02", "price": 134.46}, {"date": "2026-04-03", "price": 129.63}, {"date": "2026-04-04", "price": 92.87}, {"date": "2026-04-05", "price": 84.33}, {"date": "2026-04-06", "price": 109.38}, {"date": "2026-04-07", "price": 134.18}, {"date": "2026-04-08", "price": 95.09}, {"date": "2026-04-09", "price": 121.03}, {"date": "2026-04-10", "price": 116.26}, {"date": "2026-04-11", "price": 94.71}, {"date": "2026-04-12", "price": 83.5}, {"date": "2026-04-13", "price": 201.13}, {"date": "2026-04-14", "price": 118.79}, {"date": "2026-04-15", "price": 123.26}, {"date": "2026-04-16", "price": 129.71}, {"date": "2026-04-17", "price": 191.12}, {"date": "2026-04-18", "price": 118.26}, {"date": "2026-04-19", "price": 111.98}, {"date": "2026-04-20", "price": 111.21}, {"date": "2026-04-21", "price": 101.75}, {"date": "2026-04-22", "price": 125.26}, {"date": "2026-04-23", "price": 123.19}, {"date": "2026-04-24", "price": 106.98}, {"date": "2026-04-25", "price": 97.47}, {"date": "2026-04-26", "price": 104.16}, {"date": "2026-04-27", "price": 108.98}, {"date": "2026-04-28", "price": 119.97}, {"date": "2026-04-29", "price": 126.39}, {"date": "2026-04-30", "price": 100.75}, {"date": "2026-05-01", "price": 116.3}, {"date": "2026-05-02", "price": 86.92}, {"date": "2026-05-03", "price": 108.26}, {"date": "2026-05-04", "price": 120.46}, {"date": "2026-05-05", "price": 127.23}, {"date": "2026-05-06", "price": 122.92}, {"date": "2026-05-07", "price": 124.1}, {"date": "2026-05-08", "price": 137.52}, {"date": "2026-05-09", "price": 105.24}, {"date": "2026-05-10", "price": 117.33}, {"date": "2026-05-11", "price": 112.81}, {"date": "2026-05-12", "price": 110.55}, {"date": "2026-05-13", "price": 125.89}, {"date": "2026-05-14", "price": 136.33}, {"date": "2026-05-15", "price": 118.78}, {"date": "2026-05-16", "price": 123.99}, {"date": "2026-05-17", "price": 116.6}, {"date": "2026-05-18", "price": 114.71}, {"date": "2026-05-19", "price": 120.33}, {"date": "2026-05-20", "price": 125.85}, {"date": "2026-05-21", "price": 108.15}, {"date": "2026-05-22", "price": 111.56}, {"date": "2026-05-23", "price": 107.79}, {"date": "2026-05-24", "price": 119.94}, {"date": "2026-05-25", "price": 124.14}, {"date": "2026-05-26", "price": 123.03}, {"date": "2026-05-27", "price": 95.81}, {"date": "2026-05-28", "price": 121.19}, {"date": "2026-05-29", "price": 119.03}, {"date": "2026-05-30", "price": 123.11}, {"date": "2026-05-31", "price": 110.22}, {"date": "2026-06-01", "price": 127.18}, {"date": "2026-06-02", "price": 143.67}, {"date": "2026-06-03", "price": 114.54}, {"date": "2026-06-04", "price": 99.8}, {"date": "2026-06-05", "price": 110.13}, {"date": "2026-06-06", "price": 86.17}, {"date": "2026-06-07", "price": 94.1}, {"date": "2026-06-08", "price": 103.78}, {"date": "2026-06-09", "price": 129.9}, {"date": "2026-06-10", "price": 133.52}, {"date": "2026-06-11", "price": 123.07}, {"date": "2026-06-12", "price": 130.46}, {"date": "2026-06-13", "price": 122.59}, {"date": "2026-06-14", "price": 104.26}, {"date": "2026-06-15", "price": 136.49}, {"date": "2026-06-16", "price": 127.16}, {"date": "2026-06-17", "price": 149.63}, {"date": "2026-06-18", "price": 140.37}, {"date": "2026-06-19", "price": 168.59}, {"date": "2026-06-20", "price": 94.02}, {"date": "2026-06-21", "price": 127.75}, {"date": "2026-06-22", "price": 128.1}, {"date": "2026-06-23", "price": 129.43}, {"date": "2026-06-24", "price": 118.85}, {"date": "2026-06-25", "price": 117.22}, {"date": "2026-06-26", "price": 122.53}, {"date": "2026-06-27", "price": 95.64}, {"date": "2026-06-28", "price": 86.03}, {"date": "2026-06-29", "price": 114.69}];

  function getData(el, cb) {
    // 1) Globální proměnná (IT může injektovat)
    if (window.FFY_PRICE_DATA && window.FFY_PRICE_DATA.length) {
      return cb(window.FFY_PRICE_DATA);
    }
    // 2) data-source URL
    var src = el.getAttribute('data-source');
    if (src) {
      fetch(src).then(function (r) { return r.json(); })
        .then(function (d) { cb(d && d.length ? d : DEMO_DATA); })
        .catch(function () { cb(DEMO_DATA); });
      return;
    }
    // 3) Demo fallback
    cb(DEMO_DATA);
  }

  function render(el, data) {
    var W = 900, H = 360, padL = 48, padR = 16, padT = 20, padB = 40;
    var plotW = W - padL - padR, plotH = H - padT - padB;

    var prices = data.map(function (d) { return d.price; });
    var minP = Math.min.apply(null, prices);
    var maxP = Math.max.apply(null, prices);
    // Round bounds to nice numbers
    var lo = Math.floor(minP / 20) * 20;
    var hi = Math.ceil(maxP / 20) * 20;
    var range = hi - lo || 1;

    function x(i) { return padL + (i / (data.length - 1)) * plotW; }
    function y(p) { return padT + plotH - ((p - lo) / range) * plotH; }

    // Build smoothed area + line path
    var linePath = '', areaPath = '';
    data.forEach(function (d, i) {
      var px = x(i), py = y(d.price);
      linePath += (i === 0 ? 'M' : 'L') + px.toFixed(1) + ' ' + py.toFixed(1) + ' ';
    });
    areaPath = linePath + 'L' + x(data.length - 1).toFixed(1) + ' ' + (padT + plotH) +
               ' L' + padL + ' ' + (padT + plotH) + ' Z';

    // Y axis gridlines + labels
    var grid = '', yLabels = '';
    var steps = 5;
    for (var s = 0; s <= steps; s++) {
      var val = lo + (range / steps) * s;
      var gy = y(val);
      grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) +
              '" y2="' + gy.toFixed(1) + '" class="ffy-pc-grid"/>';
      yLabels += '<text x="' + (padL - 8) + '" y="' + (gy + 4).toFixed(1) +
                 '" class="ffy-pc-ylabel">' + Math.round(val) + '</text>';
    }

    // X axis month labels
    var xLabels = '';
    var lastMonth = -1;
    data.forEach(function (d, i) {
      var mo = new Date(d.date).getMonth();
      if (mo !== lastMonth) {
        lastMonth = mo;
        var names = ['Led','Úno','Bře','Dub','Kvě','Čvn','Čvc','Srp','Zář','Říj','Lis','Pro'];
        xLabels += '<text x="' + x(i).toFixed(1) + '" y="' + (H - padB + 20) +
                   '" class="ffy-pc-xlabel">' + names[mo] + '</text>';
      }
    });

    // Current value
    var current = data[data.length - 1];
    var avg = (prices.reduce(function (a, b) { return a + b; }, 0) / prices.length);

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ffy-pc-svg" preserveAspectRatio="xMidYMid meet">' +
      '<defs><linearGradient id="ffyPcGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#45e7a3" stop-opacity="0.28"/>' +
      '<stop offset="100%" stop-color="#45e7a3" stop-opacity="0"/></linearGradient></defs>' +
      grid + yLabels + xLabels +
      '<path d="' + areaPath + '" fill="url(#ffyPcGrad)"/>' +
      '<path d="' + linePath + '" class="ffy-pc-line"/>' +
      '<circle cx="' + x(data.length - 1).toFixed(1) + '" cy="' + y(current.price).toFixed(1) +
      '" r="4" class="ffy-pc-dot"/>' +
      '</svg>';

    el.innerHTML =
      '<div class="ffy-pc-head">' +
        '<div class="ffy-pc-stat"><div class="ffy-pc-stat-label">Aktuální cena</div>' +
          '<div class="ffy-pc-stat-val">' + current.price.toFixed(1) + ' <span>€/MWh</span></div></div>' +
        '<div class="ffy-pc-stat"><div class="ffy-pc-stat-label">Roční průměr</div>' +
          '<div class="ffy-pc-stat-val">' + avg.toFixed(1) + ' <span>€/MWh</span></div></div>' +
        '<div class="ffy-pc-stat"><div class="ffy-pc-stat-label">Rozsah</div>' +
          '<div class="ffy-pc-stat-val">' + Math.round(minP) + '–' + Math.round(maxP) + ' <span>€/MWh</span></div></div>' +
      '</div>' + svg +
      '<div class="ffy-pc-foot">Denní průměr spotové ceny elektřiny · zdroj: OTE, a.s. (denní trh) · ' +
        'data za posledních ' + data.length + ' dní</div>';
  }

  function init() {
    var els = document.querySelectorAll('#ffy-price-chart, .ffy-price-chart');
    els.forEach(function (el) {
      getData(el, function (data) {
        // Sort by date ascending
        data = data.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
        render(el, data);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
