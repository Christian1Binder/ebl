// Nutzertexte werden immer escaped. Der kleine Markdown-Renderer erlaubt
// ausschließlich Absätze, Überschriften und Listen – kein aktives HTML.
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function markdown(text=''){
  const lines=text.split('\n');let out='',paragraph=[],list=[];
  const flush=()=>{if(paragraph.length){out+=`<p>${paragraph.map(esc).join('<br>')}</p>`;paragraph=[];}if(list.length){out+=`<ul>${list.map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`;list=[];}};
  for(const line of lines){if(line.startsWith('## ')){flush();out+=`<h2>${esc(line.slice(3))}</h2>`;}else if(line.startsWith('- ')){if(paragraph.length)flush();list.push(line.slice(2));}else if(!line.trim()){flush();}else{if(list.length)flush();paragraph.push(line);}}flush();return out;
}
export function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),5000);}
export function download(name,data,type='application/json'){
  const url=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function modal(title,body){const d=document.getElementById('dialog');d.innerHTML=`<div class="dialog-head"><h2>${esc(title)}</h2><button class="icon-button" data-close aria-label="Dialog schließen">×</button></div><div class="dialog-body">${body}</div>`;d.querySelector('[data-close]').onclick=()=>d.close();if(!d.open)d.showModal();return d;}
export const empty=(title,text)=>`<div class="empty"><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`;
export const title=(heading,description,actions='')=>`<div class="page-title"><div><span class="eyebrow">DEIN STUDIUM · DEIN LERNRAUM</span><h1>${esc(heading)}</h1><p>${esc(description)}</p></div>${actions}</div>`;
