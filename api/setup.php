<?php
declare(strict_types=1);
require __DIR__.'/bootstrap.php';
ini_set('display_errors','0');
header('Cache-Control: no-store');header('X-Content-Type-Options: nosniff');header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; style-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'");
function setup_page(string $message='',int $status=200,bool $finished=false): never {
    http_response_code($status);$e=fn($s)=>htmlspecialchars($s,ENT_QUOTES,'UTF-8');
    echo '<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EBL · Ersteinrichtung</title><link rel="stylesheet" href="../assets/style.css"><div class="shell"><main><h1>EBL einrichten.</h1><div class="panel"><p role="status">'.$e($message).'</p>';
    if(!$finished)echo '<form method="post" class="form-stack"><input type="hidden" name="csrf" value="'.$e($_SESSION['csrf']).'"><label>Einrichtungsschlüssel<input type="password" name="token" autocomplete="off" required maxlength="256"></label><label>Admin-Name<input name="name" required maxlength="150"></label><label>Admin-E-Mail<input type="email" name="email" required maxlength="254"></label><label>Admin-Passwort (mindestens 12 Zeichen)<input type="password" name="password" autocomplete="new-password" required minlength="12" maxlength="256"></label><label>Passwort wiederholen<input type="password" name="repeat" autocomplete="new-password" required minlength="12" maxlength="256"></label><button class="button">Datenbank und Admin einrichten</button></form>';
    echo '</div></main></div></html>';exit;
}
try{
    $config=settings();$setup=$config['setup']??[];
    if(($setup['enabled']??false)!==true||!preg_match('/^[a-f0-9]{64}$/D',$setup['token_hash']??'')){http_response_code(404);exit;}
    if($config['secure_cookies']&&($_SERVER['HTTPS']??'')!=='on'&&($_SERVER['SERVER_PORT']??'')!=='443'){http_response_code(403);exit('HTTPS erforderlich. Bei TLS-Proxy die HTTPS-Erkennung mit dem Hoster konfigurieren.');}
    ini_set('session.use_strict_mode','1');session_name('EBL_SETUP');
    session_set_cookie_params(['path'=>rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])),'/').'/','secure'=>$config['secure_cookies'],'httponly'=>true,'samesite'=>'Strict']);session_start();
    $_SESSION['csrf']??=bin2hex(random_bytes(32));
    if($_SERVER['REQUEST_METHOD']==='GET')setup_page('Geschützte Ersteinrichtung. Bestehende Inhalte werden nicht überschrieben.');
    if($_SERVER['REQUEST_METHOD']!=='POST')setup_page('Methode nicht unterstützt.',405,true);
    if((int)($_SERVER['CONTENT_LENGTH']??0)>8192)setup_page('Anfrage zu groß.',413);
    $token=$_POST['token']??null;
    if(!is_string($token)||strlen($token)<32||strlen($token)>256||!hash_equals($setup['token_hash'],hash('sha256',$token)))setup_page('Einrichtungsschlüssel ist nicht korrekt.',403);
    if(!is_string($_POST['csrf']??null)||!hash_equals($_SESSION['csrf'],$_POST['csrf']))setup_page('Formular abgelaufen. Lade die Seite neu.',403);
    foreach(['name','email','password','repeat'] as $field)if(!is_string($_POST[$field]??null))setup_page('Formular unvollständig.',400);
    if($_POST['password']!==$_POST['repeat'])setup_page('Passwörter stimmen nicht überein.',400);
    define('EBL_AUTHORIZED_SETUP',true);require dirname(__DIR__).'/database/setup-common.php';
    setup_schema();setup_admin($_POST['name'],$_POST['email'],$_POST['password'],true);
    $_SESSION=[];session_destroy();
    setup_page('Einrichtung abgeschlossen. Deaktiviere setup.enabled, entferne setup.token_hash und lösche api/setup.php sowie den Ordner database vom Webspace. Aktiviere danach backend: php in js/config.js und melde dich an.',201,true);
}catch(InvalidArgumentException $e){setup_page($e->getMessage(),400);
}catch(LogicException $e){setup_page($e->getMessage(),410,true);
}catch(Throwable $e){error_log('EBL Einrichtung: '.$e->getMessage());setup_page('Einrichtung fehlgeschlagen. Prüfe Datenbankzugang, PHP-Erweiterungen und hochgeladene Dateien; Details stehen im PHP-Fehlerprotokoll.',503,true);}
