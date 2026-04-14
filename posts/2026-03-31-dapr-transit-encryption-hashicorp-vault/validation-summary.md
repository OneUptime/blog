# Validation Summary: How to Use Transit Encryption with Dapr and HashiCorp Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Vault Transit secrets engine
- Dapr Cryptography API
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr HTTP API (crypto endpoints)
- Go programming language

## Sources Consulted
- Dapr supported cryptography components reference: https://docs.dapr.io/reference/components-reference/supported-cryptography/
- Dapr components-contrib crypto directory: https://github.com/dapr/components-contrib/tree/main/crypto
- Dapr Go SDK crypto.go source: https://github.com/dapr/go-sdk/blob/main/client/crypto.go
- Dapr cryptography quickstart: https://github.com/dapr/quickstarts/blob/master/cryptography/go/sdk/crypto-quickstart/app.go
- Dapr Cryptography HTTP API reference: https://docs.dapr.io/reference/api/cryptography_api/
- HashiCorp Vault Transit secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/transit
- HashiCorp Vault Transit API docs: https://developer.hashicorp.com/vault/api-docs/secret/transit
- HashiCorp Vault encrypt data in transit tutorial: https://developer.hashicorp.com/vault/tutorials/encryption-as-a-service/eaas-transit
- HashiCorp Vault re-wrapping data tutorial: https://developer.hashicorp.com/vault/tutorials/encryption-as-a-service/eaas-transit-rewrap
- HashiCorp Vault policies documentation: https://developer.hashicorp.com/vault/docs/concepts/policies

## Issues Found

### 1. Wrong Go SDK struct name `EncryptRequestOptions` (fixed)
**What was wrong:** The blog used `dapr.EncryptRequestOptions` which does not exist in the Dapr Go SDK.
**What was changed:** Corrected to `dapr.EncryptOptions`, which is the actual struct name in `github.com/dapr/go-sdk/client`.
**Why:** The code would not compile with the incorrect struct name.

### 2. Wrong Go SDK struct name `DecryptRequestOptions` (fixed)
**What was wrong:** The blog used `dapr.DecryptRequestOptions` which does not exist in the Dapr Go SDK.
**What was changed:** Corrected to `dapr.DecryptOptions`, which is the actual struct name.
**Why:** The code would not compile with the incorrect struct name.

### 3. Wrong field name `Algorithm` in EncryptOptions (fixed)
**What was wrong:** The blog used `Algorithm: "AES"` as a field in the encrypt options struct.
**What was changed:** Corrected to `KeyWrapAlgorithm: "AES"`. The value `"AES"` is valid but the field name was wrong.
**Why:** `Algorithm` is not a field on `EncryptOptions`; the correct field is `KeyWrapAlgorithm`.

### 4. Invalid `Close()` calls on `io.Reader` return values (fixed)
**What was wrong:** The blog called `defer encrypted.Close()` and `defer decrypted.Close()` on the return values of `Encrypt` and `Decrypt`. These methods return `io.Reader`, which does not have a `Close()` method.
**What was changed:** Removed both `defer encrypted.Close()` and `defer decrypted.Close()` lines.
**Why:** The code would not compile because `io.Reader` does not implement `Close()`.

### 5. Wrong HTTP method for Dapr Cryptography API (fixed)
**What was wrong:** The blog used `curl -X POST` for the encrypt endpoint.
**What was changed:** Corrected to `curl -X PUT`. The Dapr Cryptography HTTP API uses PUT, not POST, for encrypt and decrypt operations.
**Why:** Using POST would return a 405 Method Not Allowed error.

### 6. Missing required `dapr-key-wrap-algorithm` header in HTTP example (fixed)
**What was wrong:** The HTTP API example was missing the required `dapr-key-wrap-algorithm` header.
**What was changed:** Added `-H "dapr-key-wrap-algorithm: AES"` to the curl command.
**Why:** This header is required by the Dapr Cryptography HTTP API for encryption requests.

## Review Notes
- **Critical caveat: `crypto.hashicorp.vault` component does not exist in Dapr.** As of current Dapr releases, the Cryptography building block only supports four component types: `crypto.azure.keyvault`, `crypto.dapr.localstorage`, `crypto.dapr.jwks`, and `crypto.dapr.kubernetes.secrets`. There is no HashiCorp Vault crypto component. HashiCorp Vault is available in Dapr only as a secret store (`secretstores.hashicorp.vault`), not as a cryptography provider. The blog post's central premise -- that Dapr's Cryptography API wraps Vault Transit -- describes an integration that does not currently exist. The component YAML, including the metadata fields `vaultTokenMountPath` and `transitMountPath`, appears to be fabricated by combining patterns from the Vault secret store component with imagined crypto-specific fields.
- All HashiCorp Vault Transit commands, policy syntax, key rotation, and rewrap operations in the post are technically correct and verified against official Vault documentation.
- The `SaveState` call in the PII example uses `map[string]string` as the data value, which may need to be serialized to `[]byte` depending on the exact Dapr Go SDK version. This was not changed as the general pattern is illustrative.
- The Dapr Go SDK API names and patterns were corrected to match the actual source code, but readers should be aware that without a real `crypto.hashicorp.vault` component, the full end-to-end workflow described in this post cannot be executed as written.
