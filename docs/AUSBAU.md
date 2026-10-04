# Vorbereiteter Ausbau

## Jetzt umgesetzt

Kurse, Module, Lektionen, sichere Textdarstellung, Quellen, Single-/Multiple-Choice, Karteikarten, persönliche Notizen und Lernplanung, Import/Export, Browser- und API-Speicheradapter, Konten und Rollen im PHP-Modus. Gemeinsame Katalogänderungen und persönliche Lernstände sind revisionsgeschützt.

## Noch benötigte Projektinformationen

- Der tatsächliche EBL-Modulplan, konkrete Vorlesungsunterlagen und die verbindlichen Prüfungsanforderungen. Die Startkurse sind thematische Lernpfade, keine behaupteten offiziellen Module.
- Webspace-Domain, PHP-Version, MySQL-Zugang und Art des Hostingzugangs für die spätere Installation. Diese Daten werden nicht in Git gespeichert.
- Betreiberkontakt und passende rechtliche Texte für den regulären Gruppenbetrieb.

## Bewusst noch kein Bestandteil dieser Version

Automatischer PDF-/Folienimport, Dateiuploads, KI-generierte Inhalte, öffentliche Selbstregistrierung, Einladungsmails, Passwort-Reset per E-Mail, Zertifikate, Live-Zusammenarbeit und vollständige Offline-Installation. Quellen können verlinkt und Inhalte als JSON importiert werden. Passwort-Reset ist durch einen Admin möglich. Zwei simultane Bearbeitungen werden als Konflikt gemeldet und nicht zusammengeführt.

## Nächste fachliche Ausbaupunkte

1. Mit echten freigegebenen Studienmaterialien Kurse ergänzen und Quellen/Fundstellen pro Lektion pflegen.
2. Native Formularfelder für Karten und Quiz ergänzen; derzeit werden diese didaktischen Bausteine validiert als JSON gepflegt.
3. Nach dem Serverumzug Einladungsabläufe und eine passende Hosting-Sicherung ergänzen.
4. Optional Dateiuploads mit Speicherquoten, MIME-Prüfung, privater Downloadberechtigung und Lizenzprüfung konzipieren.

## Technischer Vertrag

Kein Buildzwang, kein Composer und keine JavaScript-Frameworkbindung. UI-Module greifen ausschließlich über `store.js` auf Daten zu. Nutzer und Rollen liegen relational in MySQL; Katalog und Lernstände liegen als versionierte JSON-Dokumente in getrennten Tabellen. Damit bleibt der GitHub-Pages-Startkatalog kompatibel mit dem PHP-System.
