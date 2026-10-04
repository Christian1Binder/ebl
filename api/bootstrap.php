<?php
declare(strict_types=1);
function settings(): array {
    static $config;
    if ($config === null) {
        $path = __DIR__ . '/config.local.php';
        if (!is_file($path)) throw new RuntimeException('Serverkonfiguration fehlt.');
        $config = require $path;
    }
    return $config;
}
function db(): PDO {
    static $pdo;
    if (!$pdo) {
        $c = settings()['db'];
        $pdo = new PDO("mysql:host={$c['host']};port={$c['port']};dbname={$c['name']};charset=utf8mb4", $c['user'], $c['password'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES=>false]);
    }
    return $pdo;
}
function run(string $sql, array $params=[]): PDOStatement {$s=db()->prepare($sql);$s->execute($params);return $s;}
function out(mixed $value,int $status=200): never {http_response_code($status);echo json_encode($value,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);exit;}
function fail(string $message,int $status=400): never {out(['error'=>$message],$status);}
function new_state(): stdClass {return json_decode('{"completed":{},"quizResults":{},"notes":{},"reviews":{},"tasks":[],"bookmarks":[],"lastLesson":null,"activity":[]}');}
function user(): ?array {
    if (empty($_SESSION['user_id'])) return null;
    $u=run('SELECT id,name,email,role,active,auth_version FROM users WHERE id=?',[$_SESSION['user_id']])->fetch();
    if (!$u || !$u['active'] || (int)$u['auth_version'] !== (int)($_SESSION['auth_version']??0)) {unset($_SESSION['user_id'],$_SESSION['auth_version']);return null;}
    return ['id'=>(int)$u['id'],'name'=>$u['name'],'email'=>$u['email'],'role'=>$u['role']];
}
function require_user(array $roles=[]): array {$u=user();if(!$u)fail('Bitte melde dich erneut an.',401);if($roles&&!in_array($u['role'],$roles,true))fail('Dafür fehlen die erforderlichen Rechte.',403);return $u;}
function password_valid(mixed $password): bool {return is_string($password)&&strlen($password)>=12&&strlen($password)<=256;}
function account_fields(stdClass $data): array {
    $name=trim((string)($data->name??''));$email=strtolower(trim((string)($data->email??'')));$role=$data->role??'user';
    if(!$name||strlen($name)>600||mb_strlen($name)>150)fail('Name fehlt oder ist zu lang.');
    if(strlen($email)>254||!filter_var($email,FILTER_VALIDATE_EMAIL))fail('Ungültige E-Mail-Adresse.');
    if(!in_array($role,['user','editor','admin'],true))fail('Ungültige Rolle.');
    return [$name,$email,$role];
}
