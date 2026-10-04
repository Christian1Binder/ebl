<?php
declare(strict_types=1);
require __DIR__.'/bootstrap.php';
require __DIR__.'/validation.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
ini_set('display_errors','0');
try {
    $config=settings();
    ini_set('session.use_strict_mode','1');ini_set('session.use_only_cookies','1');
    session_name('EBL_SESSION');
    $cookiePath=rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])),'/').'/';
    session_set_cookie_params(['lifetime'=>0,'path'=>$cookiePath,'secure'=>$config['secure_cookies'],'httponly'=>true,'samesite'=>'Lax']);
    session_start();
    if(isset($_SESSION['last_activity'])&&time()-$_SESSION['last_activity']>$config['session_timeout']){$_SESSION=[];session_regenerate_id(true);}
    $_SESSION['last_activity']=time();
    $_SESSION['csrf']??=bin2hex(random_bytes(32));
    $method=$_SERVER['REQUEST_METHOD'];$action=$_GET['action']??'';
    if(!in_array($method,['GET','POST'],true))fail('Methode nicht unterstützt.',405);
    $data=new stdClass();
    if($method==='POST'){
        if((int)($_SERVER['CONTENT_LENGTH']??0)>4194304)fail('Anfrage zu groß (maximal 4 MB).',413);
        if(!hash_equals($_SESSION['csrf'],$_SERVER['HTTP_X_CSRF_TOKEN']??''))fail('Sicherheitsprüfung fehlgeschlagen. Lade die Seite neu.',403);
        $raw=file_get_contents('php://input',false,null,0,4194305);if(strlen($raw)>4194304)fail('Anfrage zu groß.',413);
        $data=json_decode($raw,false,64,JSON_THROW_ON_ERROR);if(!$data instanceof stdClass)fail('Ein JSON-Objekt wird erwartet.');
    }
    if($action==='session'&&$method==='GET')out(['user'=>user(),'csrf'=>$_SESSION['csrf']]);
    if($action==='login'&&$method==='POST'){
        $email=strtolower(trim((string)($data->email??'')));$password=$data->password??'';
        if(!is_string($password)||strlen($password)>256||strlen($email)>254)fail('Anmeldung fehlgeschlagen.',401);
        // Eigene E-Mail- und IP-Limits verhindern Umgehung durch wechselnde Namen.
        $keys=[hash('sha256','email:'.$email),hash('sha256','ip:'.($_SERVER['REMOTE_ADDR']??''))];$now=time();
        db()->beginTransaction();
        foreach($keys as $i=>$key){run('INSERT IGNORE INTO login_attempts (fingerprint,attempts,window_started) VALUES (?,0,?)',[$key,$now]);$attempt=run('SELECT attempts,window_started FROM login_attempts WHERE fingerprint=? FOR UPDATE',[$key])->fetch();if($now-(int)$attempt['window_started']>900){run('UPDATE login_attempts SET attempts=0,window_started=? WHERE fingerprint=?',[$now,$key]);$attempt['attempts']=0;}if((int)$attempt['attempts']>=($i===0?8:40)){db()->rollBack();fail('Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.',429);}run('UPDATE login_attempts SET attempts=attempts+1 WHERE fingerprint=?',[$key]);}
        db()->commit();
        $u=run('SELECT * FROM users WHERE email=?',[$email])->fetch();
        // Gleicher aufwendiger Passwortvergleich auch für unbekannte Konten.
        $dummy='$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi';
        $valid=password_verify($password,$u['password_hash']??$dummy);
        if(!$valid||!$u||!$u['active'])fail('E-Mail oder Passwort ist nicht korrekt.',401);
        run('DELETE FROM login_attempts WHERE fingerprint=?',[$keys[0]]);
        run('DELETE FROM login_attempts WHERE window_started<?',[$now-86400]);
        if(password_needs_rehash($u['password_hash'],PASSWORD_DEFAULT))run('UPDATE users SET password_hash=? WHERE id=?',[password_hash($password,PASSWORD_DEFAULT),$u['id']]);
        session_regenerate_id(true);$_SESSION['user_id']=(int)$u['id'];$_SESSION['auth_version']=(int)$u['auth_version'];$_SESSION['csrf']=bin2hex(random_bytes(32));
        out(['user'=>user(),'csrf'=>$_SESSION['csrf']]);
    }
    if($action==='logout'&&$method==='POST'){$_SESSION=[];session_regenerate_id(true);out(['ok'=>true]);}
    $u=require_user();
    if($action==='catalog'){
        if($method==='GET'){$r=run('SELECT body,revision FROM catalogs WHERE id=1')->fetch();if(!$r)fail('Kurskatalog noch nicht eingerichtet.',503);$catalog=json_decode($r['body']);$catalog->revision=(int)$r['revision'];out($catalog);}
        require_user(['admin','editor']);validate_catalog($data->catalog??null);
        if(!is_int($data->revision??null))fail('Revision fehlt.');
        $s=run('UPDATE catalogs SET body=?,revision=revision+1,updated_by=? WHERE id=1 AND revision=?',[json_encode($data->catalog,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$u['id'],$data->revision]);
        if(!$s->rowCount())fail('Der Katalog wurde inzwischen geändert. Exportiere deine Änderung und lade den aktuellen Stand neu.',409);
        out(['revision'=>$data->revision+1]);
    }
    if($action==='state'){
        run('INSERT IGNORE INTO user_state (user_id,body,revision) VALUES (?,?,1)',[$u['id'],json_encode(new_state())]);
        if($method==='GET'){$r=run('SELECT body,revision FROM user_state WHERE user_id=?',[$u['id']])->fetch();out(['state'=>json_decode($r['body']),'revision'=>(int)$r['revision']]);}
        validate_state($data->state??null);if(!is_int($data->revision??null))fail('Revision fehlt.');
        $s=run('UPDATE user_state SET body=?,revision=revision+1 WHERE user_id=? AND revision=?',[json_encode($data->state,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR),$u['id'],$data->revision]);
        if(!$s->rowCount())fail('Dein Lernstand wurde in einer anderen Sitzung geändert. Lade die Seite neu, bevor du weitermachst.',409);
        out(['revision'=>$data->revision+1]);
    }
    if($action==='password'&&$method==='POST'){
        if(!password_valid($data->password??null)||!is_string($data->current??null))fail('Neues Passwort: mindestens 12, höchstens 256 Zeichen.');
        $old=run('SELECT password_hash FROM users WHERE id=?',[$u['id']])->fetch();if(!password_verify($data->current,$old['password_hash']))fail('Aktuelles Passwort ist nicht korrekt.',403);
        run('UPDATE users SET password_hash=?,auth_version=auth_version+1 WHERE id=?',[password_hash($data->password,PASSWORD_DEFAULT),$u['id']]);
        $_SESSION['auth_version']=(int)run('SELECT auth_version FROM users WHERE id=?',[$u['id']])->fetch()['auth_version'];session_regenerate_id(true);out(['ok'=>true]);
    }
    if($action==='users'){
        require_user(['admin']);
        if($method==='GET'){$users=run('SELECT id,name,email,role,active FROM users ORDER BY name')->fetchAll();foreach($users as &$item){$item['id']=(int)$item['id'];$item['active']=(bool)$item['active'];}out(['users'=>$users]);}
        if(($data->op??'')==='create'){
            [$name,$email,$role]=account_fields($data);if(!password_valid($data->password??null))fail('Startpasswort muss mindestens 12 Zeichen lang sein.');
            if(run('SELECT id FROM users WHERE email=?',[$email])->fetch())fail('Diese E-Mail-Adresse ist bereits vergeben.',409);
            run('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)',[$name,$email,password_hash($data->password,PASSWORD_DEFAULT),$role]);out(['ok'=>true],201);
        }
        if(($data->op??'')==='update'){
            if(!is_int($data->id??null)||!is_bool($data->active??null)||!in_array($data->role??null,['user','editor','admin'],true))fail('Ungültige Kontoänderung.');
            if($data->id===$u['id']&&(!$data->active||$data->role!=='admin'))fail('Das eigene Admin-Konto darf hier nicht deaktiviert oder herabgestuft werden.');
            $newPassword=$data->password??'';if($newPassword!==''&&!password_valid($newPassword))fail('Neues Passwort muss mindestens 12 Zeichen lang sein.');
            db()->beginTransaction();$accounts=run('SELECT id,role,active FROM users ORDER BY id FOR UPDATE')->fetchAll();$target=null;$admins=0;foreach($accounts as $a){if((int)$a['id']===$data->id)$target=$a;if($a['role']==='admin'&&$a['active'])$admins++;}
            if(!$target){db()->rollBack();fail('Konto nicht gefunden.',404);}if($target['role']==='admin'&&$target['active']&&$admins<=1&&(!$data->active||$data->role!=='admin')){db()->rollBack();fail('Mindestens ein aktives Admin-Konto muss erhalten bleiben.');}
            run('UPDATE users SET role=?,active=?,auth_version=auth_version+1 WHERE id=?',[$data->role,(int)$data->active,$data->id]);if($newPassword!=='')run('UPDATE users SET password_hash=? WHERE id=?',[password_hash($newPassword,PASSWORD_DEFAULT),$data->id]);db()->commit();
            if($data->id===$u['id'])$_SESSION['auth_version']=(int)run('SELECT auth_version FROM users WHERE id=?',[$u['id']])->fetch()['auth_version'];out(['ok'=>true]);
        }
        fail('Unbekannte Kontoaktion.');
    }
    fail('Endpunkt nicht gefunden.',404);
} catch (JsonException $e) {fail('Ungültiges JSON.',400);
} catch (Throwable $e) {
    if(isset($u))try{if(db()->inTransaction())db()->rollBack();}catch(Throwable $ignored){}
    error_log('EBL API: '.$e->getMessage());
    fail('Der Server ist noch nicht eingerichtet oder vorübergehend nicht erreichbar. Prüfe Konfiguration und Datenbank.',503);
}
