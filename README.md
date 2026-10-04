# EBL Lernraum

Studiumsbegleitender Lernraum für Soziale Arbeit. Das Design folgt der bereitgestellten Referenz: warme Naturfarben, eine transparente Oberfläche, ruhige Landschaft, große Typografie und abgerundete Karten. Die Landschaft ist eine eigene SVG-Grafik; Schriftarten und Assets werden ohne externe Dienste geladen.

## Die erste Version

- Fünf Einstiegskurse, jeweils fünf Lektionen, insgesamt 25 Karteikarten und 26 Quizfragen.
- Kursübersicht mit Volltextsuche, Fortschritt und Filtern.
- Lektionen, Quellen, Reflexionsfragen, private Notizen und Druckansicht.
- Single-/Multiple-Choice mit Erklärungen; `passingScore` ist die Mindestanzahl richtig beantworteter Fragen.
- Karteikarten mit einfacher Wiederholungsplanung (10 Minuten / 1 Tag / wachsender Abstand).
- Persönlicher Lernplan und Hausarbeits-Arbeitsschritte ohne erfundene Termine.
- Quellenübersicht und persönliche Leseliste.
- Editor für Kurse, Module und Lektionen; Karten-/Quiz-JSON; validierter Katalogimport/-export.
- Persönliche Backups mit Notizen und Lernstand.
- Vorbereitetes, funktionsfähiges PHP/MySQL-Backend: Konten, Rollen, gemeinsame Inhalte, getrennte persönliche Daten und Revisionen.

Die Startinhalte sind kurze Orientierungstexte und selbst formulierte Übungen. Sie bilden keinen offiziellen Modulplan der TH Nürnberg ab und ersetzen keine Vorlesungsunterlagen. Alle Praxisfälle sind erfunden. Die Wissenschecks stellen keine Zertifizierung dar.

## Zwei Betriebsarten

`js/config.js` legt den Speichermodus fest:

```js
{ backend: 'local', apiUrl: 'api/index.php', storageKey: 'ebl.v1' }
```

**GitHub Pages / local:** Inhalte und Lernstand werden in diesem Browser gespeichert. Editoränderungen sind nicht für andere Nutzer sichtbar. Es gibt keine echte Anmeldung und keine vorgetäuschte Benutzerverwaltung. Browserdaten können verloren gehen; persönliche Backups und Katalogexport sind vorhanden.

**PHP-Webspace / php:** Echte serverseitige Anmeldung, Rollen `admin`, `editor`, `user`, ein gemeinsamer Katalog und getrennte Lernstände. Katalog und persönliche Daten kommen aus MySQL. Notizen werden nicht in GitHub oder im öffentlichen JSON-Katalog gespeichert.

Der Wechsel erfordert die Konfiguration des Servers und `backend: 'php'`, keinen Neubau der Oberfläche. Relative Pfade unterstützen auch Unterverzeichnisse.

## Projektstruktur

```text
index.html                 Einstieg
assets/                    Design, Logo und eigene Landschaft
js/config.js               Betriebsart
js/model.js                Datenmodell und Lernregeln
js/store.js                LocalStorage-/API-Adapter
js/app.js                  Router und Navigation
js/pages.js                Übersicht, Kurse, Plan, Materialien, Hilfe
js/learning.js             Lektionen, Quiz und Karten
js/editor.js               Inhaltsverwaltung
js/account.js              Konto und Benutzerverwaltung
data/catalog.json          Öffentliche Startinhalte
api/                       PHP-REST-API
database/                  Schema und CLI-Installation
docs/                      Umzug und Datenformat
tests/                     Modell-, Browser- und API-Prüfungen
```

## Entwicklung und Prüfung

Node 22+ genügt für `npm run check` und `npm test`; die Oberfläche braucht weder npm noch Buildschritt.

Zum lokalen Öffnen einen HTTP-Server verwenden, zum Beispiel `python3 -m http.server 8080`. ES-Module benötigen HTTP statt Doppelklick über `file://`.

Die GitHub-Action prüft JavaScript und Datenformat, PHP-Syntax, die API gegen MySQL sowie Lernabläufe und responsive Ansichten mit Chromium. Das statische Veröffentlichungspaket enthält nur `index.html`, `assets`, `js`, `data` und `.nojekyll`, keine Serverkonfiguration oder Datenbankdateien.

## Veröffentlichung

GitHub Pages ist aktiviert. Die Action `.github/workflows/pages.yml` veröffentlicht nach bestandenen Prüfungen und kontrolliert die live erreichbaren Dateien. Der Branch `gh-pages` enthält zusätzlich das geprüfte statische Veröffentlichungspaket. Adresse: https://christian1binder.github.io/ebl/.

## Dokumentation

- [PHP/MySQL-Umzug](docs/WEBSPACE.md)
- [Datenmodell und Import](docs/DATENFORMAT.md)
- [Ausbau und Grenzen](docs/AUSBAU.md)
