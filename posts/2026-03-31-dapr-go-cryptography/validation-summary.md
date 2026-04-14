# Validation Summary: How to Use Dapr Cryptography with Go SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Cryptography building block
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Local storage crypto component (`crypto.dapr.localstorage`)
- Azure Key Vault crypto component (`crypto.azure.keyvault`)
- Go programming language

## Sources Consulted
- Dapr Go SDK source code — `client/crypto.go` (EncryptOptions, DecryptOptions structs and Encrypt/Decrypt methods): https://github.com/dapr/go-sdk
- Dapr CLI source code — confirmed no `crypto` subcommand exists: https://github.com/dapr/cli
- Dapr components-contrib — crypto component types and SubtleCrypto interface: https://github.com/dapr/components-contrib
- Dapr kit — key wrap algorithm constants (`A256KW`, `RSA-OAEP-256`, etc.) and data encryption cipher constants (`aes-gcm`, `chacha20-poly1305`): https://github.com/dapr/kit
- Dapr official documentation — cryptography component reference for local storage and Azure Key Vault: https://docs.dapr.io/reference/components-reference/supported-cryptography/
- Dapr cryptography quickstart examples (use OpenSSL for key generation): https://github.com/dapr/quickstarts

## Issues Found

### 1. Incorrect `EncryptOptions` field name: `Algorithm` (Critical — won't compile)
- **Wrong:** `Algorithm: "AES256-GCM"`
- **Fixed to:** `KeyWrapAlgorithm: "A256KW"`
- **Why:** The Go SDK struct field is named `KeyWrapAlgorithm`, not `Algorithm`. This would cause a compile error.

### 2. Incorrect `EncryptOptions` field name: `DataEncryptionKey` (Critical — won't compile)
- **Wrong:** `DataEncryptionKey: "mykey"`
- **Fixed to:** `DataEncryptionCipher: "aes-gcm"`
- **Why:** The Go SDK struct field is `DataEncryptionCipher` and it takes a cipher name (e.g., `"aes-gcm"` or `"chacha20-poly1305"`), not a key name. This would cause a compile error.

### 3. Invalid algorithm value: `"AES256-GCM"` (Critical — runtime error)
- **Wrong:** `"AES256-GCM"`
- **Fixed to:** `"A256KW"` (for key wrap algorithm)
- **Why:** `"AES256-GCM"` is not a valid key wrap algorithm. Valid values include `"A256KW"`, `"AES"`, `"RSA-OAEP-256"`, `"RSA"`, `"A128CBC-NOPAD"`, `"A192CBC-NOPAD"`, `"A256CBC-NOPAD"`.

### 4. Non-existent CLI command: `dapr crypto local keygen` (Critical — command fails)
- **Wrong:** `dapr crypto local keygen --algorithm AES256`
- **Fixed to:** OpenSSL commands (`openssl rand` for symmetric keys, `openssl genpkey` for RSA keys)
- **Why:** The Dapr CLI has no `crypto` subcommand. The official quickstarts use OpenSSL for key generation.

### 5. Non-existent Go SDK methods: `client.WrapKey()` and `client.UnwrapKey()` (Critical — won't compile)
- **Wrong:** Code showing `client.WrapKey()` and `client.UnwrapKey()` with `dapr.WrapKeyOptions` and `dapr.UnwrapKeyOptions`
- **Fixed to:** Explanation that key wrapping is handled internally by the high-level `Encrypt` API via the `KeyWrapAlgorithm` option, with a correct code example using RSA key wrapping
- **Why:** These methods and option structs do not exist in the Dapr Go SDK. The SubtleCrypto gRPC API has wrap/unwrap operations, but they are not exposed in the Go SDK's high-level client.

## Review Notes
- The Azure Key Vault component YAML only shows the `vaultName` metadata field. A working configuration would also require authentication metadata (e.g., `azureTenantId`, `azureClientId`, `azureClientSecret`). This is acceptable for a brief example but readers should consult the Dapr docs for full auth setup.
- The Dapr Cryptography API is still in alpha (`EncryptAlpha1`/`DecryptAlpha1` in gRPC). Field names and behavior may change in future releases.
- The `DecryptOptions` struct usage in the blog post was correct.
- The component types (`crypto.dapr.localstorage` and `crypto.azure.keyvault`) were correct.
