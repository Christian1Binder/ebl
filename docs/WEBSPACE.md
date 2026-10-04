# Umzug auf PHP/MySQL-Webspace

## Voraussetzungen

PHP 8.2+ mit `pdo_mysql`, `mbstring`, `json` und Sessions; MySQL 8+ oder MariaDB 10.6+; HTTPS. Keine Frameworks, kein Composer und kein Node-Build auf dem Server nötig. Die Anwendung ist für einen gewöhnlichen Apache-Webspace vorbereitet. Die `.htaccess`-Regeln benötigen `AllowOverride`; bei Nginx sind entsprechende serverseitige Regeln anzulegen.

## Installation mit SSH/CLI

1. Laufzeitdateien `index.html`, `assets`, `js`, `data`, `api` und die jeweiligen `.htaccess`-Dateien auf den Webspace kopieren. `database` kann für die Installation außerhalb des öffentlichen Webroots liegen; danach vom öffentlichen Webspace entfernen. `docs`, `tests`, `.github`, `node_modules` und Testartefakte gehören nicht auf den öffentlichen Webspace.
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

## Webspace ohne SSH

Schema aus `database/schema.sql` über phpMyAdmin importieren. Admin-Konto und Startkatalog müssen anschließend einmalig über eine vertrauenswürdige lokale PHP-Umgebung oder ein nicht öffentliches Hostingwerkzeug eingerichtet werden. Passworthash mit `password_hash($password, PASSWORD_DEFAULT)` erstellen; keinen Hash-Onlinedienst nutzen. Es gibt bewusst keinen ungeschützten Setup-Endpunkt. Der bereitgestellte Installer ist per HTTP nicht ausführbar.

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
