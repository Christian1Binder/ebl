import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.EBL_BROWSER_URL||'http://127.0.0.1:8080/';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
fs.mkdirSync('test-results',{recursive:true});
try{
  await page.goto(base);await page.getByRole('heading',{name:/Dein Studium/}).waitFor();
  await page.screenshot({path:'test-results/desktop.png',fullPage:true});
  await page.getByRole('link',{name:/Lernen beginnen/}).click();
  await page.getByRole('textbox',{name:'Private Notizen zur Lektion'}).fill('Meine Testnotiz <script>alert(1)</script>');
  await page.getByRole('button',{name:'Notiz speichern'}).click();await page.getByText('Gespeichert',{exact:true}).waitFor();
  await page.getByRole('link',{name:'Wissenscheck starten ↗'}).click();
  await page.getByRole('radio',{name:'Person und Lebensbedingungen gemeinsam betrachten'}).check();
  await page.getByRole('button',{name:'Antworten prüfen ↗'}).click();await page.getByText(/Bestanden. Die Lektion/).waitFor();
  await page.goto(base+'#/cards');await page.getByRole('button',{name:'Antwort aufdecken ↗'}).click();await page.getByRole('button',{name:/Gewusst/}).click();await page.getByText(/Karte 2 von/).waitFor();
  await page.goto(base+'#/planner');await page.getByRole('button',{name:/Lernschritt hinzufügen/}).click();await page.getByRole('textbox',{name:'Was möchtest du bearbeiten?'}).fill('Literatur lesen');await page.locator('dialog').getByRole('button',{name:'Lernschritt hinzufügen'}).click();await page.getByText('Literatur lesen',{exact:true}).waitFor();
  await page.reload();await page.getByText('Literatur lesen',{exact:true}).waitFor();
  await page.getByRole('checkbox',{name:'Literatur lesen erledigt'}).check();
  await page.goto(base+'#/quiz/kinderrechte/kinderrechte-5');
  await page.getByRole('radio',{name:'Eine nachvollziehbare Rückmeldung zur Entscheidung'}).check();
  for(const answer of ['Ankündigung der Beteiligung','Tatsächlicher Einfluss','Rückmeldung zur Entscheidung'])await page.getByRole('checkbox',{name:answer,exact:true}).check();
  await page.getByRole('button',{name:'Antworten prüfen ↗'}).click();await page.getByText('2 von 2 richtig.').waitFor();
  await page.goto(base+'#/editor');await page.getByRole('textbox',{name:'Titel',exact:true}).fill('Testlektion – verändert');await page.getByRole('button',{name:'Lektion speichern ↗'}).click();await page.locator('#toast').getByText('Lektion gespeichert.',{exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'Titel',exact:true}).inputValue(),'Testlektion – verändert');
  await page.getByRole('button',{name:'JSON importieren +'}).click();await page.locator('#catalog-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"courses":[]}')});await page.getByRole('button',{name:'Katalog prüfen & übernehmen'}).click();await page.getByText(/Erwartet wird ein EBL-Katalog/).waitFor();await page.getByRole('button',{name:'Dialog schließen'}).click();
  await page.getByRole('button',{name:'Module verwalten ✎'}).click();await page.getByRole('textbox',{name:'Modultitel'}).fill('Neues Testmodul');await page.getByRole('button',{name:'Module speichern'}).click();await page.getByRole('button',{name:'Module verwalten ✎'}).click();assert.equal(await page.getByRole('textbox',{name:'Modultitel'}).inputValue(),'Neues Testmodul');await page.getByRole('button',{name:'Dialog schließen'}).click();
  assert.equal(await page.getByRole('button',{name:'Menü öffnen'}).isVisible(),false);
  for(const width of [390,768,1440]){await page.setViewportSize({width,height:900});await page.goto(base+'#/');await page.getByRole('heading',{name:/Dein Studium/}).waitFor();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth);assert.equal(overflow,false,`Horizontaler Überlauf bei ${width}px`);await page.screenshot({path:`test-results/home-${width}.png`,fullPage:true});}
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Menü öffnen'}).click();await page.getByRole('navigation').getByRole('link',{name:'Meine Kurse'}).click();await page.getByRole('searchbox',{name:'Kurse durchsuchen'}).fill('Montessori');assert.equal(await page.locator('.course-card').count(),1);
  await page.goto(base+'#/lesson/soziale-arbeit/soziale-arbeit-1');assert.equal(await page.getByRole('textbox',{name:'Private Notizen zur Lektion'}).inputValue(),'Meine Testnotiz <script>alert(1)</script>');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  await page.screenshot({path:'test-results/mobile-lesson.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('Browser geprüft: Quiz, Multiple Choice, Notizen, Karten, Lernplan, Editor, Import und 390/768/1440px.');
}finally{await browser.close();}
