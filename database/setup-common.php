<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli' && !defined('EBL_AUTHORIZED_SETUP')){http_response_code(404);exit;}
require_once dirname(__DIR__).'/api/bootstrap.php';
function setup_schema(): void {
    foreach(['pdo_mysql','mbstring'] as $extension)if(!extension_loaded($extension))throw new RuntimeException('PHP-Erweiterung fehlt: '.$extension);
    $sql=file_get_contents(__DIR__.'/schema.sql');
    if($sql===false)throw new RuntimeException('schema.sql fehlt.');
    // DDL bewusst vor der Datentransaktion: MySQL führt implizite Commits aus.
    foreach(explode(';',$sql) as $statement)if(trim($statement))db()->exec($statement);
    $catalog=file_get_contents(dirname(__DIR__).'/data/catalog.json');
    if($catalog===false)throw new RuntimeException('Startkatalog fehlt.');
    json_decode($catalog,false,64,JSON_THROW_ON_ERROR);
    run('INSERT IGNORE INTO catalogs (id,body,revision) VALUES (1,?,1)',[$catalog]);
}
function setup_admin(string $name,string $email,string $password,bool $firstOnly=false): void {
    $name=trim($name);$email=strtolower(trim($email));
    if(!$name||mb_strlen($name)>150||strlen($email)>254||!filter_var($email,FILTER_VALIDATE_EMAIL))throw new InvalidArgumentException('Gültigen Namen und eine E-Mail-Adresse eingeben.');
    if(!password_valid($password))throw new InvalidArgumentException('Passwort benötigt 12–256 Zeichen.');
    $hash=password_hash($password,PASSWORD_DEFAULT);
    db()->beginTransaction();
    try {
        // Singleton-Zeile serialisiert parallele Ersteinrichtungen.
        run('SELECT id FROM catalogs WHERE id=1 FOR UPDATE')->fetch();
        if($firstOnly&&(int)run('SELECT COUNT(*) AS n FROM users')->fetch()['n']>0)throw new LogicException('Bereits eingerichtet. Browserinstallation ist gesperrt.');
        if(run('SELECT id FROM users WHERE email=?',[$email])->fetch())throw new LogicException('Konto existiert bereits und wurde nicht verändert.');
        run('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,\'admin\')',[$name,$email,$hash]);
        db()->commit();
    }catch(Throwable $e){if(db()->inTransaction())db()->rollBack();throw $e;}
}
