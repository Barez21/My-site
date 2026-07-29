<?php
/* GET    /api/files?dir=media       → [{name,url,size,date}]
   DELETE /api/files?dir=&name=      → {ok:true}                */
require __DIR__ . '/config.php';
ffy_cors();
ffy_require_auth();

$dir = isset($_GET['dir']) ? $_GET['dir'] : '';
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $base = ffy_safe_path($dir);
  $out = [];
  if (is_dir($base)) {
    foreach (scandir($base) as $f) {
      if ($f === '.' || $f === '..' || $f[0] === '.') continue;
      $full = $base . '/' . $f;
      if (!is_file($full)) continue;
      $out[] = [
        'name' => $f,
        'url'  => $dir . '/' . $f,          // veřejná cesta relativní k rootu webu
        'size' => filesize($full),
        'date' => filemtime($full) * 1000,   // ms pro JS
      ];
    }
  }
  // Seřaď od nejnovějších
  usort($out, function ($a, $b) { return $b['date'] - $a['date']; });
  ffy_json($out);
}

if ($method === 'DELETE') {
  $name = isset($_GET['name']) ? $_GET['name'] : '';
  $full = ffy_safe_path($dir, $name);
  if (is_file($full) && @unlink($full)) {
    ffy_json(['ok' => true]);
  }
  ffy_error('Soubor nenalezen nebo nelze smazat', 404);
}

ffy_error('Nepodporovaná metoda', 405);
