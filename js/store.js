import {config} from './config.js';
import {validateCatalog} from './model.js';

const freshState=()=>({completed:{},quizResults:{},notes:{},reviews:{},tasks:[],bookmarks:[],lastLesson:null,activity:[]});
export class Store {
  constructor(){this.catalog=null;this.state=freshState();this.user=null;this.csrf='';this.stateRevision=0;this.queue=Promise.resolve();this.storageAvailable=true;}
  get local(){return config.backend==='local';}
  async request(action,{method='GET',body}={}){
    const response=await fetch(`${config.apiUrl}?action=${encodeURIComponent(action)}`,{method,credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{'X-CSRF-Token':this.csrf}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const result=await response.json().catch(()=>({error:'Der Server liefert keine gültige JSON-Antwort. Prüfe PHP-Konfiguration und API-Pfad.'}));
    if(!response.ok)throw new Error(result.error||`Serverfehler (${response.status}).`);
    return result;
  }
  async init(){
    if(this.local){
      let cached;
      try{cached=JSON.parse(localStorage.getItem(config.storageKey)||'null');}catch{this.storageAvailable=false;}
      if(cached?.catalog){try{this.catalog=validateCatalog(cached.catalog);}catch{this.catalog=null;}}
      if(!this.catalog){const r=await fetch('data/catalog.json');if(!r.ok)throw new Error('Die Startinhalte konnten nicht geladen werden.');this.catalog=validateCatalog(await r.json());}
      if(cached?.state)this.state={...freshState(),...cached.state};
    }else{
      const session=await this.request('session');this.user=session.user;this.csrf=session.csrf;
      if(this.user)await this.loadRemote();
    }
    return this;
  }
  async loadRemote(){
    const [catalog,personal]=await Promise.all([this.request('catalog'),this.request('state')]);
    this.catalog=validateCatalog(catalog);this.state={...freshState(),...personal.state};this.stateRevision=personal.revision;
  }
  writeLocal(){try{localStorage.setItem(config.storageKey,JSON.stringify({catalog:this.catalog,state:this.state}));}catch{this.storageAvailable=false;throw new Error('Der Browser konnte nicht speichern. Bitte exportiere deine Daten, bevor du diesen Lernraum schließt.');}}
  async mutate(fn){
    // Serialisierte Schreibvorgänge und Revisionen schützen vor verlorenen Updates.
    const run=async()=>{const previous=structuredClone(this.state);try{fn(this.state);if(this.local)this.writeLocal();else{const saved=await this.request('state',{method:'POST',body:{state:this.state,revision:this.stateRevision}});this.stateRevision=saved.revision;}}catch(error){this.state=previous;throw error;}};
    const operation=this.queue.then(run,run);this.queue=operation.catch(()=>{});return operation;
  }
  async saveCatalog(data){
    const next=validateCatalog(structuredClone(data));
    if(this.local){const previous=this.catalog;this.catalog=next;try{this.writeLocal();}catch(error){this.catalog=previous;throw error;}}
    else {const result=await this.request('catalog',{method:'POST',body:{catalog:next,revision:this.catalog.revision}});next.revision=result.revision;this.catalog=next;}
  }
  async login(email,password){const s=await this.request('login',{method:'POST',body:{email,password}});this.user=s.user;this.csrf=s.csrf;await this.loadRemote();}
  async logout(){await this.queue;await this.request('logout',{method:'POST',body:{}});this.user=null;this.catalog=null;this.state=freshState();const s=await this.request('session');this.csrf=s.csrf;}
  exportAll(){return {schemaVersion:1,exportedAt:new Date().toISOString(),catalog:this.catalog,state:this.state};}
  async restorePersonal(data){
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Ungültiges persönliches Backup.');
    const next={...freshState(),...data};
    for(const key of ['completed','quizResults','notes','reviews'])if(!next[key]||typeof next[key]!=='object'||Array.isArray(next[key]))throw new Error(`Backup: ${key} ist ungültig.`);
    for(const key of ['tasks','bookmarks','activity'])if(!Array.isArray(next[key]))throw new Error(`Backup: ${key} ist ungültig.`);
    if(next.tasks.some(t=>typeof t.id!=='string'||typeof t.title!=='string'||typeof t.done!=='boolean'))throw new Error('Backup enthält ungültige Aufgaben.');
    if(Object.values(next.notes).some(n=>typeof n!=='string'))throw new Error('Backup enthält ungültige Notizen.');
    await this.mutate(s=>{for(const key of Object.keys(freshState()))s[key]=next[key];});
  }
}
export const store=new Store();
