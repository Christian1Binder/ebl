# STRATO-Upload über GitHub Actions

Der Workflow **STRATO per SFTP** überträgt die EBL-Plattform auf STRATO. Er wird bewusst manuell gestartet, ausschließlich auf `main`. Änderungen im Repository starten weiterhin die bisherigen Prüfungen und die Veröffentlichung auf GitHub Pages. STRATO-Updates starten separat mit `deploy`; es gibt keinen automatischen Upload bei jedem Commit.

## Bereits eingetragene Verbindungswerte

- SFTP-Server: `5020024027.ssh.w2.strato.hosting`, Port `22`.
- SFTP-Benutzer: `su2171620`, eingeschränktes Startverzeichnis laut STRATO `/ebl`.
- Zieladresse: `https://ebl.binder-lab.com/`.
- MySQL-Host: `database-5021595958.webspace-host.com`, Port `3306`.
- Datenbank: `dbs16203468`, Datenbankbenutzer: `dbu1860245`.

Passwörter stehen weder im Repository noch in dieser Anleitung. Verwende die beiden Passwörter aus deiner privaten Memo. Der SFTP-Zugang benötigt keinen Terminalzugang.

## 1. GitHub Secrets eintragen

Öffne [Repository → Settings → Secrets and variables → Actions](https://github.com/Christian1Binder/ebl/settings/secrets/actions). Lege unter **Repository secrets → New repository secret** genau diese Secrets an:

- **`STRATO_SFTP_PASSWORD`**: das SFTP-Passwort aus der Memo.
- **`STRATO_DB_PASSWORD`**: das Datenbankpasswort aus der Memo.
- **`STRATO_KNOWN_HOSTS`**: verifizierte OpenSSH-known_hosts-Zeile für den SFTP-Server, siehe nächster Abschnitt. Benötigt auch der Prüfmodus.
- **`EBL_SETUP_TOKEN`**: der 64-stellige geheime Hex-Schlüssel aus der lokal geöffneten `database/keygen.html`. **Den Schlüssel selbst**, nicht den angezeigten SHA-256-Hash eintragen. Nur `bootstrap` benötigt dieses Secret; der Workflow erzeugt daraus den Hash.

Die Namen sind exakt und unterscheiden Groß-/Kleinschreibung. Keine Secrets in Workflow-Eingabefelder oder Dateien eintragen. GitHub übergibt sie als Umgebungsvariablen. Die PHP-Konfiguration entsteht im Arbeitsspeicher des Runners und wird direkt per SFTP übertragen; sie wird nicht als Download-Artefakt gespeichert. Sie liegt anschließend ausschließlich auf dem privaten STRATO-Webspace.

## 2. SSH-Hostschlüssel prüfen

Der Workflow akzeptiert keinen unbekannten oder abweichenden Hostschlüssel. Besorge die known_hosts-Zeile auf deinem Rechner mit OpenSSH, beispielsweise in PowerShell oder Terminal:

```bash
ssh-keyscan -t ed25519 5020024027.ssh.w2.strato.hosting > strato-known-hosts.txt
ssh-keygen -lf strato-known-hosts.txt
```

**Prüfe den angezeigten Fingerabdruck anhand einer vertrauenswürdigen STRATO-Angabe beziehungsweise beim STRATO-Support.** `ssh-keyscan` allein bestätigt die Identität nicht. Wenn der Server keinen ed25519-Schlüssel anbietet, mit `-t ecdsa,rsa` erneut auslesen und den entsprechenden Fingerabdruck prüfen. Anschließend den vollständigen Inhalt der Datei als `STRATO_KNOWN_HOSTS` eintragen. Format: `5020024027.ssh.w2.strato.hosting ssh-ed25519 AAAA…`. Nicht den Fingerabdruck allein eintragen.

## 3. Tatsächliches Zielverzeichnis feststellen

Öffne [Actions → STRATO per SFTP](https://github.com/Christian1Binder/ebl/actions/workflows/strato.yml), wähle **Run workflow**, Branch `main`, Modus **`inspect`**, Ziel **`.`**.

Dieser Modus meldet das tatsächliche SFTP-Startverzeichnis, das normalisierte Ziel und vorhandene Einträge. Er verändert keine Dateien. Ein eingeschränkter Zugang kann `/ebl` intern als `/` anzeigen. Dann bleibt das Workflow-Ziel `.`; nicht zusätzlich `/ebl` anhängen. Wenn der Zugang stattdessen das gesamte Hostingverzeichnis zeigt, den passenden vorhandenen Ordner wählen und `inspect` erneut mit diesem Ziel ausführen.

Prüfe im STRATO-Kundenbereich, dass die interne Zuordnung von `ebl.binder-lab.com` auf den gewünschten Website-Ordner zeigt und HTTPS aktiv ist. Bei jeder schreibenden Aktion prüft der Workflow diese Zuordnung zusätzlich: Er legt kurz eine zufällige Textdatei im ausgewählten Ziel ab, ruft sie unter der HTTPS-Subdomain ab, vergleicht deren Inhalt und entfernt sie wieder. Bei Fehlern oder Weiterleitungen werden keine Anwendungsdateien hochgeladen. Der Probezugriff verändert nur diese temporäre Datei.

## 4. Erstinstallation hochladen

Das Ziel muss für `bootstrap` **leer** sein. Vorhandene Dateien werden nicht automatisch gelöscht; gegebenenfalls zuerst privat sichern und ihren Zweck prüfen. Die Datenbank muss eine eigene, leere EBL-Datenbank sein.

Starte denselben Workflow mit Modus **`bootstrap`** und dem zuvor geprüften Ziel. Der Workflow prüft JavaScript, Datenformat, PHP-Syntax und Deployment-Logik; er lädt die Laufzeitdateien, Schutzregeln und vorübergehend den Installer hoch. Die STRATO-Kopie von `js/config.js` verwendet `backend: 'php'`; die Quelldatei und GitHub Pages bleiben bei `backend: 'local'`.

Vor dem Übertragen der Zugangsdaten prüft der Workflow mit harmlosen Testdateien, dass die hochgeladenen Schutzregeln interne Dateien mit HTTP 403 oder 404 sperren. Andernfalls bricht er ab.

Die private `api/config.local.php` enthält das Datenbankpasswort, sichere HTTPS-Cookies sowie den aktivierten Setup-Block mit dem Schlüssel-Hash. Eine vorhandene Konfiguration oder die Abschlussmarkierung `.ebl-installed` verhindert ein weiteres `bootstrap`. Ein nach einem abgebrochenen Upload teilweise belegter Ordner benötigt eine manuelle Prüfung; der Workflow löscht ihn nicht zum Wiederholen.

## 5. Admin und Tabellen im Browser einrichten

Nach erfolgreichem `bootstrap` öffne:

**https://ebl.binder-lab.com/api/setup.php**

Gib den geheimen Einrichtungsschlüssel aus `EBL_SETUP_TOKEN`, deinen Namen, deine Admin-E-Mail und ein eigenes Admin-Passwort (12–256 Zeichen) ein. Das Admin-Passwort ist unabhängig von SFTP und Datenbank. Der Installer erstellt Tabellen, Startkatalog und das erste Konto. Der Workflow legt kein Admin-Konto an und erhält kein Admin-Passwort.

Warte auf die Erfolgsmeldung. Bei bereits existierenden Benutzerkonten sperrt der Installer eine erneute Einrichtung. Weitere Details und Fehlerursachen stehen in [IMPLEMENTIERUNG.md](IMPLEMENTIERUNG.md).

## 6. Installation abschließen und Installer entfernen

**Erst nach der erfolgreichen Browserinstallation** den Workflow mit Modus **`finish`** und demselben Ziel starten. `finish` setzt den Setup-Block auf deaktiviert und entfernt den Hash, löscht die bekannten Installationsdateien und den dann leeren Datenbankskript-Ordner. Unbekannte Dateien werden nicht rekursiv gelöscht. Zum Schluss wird `.ebl-installed` geschrieben. Der Workflow kann den Erfolg der Admin-Einrichtung nicht selbst bestätigen; deshalb erst nach der Erfolgsmeldung aus Schritt 5 starten.

Anschließend `EBL_SETUP_TOKEN` aus den GitHub Secrets löschen; die anderen drei Secrets bleiben für Updates. Website öffnen, als Admin anmelden und prüfen, ob Notizen und Lernstand nach erneuter Anmeldung erhalten bleiben. Mit einem zweiten Konto die Trennung persönlicher Daten prüfen. Der Installer muss nun nicht mehr erreichbar sein.

## 7. Spätere Updates

Nach erfolgreichen Projektprüfungen denselben Workflow mit **`deploy`** und dem bestätigten Ziel starten. Voraussetzung ist `.ebl-installed` und eine vorhandene Serverkonfiguration. Installer-Reste führen zum Abbruch. Das Update-Paket enthält keine Installationsskripte und aktiviert Setup nicht. Die private Konfiguration wird aus den aktuellen Secrets erneuert; individuell eingetragene Änderungen daran würden überschrieben. Dauerhaft gewünschte Konfigurationsänderungen daher im Deployment-Skript anpassen.

Updates ersetzen nur die übertragenen Laufzeitdateien. Sie führen keine SQL-Migration aus und löschen keine Datenbankeinträge. Vor Updates Datenbank und Webdateien über den Hoster sichern. Der Upload ist pro Datei atomar, aber kein atomarer Wechsel der gesamten Website; während des Uploads können kurz Dateien aus zwei Versionen zusammentreffen. Größere Änderungen daher in einer ruhigen Nutzungsphase veröffentlichen.

## Schutz und Fehlerbehebung

Die Hostschlüsselprüfung ist verpflichtend. Veränderte Hostschlüssel erst nach Prüfung beim Hoster im Secret aktualisieren. Der Server muss die OpenSSH-Erweiterung `posix-rename` für atomare Dateiersetzung unterstützen; andernfalls bricht der Upload ab und muss angepasst werden.

Bei fehlenden Secrets oder falscher Modusreihenfolge meldet der Workflow die konkrete Voraussetzung. Bibliotheks-/Verbindungsfehler werden ohne möglicherweise sensible Details ausgegeben. Prüfe dann Zugangsdaten, Hostschlüssel, Zielverzeichnis und HTTPS-Zuordnung. Ein Bootstrap-Ziel mit bestehenden Dateien oder ein Update vor `finish` wird abgewiesen.

Die Anwendung erfordert PHP 8.2+, `pdo_mysql`, `mbstring`, Sessions, MySQL 8 und wirksame Apache-`.htaccess`-Regeln. Prüfe nach dem Upload, dass `api/config.local.php` nicht öffentlich ausgeliefert wird. Betreiberangaben, Backups und Datenübernahme beschreibt die [Implementierungsanleitung](IMPLEMENTIERUNG.md).

Technische Referenzen: [GitHub-Workflow-Syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax), [Paramiko SSHClient](https://docs.paramiko.org/en/stable/api/client.html), [Paramiko SFTPClient](https://docs.paramiko.org/en/stable/api/sftp.html).
