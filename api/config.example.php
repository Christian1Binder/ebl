<?php
declare(strict_types=1);
// Kopie als config.local.php anlegen. Die Kopie ist aus Git ausgeschlossen.
// Alternativ die folgenden EBL_*-Variablen im Webspace setzen.
return [
    'db' => [
        'host' => getenv('EBL_DB_HOST') ?: '127.0.0.1',
        'port' => getenv('EBL_DB_PORT') ?: '3306',
        'name' => getenv('EBL_DB_NAME') ?: 'ebl',
        'user' => getenv('EBL_DB_USER') ?: 'ebl',
        'password' => getenv('EBL_DB_PASSWORD') ?: 'CHANGE_ME',
    ],
    // Auf produktivem Webspace immer true; false nur für lokale HTTP-Tests.
    'secure_cookies' => getenv('EBL_LOCAL_HTTP') !== '1',
    'session_timeout' => 7200,
];
