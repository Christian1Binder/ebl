import {spawn,spawnSync} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const token=randomBytes(32).toString('hex');
const env={...process.env,EBL_DB_NAME:'ebl_setup_test',EBL_SETUP_ENABLED:'1',EBL_SETUP_TOKEN_HASH:createHash('sha256').update(token).digest('hex')};
const create=spawnSync('php',['-r',`require 'api/bootstrap.php'; db()->exec('CREATE DATABASE IF NOT EXISTS ebl_setup_test CHARACTER SET utf8mb4');`],{env:process.env,encoding:'utf8'});assert.equal(create.status,0,create.stderr);
const server=spawn('php',['-S','127.0.0.1:8081','-t','.'],{env,stdio:'ignore'});
let cookie='';
async function request(body){const r=await fetch('http://127.0.0.1:8081/api/setup.php',{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(body?{body:new URLSearchParams(body)}:{})});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return {status:r.status,text:await r.text()};}
try{
  let initial;for(let i=0;i<30;i++){try{initial=await request();break;}catch{await new Promise(r=>setTimeout(r,100));}}
  assert.equal(initial.status,200);const csrf=initial.text.match(/name="csrf" value="([a-f0-9]+)"/)[1];
  const body={csrf,token,name:'Setup Admin',email:'setup@example.test',password:'setup-test-password',repeat:'setup-test-password'};
  assert.equal((await request({...body,token:'x'.repeat(64)})).status,403);
  assert.equal((await request({...body,csrf:'wrong'})).status,403);
  assert.equal((await request({...body,repeat:'different-password'})).status,400);
  assert.equal((await request(body)).status,201);
  assert.equal((await request(body)).status,410);
  const check=spawnSync('php',['database/check.php'],{env,encoding:'utf8'});assert.equal(check.status,0,check.stderr);
  const duplicate=spawnSync('php',['database/install.php','--name=Other','--email=setup@example.test'],{env:{...env,EBL_ADMIN_PASSWORD:'other-test-password'},encoding:'utf8'});assert.equal(duplicate.status,1);assert(duplicate.stderr.includes('existiert bereits'));
  // Ein wiederholter Versuch darf das erste Passwort nicht ersetzen.
  const verify=spawnSync('php',['-r',`require 'api/bootstrap.php'; $u=run('SELECT password_hash FROM users WHERE email=?',['setup@example.test'])->fetch(); exit(password_verify('setup-test-password',$u['password_hash'])?0:1);`],{env});assert.equal(verify.status,0);
  const disabled=await fetch('http://127.0.0.1:8080/api/setup.php');assert.equal(disabled.status,404);
  console.log('Setup geprüft: Schlüssel, CSRF, Passwortabgleich, Erstinstallation, Sperre, CLI-Diagnose und Schutz bestehender Konten.');
}finally{server.kill();}
