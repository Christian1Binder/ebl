// Integration gegen eine eigene, kurzlebige MySQL-Testdatenbank.
import assert from 'node:assert/strict';
const base=process.env.EBL_TEST_URL||'http://127.0.0.1:8080/api/index.php';
const createClient=()=>({cookie:'',csrf:'',async call(action,method='GET',body,expected=200){const r=await fetch(`${base}?action=${action}`,{method,headers:{...(this.cookie?{Cookie:this.cookie}:{}),...(method==='POST'?{'Content-Type':'application/json','X-CSRF-Token':this.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});const set=r.headers.get('set-cookie');if(set)this.cookie=set.split(';')[0];const data=await r.json();assert.equal(r.status,expected,`${action}: ${JSON.stringify(data)}`);if(data.csrf)this.csrf=data.csrf;return data;}});
for(let i=0;i<30;i++){try{await fetch(base+'?action=session');break;}catch{await new Promise(r=>setTimeout(r,300));}}
const a=createClient(),u=createClient(),editor=createClient();
await a.call('session');await a.call('catalog','GET',undefined,401);
await a.call('login','POST',{email:'admin@example.test',password:process.env.EBL_ADMIN_PASSWORD||'ebl-ci-admin-password'});
const catalog=await a.call('catalog');assert.equal(catalog.courses.length,5);
await a.call('users','POST',{op:'create',name:'Student',email:'student@example.test',password:'student-test-password',role:'user'},201);
await a.call('users','POST',{op:'create',name:'Editor',email:'editor@example.test',password:'editor-test-password',role:'editor'},201);
await u.call('session');await u.call('login','POST',{email:'student@example.test',password:'student-test-password'});
await u.call('users','GET',undefined,403);
await u.call('catalog','POST',{catalog,revision:catalog.revision},403);
const before=await u.call('state');before.state.notes['kinderrechte-1']='Private Testnotiz';
const saved=await u.call('state','POST',before);assert(saved.revision>before.revision);
await u.call('state','POST',before,409);
const adminState=await a.call('state');assert.equal(adminState.state.notes['kinderrechte-1'],undefined);
const reload=await u.call('state');assert.equal(reload.state.notes['kinderrechte-1'],'Private Testnotiz');assert(!Array.isArray(reload.state.completed));
const validCsrf=u.csrf;u.csrf='ungueltig';await u.call('state','POST',reload,403);u.csrf=validCsrf;
await editor.call('session');await editor.call('login','POST',{email:'editor@example.test',password:'editor-test-password'});
await editor.call('catalog','POST',{catalog,revision:catalog.revision});await a.call('catalog','POST',{catalog,revision:catalog.revision},409);
const users=(await a.call('users')).users;
await a.call('users','POST',{op:'update',id:users.find(x=>x.role==='admin').id,active:false,role:'user'},400);
await a.call('users','POST',{op:'update',id:users.find(x=>x.email==='student@example.test').id,active:false,role:'user'});
await u.call('state','GET',undefined,401);
await a.call('password','POST',{current:process.env.EBL_ADMIN_PASSWORD||'ebl-ci-admin-password',password:'new-admin-test-password'});
await a.call('catalog');await a.call('logout','POST',{});await a.call('catalog','GET',undefined,401);
console.log('API geprüft: Anmeldung, CSRF, Rollen, Isolation, Revisionen, Passwort und Kontensperre.');
