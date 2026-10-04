import assert from 'node:assert/strict';
const base=process.env.EBL_LIVE_URL||'https://christian1binder.github.io/ebl/';
for(let attempt=0;attempt<6;attempt++){
  try{
    const results=await Promise.all(['','assets/style.css','assets/landscape.svg','js/app.js','js/model.js','data/catalog.json'].map(async path=>{const r=await fetch(new URL(path,base),{cache:'no-store',signal:AbortSignal.timeout(10000)});assert.equal(r.status,200,`${path}: HTTP ${r.status}`);return [path,await r.text()];}));
    const files=Object.fromEntries(results);assert(files[''].includes('EBL'));assert(files['js/app.js'].includes('saveOpenNote'));const c=JSON.parse(files['data/catalog.json']);assert.equal(c.schemaVersion,1);assert.equal(c.courses.length,5);console.log('Live geprüft: '+base+' – HTML, CSS, Grafik, JavaScript und Kursdaten erreichbar.');break;
  }catch(error){if(attempt===5)throw error;await new Promise(r=>setTimeout(r,5000));}
}
