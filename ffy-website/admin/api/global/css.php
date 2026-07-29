<?php
/* GET /api/global/css → text (styles.css)
   PUT /api/global/css → {ok:true}          */
require __DIR__ . '/../config.php';
ffy_cors();
ffy_require_auth();

$cssPath = WEB_ROOT . '/styles.css';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  if (!is_file($cssPath)) { header('Content-Type: text/css'); echo ''; exit; }
  header('Content-Type: text/css; charset=utf-8');
  echo file_get_contents($cssPath);
  exit;
}

if ($method === 'PUT') {
  $css = file_get_contents('php://input');
  if (strlen($css) > 2 * 1024 * 1024) ffy_error('CSS je příliš velké', 400);

  // Záloha před přepsáním
  if (is_file($cssPath)) {
    $backupDir = WEB_ROOT . '/admin/backups';
    if (!is_dir($backupDir)) @mkdir($backupDir, 0755, true);
    @copy($cssPath, $backupDir . '/styles-' . date('Ymd-His') . '.css');
  }

  if (file_put_contents($cssPath, $css) === false) {
    ffy_error('Nepodařilo se zapsat styles.css (zkontroluj práva)', 500);
  }
  ffy_json(['ok' => true]);
}

ffy_error('Nepodporovaná metoda', 405);
