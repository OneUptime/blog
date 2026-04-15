# How to Test Dapr Cryptography Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, Testing, Local Development, Unit Test, Integration Test

Description: Learn how to test Dapr Cryptography operations locally using local key storage, mock components, unit tests, and automated round-trip integration tests.

---

## Testing Cryptography Locally

Testing cryptography with Dapr locally requires:
1. A local key provider (local storage or in-memory)
2. The Dapr sidecar running via `dapr run`
3. Unit tests for your encryption helper functions
4. Integration tests that do full encrypt/decrypt round-trips

## Setting Up Local Keys

Generate test keys for local development:

```bash
mkdir -p ./keys/test

# Generate a 256-bit AES key in JWK format
AES_KEY=$(python3 -c 'import base64, os; print(base64.urlsafe_b64encode(os.urandom(32)).rstrip(b"=").decode())')

cat > ./keys/test/test-aes-key.json << EOF
{
  "kty": "oct",
  "kid": "test-aes-key",
  "use": "enc",
  "alg": "A256KW",
  "k": "$AES_KEY"
}
EOF
```

Or use a pre-generated test key (never use in production):

```json
{
  "kty": "oct",
  "kid": "test-aes-key",
  "use": "enc",
  "alg": "A256KW",
  "k": "dGhpcy1pcy1hLTMyLWJ5dGUtdGVzdC1rZXktb2shIQ"
}
```

## Test Component Configuration

```yaml
# components/test/crypto.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: test-crypto
spec:
  type: crypto.dapr.localstorage
  version: v1
  metadata:
  - name: path
    value: ./keys/test
```

## Unit Testing Encryption Helpers

Test your wrapper functions without Dapr by mocking the DaprClient:

```python
# app/crypto_helpers.py
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import EncryptOptions, DecryptOptions

CRYPTO_COMPONENT = "test-crypto"

def encrypt_field(value: str, key_name: str = "test-aes-key") -> bytes:
    with DaprClient() as d:
        return d.encrypt(
            data=value.encode(),
            options=EncryptOptions(
                component_name=CRYPTO_COMPONENT,
                key_name=key_name,
                key_wrap_algorithm="AES",
            ),
        ).read()

def decrypt_field(ciphertext: bytes, key_name: str = "test-aes-key") -> str:
    with DaprClient() as d:
        return d.decrypt(
            data=ciphertext,
            options=DecryptOptions(
                component_name=CRYPTO_COMPONENT,
                key_name=key_name,
            ),
        ).read().decode()
```

```python
# tests/test_crypto_helpers.py
import pytest
from unittest.mock import MagicMock, patch
from dapr.clients.grpc._crypto import EncryptOptions, DecryptOptions

class FakeResponse:
    def __init__(self, data: bytes):
        self._data = data
    def read(self, size=-1):
        return self._data

@pytest.fixture
def mock_dapr_client():
    with patch("app.crypto_helpers.DaprClient") as MockClient:
        mock_instance = MagicMock()
        MockClient.return_value.__enter__.return_value = mock_instance
        yield mock_instance

def test_encrypt_field_returns_bytes(mock_dapr_client):
    mock_dapr_client.encrypt.return_value = FakeResponse(b"encrypted-data")
    from app.crypto_helpers import encrypt_field

    result = encrypt_field("secret value")

    mock_dapr_client.encrypt.assert_called_once()
    call_kwargs = mock_dapr_client.encrypt.call_args
    opts = call_kwargs.kwargs["options"]
    assert opts.component_name == "test-crypto"
    assert opts.key_name == "test-aes-key"
    assert result == b"encrypted-data"

def test_encrypt_uses_custom_key(mock_dapr_client):
    mock_dapr_client.encrypt.return_value = FakeResponse(b"enc")
    from app.crypto_helpers import encrypt_field

    encrypt_field("value", key_name="payment-key")

    call_kwargs = mock_dapr_client.encrypt.call_args
    assert call_kwargs.kwargs["options"].key_name == "payment-key"

def test_decrypt_field_returns_string(mock_dapr_client):
    mock_dapr_client.decrypt.return_value = FakeResponse(b"original value")
    from app.crypto_helpers import decrypt_field

    result = decrypt_field(b"ciphertext")
    assert result == "original value"
```

## Integration Test: Round-Trip Encrypt/Decrypt

```python
# tests/test_crypto_integration.py
import pytest
import subprocess
import time
import os

@pytest.fixture(scope="session", autouse=True)
def dapr_sidecar():
    """Start Dapr sidecar for integration tests."""
    proc = subprocess.Popen([
        "dapr", "run",
        "--app-id", "test-app",
        "--dapr-http-port", "3510",
        "--resources-path", "./components/test"
    ])
    time.sleep(3)  # Wait for sidecar to start
    yield
    proc.terminate()
    proc.wait()

@pytest.mark.integration
def test_encrypt_decrypt_roundtrip():
    import requests

    plaintext = b"sensitive test data 12345"

    # Encrypt
    enc_resp = requests.put(
        "http://localhost:3510/v1.0-alpha1/crypto/test-crypto/encrypt",
        headers={
            "Content-Type": "application/octet-stream",
            "dapr-key-name": "test-aes-key",
            "dapr-key-wrap-algorithm": "A256KW"
        },
        data=plaintext
    )
    assert enc_resp.status_code == 200
    ciphertext = enc_resp.content
    assert ciphertext != plaintext

    # Decrypt
    dec_resp = requests.put(
        "http://localhost:3510/v1.0-alpha1/crypto/test-crypto/decrypt",
        headers={
            "Content-Type": "application/octet-stream",
            "dapr-key-name": "test-aes-key"
        },
        data=ciphertext
    )
    assert dec_resp.status_code == 200
    assert dec_resp.content == plaintext

@pytest.mark.integration
def test_different_plaintexts_produce_different_ciphertexts():
    import requests

    def encrypt(data: bytes) -> bytes:
        resp = requests.put(
            "http://localhost:3510/v1.0-alpha1/crypto/test-crypto/encrypt",
            headers={"Content-Type": "application/octet-stream",
                     "dapr-key-name": "test-aes-key",
                     "dapr-key-wrap-algorithm": "A256KW"},
            data=data
        )
        return resp.content

    ct1 = encrypt(b"hello")
    ct2 = encrypt(b"hello")
    # AES-GCM uses random nonce, so same plaintext produces different ciphertexts
    assert ct1 != ct2
```

## Running Tests

```bash
# Unit tests only (no Dapr required)
pytest tests/test_crypto_helpers.py -v

# Integration tests (Dapr sidecar required)
pytest tests/test_crypto_integration.py -v -m integration

# All tests
pytest tests/ -v
```

## Summary

Local Dapr Cryptography testing uses two layers: unit tests with mocked DaprClient for fast, dependency-free testing of your helper functions, and integration tests that start a real Dapr sidecar with the local storage provider for end-to-end round-trip validation. This approach catches both logic bugs and configuration issues before deployment.
