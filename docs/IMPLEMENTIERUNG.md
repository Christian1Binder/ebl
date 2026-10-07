# EBL auf PHP/MySQL installieren

Diese Anleitung richtet sich an die Person, die den neuen Webspace einrichtet. Die aktuell auf GitHub Pages veröffentlichte Version speichert weiterhin im Browser. Die folgenden Schritte aktivieren auf dem neuen Server die gemeinsame Datenbank und echte Benutzerkonten.

## 1. Paket und Webspace vorbereiten

Lade das [vollständige Projekt als ZIP](https://github.com/Christian1Binder/ebl/archive/refs/heads/main.zip) herunter und entpacke es. Erforderlich sind PHP 8.2 oder neuer, die Erweiterungen PDO MySQL und mbstring, PHP-Sessions, MySQL 8 oder MariaDB 10.6 oder neuer und eine HTTPS-Adresse. Node und Composer werden auf dem Webspace nicht benötigt.

Erstelle im Kundenbereich des Hosters eine **eigene, leere Datenbank** und einen zugehörigen Datenbankbenutzer. Notiere Datenbankhost, Port, Datenbankname, Benutzername und Datenbankpasswort. Hostinganbieter vergeben häufig Namen mit einem Präfix; verwende exakt diese Angaben. Das SQL-Skript erstellt Tabellen in dieser Datenbank, aber keine Datenbank und keinen Hostingbenutzer.

Für die Einrichtung benötigt der Datenbankbenutzer CREATE, SELECT und INSERT; für den späteren Betrieb außerdem UPDATE und DELETE. Verwende keine bestehende Datenbank einer anderen Anwendung. Vor Arbeiten an einer bereits eingerichteten EBL-Datenbank zuerst eine vollständige Sicherung erstellen.

## 2. Dateien hochladen

Lade per SFTP oder dem Dateimanager des Hosters folgende Dateien und Ordner in das gewünschte Webverzeichnis, beispielsweise `public_html/ebl`:

- `index.html`, `assets/`, `js/` und `data/`;
- `api/` einschließlich der darin enthaltenen `.htaccess`;
- vorübergehend `database/` einschließlich `.htaccess`, aber ohne `keygen.html`.

Die Datei `database/keygen.html` bleibt auf deinem Computer. Entwicklungsdateien, Tests und GitHub-Workflows werden nicht hochgeladen. Aktiviere im FTP-Programm die Anzeige versteckter Dateien, damit `.htaccess` mit übertragen wird.

Diese Anleitung setzt Apache mit wirksamen `.htaccess`-Regeln voraus. Bei Nginx oder deaktiviertem AllowOverride muss der Hoster den Zugriff auf `database/`, `api/config.local.php`, `api/config.example.php`, `api/bootstrap.php` und `api/validation.php` entsprechend sperren. Kontrolliere, dass diese internen Dateien nicht abrufbar sind; eine 403- oder 404-Antwort ist richtig.

## 3. Datenbankverbindung konfigurieren

Kopiere `api/config.example.php` zu `api/config.local.php`. Ersetze den Inhalt der Kopie durch die folgende Vorlage und trage deine Hostingwerte ein. Die Datei bleibt ausschließlich auf deinem Server beziehungsweise in deiner privaten Sicherung.

```php
<?php
declare(strict_types=1);
return [
    'db' => [
        'host' => 'DATENBANKHOST_DES_HOSTERS',
        'port' => '3306',
        'name' => 'DEIN_DATENBANKNAME',
        'user' => 'DEIN_DATENBANKBENUTZER',
        'password' => 'DEIN_DATENBANKPASSWORT',
    ],
    'secure_cookies' => true,
    'session_timeout' => 7200,
    'setup' => [
        'enabled' => false,
        'token_hash' => '',
    ],
];
```

Bei einem Apostroph oder Backslash in einem Wert müssen diese Zeichen in einem PHP-String korrekt maskiert werden: `\\` für einen Backslash und `\'` für ein Apostroph. Verwende für Dateiberechtigungen die Vorgaben deines Hosters; die Konfiguration muss durch PHP lesbar sein. `secure_cookies` bleibt im produktiven Betrieb `true`.

## 4. Installation ohne SSH durchführen

1. Öffne die heruntergeladene `database/keygen.html` lokal im Browser. Klicke auf „Zufälligen Schlüssel erzeugen“. Die Datei arbeitet ohne Netzwerkzugriff und erzeugt einen zufälligen Schlüssel sowie dessen SHA-256-Hash.
2. Ersetze ausschließlich den `setup`-Block in `api/config.local.php` durch den angezeigten Konfigurationsblock. Darin steht `enabled: true` in PHP-Schreibweise und der Hash. Das eigentliche Geheimnis gehört weder in GitHub noch in eine URL.
3. Öffne `https://DEINE-DOMAIN/ebl/api/setup.php`. Bei Installation direkt im Hauptverzeichnis lautet der Pfad `/api/setup.php`.
4. Trage den Einrichtungsschlüssel, deinen Namen, deine Admin-E-Mail und ein eigenes Passwort mit 12 bis 256 Zeichen ein. Bestätige das Passwort und starte die Einrichtung.
5. Warte auf die Erfolgsmeldung. Das Skript legt die vier Tabellen, den Startkatalog und dein erstes Admin-Konto an.
6. Setze in `config.local.php` sofort `enabled` auf `false` und `token_hash` auf `''`. Lösche danach `api/setup.php` und den gesamten Ordner `database/` vom Webspace. Behalte die Originale im heruntergeladenen Paket für spätere Wartung.

Der Browserinstaller ist standardmäßig deaktiviert, prüft Schlüssel und CSRF-Token und arbeitet nur vor dem ersten Benutzerkonto. Vorhandene Konten werden nicht zurückgesetzt; ein vorhandener Katalog bleibt erhalten. Das Schema verwendet `CREATE TABLE IF NOT EXISTS`, ist aber kein Werkzeug zur Migration eines älteren, abweichenden Schemas.

Wenn dein Hoster Tabellen nur über phpMyAdmin anlegen lässt, wähle dort ausdrücklich die neue EBL-Datenbank und importiere unter „Importieren“ die Datei `database/schema.sql`. Führe anschließend die Browserinstallation trotzdem für Startkatalog und Admin durch. Beschränkt der Hoster auch SQL-Berechtigungen so weit, dass der Installer nicht arbeiten kann, muss er die nötigen Rechte für die Einrichtung bereitstellen.

## 5. Alternative mit SSH

Lasse den `setup`-Block deaktiviert und führe im hochgeladenen Projektverzeichnis aus:

```bash
read -s -p 'Admin-Passwort: ' EBL_ADMIN_PASSWORD
export EBL_ADMIN_PASSWORD
php database/install.php --name="Dein Name" --email="deine-adresse@example.org"
unset EBL_ADMIN_PASSWORD
php database/check.php
```

Verwende deine echte E-Mail-Adresse. Das Passwort wird nicht als Kommandoargument in der Shell-Historie gespeichert. `check.php` prüft Verbindung, Tabellen, Startkatalog und ein aktives Admin-Konto. Nach erfolgreicher Installation ebenfalls `api/setup.php` und `database/` vom öffentlichen Webspace entfernen. Ein erneuter CLI-Aufruf mit einer bereits verwendeten E-Mail verändert deren Konto und Passwort nicht.

## 6. Oberfläche auf Datenbank umstellen

Öffne auf dem neuen Webspace `js/config.js` und ändere ausschließlich `backend: 'local'` zu `backend: 'php'`. Die API-Adresse bleibt bei derselben Ordnerstruktur `api/index.php`. Lade die geänderte Datei hoch und öffne die Website über HTTPS neu; bei Bedarf den Browsercache aktualisieren.

Melde dich mit dem angelegten Admin-Konto an. In „Mein Lernraum → Lerngruppe verwalten“ kannst du weitere Konten anlegen und Rollen vergeben. `user` lernt mit privaten Daten, `editor` bearbeitet zusätzlich den gemeinsamen Katalog, `admin` verwaltet zusätzlich Konten.

## 7. Inhalte übernehmen und Abnahme durchführen

Exportiere vor dem Umzug im bisherigen Browser den Katalog und dein persönliches Backup. Importiere den Katalog einmal als Admin oder Editor auf der neuen Plattform. Jedes Mitglied importiert sein persönliches Backup ausschließlich in sein eigenes Konto. Der Browsermodus und der Servermodus übernehmen Daten nicht automatisch voneinander.

Prüfe mit zwei getrennten Browserprofilen oder einem zusätzlichen privaten Fenster:

- Admin-Anmeldung und Abmeldung funktionieren über HTTPS.
- Ein zweites Benutzerkonto kann lernen, aber keine gemeinsamen Inhalte bearbeiten.
- Notizen und Fortschritt des einen Kontos erscheinen nicht im anderen.
- Nach Abmeldung und erneuter Anmeldung bleiben gespeicherte Daten erhalten.
- Der gelöschte Installer ist nicht mehr erreichbar und interne Konfigurationsdateien werden nicht ausgeliefert.

Ergänze vor dem Gruppenbetrieb die tatsächlichen Betreiber- und Datenschutzangaben in der Hilfe. Richte regelmäßige Datenbanksicherungen beim Hoster ein und prüfe die Wiederherstellung. Eine MySQL-Sicherung enthält Konten, gemeinsamen Katalog und persönliche Lernstände; JSON-Exporte aus der Oberfläche ersetzen diese vollständige Sicherung nicht.

## Fehler eingrenzen

**Installer antwortet mit 404:** Er ist deaktiviert, der Hash fehlt oder die URL stimmt nicht. Prüfe den `setup`-Block und das Installationsverzeichnis.

**403 beim Einrichten:** Der Schlüssel oder das Formulartoken ist ungültig, oder PHP erkennt HTTPS nicht korrekt. Lade das Formular neu und verwende den passenden Schlüssel. Bei einem TLS-Proxy muss der Hoster das HTTPS-Signal korrekt an PHP übergeben; sichere Cookies nicht abschalten.

**410 beim Einrichten:** Es existieren bereits Benutzer. Melde dich mit dem vorhandenen Konto an. Lösche keine Tabellen, um diese Sperre zu umgehen.

**503 beziehungsweise Datenbankfehler:** Prüfe PHP-Erweiterungen, Zugangsdaten und Benutzerrechte. Technische Details stehen im PHP-Fehlerprotokoll des Hosters; der Installer zeigt keine Zugangsdaten an.

**Login bleibt nicht bestehen:** Prüfe HTTPS, Sitzungsunterstützung und beschreibbaren Session-Speicher beim Hoster. Website und API müssen über dieselbe Domain und denselben vorgesehenen Pfad laufen.

**Website bleibt im Browsermodus:** Prüfe die hochgeladene `js/config.js` und aktualisiere den Cache. Ändere nicht die GitHub-Pages-Konfiguration auf PHP, denn GitHub Pages führt PHP nicht aus.

## Enthaltene Skripte

`database/schema.sql` ist das reine Tabellenschema. `database/install.php` installiert per CLI; `database/check.php` kontrolliert die Einrichtung. `api/setup.php` ist der geschützte Einmalinstaller ohne SSH. Beide Installationswege verwenden `database/setup-common.php`, damit Schema, Katalog und Konto identisch eingerichtet werden. `database/keygen.html` erzeugt lokal den Einrichtungsschlüssel. Weitere technische Einzelheiten und API-Endpunkte stehen in [WEBSPACE.md](WEBSPACE.md).
