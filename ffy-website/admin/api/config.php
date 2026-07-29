<?php
/* ════════════════════════════════════════════
   FREE for YOU — Backend API (config + helpers)
   ════════════════════════════════════════════
   Společná konfigurace a pomocné funkce.
   Uprav hodnoty v sekci KONFIGURACE níže.
   ════════════════════════════════════════════ */

// ══════════ KONFIGURACE ══════════

// Heslo do editoru. ZMĚŇ HO! (nebo použij hash — viz login.php)
define('FFY_PASSWORD', 'zmen-toto-heslo');

// Kořen webu (kde leží styles.css, media/, docs/, jednotlivé .html).
// __DIR__ je admin/api, takže o dvě úrovně výš je root webu.
define('WEB_ROOT', realpath(__DIR__ . '/../..'));

// Povolené složky pro upload/výpis souborů
$ALLOWED_DIRS = ['media', 'docs'];

// Povolené přípony pro upload
$ALLOWED_EXT = [
  'media' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'],
  'docs'  => ['pdf', 'xlsx', 'xls', 'docx', 'doc', 'zip', 'csv'],
];

// Max velikost uploadu (bytů) — 20 MB
define('MAX_UPLOAD', 20 * 1024 * 1024);

// ══════════ HELPERY ══════════

function ffy_json($data, $code = 200) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function ffy_error($msg, $code = 400) {
  ffy_json(['ok' => false, 'message' => $msg], $code);
}

// Spustí session a ověří přihlášení
function ffy_require_auth() {
  if (session_status() === PHP_SESSION_NONE) session_start();
  if (empty($_SESSION['ffy_authed'])) {
    ffy_error('Nepřihlášeno', 401);
  }
}

// Bezpečné složení cesty — brání path traversal
function ffy_safe_path($dir, $name = '') {
  global $ALLOWED_DIRS;
  if (!in_array($dir, $ALLOWED_DIRS, true)) {
    ffy_error('Neplatná složka', 400);
  }
  $base = WEB_ROOT . '/' . $dir;
  if (!is_dir($base)) @mkdir($base, 0755, true);
  if ($name === '') return $base;

  // Sanitace názvu: jen basename, žádné ../ ani lomítka
  $name = basename($name);
  if ($name === '' || $name[0] === '.') ffy_error('Neplatný název souboru', 400);
  $full = $base . '/' . $name;

  // Ověř, že výsledná cesta je opravdu uvnitř base
  $realBase = realpath($base);
  $realDir = realpath(dirname($full));
  if ($realDir === false || strpos($realDir, $realBase) !== 0) {
    ffy_error('Nepovolená cesta', 400);
  }
  return $full;
}

// CORS/preflight (pro jistotu, i když je vše na stejné doméně)
function ffy_cors() {
  header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
}
