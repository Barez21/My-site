<?php
/* POST /api/login  body: {"password":"..."} → {"ok":true} */
require __DIR__ . '/config.php';
ffy_cors();
if (session_status() === PHP_SESSION_NONE) session_start();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') ffy_error('Použij POST', 405);

$body = json_decode(file_get_contents('php://input'), true);
$pwd = isset($body['password']) ? $body['password'] : '';

// Ověření hesla.
// Doporučení: místo plain textu použij hash. Vygeneruj:
//   php -r "echo password_hash('tveheslo', PASSWORD_DEFAULT);"
// a nahraď porovnání za: password_verify($pwd, FFY_PASSWORD_HASH)
if ($pwd !== '' && hash_equals(FFY_PASSWORD, $pwd)) {
  $_SESSION['ffy_authed'] = true;
  ffy_json(['ok' => true]);
} else {
  // Malá prodleva proti brute-force
  usleep(500000);
  ffy_error('Nesprávné heslo', 401);
}
