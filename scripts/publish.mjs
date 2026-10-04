// Branch-basierte Pages-Veröffentlichung ohne zusätzliche dauerhafte Tokens.
// Läuft ausschließlich im geprüften main-Workflow mit GitHub Actions Token.
import fs from 'node:fs/promises';
import path from 'node:path';
const repo=process.env.GITHUB_REPOSITORY;
if(!repo||!process.env.GH_TOKEN||process.env.GITHUB_REF!=='refs/heads/main')throw new Error('Veröffentlichung ist nur im main-Workflow erlaubt.');
async function api(endpoint,method='GET',body){const r=await fetch(`https://api.github.com/repos/${repo}/${endpoint}`,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${process.env.GH_TOKEN}`,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(!r.ok)throw new Error(`${method} ${endpoint}: ${r.status} ${data.message||'API-Fehler'}`);return data;}
const site=await api('pages');
if(site.source?.branch!=='gh-pages')throw new Error('GitHub Pages muss den bestehenden gh-pages-Veröffentlichungsbranch verwenden.');
const entries=[];
async function collect(file){const stat=await fs.stat(file);if(stat.isDirectory()){for(const child of await fs.readdir(file))await collect(path.join(file,child));}else entries.push({path:file.replaceAll(path.sep,'/'),mode:'100644',type:'blob',content:await fs.readFile(file,'utf8')});}
for(const file of ['index.html','.nojekyll','assets','js','data'])await collect(file);
entries.push({path:'data/release.json',mode:'100644',type:'blob',content:JSON.stringify({sourceCommit:process.env.GITHUB_SHA,publishedAt:new Date().toISOString()})});
const head=await api('git/ref/heads/gh-pages');
const tree=await api('git/trees','POST',{tree:entries});
const commit=await api('git/commits','POST',{message:`Veröffentliche geprüfte EBL-Version ${process.env.GITHUB_SHA.slice(0,7)}`,tree:tree.sha,parents:[head.object.sha]});
await api('git/refs/heads/gh-pages','PATCH',{sha:commit.sha,force:false});
// Token-Pushes lösen selbst keinen Pages-Build aus. Der öffentliche Build-
// Endpunkt startet ihn ausdrücklich mit pages:write, ohne Settings-Änderung.
await api('pages/builds','POST',{});
for(let i=0;i<36;i++){
  await new Promise(r=>setTimeout(r,5000));
  const build=await api('pages/builds/latest');
  if(build.commit!==commit.sha)continue;
  if(build.status==='errored')throw new Error(build.error?.message||'Pages-Build fehlgeschlagen.');
  if(build.status==='built'){console.log('GitHub Pages erfolgreich veröffentlicht: '+site.html_url);process.exit(0);}
}
throw new Error('Pages-Build hat innerhalb von drei Minuten keinen Abschluss gemeldet.');
