# EBL-Datenformat, Version 1

Der gemeinsame Katalog ist ein versioniertes Dokument: **Kurse → Module → Lektionen → Quizfragen → Antworten**. Diese Hierarchie wird in der Oberfläche und in MySQL unverändert verwendet. Die persönliche Speicherung ist ein getrenntes Dokument pro Nutzer.

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "title": "EBL Lernraum",
  "courses": [{
    "id": "mein-kurs",
    "title": "Mein Kurs",
    "category": "Grundausbildung",
    "description": "Eine kurze Beschreibung",
    "color": "sage",
    "symbol": "◎",
    "modules": [{
      "id": "mein-modul",
      "title": "Grundlagen",
      "lessons": [{
        "id": "meine-lektion",
        "title": "Erste Perspektive",
        "minutes": 8,
        "content": "## Eine Frage\n\nEin kurzer Einstieg.\n\n- Erste Idee\n- Zweite Idee",
        "reflection": "Welche Frage bleibt für dich offen?",
        "sources": [{"title": "Quelle", "url": "https://example.org"}],
        "flashcards": [{"q": "Eine Frage?", "a": "Eine Antwort."}],
        "quiz": {
          "passingScore": 1,
          "questions": [{
            "id": "meine-frage",
            "title": "Welche Antwort passt?",
            "type": "single",
            "explanation": "Eine verständliche Begründung.",
            "answers": [
              {"id": "a1", "text": "Richtige Antwort", "isCorrect": true},
              {"id": "a2", "text": "Andere Antwort", "isCorrect": false}
            ]
          }]
        }
      }]
    }]
  }],
  "resources": [{"title": "Weiterlesen", "url": "https://example.org"}]
}
```

IDs für Kurs, Modul, Lektion und Frage sind katalogweit eindeutig. Erlaubt sind 1–100 Buchstaben, Ziffern, Unterstriche und Bindestriche. Antwort-IDs müssen innerhalb der Frage eindeutig sein. Die Reihenfolge in den Arrays bestimmt die Anzeige. Ein älteres `order`-Feld wird bei vorhandenen Startlektionen mitgeführt, ist aber nicht die Sortierquelle.

`type` ist `single` oder `multiple`. Single verlangt genau eine richtige Antwort. Bei Multiple muss die Auswahl exakt der Menge richtiger Antworten entsprechen. `passingScore` ist eine positive ganze Zahl richtiger Fragen, niemals ein Prozentwert. Ohne Wissenscheck kann `quiz` entfallen oder `null` sein.

Der Inhalt ist Klartext mit einem kleinen, sicheren Markdown-Umfang: `##`-Überschriften, `-`-Listen und Absätze. Aktives HTML, Skripte und Videoeinbettungen werden nicht zugelassen. Quellen öffnen über überprüfte HTTP(S)-Links.

Ein **Katalogexport** enthält gemeinsame Inhalte. Ein **persönliches Backup** enthält `catalog` und `state`; der persönliche Import übernimmt nur `state`, der Katalogimport nur `catalog`. Notizen werden somit nicht versehentlich als Kursinhalt veröffentlicht.

In `state` liegen `completed`, `quizResults`, `notes`, `reviews`, `tasks`, `bookmarks`, `lastLesson` und `activity`. Die Karten-ID kombiniert die stabile Lektion-ID und den Kartenindex; beim grundlegenden Umbau eines Kartenstapels sollte dessen persönliche Wiederholungsplanung neu begonnen werden. Entfernte Lektion-IDs bleiben im persönlichen Backup erhalten, zählen aber nicht mehr zum sichtbaren Fortschritt.

Andere TecLearn-/Legacy-Formate sind nicht automatisch kompatibel. Der jetzige gemeinsame Vertrag benutzt das oben vollständig dokumentierte Format. Vor einem Import alter Bestände sind Feldnamen und Fragenformate gezielt zu migrieren.
