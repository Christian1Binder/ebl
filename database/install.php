<?php
declare(strict_types=1);
// Ausschließlich per CLI. Es gibt bewusst keinen öffentlichen Setup-Endpunkt.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require dirname(__DIR__).'/api/bootstrap.php';
$options=getopt('',['name:','email:']);
$name=$options['name']??'';$email=strtolower($options['email']??'');
if(!$name||!filter_var($email,FILTER_VALIDATE_EMAIL)){fwrite(STDERR,"Aufruf: php database/install.php --name=\"Admin Name\" --email=\"admin@example.org\"\nPasswort sicher über EBL_ADMIN_PASSWORD setzen (mindestens 12 Zeichen).\n");exit(1);}
$password=getenv('EBL_ADMIN_PASSWORD');
if(!password_valid($password)){fwrite(STDERR,"EBL_ADMIN_PASSWORD fehlt oder ist zu kurz (12–256 Zeichen).\n");exit(1);}
try{
    $schema=file_get_contents(__DIR__.'/schema.sql');
    // Nur die eigenen, statischen DDL-Anweisungen – niemals Nutzereingaben.
    foreach(explode(';',$schema) as $statement)if(trim($statement))db()->exec($statement);
    $catalog=file_get_contents(dirname(__DIR__).'/data/catalog.json');
    run('INSERT IGNORE INTO catalogs (id,body,revision) VALUES (1,?,1)',[$catalog]);
    if(run('SELECT id FROM users WHERE email=?',[$email])->fetch()){fwrite(STDERR,"Dieses Konto existiert bereits; es wurde nicht verändert.\n");exit(1);}
    run('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,\'admin\')',[$name,$email,password_hash($password,PASSWORD_DEFAULT)]);
    fwrite(STDOUT,"Schema, Startkatalog und Admin-Konto eingerichtet.\n");
}catch(Throwable $e){fwrite(STDERR,"Installation fehlgeschlagen: ".$e->getMessage()."\n");exit(1);}
