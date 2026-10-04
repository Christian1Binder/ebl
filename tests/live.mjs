import assert from 'node:assert/strict';
const base=process.env.EBL_LIVE_URL||'https://christian1binder.github.io/ebl/';
for(let attempt=0;attempt<6;attempt++){
  try{
    const results=await Promise.all(['','assets/style.css','assets/landscape.svg','js/app.js','js/model.js','data/catalog.json',...(process.env.EBL_EXPECT_SHA?['data/release.json']:[])].map(async path=>{const url=new URL(path,base);url.searchParams.set('v',process.env.EBL_EXPECT_SHA||Date.now());const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});assert.equal(r.status,200,`${path}: HTTP ${r.status}`);return [path,await r.text()];}));
    const files=Object.fromEntries(results);assert(files[''].includes('EBL'));assert(files['js/app.js'].includes('saveOpenNote'));const c=JSON.parse(files['data/catalog.json']);assert.equal(c.schemaVersion,1);assert.equal(c.courses.length,5);if(process.env.EBL_EXPECT_SHA)assert.equal(JSON.parse(files['data/release.json']).sourceCommit,process.env.EBL_EXPECT_SHA);console.log('Live geprüft: '+base+' – HTML, CSS, Grafik, JavaScript und Kursdaten erreichbar.');break;
  }catch(error){if(attempt===5)throw error;await new Promise(r=>setTimeout(r,5000));}
}
