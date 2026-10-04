import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {validateCatalog} from '../js/model.js';
const catalog=validateCatalog(JSON.parse(fs.readFileSync('data/catalog.json','utf8')));
for(const file of fs.readdirSync('js').filter(f=>f.endsWith('.js'))){const r=spawnSync(process.execPath,['--check',`js/${file}`],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);}
for(const path of ['assets/style.css','assets/mark.svg','assets/landscape.svg','index.html'])if(!fs.existsSync(path))throw new Error('Datei fehlt: '+path);
console.log(`JavaScript und Katalog gültig: ${catalog.courses.length} Kurse.`);
