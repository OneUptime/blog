"""Single-process persistent OAuth2 example; see README.md for setup.

The class definitions mirror the corresponding article snippets.
"""

import time
import requests
from dataclasses import dataclass
from typing import Optional
import threading

@dataclass
class TokenData:
    """Holds OAuth2 token information."""
    access_token: str
    refresh_token: str
    expires_at: float
    expires_in: int
    issued_at: float
    token_type: str = "Bearer"
    scope: Optional[str] = None


class OAuth2TokenManager:
    """
    Manages OAuth2 tokens with automatic refresh capability.
    """

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        token_url: str,
        refresh_buffer_seconds: int = 60
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = token_url
        self.refresh_buffer = refresh_buffer_seconds
        self._token_data: Optional[TokenData] = None
        self._lock = threading.Lock()

    def set_tokens(self, token_response: dict) -> None:
        """
        Store tokens from an OAuth2 token response.
        """
        expires_in = token_response.get("expires_in", 3600)
        issued_at = time.time()

        self._token_data = TokenData(
            access_token=token_response["access_token"],
            refresh_token=token_response["refresh_token"],
            expires_at=issued_at + expires_in,
            expires_in=expires_in,
            issued_at=issued_at,
            token_type=token_response.get("token_type", "Bearer"),
            scope=token_response.get("scope")
        )

    def get_access_token(self) -> str:
        """
        Get a valid access token, refreshing if necessary.
        Thread-safe implementation.
        """
        with self._lock:
            if self._token_data is None:
                raise TokenNotAvailableError("No tokens available. User must authenticate.")

            # Check if token needs refresh (with buffer time)
            if self._is_token_expiring():
                self._refresh_token()

            return self._token_data.access_token

    def force_refresh(self) -> str:
        """
        Force a token refresh and return the new access token.
        """
        with self._lock:
            self._refresh_token()
            return self._token_data.access_token

    def _is_token_expiring(self) -> bool:
        """Check if token is expired or will expire soon."""
        if self._token_data is None:
            return True
        return time.time() >= (self._token_data.expires_at - self.refresh_buffer)

    def _refresh_token(self) -> None:
        """
        Refresh the access token using the refresh token.
        """
        if self._token_data is None or not self._token_data.refresh_token:
            raise TokenNotAvailableError("No refresh token available")

        response = requests.post(
            self.token_url,
            data={
                "grant_type": "refresh_token",
                "refresh_token": self._token_data.refresh_token
            },
            auth=(self.client_id, self.client_secret),
            timeout=30
        )

        if response.status_code == 200:
            token_response = response.json()

            # Handle refresh token rotation
            new_refresh_token = token_response.get(
                "refresh_token",
                self._token_data.refresh_token  # Keep old if not rotated
            )
            token_response["refresh_token"] = new_refresh_token

            self.set_tokens(token_response)
        else:
            error_data = response.json()
            if error_data.get("error") == "invalid_grant":
                # Refresh token is invalid/expired
                self._token_data = None
                raise RefreshTokenExpiredError(
                    "Refresh token expired. User must re-authenticate."
                )
            raise TokenRefreshError(f"Token refresh failed: {error_data}")


class TokenNotAvailableError(Exception):
    pass


class RefreshTokenExpiredError(Exception):
    pass


class TokenRefreshError(Exception):
    pass

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class OAuth2Session:
    """
    HTTP session with automatic token refresh.
    """

    def __init__(self, token_manager: OAuth2TokenManager, base_url: str = ""):
        self.token_manager = token_manager
        self.base_url = base_url
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        """Create a session with retry configuration."""
        session = requests.Session()

        # Configure retries for transient failures
        retry_strategy = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["GET", "POST", "PUT", "DELETE", "PATCH"]
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        return session

    def request(self, method: str, url: str, **kwargs) -> requests.Response:
        """
        Make an authenticated request with automatic token refresh.
        """
        full_url = f"{self.base_url}{url}" if self.base_url else url

        # Get current access token
        try:
            access_token = self.token_manager.get_access_token()
        except RefreshTokenExpiredError:
            raise  # Re-authentication required

        # Add authorization header
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {access_token}"

        # Make the request
        response = self.session.request(method, full_url, headers=headers, **kwargs)

        # Handle 401 - token might have been invalidated server-side
        if response.status_code == 401:
            response = self._handle_unauthorized(method, full_url, headers, kwargs)

        return response

    def _handle_unauthorized(
        self,
        method: str,
        url: str,
        headers: dict,
        kwargs: dict
    ) -> requests.Response:
        """
        Handle 401 response by forcing token refresh and retrying.
        """
        try:
            # Force refresh
            access_token = self.token_manager.force_refresh()

            # Update header with new token
            headers["Authorization"] = f"Bearer {access_token}"

            # Retry the request
            return self.session.request(method, url, headers=headers, **kwargs)

        except (RefreshTokenExpiredError, TokenRefreshError):
            raise

    def get(self, url: str, **kwargs) -> requests.Response:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs) -> requests.Response:
        return self.request("POST", url, **kwargs)

    def put(self, url: str, **kwargs) -> requests.Response:
        return self.request("PUT", url, **kwargs)

    def delete(self, url: str, **kwargs) -> requests.Response:
        return self.request("DELETE", url, **kwargs)

    def patch(self, url: str, **kwargs) -> requests.Response:
        return self.request("PATCH", url, **kwargs)

import json
import os
import tempfile
from pathlib import Path
from typing import Optional


class PersistentTokenStore:
    """Persistent token storage with atomic file replacement."""

    def __init__(self, storage_path: str):
        self.storage_path = Path(storage_path).expanduser()
        self.storage_path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)

    def save_tokens(self, token_data: TokenData) -> None:
        """Save complete token metadata without exposing a partial JSON file."""
        data = {
            "access_token": token_data.access_token,
            "refresh_token": token_data.refresh_token,
            "expires_at": token_data.expires_at,
            "expires_in": token_data.expires_in,
            "issued_at": token_data.issued_at,
            "token_type": token_data.token_type,
            "scope": token_data.scope
        }

        temp_path = None
        try:
            # NamedTemporaryFile is readable/writable only by its owner on POSIX.
            with tempfile.NamedTemporaryFile(
                "w", dir=self.storage_path.parent, delete=False, encoding="utf-8"
            ) as f:
                temp_path = Path(f.name)
                json.dump(data, f)
                f.flush()
                os.fsync(f.fileno())

            os.replace(temp_path, self.storage_path)
        finally:
            # Remove the temporary file if writing or replacing failed.
            if temp_path is not None and temp_path.exists():
                temp_path.unlink()

    def load_tokens(self) -> Optional[TokenData]:
        """Restore the original expiry; restarting must not extend token life."""
        try:
            with self.storage_path.open(encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError:
            return None

        return TokenData(
            access_token=data["access_token"],
            refresh_token=data["refresh_token"],
            expires_at=data["expires_at"],
            expires_in=data.get("expires_in", 3600),
            issued_at=data.get("issued_at", data["expires_at"] - data.get("expires_in", 3600)),
            token_type=data.get("token_type", "Bearer"),
            scope=data.get("scope")
        )

    def clear_tokens(self) -> None:
        """Remove stored tokens when re-authentication is required."""
        try:
            self.storage_path.unlink()
        except FileNotFoundError:
            pass


class TokenManagerWithRotation(OAuth2TokenManager):
    """Persist initial tokens and every successful refresh."""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        token_url: str,
        token_store: PersistentTokenStore,
        refresh_buffer_seconds: int = 60
    ):
        super().__init__(client_id, client_secret, token_url, refresh_buffer_seconds)
        if isinstance(token_store, (str, Path)):
            raise TypeError("Pass PersistentTokenStore(filename), not the filename itself")
        self.token_store = token_store
        self._token_data = self.token_store.load_tokens()

    def set_tokens(self, token_response: dict) -> None:
        """Store tokens in memory and persist to storage."""
        super().set_tokens(token_response)
        self.token_store.save_tokens(self._token_data)

    def _refresh_token(self) -> None:
        # The base class already preserves or replaces the refresh token.
        # Its call to self.set_tokens() also persists the new token here.
        try:
            super()._refresh_token()
        except RefreshTokenExpiredError:
            self.token_store.clear_tokens()
            raise

from getpass import getpass
from urllib.parse import urlsplit


def main():
    token_url = os.environ["OAUTH_TOKEN_URL"]
    base_url = os.environ["OAUTH_API_BASE_URL"].rstrip("/")
    api_path = os.environ.get("OAUTH_API_PATH", "/users/me")
    for url in (token_url, base_url):
        parsed = urlsplit(url)
        if parsed.scheme != "https" or not parsed.netloc:
            raise ValueError("Use a complete HTTPS URL for the token endpoint and API")
    if not api_path.startswith("/"):
        raise ValueError("OAUTH_API_PATH must start with /")

    # Use a stable path outside the source repository, even after a restart.
    store = PersistentTokenStore(os.environ.get(
        "OAUTH_TOKEN_FILE", str(Path.home() / ".oauth2-monitor" / "tokens.json")
    ))
    token_manager = TokenManagerWithRotation(
        client_id=os.environ["OAUTH_CLIENT_ID"],
        client_secret=os.environ.get("OAUTH_CLIENT_SECRET") or getpass("Client secret: "),
        token_url=token_url,
        token_store=store  # Pass the object, not "tokens.json".
    )

    if store.load_tokens() is None:
        refresh_token = getpass("Current refresh token from initial authorization: ")
        if not refresh_token:
            raise ValueError("A refresh token is required for the first run")
        token_manager.set_tokens({
            "access_token": "",
            "refresh_token": refresh_token,
            "expires_in": 0  # Refresh before making the first API request.
        })

    api = OAuth2Session(token_manager, base_url=base_url)
    try:
        response = api.get(api_path, timeout=30)
        response.raise_for_status()
        print(response.json())
    except RefreshTokenExpiredError:
        raise SystemExit(
            "Refresh token rejected; saved tokens were removed. Complete your "
            "provider's authorization flow again, then rerun with a new refresh token."
        ) from None
    finally:
        api.session.close()


if __name__ == "__main__":
    main()
