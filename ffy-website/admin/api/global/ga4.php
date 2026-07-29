<?php
/* GET /api/global/ga4 → {gtm_id:"GTM-XXXX"}
   PUT /api/global/ga4 → {ok:true}  (body {"gtm_id":"..."}) */
require __DIR__ . '/../config.php';
ffy_cors();
ffy_require_auth();

$jsPath = WEB_ROOT . '/analytics.js';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $id = 'GTM-XXXXXXX';
  if (is_file($jsPath)) {
    $content = file_get_contents($jsPath);
    if (preg_match("/GTM_ID\\s*=\\s*'([^']*)'/", $content, $m)) {
      $id = $m[1];
    }
  }
  ffy_json(['gtm_id' => $id]);
}

if ($method === 'PUT') {
  $body = json_decode(file_get_contents('php://input'), true);
  $id = isset($body['gtm_id']) ? trim($body['gtm_id']) : '';

  // Validace formátu GTM-XXXXXXX
  if (!preg_match('/^GTM-[A-Z0-9]+$/', $id)) {
    ffy_error('Neplatný formát GTM ID (očekává se GTM-XXXXXXX)', 400);
  }
  if (!is_file($jsPath)) ffy_error('analytics.js nenalezen', 404);

  $content = file_get_contents($jsPath);
  // Nahraď řádek GTM_ID = '...'
  $new = preg_replace("/(GTM_ID\\s*=\\s*')[^']*(')/", '${1}' . $id . '${2}', $content, 1, $count);
  if ($count === 0) ffy_error('V analytics.js nenalezen řádek GTM_ID', 500);

  // Záloha
  $backupDir = WEB_ROOT . '/admin/backups';
  if (!is_dir($backupDir)) @mkdir($backupDir, 0755, true);
  @copy($jsPath, $backupDir . '/analytics-' . date('Ymd-His') . '.js');

  if (file_put_contents($jsPath, $new) === false) {
    ffy_error('Nepodařilo se zapsat analytics.js (zkontroluj práva)', 500);
  }
  ffy_json(['ok' => true]);
}

ffy_error('Nepodporovaná metoda', 405);
