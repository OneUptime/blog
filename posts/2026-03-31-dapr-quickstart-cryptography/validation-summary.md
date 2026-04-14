# Validation Summary: How to Run Dapr Quickstart for Cryptography

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (cryptography building block)
- Python (requests library, Dapr Python SDK)
- JSON Web Key Sets (JWKS / RFC 7517)
- Azure Key Vault (as a crypto component backend)
- AES key wrapping (A256KW)

## Sources Consulted
- Dapr Cryptography API reference — https://docs.dapr.io/reference/api/cryptography_api/
- Dapr How-to: Use the cryptography APIs — https://docs.dapr.io/developing-applications/building-blocks/cryptography/howto-cryptography/
- Dapr Cryptography Quickstart — https://docs.dapr.io/getting-started/quickstarts/cryptography-quickstart/
- Dapr JWKS Component reference — https://docs.dapr.io/reference/components-reference/supported-cryptography/json-web-key-sets/
- Dapr Azure Key Vault Cryptography Component — https://docs.dapr.io/reference/components-reference/supported-cryptography/azure-key-vault/
- Dapr Python SDK documentation — https://docs.dapr.io/developing-applications/sdks/python/
- Dapr CLI reference (dapr run) — https://docs.dapr.io/reference/cli/dapr-run/
- RFC 7518 (JSON Web Algorithms) — https://datatracker.ietf.org/doc/html/rfc7518

## Issues Found

1. **HTTP API uses binary octet-stream, not JSON**: The `encrypt_value` and `decrypt_value` functions sent JSON payloads with `plaintext`/`ciphertext` fields. The actual Dapr cryptography HTTP API accepts raw binary data (`application/octet-stream`) in the request body and returns binary in the response. Key name and algorithm are passed as HTTP headers (`dapr-key-name`, `dapr-key-wrap-algorithm`), not as JSON fields. Rewrote both functions to use the correct binary API with headers.

2. **`pub.public_key()` bug in generate-key.py**: The variable `pub` is already an `RSAPublicKey` object (from `private_key.public_key()`). Calling `pub.public_key()` would raise `AttributeError` since `RSAPublicKey` has no `public_key()` method. The `hasattr` guard partially mitigated this but the code path was still wrong. Fixed to call `pub.public_numbers()` directly.

3. **Invalid JWK `alg` value `A256CBC`**: `A256CBC` is not a registered JWK algorithm identifier per RFC 7518. Changed to `A256KW` (AES-256 Key Wrap), which is a valid algorithm for symmetric (`oct`) keys and matches the `keyWrapAlgorithm` used in the application code. Fixed in both the `keys.json` and `crypto.yaml` snippets.

4. **`encrypt_value` called with non-existent `store` kwarg**: The Azure Key Vault section called `encrypt_value("my-secret-data", "my-key-name", store="azure-keyvault-crypto")` but the function signature is `encrypt_value(plaintext: str, key_name: str)` with no `store` parameter. Fixed to show setting the `CRYPTO_STORE` variable instead.

5. **`client.encrypt()` used plain dict instead of `EncryptOptions`**: The streaming encryption section passed a plain dictionary for `options`. The Dapr Python SDK requires an `EncryptOptions` object with named parameters (`component_name`, `key_name`, `key_wrap_algorithm`). Fixed the import and call to use `EncryptOptions`.

6. **Unused imports removed**: Removed `from cryptography.hazmat.primitives import serialization` from generate-key.py (never used) and `import json` from app.py (no longer needed after switching from JSON to binary API).

## Review Notes
- The Dapr cryptography building block is in alpha status (`v1.0-alpha1` API prefix). The API surface may change in future Dapr releases.
- The HTTP API is documented as intended for development and testing only. For production, Dapr recommends using the gRPC-based SDKs (Go and JavaScript SDKs have the most mature crypto support).
- Python SDK cryptography support may still be in alpha/limited availability — the official docs primarily reference Go and JavaScript SDKs for the cryptography building block.
- The `pip3 install dapr cryptography` command installs two separate packages: `dapr` (the SDK) and `cryptography` (the Python cryptography library). The `cryptography` package is only needed for the key generation script, not for the Dapr SDK operations.
