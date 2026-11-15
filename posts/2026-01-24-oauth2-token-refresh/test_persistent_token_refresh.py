"""Offline regression tests for the runnable persistent OAuth2 example.

Run: python -m unittest discover -s posts/2026-01-24-oauth2-token-refresh -p 'test_*.py'
"""

import os
import stat
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import persistent_token_refresh as example


class PersistentRefreshTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.token_path = Path(self.directory.name) / "state" / "tokens.json"
        self.store = example.PersistentTokenStore(str(self.token_path))
        self.clock = patch.object(example.time, "time", return_value=1000)
        self.clock_mock = self.clock.start()
        self.addCleanup(self.clock.stop)
        self.post = patch.object(example.requests, "post")
        self.post_mock = self.post.start()
        self.addCleanup(self.post.stop)

    def manager(self):
        return example.TokenManagerWithRotation(
            "test-client", "test-secret", "https://auth.example.test/token", self.store
        )

    def seed(self):
        manager = self.manager()
        manager.set_tokens({
            "access_token": "access-1", "refresh_token": "refresh-1", "expires_in": 300
        })
        return manager

    @staticmethod
    def response(body, status=200):
        result = Mock(status_code=status)
        result.json.return_value = body
        return result

    def test_filename_error_explains_required_store_object(self):
        with self.assertRaisesRegex(TypeError, "PersistentTokenStore"):
            example.TokenManagerWithRotation("id", "secret", "https://auth.example.test", "t.json")

    def test_restart_preserves_expiry_and_refreshes_with_rotated_token(self):
        self.seed()
        self.clock_mock.return_value = 1200
        restarted = self.manager()
        self.assertEqual(restarted.get_access_token(), "access-1")
        self.assertEqual(self.store.load_tokens().expires_at, 1300)
        self.post_mock.assert_not_called()

        # The expiry buffer starts at 1240, even after restarting at 1200.
        self.clock_mock.return_value = 1240
        self.post_mock.return_value = self.response({
            "access_token": "access-2", "refresh_token": "refresh-2", "expires_in": 300
        })
        self.assertEqual(restarted.get_access_token(), "access-2")
        self.assertEqual(self.post_mock.call_args.kwargs["data"]["refresh_token"], "refresh-1")
        self.assertEqual(self.store.load_tokens().refresh_token, "refresh-2")

        self.clock_mock.return_value = 1541
        self.post_mock.return_value = self.response({
            "access_token": "access-3", "refresh_token": "refresh-3", "expires_in": 300
        })
        self.assertEqual(self.manager().get_access_token(), "access-3")
        self.assertEqual(self.post_mock.call_args.kwargs["data"]["refresh_token"], "refresh-2")
        self.assertEqual(self.store.load_tokens().refresh_token, "refresh-3")

    def test_response_without_refresh_token_retains_existing_token(self):
        manager = self.seed()
        self.post_mock.return_value = self.response({"access_token": "access-2", "expires_in": 300})
        manager.force_refresh()
        self.assertEqual(self.store.load_tokens().refresh_token, "refresh-1")

    def test_invalid_grant_clears_memory_and_disk(self):
        manager = self.seed()
        self.post_mock.return_value = self.response({"error": "invalid_grant"}, status=400)
        with self.assertRaises(example.RefreshTokenExpiredError):
            manager.force_refresh()
        self.assertIsNone(self.store.load_tokens())
        with self.assertRaises(example.TokenNotAvailableError):
            manager.get_access_token()
        self.assertIsNone(self.manager()._token_data)

    def test_other_refresh_error_preserves_saved_tokens(self):
        manager = self.seed()
        before = self.token_path.read_bytes()
        self.post_mock.return_value = self.response({"error": "temporarily_unavailable"}, status=503)
        with self.assertRaises(example.TokenRefreshError):
            manager.force_refresh()
        self.assertEqual(self.token_path.read_bytes(), before)

    def test_failed_save_preserves_old_file_and_removes_temporary_file(self):
        manager = self.seed()
        before = self.token_path.read_bytes()
        self.post_mock.return_value = self.response({
            "access_token": "access-2", "refresh_token": "refresh-2", "expires_in": 300
        })
        with patch.object(example.os, "replace", side_effect=OSError("disk error")):
            with self.assertRaisesRegex(OSError, "disk error"):
                manager.force_refresh()
        self.assertEqual(self.token_path.read_bytes(), before)
        self.assertEqual(list(self.token_path.parent.iterdir()), [self.token_path])

    @unittest.skipUnless(os.name == "posix", "POSIX file permissions")
    def test_saved_credentials_are_owner_only(self):
        self.seed()
        self.assertEqual(stat.S_IMODE(self.token_path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(self.token_path.parent.stat().st_mode), 0o700)

    def test_first_run_and_restart_do_not_overwrite_saved_rotation(self):
        config = {
            "OAUTH_CLIENT_ID": "test-client", "OAUTH_CLIENT_SECRET": "test-secret",
            "OAUTH_TOKEN_URL": "https://auth.example.test/token",
            "OAUTH_API_BASE_URL": "https://api.example.test",
            "OAUTH_API_PATH": "/status", "OAUTH_TOKEN_FILE": str(self.token_path)
        }
        self.post_mock.return_value = self.response({
            "access_token": "access-2", "refresh_token": "refresh-2", "expires_in": 300
        })
        with patch.dict(os.environ, config, clear=True), \
                patch.object(example, "getpass", return_value="refresh-1") as prompt, \
                patch.object(example.requests.Session, "request", return_value=self.response({"ok": True})) as api, \
                patch("builtins.print"):
            example.main()
            self.assertEqual(api.call_args.kwargs["headers"]["Authorization"], "Bearer access-2")
            self.assertEqual(self.store.load_tokens().refresh_token, "refresh-2")
            prompt.assert_called_once()
            self.post_mock.assert_called_once()

            # A new process should use the file, never prompt for or reseed old tokens.
            prompt.reset_mock()
            self.post_mock.reset_mock()
            self.clock_mock.return_value = 1100
            example.main()
            prompt.assert_not_called()
            self.post_mock.assert_not_called()
            self.assertEqual(self.store.load_tokens().expires_at, 1300)
            self.assertEqual(self.store.load_tokens().refresh_token, "refresh-2")

    def test_unauthorized_api_request_retries_once_and_persists_rotation(self):
        manager = self.seed()
        self.post_mock.return_value = self.response({
            "access_token": "access-2", "refresh_token": "refresh-2", "expires_in": 300
        })
        api = example.OAuth2Session(manager, base_url="https://api.example.test")
        self.addCleanup(api.session.close)
        observed_headers = []

        def respond(method, url, headers, **kwargs):
            observed_headers.append(headers["Authorization"])
            # A second 401 must be returned instead of endlessly refreshing.
            return self.response({}, status=401)

        with patch.object(api.session, "request", side_effect=respond):
            self.assertEqual(api.get("/status", timeout=30).status_code, 401)
        self.assertEqual(observed_headers, ["Bearer access-1", "Bearer access-2"])
        self.post_mock.assert_called_once()
        self.assertEqual(self.store.load_tokens().refresh_token, "refresh-2")


if __name__ == "__main__":
    unittest.main()
