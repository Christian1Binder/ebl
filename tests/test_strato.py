import importlib.util
import io
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('strato', Path(__file__).parents[1] / 'scripts/strato.py')
strato = importlib.util.module_from_spec(spec)
spec.loader.exec_module(strato)


class FakeSFTP:
    def __init__(self):
        self.files = {}
        self.dirs = {'/'}
        self.writes = []

    def lstat(self, path):
        if path in self.dirs:
            return type('Attr', (), {'st_mode': stat.S_IFDIR})()
        if path in self.files:
            return type('Attr', (), {'st_mode': stat.S_IFREG})()
        raise FileNotFoundError(path)

    def listdir(self, path):
        prefix = path.rstrip('/') + '/'
        return sorted({p[len(prefix):].split('/')[0] for p in self.files.keys() | self.dirs
                       if p.startswith(prefix) and p != path})

    def mkdir(self, path):
        self.dirs.add(path)

    def putfo(self, file, path, file_size):
        self.files[path] = file.read()

    def chmod(self, path, mode):
        pass

    def posix_rename(self, old, new):
        self.writes.append(new)
        self.files[new] = self.files.pop(old)

    def remove(self, path):
        del self.files[path]

    def rmdir(self, path):
        assert not self.listdir(path)
        self.dirs.remove(path)

    def normalize(self, path):
        return '/' if path == '.' else path


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.env = {'STRATO_DB_PASSWORD': "test'\\password$()", 'EBL_SETUP_TOKEN': 'a' * 64}

    def test_packages_keep_browser_source_and_exclude_secrets_and_setup(self):
        source = (strato.ROOT / 'js/config.js').read_bytes()
        normal = strato.payload(self.env, False)
        setup = strato.payload(self.env, True)
        self.assertIn(b"backend: 'php'", normal['js/config.js'])
        self.assertIn(b"backend: 'local'", source)
        self.assertEqual(source, (strato.ROOT / 'js/config.js').read_bytes())
        self.assertNotIn('api/setup.php', normal)
        self.assertNotIn('api/config.example.php', normal)
        self.assertFalse(any(p.startswith('database/') for p in normal))
        self.assertNotIn('database/keygen.html', setup)
        self.assertNotIn(self.env['EBL_SETUP_TOKEN'].encode(), setup['api/config.local.php'])
        self.assertIn(b"'enabled'=>false", normal['api/config.local.php'])

    @unittest.skipUnless(shutil.which('php'), 'PHP only available in CI')
    def test_generated_php_accepts_quotes_backslashes_and_literal_shell_characters(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'config.php'
            path.write_bytes(strato.configuration(self.env, True))
            result = subprocess.run(['php', '-l', str(path)], capture_output=True)
            self.assertEqual(result.returncode, 0)
            result = subprocess.run(['php', '-r',
                '$c=require $argv[1]; echo $c["db"]["password"];', str(path)], capture_output=True)
            self.assertEqual(result.stdout.decode(), self.env['STRATO_DB_PASSWORD'])

    def test_bootstrap_finish_and_update_do_not_restore_setup(self):
        server = FakeSFTP()
        with patch.object(strato, 'verify_domain') as verify, patch.object(strato, 'verify_protection'):
            strato.deploy(server, '/', 'bootstrap', strato.payload(self.env, True))
            verify.assert_called_once_with(server, '/')
            self.assertEqual(server.writes[0], '/api/.htaccess')
            self.assertEqual(server.writes[-1], '/api/config.local.php')
            self.assertIn('/api/setup.php', server.files)
            with self.assertRaises(strato.DeploymentError):
                strato.deploy(server, '/', 'bootstrap', {})
            with self.assertRaises(strato.DeploymentError):
                strato.deploy(server, '/', 'deploy', {})
            strato.deploy(server, '/', 'finish', strato.payload(self.env, False))
            self.assertIn('/.ebl-installed', server.files)
            self.assertNotIn('/database', server.dirs)
            strato.deploy(server, '/', 'deploy', strato.payload(self.env, False))
            self.assertNotIn('/api/setup.php', server.files)
            self.assertIn(b"'enabled'=>false", server.files['/api/config.local.php'])

    def test_wrong_domain_aborts_before_application_upload(self):
        server = FakeSFTP()
        with patch.object(strato, 'verify_domain', side_effect=strato.DeploymentError('wrong domain')):
            with self.assertRaises(strato.DeploymentError):
                strato.deploy(server, '/', 'bootstrap', strato.payload(self.env, True))
        self.assertEqual(server.files, {})

    def test_unknown_files_are_not_overwritten_or_recursively_deleted(self):
        server = FakeSFTP()
        server.files['/other-site.html'] = b'keep'
        with self.assertRaises(strato.DeploymentError):
            strato.deploy(server, '/', 'bootstrap', {})
        self.assertEqual(server.files['/other-site.html'], b'keep')

    def test_access_probe_is_removed_on_allowed_and_denied_http(self):
        server = FakeSFTP()
        opener = unittest.mock.MagicMock()
        opener.open.side_effect = strato.urllib.error.HTTPError('https://example.test', 403, 'denied', {}, None)
        with patch.object(strato.urllib.request, 'build_opener', return_value=opener):
            strato.verify_protection(server, '/', True)
        self.assertEqual(server.files, {})
        opener.open.side_effect = None
        with patch.object(strato.urllib.request, 'build_opener', return_value=opener):
            with self.assertRaises(strato.DeploymentError):
                strato.verify_protection(server, '/', False)
        self.assertEqual(server.files, {})

    def test_missing_access_rules_prevent_upload_of_database_password(self):
        server = FakeSFTP()
        with patch.object(strato, 'verify_domain'), patch.object(strato, 'verify_protection',
                side_effect=strato.DeploymentError('not protected')):
            with self.assertRaises(strato.DeploymentError):
                strato.deploy(server, '/', 'bootstrap', strato.payload(self.env, True))
        self.assertNotIn('/api/config.local.php', server.files)
        self.assertTrue(all(p.endswith('.htaccess') for p in server.files))

    def test_missing_secret_and_invalid_setup_token_stop_packaging(self):
        with self.assertRaises(strato.DeploymentError):
            strato.payload({}, False)
        with self.assertRaises(strato.DeploymentError):
            strato.payload({'STRATO_DB_PASSWORD': 'test', 'EBL_SETUP_TOKEN': 'short'}, True)


if __name__ == '__main__':
    unittest.main()
