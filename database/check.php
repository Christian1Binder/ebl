<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/api/bootstrap.php';
try{
    if(version_compare(PHP_VERSION,'8.2','<'))throw new RuntimeException('PHP 8.2+ erforderlich.');
    foreach(['pdo_mysql','mbstring'] as $ext)if(!extension_loaded($ext))throw new RuntimeException('Erweiterung fehlt: '.$ext);
    foreach(['users','catalogs','user_state','login_attempts'] as $table)run('SELECT 1 FROM '.$table.' LIMIT 1');
    $row=run('SELECT body,revision FROM catalogs WHERE id=1')->fetch();if(!$row)throw new RuntimeException('Startkatalog fehlt.');
    $catalog=json_decode($row['body'],true,64,JSON_THROW_ON_ERROR);
    $admins=(int)run("SELECT COUNT(*) AS n FROM users WHERE role='admin' AND active=1")->fetch()['n'];
    if(!$admins)throw new RuntimeException('Aktives Admin-Konto fehlt.');
    echo 'OK: PHP '.PHP_VERSION.', Datenbankverbindung, vier Tabellen, '.count($catalog['courses']).' Kurse, Revision '.$row['revision'].', aktiver Admin vorhanden.'.PHP_EOL;
}catch(Throwable $e){fwrite(STDERR,'Prüfung fehlgeschlagen: '.$e->getMessage().PHP_EOL);exit(1);}
