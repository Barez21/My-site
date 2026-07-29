<?php
/* POST /api/publish  body: {pages:[{slug,html}]} → {ok:true,published:N} */
require __DIR__ . '/config.php';
ffy_cors();
ffy_require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') ffy_error('Použij POST', 405);

$body = json_decode(file_get_contents('php://input'), true);
if (empty($body['pages']) || !is_array($body['pages'])) {
  ffy_error('Chybí seznam stránek', 400);
}

// Záložní složka pro publikaci (staging → produkce workflow)
$backupDir = WEB_ROOT . '/admin/backups/publish-' . date('Ymd-His');
@mkdir($backupDir, 0755, true);

$published = [];
$errors = [];

foreach ($body['pages'] as $page) {
  $slug = isset($page['slug']) ? $page['slug'] : '';
  $html = isset($page['html']) ? $page['html'] : '';

  // Sanitace slug: povolené jen a-z0-9-/ (kvůli blog/ podsložce)
  if (!preg_match('#^[a-z0-9/_-]+$#i', $slug)) {
    $errors[] = "$slug: neplatný název";
    continue;
  }
  // Zákaz path traversal
  if (strpos($slug, '..') !== false) { $errors[] = "$slug: nepovolená cesta"; continue; }

  $target = WEB_ROOT . '/' . $slug . '.html';
  $targetDir = dirname($target);

  // Ověř, že cíl je uvnitř WEB_ROOT
  $realRoot = realpath(WEB_ROOT);
  if (!is_dir($targetDir)) @mkdir($targetDir, 0755, true);
  $realDir = realpath($targetDir);
  if ($realDir === false || strpos($realDir, $realRoot) !== 0) {
    $errors[] = "$slug: cesta mimo web";
    continue;
  }

  // Záloha stávajícího souboru
  if (is_file($target)) {
    $bakName = str_replace('/', '__', $slug) . '.html';
    @copy($target, $backupDir . '/' . $bakName);
  }

  if (file_put_contents($target, $html) === false) {
    $errors[] = "$slug: zápis selhal";
    continue;
  }
  @chmod($target, 0644);
  $published[] = $slug;
}

ffy_json([
  'ok' => count($errors) === 0,
  'published' => count($published),
  'pages' => $published,
  'errors' => $errors,
  'backup' => basename($backupDir),
]);
