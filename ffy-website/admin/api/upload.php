<?php
/* POST /api/upload  multipart: file, dir → {name,url} */
require __DIR__ . '/config.php';
ffy_cors();
ffy_require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') ffy_error('Použij POST', 405);
if (empty($_FILES['file'])) ffy_error('Chybí soubor', 400);

$dir = isset($_POST['dir']) ? $_POST['dir'] : '';
$file = $_FILES['file'];

if ($file['error'] !== UPLOAD_ERR_OK) ffy_error('Chyba uploadu (kód ' . $file['error'] . ')', 400);
if ($file['size'] > MAX_UPLOAD) ffy_error('Soubor je příliš velký (max ' . round(MAX_UPLOAD/1024/1024) . ' MB)', 400);

// Kontrola přípony
global $ALLOWED_EXT;
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowed = isset($ALLOWED_EXT[$dir]) ? $ALLOWED_EXT[$dir] : [];
if (!in_array($ext, $allowed, true)) {
  ffy_error('Nepovolený typ souboru (.' . $ext . ')', 400);
}

// Bezpečný název (zachovej původní, ale sanituj)
$name = preg_replace('/[^a-zA-Z0-9._-]/', '-', basename($file['name']));
$target = ffy_safe_path($dir, $name);

// Když soubor existuje, přidej číslo
if (file_exists($target)) {
  $b = pathinfo($name, PATHINFO_FILENAME);
  $i = 1;
  do {
    $name = $b . '-' . $i . '.' . $ext;
    $target = ffy_safe_path($dir, $name);
    $i++;
  } while (file_exists($target));
}

if (!move_uploaded_file($file['tmp_name'], $target)) {
  ffy_error('Nepodařilo se uložit soubor', 500);
}
@chmod($target, 0644);

/* ── Volitelně: optimalizace obrázků (WebP) ──
   Pokud je GD dostupné a jde o obrázek, můžeš tu vygenerovat
   zmenšeniny / WebP. Základní příklad zakomentovaný: */
// if ($dir === 'media' && in_array($ext, ['jpg','jpeg','png'])) {
//   ffy_maybe_webp($target);
// }

ffy_json(['name' => $name, 'url' => $dir . '/' . $name, 'size' => filesize($target)]);
