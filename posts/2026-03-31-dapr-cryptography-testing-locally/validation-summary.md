# Validation Summary: How to Test Dapr Cryptography Locally

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (cryptography building block)
- Dapr Python SDK (`dapr-client` package)
- Dapr HTTP API (crypto endpoints)
- Dapr CLI (`dapr run`)
- Python (pytest, unittest.mock)
- JWK (JSON Web Key) format for AES keys
- Local storage crypto component (`crypto.dapr.localstorage`)

## Sources Consulted
- Dapr Cryptography API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr local storage crypto component reference: https://docs.dapr.io/reference/components-reference/supported-cryptography/local-storage/
- Dapr Cryptography quickstart: https://docs.dapr.io/getting-started/quickstarts/cryptography-quickstart/
- Dapr Python SDK crypto examples: https://github.com/dapr/python-sdk/tree/main/examples/crypto
- Dapr Python SDK source (`client.py`, `_crypto.py`): https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- RFC 7517 (JWK) and RFC 7518 (JWA) for JWK key format validation

## Issues Found

### 1. Heredoc prevents key generation (bash script)
**What was wrong:** The key generation script used `<< 'EOF'` (single-quoted heredoc delimiter), which disables all shell expansion. The `$(python3 ...)` command substitution inside the heredoc would be written as a literal string instead of being executed.
**What was changed:** Split into two steps: first generate the key into a variable with `AES_KEY=$(python3 ...)`, then use an unquoted `<< EOF` heredoc that substitutes `$AES_KEY`.

### 2. Pre-generated test key was wrong size (16 bytes instead of 32)
**What was wrong:** The example key `"GawgguFyGrWKav7AX4VKUg"` decodes to only 16 bytes (128 bits), but the `A256KW` algorithm requires a 256-bit (32-byte) key. This would cause a runtime error.
**What was changed:** Replaced with `"dGhpcy1pcy1hLTMyLWJ5dGUtdGVzdC1rZXktb2shIQ"`, which is a valid 32-byte base64url-encoded key.

### 3. Python SDK API was completely wrong (crypto_helpers.py)
**What was wrong:** The code used `io.BytesIO` for the `data` parameter and a plain dict with camelCase keys (`componentName`, `keyName`, `keyWrapAlgorithm`) for `options`. The actual Dapr Python SDK expects `bytes` (or `str`) for `data` and `EncryptOptions`/`DecryptOptions` dataclasses with snake_case fields (`component_name`, `key_name`, `key_wrap_algorithm`).
**What was changed:** Updated to use `EncryptOptions`/`DecryptOptions` dataclasses with correct snake_case parameter names, and pass `bytes` directly instead of `io.BytesIO`. Added the required import from `dapr.clients.grpc._crypto`.

### 4. Unit tests used wrong assertion patterns
**What was wrong:** Tests asserted against dict-style access (`call_kwargs.kwargs["options"]["componentName"]`) and used `io.BytesIO` for mock return values. The `encrypt`/`decrypt` methods return `EncryptResponse`/`DecryptResponse` objects (not `BytesIO`), so `io.BytesIO` as a mock return would fail on `.read()` semantics.
**What was changed:** Updated assertions to use dataclass attribute access (`opts.component_name`). Replaced `io.BytesIO` mock return values with a `FakeResponse` helper class that matches the real response interface.

### 5. HTTP method was POST instead of PUT (integration tests)
**What was wrong:** All integration test HTTP calls used `requests.post()`. The Dapr cryptography HTTP API requires `PUT`, not `POST`.
**What was changed:** Changed all `requests.post()` calls to `requests.put()`.

### 6. HTTP key-wrap-algorithm header used SDK shorthand
**What was wrong:** The HTTP API calls used `"dapr-key-wrap-algorithm": "AES"`, which is the Python SDK shorthand. The HTTP API expects the full JWA algorithm name: `A256KW`.
**What was changed:** Replaced `"AES"` with `"A256KW"` in all HTTP header values.

## Review Notes
- The Dapr cryptography API is still in alpha (`v1.0-alpha1`). The post correctly uses this version prefix, but readers should be aware the API may change in future Dapr releases.
- The `dapr.clients.grpc._crypto` import path uses a private module (`_crypto`). This is the current documented pattern from Dapr's official examples, but it may change in future SDK versions.
- The component configuration and `dapr run` CLI flags are correct for current Dapr versions.
