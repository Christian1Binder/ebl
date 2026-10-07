# Umzug auf PHP/MySQL-Webspace

## Voraussetzungen

PHP 8.2+ mit `pdo_mysql`, `mbstring`, `json` und Sessions; MySQL 8+ oder MariaDB 10.6+; HTTPS. Keine Frameworks, kein Composer und kein Node-Build auf dem Server nötig. Die Anwendung ist für einen gewöhnlichen Apache-Webspace vorbereitet. Die `.htaccess`-Regeln benötigen `AllowOverride`; bei Nginx sind entsprechende serverseitige Regeln anzulegen.

## Installation mit SSH/CLI

1. Laufzeitdateien `index.html`, `assets`, `js`, `data`, `api` und die jeweiligen `.htaccess`-Dateien auf den Webspace kopieren. `database` für die Installation neben `api` belassen (die mitgelieferte `.htaccess` sperrt den HTTP-Zugriff); nach der Installation vom öffentlichen Webspace entfernen. Ein Verschieben an einen anderen Ort erfordert angepasste Pfade und ist für diese Anleitung nicht vorgesehen. `docs`, `tests`, `.github`, `node_modules` und Testartefakte gehören nicht auf den öffentlichen Webspace.
2. Leere Datenbank mit einem eigenen Datenbankbenutzer erstellen.
3. `api/config.example.php` nach `api/config.local.php` kopieren und Verbindungswerte eintragen, oder die dokumentierten `EBL_DB_*`-Umgebungsvariablen verwenden. Die Datei nie in Git einchecken. `secure_cookies` bleibt produktiv `true`.
4. Über SSH im Projektordner installieren:

```bash
read -s -p 'Admin-Passwort: ' EBL_ADMIN_PASSWORD
export EBL_ADMIN_PASSWORD
php database/install.php --name="Admin Name" --email="admin@example.org"
unset EBL_ADMIN_PASSWORD
```

5. In `js/config.js` `backend: 'local'` durch `backend: 'php'` ersetzen. `apiUrl` bleibt bei derselben Verzeichnisstruktur unverändert.
6. Über HTTPS öffnen und mit dem angelegten Konto anmelden. In „Mein Lernraum → Lerngruppe verwalten“ weitere Konten anlegen.
7. Bisherige Inhalte über Katalogexport/-import übernehmen. Jede Person importiert ihr eigenes persönliches Backup separat. Kein gemeinsames persönliches Backup verwenden.

## Webspace ohne SSH: Einrichtung im Browser

1. Dateien und Serverkonfiguration wie oben bereitstellen; zusätzlich vorübergehend `database` und `api/setup.php` hochladen. `database/keygen.html` bleibt ausschließlich auf deinem Computer.
2. `database/keygen.html` lokal doppelklicken und „Zufälligen Schlüssel erzeugen“ wählen. Die Datei benötigt keine Zusatzinstallation und sendet keine Daten.
3. Den erzeugten **setup-Konfigurationsblock mit dem Hash** in `api/config.local.php` einsetzen. Den eigentlichen geheimen Schlüssel separat bereithalten. Keinen Einrichtungsschlüssel in eine URL, GitHub oder einen Chat kopieren.
4. `https://DEINE-DOMAIN/ebl/api/setup.php` öffnen (bei Installation im Hauptverzeichnis `/ebl` weglassen). Einrichtungsschlüssel, Admin-Namen, Admin-E-Mail und ein eigenes Passwort eingeben und absenden.
5. Der Installer legt die vier Tabellen, den Startkatalog und genau das erste Admin-Konto an. Ein vorhandener Katalog wird nicht überschrieben. Sind bereits Nutzer vorhanden, wird eine erneute Browserinstallation mit HTTP 410 abgewiesen.
6. `setup.enabled` wieder auf `false` setzen und `setup.token_hash` leeren. `api/setup.php` und den gesamten Ordner `database` vom Webspace löschen. Die Kopien im heruntergeladenen Projekt behalten.
7. `js/config.js` auf `backend: 'php'` umstellen, per HTTPS öffnen und anmelden.

Ein manueller SQL-Import ist bei diesem Weg nicht erforderlich. Falls der Hoster Tabellen nur über phpMyAdmin anlegen lässt: richtige Datenbank wählen, unter **Importieren** `database/schema.sql` importieren und anschließend dieselbe geschützte Browserinstallation für Startkatalog und Admin nutzen. `CREATE TABLE IF NOT EXISTS` belässt vorhandene Tabellen; es ist kein Schema-Migrationswerkzeug für inkompatible Altversionen.

Eine funktionierende HTTPS-Erkennung ist Voraussetzung. Bei einem vorgeschalteten TLS-Proxy muss der Hoster PHP das HTTPS-Signal korrekt bereitstellen. Sichere Cookies nicht für den produktiven Betrieb abschalten.

## Rechte und Sitzungen

- `user`: Kurse lesen, eigenen Lernstand speichern, eigenes Passwort ändern.
- `editor`: zusätzlich gemeinsamen Katalog bearbeiten.
- `admin`: zusätzlich Konten anlegen, Rollen ändern, Konten deaktivieren und Passwörter zurücksetzen.

Startpasswörter werden nicht per E-Mail verschickt. Passwörter werden als Hash gespeichert. Passwortänderungen und Kontensperren entziehen bestehenden Sitzungen ihren Zugriff. Sitzungen laufen nach zwei Stunden ohne API-Aktivität aus. Ein eigenes Admin-Konto kann nicht über die Oberfläche deaktiviert oder herabgestuft werden; mindestens ein aktives Admin-Konto bleibt erhalten.

Alle Schreibzugriffe benötigen Sitzung und CSRF-Token. SQL nutzt gebundene Parameter. HTML aus importierten Lektionstexten wird escaped. Katalog-/Lernstandrevisionen verhindern das stille Überschreiben von Änderungen aus einer anderen Sitzung. Persönlicher Lernstand ist auf 1 MB pro Konto begrenzt, Anfragen auf 4 MB.

## Betreiberangaben und Sicherung

Vor dem regulären Gruppenbetrieb sind Betreiberkontakt und passende Datenschutz-/Impressumsangaben in der Hilfe einzusetzen. Die Anwendung enthält keine erfundenen Betreiberangaben. Regelmäßige Sicherung der MySQL-Datenbank über den Hostinganbieter deckt gemeinsame Inhalte, Konten und Lernstände ab. Die JSON-Exporte der Oberfläche ergänzen diese Sicherung, enthalten aber keine Passworthashes.

## API-Endpunkte

Alle Aufrufe: `api/index.php?action=…`; JSON und same-origin Sitzung.

- `GET session`: Nutzer oder `null`, CSRF-Token.
- `POST login`: `email`, `password`; neue Sitzung und Token.
- `POST logout`: Sitzung beenden.
- `GET catalog`: gemeinsamen Katalog lesen, Anmeldung erforderlich.
- `POST catalog`: `catalog`, `revision`; Editor/Admin, Konflikt ergibt HTTP 409.
- `GET state`: eigener Lernstand und `revision`.
- `POST state`: `state`, `revision`; ausschließlich eigener Lernstand.
- `POST password`: `current`, `password`.
- `GET users`: Konten ohne Passworthashes; Admin.
- `POST users`: `op: create` oder `update`; Admin.

## Serverkontrolle

Kontrolle mit zwei getrennten Browserprofilen: eigener Lernstand bleibt getrennt, Nutzer kann Kursinhalte nicht ändern, Editor kann Inhalte ändern und keine Konten verwalten, Admin kann Konten sperren. Eine veraltete Revision muss mit HTTP 409 abgewiesen werden. Die CI prüft diese Eigenschaften automatisch an einer separaten Testdatenbank.
