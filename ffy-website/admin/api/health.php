<?php
/* GET /api/health → 200 OK  (editor podle toho pozná, že backend běží) */
require __DIR__ . '/config.php';
ffy_cors();
ffy_json(['ok' => true, 'service' => 'ffy-builder-api', 'version' => 1]);
