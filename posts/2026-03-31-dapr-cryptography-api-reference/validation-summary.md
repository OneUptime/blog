# Validation Summary: How to Use the Dapr Cryptography API Reference

## Status
validated

## Post Type
Reference / API Guide

## Technologies Covered
- Dapr Cryptography Building Block
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Subtle Crypto HTTP API
- Azure Key Vault (crypto component)
- Go, HTTP/curl

## Sources Consulted
- Dapr Go SDK source code (`github.com/dapr/go-sdk/client/crypto.go`) — verified EncryptOptions/DecryptOptions struct fields
- Dapr Python SDK source code (`github.com/dapr/python-sdk`, `dapr/clients/grpc/client.py`) — verified available methods
- Dapr components-contrib crypto directory (`github.com/dapr/components-contrib/crypto/`) — verified supported backends
- Dapr Cryptography API reference documentation (https://docs.dapr.io/reference/api/cryptography_api/)
- Dapr Cryptography building block overview (https://docs.dapr.io/developing-applications/building-blocks/cryptography/)
- Dapr Azure Key Vault crypto component spec (https://docs.dapr.io/reference/components-reference/supported-cryptography/azure-keyvault/)

## Issues Found

1. **Go SDK `EncryptOptions.Algorithm` field does not exist** — The correct field name is `KeyWrapAlgorithm`, not `Algorithm`. Changed `Algorithm: "RSA-OAEP-256"` to `KeyWrapAlgorithm: "RSA-OAEP-256"`.

2. **Python SDK `sign()` and `verify()` methods do not exist** — The Dapr Python SDK (`DaprClient`) only implements `encrypt()` and `decrypt()`. It does not have `sign()`, `verify()`, or any Subtle Crypto wrappers. The sign/verify RPCs exist at the gRPC proto level (`SubtleSignAlpha1`, `SubtleVerifyAlpha1`) but are not wrapped in the Python SDK. Replaced the fabricated Python examples with Dapr Subtle Crypto HTTP API (curl) examples.

3. **HashiCorp Vault is not a supported crypto backend** — The blog claimed HashiCorp Vault (Transit secrets engine) is a supported backend. The actual supported backends are: Azure Key Vault (`crypto.azure.keyvault`), JWKS (`crypto.jwks`), Kubernetes Secrets (`crypto.kubernetes`), and Local Storage (`crypto.dapr.localstorage`). There is no HashiCorp Vault crypto component in Dapr. Corrected the backends list.

4. **Algorithm names were inaccurate** — The blog listed "AES-CBC" and "AES-GCM" as symmetric encryption algorithms and "RSA-OAEP" as an asymmetric algorithm. The actual Dapr Cryptography API uses `RSA-OAEP-256` and `A256KW` for key wrapping, and `AES-GCM` (default) and `ChaCha20-Poly1305` as data encryption ciphers. The algorithm table also conflated the high-level encrypt API algorithms with the Subtle Crypto API signing algorithms. Corrected the table with accurate categories and algorithm identifiers.

5. **"Dapr handle re-encryption transparently" is misleading** — The blog claimed Dapr handles re-encryption transparently during key rotation. Dapr does NOT automatically re-encrypt existing data. The Dapr docs state that keys can be rotated without restarting applications, but re-encryption of existing data must be handled by the application. Corrected the claim.

6. **Component metadata field `vaultUri` should be `vaultName`** — The Azure Key Vault crypto component uses `vaultName` (just the vault name) rather than `vaultUri` (a full URI). Changed the metadata field and value accordingly.

## Review Notes
- The Dapr Subtle Crypto API (sign, verify, wrap key, unwrap key, get key) is still in alpha (`v1.0-alpha1`). The blog should note this may change in future Dapr releases.
- The Go SDK Encrypt/Decrypt streaming API pattern (io.Reader in, io.Reader out) shown in the blog is correct and idiomatic.
- The DecryptOptions struct intentionally does not require a KeyName field in the Go SDK (it can be empty, as the key name is embedded in the encrypted payload). The blog includes KeyName in DecryptOptions, which works but is optional.
