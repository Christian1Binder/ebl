// Gemeinsame, DOM-unabhängige Regeln für Import, Editor und Lernfunktionen.
export function validateCatalog(data) {
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.courses) || !data.courses.length) throw new Error('Erwartet wird ein EBL-Katalog mit schemaVersion 1 und courses.');
  const ids = new Set();
  const identify = (o, label) => {
    if (typeof o.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(o.id) || ids.has(o.id)) throw new Error(`${label}: IDs müssen eindeutig sein und dürfen nur Buchstaben, Ziffern, _ und - enthalten.`);
    ids.add(o.id);
    if (typeof o.title !== 'string' || !o.title.trim() || o.title.length > 250) throw new Error(`${label}: Titel fehlt oder ist zu lang.`);
  };
  if (data.courses.length > 200) throw new Error('Maximal 200 Kurse pro Katalog.');
  for (const c of data.courses) {
    identify(c,'Kurs');
    if (!Array.isArray(c.modules) || c.modules.length > 100) throw new Error('Kurse benötigen ein modules-Array (maximal 100).');
    for (const m of c.modules) {
      identify(m,'Modul');
      if (!Array.isArray(m.lessons) || m.lessons.length > 200) throw new Error('Module benötigen ein lessons-Array (maximal 200).');
      for (const l of m.lessons) {
        identify(l,'Lektion');
        if (typeof l.content !== 'string' || l.content.length > 100000) throw new Error('Lektion: content muss Text sein (maximal 100.000 Zeichen).');
        for (const q of l.quiz?.questions ?? []) {
          identify(q,'Frage');
          if (!['single','multiple'].includes(q.type)) throw new Error('Fragetyp muss single oder multiple sein.');
          if (!Array.isArray(q.answers) || q.answers.length < 2 || q.answers.length > 10) throw new Error('Fragen benötigen 2 bis 10 Antworten.');
          const answerIds = new Set();
          for (const a of q.answers) {
            if (typeof a.id !== 'string' || answerIds.has(a.id) || typeof a.text !== 'string' || !a.text.trim() || typeof a.isCorrect !== 'boolean') throw new Error('Ungültige Antwort.');
            answerIds.add(a.id);
          }
          const correct = q.answers.filter(a=>a.isCorrect).length;
          if (!correct || (q.type === 'single' && correct !== 1)) throw new Error('Single-Fragen benötigen genau eine richtige Antwort; Multiple-Fragen mindestens eine.');
        }
        if (l.quiz && (!Array.isArray(l.quiz.questions) || !Number.isInteger(l.quiz.passingScore) || l.quiz.passingScore < 1 || l.quiz.passingScore > l.quiz.questions.length)) throw new Error('passingScore ist die Mindestzahl richtiger Fragen.');
        if (l.flashcards && (!Array.isArray(l.flashcards) || l.flashcards.some(f=>typeof f.q !== 'string'||typeof f.a !== 'string'))) throw new Error('Karteikarten benötigen q und a als Text.');
      }
    }
  }
  return data;
}
export const lessonsOf = c => c.modules.flatMap(m=>m.lessons);
export const allLessons = data => data.courses.flatMap(c=>lessonsOf(c).map(l=>({...l, courseId:c.id, courseTitle:c.title})));
export const percent = (course, completed) => {const ls=lessonsOf(course);return ls.length ? Math.round(ls.filter(l=>completed[l.id]).length/ls.length*100) : 0;};
export function grade(question, selected) {
  const expected=question.answers.filter(a=>a.isCorrect).map(a=>a.id).sort();
  const actual=[...new Set(selected)].sort();
  return expected.length===actual.length && expected.every((v,i)=>v===actual[i]);
}
export function reviewCard(previous={}, rating='again', now=Date.now()) {
  const interval=rating==='again'?0:rating==='hard'?1:Math.min(60,Math.max(2,(previous.interval||1)*2));
  return {interval,due:now+(interval?interval*86400000:600000),reviews:(previous.reviews||0)+1};
}
export function safeURL(value) {
  try {const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null;} catch{return null;}
}
