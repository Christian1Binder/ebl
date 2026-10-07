<?php
declare(strict_types=1);
// Ausschließlich per CLI. Der Browserinstaller ist separat und standardmäßig deaktiviert.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require __DIR__.'/setup-common.php';
$options=getopt('',['name:','email:']);
$name=$options['name']??'';$email=strtolower($options['email']??'');
if(!$name||!filter_var($email,FILTER_VALIDATE_EMAIL)){fwrite(STDERR,"Aufruf: php database/install.php --name=\"Admin Name\" --email=\"admin@example.org\"\nPasswort sicher über EBL_ADMIN_PASSWORD setzen (mindestens 12 Zeichen).\n");exit(1);}
$password=getenv('EBL_ADMIN_PASSWORD');
if(!password_valid($password)){fwrite(STDERR,"EBL_ADMIN_PASSWORD fehlt oder ist zu kurz (12–256 Zeichen).\n");exit(1);}
try{
    setup_schema();
    setup_admin($name,$email,$password);
    fwrite(STDOUT,"Schema, Startkatalog und Admin-Konto eingerichtet.\n");
}catch(Throwable $e){fwrite(STDERR,"Installation fehlgeschlagen: ".$e->getMessage()."\n");exit(1);}
