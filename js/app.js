import {store} from './store.js';
import {home,courses,planner,library,help} from './pages.js';
import {course,lesson,quiz,cards} from './learning.js';
import {editor} from './editor.js';
import {accountDialog,loginDialog} from './account.js';
import {esc,toast,title,modal} from './render.js';
const root=document.getElementById('main');
let ready=false,lastHash='',routeCounter=0;
function updateAccount(){document.getElementById('account-label').textContent=store.user?.name|| (store.local?'Mein Lernraum':'Anmelden');}
function render(){
  const parts=(location.hash.replace(/^#\/?/,'')||'').split('/').map(s=>decodeURIComponent(s));const [page,cid,lid]=parts;
  updateAccount();document.getElementById('navigation').classList.remove('open');document.getElementById('menu-toggle').setAttribute('aria-expanded','false');
  document.querySelectorAll('[data-nav]').forEach(a=>{const key=!page?'home':['course','lesson','quiz','editor'].includes(page)?'courses':page;if(a.dataset.nav===key)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(!store.local&&!store.user){root.innerHTML=title('Dein Studium. Dein Horizont.','Ein gemeinsamer Lernraum für Soziale Arbeit. Melde dich an, um deine Kurse, privaten Notizen und deinen Lernplan zu öffnen.',`<button class="button" id="start-login">Anmelden ↗</button>`)+`<div class="benefits"><div class="benefit"><span class="glyph">☼</span><h3>Gemeinsam lernen</h3><p>Kurse, Lektionen und Wissenschecks für deine Lerngruppe.</p></div><div class="benefit"><span class="glyph">✳</span><h3>Dein eigener Weg</h3><p>Persönliche Karteikartenbewertungen, Fortschritte und Notizen.</p></div><div class="benefit"><span class="glyph">↗</span><h3>Schritt für Schritt</h3><p>Ein Lernplan, der Raum für deinen Studienalltag schafft.</p></div></div>`;root.querySelector('#start-login').onclick=()=>loginDialog(render);return;}
  switch(page){case '':home(root);break;case 'courses':courses(root);break;case 'course':course(root,cid);break;case 'lesson':lesson(root,cid,lid);break;case 'quiz':quiz(root,cid,lid);break;case 'cards':cards(root,cid);break;case 'planner':planner(root);break;case 'library':library(root);break;case 'editor':editor(root);break;case 'help':help(root);break;default:root.innerHTML=title('Hier geht es weiter.','Diese Seite gibt es nicht. Wähle einen Lernpfad aus der Kursübersicht.',`<a class="button" href="#/courses">Zu den Kursen ↗</a>`);}
  const heading=root.querySelector('h1');document.title=`${heading?.textContent||'Lernraum'} · EBL`;
}
async function saveOpenNote(){const note=document.getElementById('lesson-note');if(!note)return;const parts=lastHash.replace(/^#\/?/,'').split('/'),lid=parts[2];if(lid&&note.value!==(store.state.notes[lid]||''))await store.mutate(s=>s.notes[lid]=note.value);}
async function route(){if(!ready)return;const ticket=++routeCounter;try{await saveOpenNote();if(ticket!==routeCounter)return;render();lastHash=location.hash;window.scrollTo(0,0);root.focus({preventScroll:true});}catch(error){toast(error.message);}}
document.getElementById('menu-toggle').onclick=()=>{const open=document.getElementById('navigation').classList.toggle('open');document.getElementById('menu-toggle').setAttribute('aria-expanded',String(open));};
document.getElementById('account-button').onclick=()=>accountDialog(render);
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#/"]');if(!a)return;const dirty=document.querySelector('#lesson-form[data-dirty="true"]');if(dirty){e.preventDefault();const d=modal('Offene Änderungen',`<p>Speichere deine Änderungen im Inhaltseditor, bevor du die Seite verlässt.</p><button class="button" data-dismiss>Zurück zum Editor</button>`);d.querySelector('[data-dismiss]').onclick=()=>d.close();}},true);
window.addEventListener('beforeunload',e=>{const note=document.getElementById('lesson-note'),lid=lastHash.replace(/^#\/?/,'').split('/')[2];if(document.querySelector('#lesson-form[data-dirty="true"]')||(note&&note.value!==(store.state.notes[lid]||''))){e.preventDefault();e.returnValue='';}});
window.addEventListener('hashchange',route);
try{await store.init();ready=true;await route();if(!store.storageAvailable)toast('Browserspeicherung ist eingeschränkt. Sichere deinen Lernstand mit einem Export.');}catch(error){root.innerHTML=title('Dein Lernraum wartet.',error.message,`<button class="button" id="reload-app">Erneut versuchen ↗</button>`);root.querySelector('#reload-app').onclick=()=>location.reload();}
