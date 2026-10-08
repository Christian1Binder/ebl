"""Manual STRATO deployment; secrets are only read from the runner environment."""
import hashlib
import io
import os
from pathlib import Path
import posixpath
import secrets
import stat
import tempfile
import urllib.request
import urllib.error

ROOT = Path(__file__).resolve().parents[1]
HOST = '5020024027.ssh.w2.strato.hosting'
USER = 'su2171620'
DOMAIN = 'https://ebl.binder-lab.com'
MARKER = '.ebl-installed'
SETUP_FILES = ['api/setup.php', 'database/schema.sql', 'database/setup-common.php',
               'database/install.php', 'database/check.php', 'database/.htaccess']


class DeploymentError(RuntimeError):
    pass


def required(env, name):
    value = env.get(name, '')
    if not value:
        raise DeploymentError(f'GitHub Secret fehlt: {name}')
    return value


def php_string(value):
    if '\x00' in value:
        raise ValueError('NUL ist in Konfigurationswerten nicht zulässig.')
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def configuration(env, bootstrap):
    password = required(env, 'STRATO_DB_PASSWORD')
    token = required(env, 'EBL_SETUP_TOKEN') if bootstrap else ''
    if bootstrap and (len(token) != 64 or any(c not in '0123456789abcdef' for c in token)):
        raise DeploymentError('EBL_SETUP_TOKEN muss ein lokal erzeugter 64-stelliger Hex-Schlüssel sein.')
    token_hash = hashlib.sha256(token.encode()).hexdigest() if bootstrap else ''
    return ("<?php\ndeclare(strict_types=1);\nreturn [\n"
            " 'db'=>['host'=>'database-5021595958.webspace-host.com','port'=>'3306',"
            "'name'=>'dbs16203468','user'=>'dbu1860245','password'=>" + php_string(password) + "],\n"
            " 'secure_cookies'=>true,'session_timeout'=>7200,\n"
            " 'setup'=>['enabled'=>" + ('true' if bootstrap else 'false') + ","
            "'token_hash'=>" + php_string(token_hash) + "]\n];\n").encode()


def payload(env, bootstrap):
    files = {name: (ROOT / name).read_bytes() for name in ['index.html', 'api/.htaccess']}
    for folder in ['assets', 'js', 'data']:
        for path in sorted((ROOT / folder).rglob('*')):
            if path.is_file():
                files[path.relative_to(ROOT).as_posix()] = path.read_bytes()
    # Explicit API allowlist keeps tests, examples and future installer files out.
    for name in ['api/index.php', 'api/bootstrap.php', 'api/validation.php']:
        files[name] = (ROOT / name).read_bytes()
    source = files['js/config.js'].decode()
    if source.count("backend: 'local'") != 1:
        raise DeploymentError('Browsermodus im Repository unerwartet; Upload abgebrochen.')
    files['js/config.js'] = source.replace("backend: 'local'", "backend: 'php'").encode()
    files['api/config.local.php'] = configuration(env, bootstrap)
    if bootstrap:
        files.update({name: (ROOT / name).read_bytes() for name in SETUP_FILES})
    return files


def exists(sftp, path):
    try:
        sftp.lstat(path)
        return True
    except FileNotFoundError:
        return False


def checked_target(sftp, target):
    if not target or '\x00' in target or '\n' in target or '..' in target.split('/'):
        raise DeploymentError('Ungültiges Zielverzeichnis.')
    resolved = sftp.normalize(target)
    if not stat.S_ISDIR(sftp.lstat(resolved).st_mode):
        raise DeploymentError('Ziel ist kein Verzeichnis.')
    print('SFTP-Startverzeichnis:', sftp.normalize('.'))
    print('Tatsächliches SFTP-Ziel:', resolved)
    print('Vorhandene Einträge:', ', '.join(sorted(sftp.listdir(resolved))))
    return resolved


def mkdirs(sftp, target, relative):
    current = target
    for part in relative.split('/')[:-1]:
        current = posixpath.join(current, part)
        if not exists(sftp, current):
            sftp.mkdir(current)
        if not stat.S_ISDIR(sftp.lstat(current).st_mode):
            raise DeploymentError('Ziel-Unterverzeichnis fehlt oder ist ein Symlink: ' + part)


def atomic_write(sftp, path, data):
    # Temp name remains covered by the PHP configuration access rule.
    temp = posixpath.join(posixpath.dirname(path),
                          'config.upload-' + secrets.token_hex(12) + '.php')
    try:
        sftp.putfo(io.BytesIO(data), temp, file_size=len(data))
        sftp.chmod(temp, 0o600 if path.endswith('config.local.php') else 0o644)
        sftp.posix_rename(temp, path)
    finally:
        if exists(sftp, temp):
            sftp.remove(temp)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def verify_domain(sftp, target):
    """Prove the selected directory serves this HTTPS domain before app writes."""
    name = 'ebl-target-' + secrets.token_hex(16) + '.txt'
    value = secrets.token_hex(32).encode()
    path = posixpath.join(target, name)
    try:
        sftp.putfo(io.BytesIO(value), path, file_size=len(value))
        opener = urllib.request.build_opener(NoRedirect())
        with opener.open(DOMAIN + '/' + name, timeout=30) as response:
            if response.read(1024) != value:
                raise DeploymentError('Subdomain zeigt nicht auf das ausgewählte SFTP-Ziel.')
    finally:
        if exists(sftp, path):
            sftp.remove(path)
    print('HTTPS-Zuordnung des Zielverzeichnisses bestätigt.')


def verify_protection(sftp, target, bootstrap):
    """Confirm server access rules before uploading database credentials."""
    probes = ['api/config.check-' + secrets.token_hex(12) + '.php']
    if bootstrap:
        probes.append('database/check-' + secrets.token_hex(12) + '.txt')
    opener = urllib.request.build_opener(NoRedirect())
    for name in probes:
        path = posixpath.join(target, name)
        try:
            sftp.putfo(io.BytesIO(b'EBL access probe'), path, file_size=16)
            try:
                with opener.open(DOMAIN + '/' + name, timeout=30):
                    raise DeploymentError('Interne Dateien sind öffentlich abrufbar; Serverregeln prüfen.')
            except urllib.error.HTTPError as error:
                if error.code not in (403, 404):
                    raise DeploymentError('Dateischutz konnte nicht bestätigt werden.')
        finally:
            if exists(sftp, path):
                sftp.remove(path)
    print('HTTP-Zugriffsschutz vor Übertragung der Konfiguration bestätigt.')


def deploy(sftp, target, mode, files):
    join = lambda p: posixpath.join(target, p)
    installed = exists(sftp, join(MARKER))
    if mode == 'bootstrap':
        if installed or exists(sftp, join('api/config.local.php')):
            raise DeploymentError('Erstinstallation bereits begonnen/abgeschlossen. Kein erneutes Aktivieren.')
        # A fresh setup must not overwrite an unrelated site or an old EBL install.
        unexpected = set(sftp.listdir(target)) - {'.', '..'}
        if unexpected:
            raise DeploymentError('Bootstrap benötigt einen leeren Zielordner. Vorhandene Dateien zuerst sichern und prüfen.')
    elif mode == 'deploy':
        if not installed or not exists(sftp, join('api/config.local.php')):
            raise DeploymentError('Erstinstallation noch nicht mit finish abgeschlossen.')
        if any(exists(sftp, join(p)) for p in SETUP_FILES):
            raise DeploymentError('Installer-Reste vorhanden. Zuerst finish ausführen.')
    elif mode == 'finish':
        if not exists(sftp, join('api/config.local.php')):
            raise DeploymentError('Keine vorhandene Installation gefunden.')
    verify_domain(sftp, target)
    # Deny rules before configuration. During bootstrap enable setup last.
    order = sorted(files, key=lambda p: (0 if p.endswith('.htaccess') else
                                        2 if p == 'api/config.local.php' else 1, p))
    protection_checked = False
    for name in order:
        if not name.endswith('.htaccess') and not protection_checked:
            verify_protection(sftp, target, mode == 'bootstrap')
            protection_checked = True
        mkdirs(sftp, target, name)
        if exists(sftp, join(name)) and not stat.S_ISREG(sftp.lstat(join(name)).st_mode):
            raise DeploymentError('Zieldatei ist kein reguläres File: ' + name)
        atomic_write(sftp, join(name), files[name])
    if mode == 'finish':
        # Configuration is disabled before installer removal; no recursive delete.
        for name in SETUP_FILES:
            if exists(sftp, join(name)):
                sftp.remove(join(name))
        if exists(sftp, join('database')):
            if sftp.listdir(join('database')):
                raise DeploymentError('Unbekannte Dateien in database; bitte prüfen. Nicht automatisch gelöscht.')
            sftp.rmdir(join('database'))
        atomic_write(sftp, join(MARKER), b'EBL setup disabled\n')
    print('STRATO-Aktion erfolgreich:', mode)
    if mode == 'bootstrap':
        print('Jetzt ' + DOMAIN + '/api/setup.php öffnen, Admin anlegen, danach finish ausführen.')


def main():
    import paramiko
    env = os.environ
    mode = env.get('STRATO_MODE', 'inspect')
    if mode not in ['inspect', 'bootstrap', 'finish', 'deploy']:
        raise DeploymentError('Unbekannter Modus.')
    # Validate all required secrets locally before making any remote change.
    password = required(env, 'STRATO_SFTP_PASSWORD')
    hosts = required(env, 'STRATO_KNOWN_HOSTS')
    files = payload(env, mode == 'bootstrap') if mode != 'inspect' else {}
    with tempfile.TemporaryDirectory() as temp:
        known = Path(temp) / 'known_hosts'
        known.write_text(hosts + '\n')
        client = paramiko.SSHClient()
        client.load_host_keys(str(known))
        client.set_missing_host_key_policy(paramiko.RejectPolicy())
        try:
            client.connect(HOST, port=22, username=USER, password=password,
                           allow_agent=False, look_for_keys=False,
                           timeout=30, auth_timeout=30, banner_timeout=30)
            with client.open_sftp() as sftp:
                target = checked_target(sftp, env.get('STRATO_TARGET', '.'))
                if mode != 'inspect':
                    deploy(sftp, target, mode, files)
        finally:
            client.close()


if __name__ == '__main__':
    try:
        main()
    except DeploymentError as error:
        print('STRATO-Aktion abgebrochen:', error)
        raise SystemExit(1)
    except Exception:
        # Do not expose exception messages from third-party libraries or secrets.
        print('STRATO-Aktion abgebrochen. Prüfe Secrets, Hostschlüssel, Ziel und HTTPS-Zuordnung. '
              'Bei bootstrap muss das Ziel leer sein; Updates benötigen ein abgeschlossenes finish.')
        raise SystemExit(1)
