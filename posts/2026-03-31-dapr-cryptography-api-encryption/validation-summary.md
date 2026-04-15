# Validation Summary: How to Use Dapr Cryptography API for Encryption

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Cryptography building block (alpha, v1.11+)
- Azure Key Vault crypto provider
- Dapr local storage crypto provider
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK (`dapr`)
- Azure CLI (`az keyvault key create`)
- OpenSSL

## Sources Consulted
- Dapr Cryptography building block documentation: https://docs.dapr.io/developing-applications/building-blocks/cryptography/
- Dapr Cryptography HTTP API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr Go SDK crypto source code: https://github.com/dapr/go-sdk/blob/main/client/crypto.go
- Dapr Python SDK crypto source code: https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/_crypto.py
- Dapr crypto component specs: https://docs.dapr.io/reference/components-reference/supported-cryptography/
- Azure CLI `az keyvault key create` documentation: https://learn.microsoft.com/en-us/cli/azure/keyvault/key

## Issues Found

### 1. HTTP API request/response format was incorrect
**What was wrong:** The HTTP encrypt/decrypt examples used a JSON body with fields `plaintext`, `keyName`, and `algorithm` (and `Content-Type: application/json`). The actual Dapr crypto HTTP API accepts raw binary data as the request body (`application/octet-stream`) and passes key metadata via HTTP headers (`dapr-key-name`, `dapr-key-wrap-algorithm`). The response is also raw binary, not JSON.
**What was changed:** Replaced JSON body format with correct `--data-binary` usage and `dapr-key-name`/`dapr-key-wrap-algorithm` headers. Updated response description to note binary output.

### 2. Go SDK API was completely wrong
**What was wrong:** The blog showed `client.Encrypt(ctx, &dapr.EncryptRequest{...})` with a struct containing `PlaintextReader` (a function) and `Algorithm` field, returning a response struct with `.Ciphertext`. The actual Go SDK signature is `client.Encrypt(ctx, io.Reader, EncryptOptions) (io.Reader, error)` — it uses streaming `io.Reader` for both input and output, and the options struct uses `KeyWrapAlgorithm` (not `Algorithm`).
**What was changed:** Rewrote the Go example to use the correct streaming API with `bytes.NewReader`, `io.ReadAll`, `dapr.EncryptOptions`/`dapr.DecryptOptions`, and `KeyWrapAlgorithm`.

### 3. Python SDK API was incorrect
**What was wrong:** The blog showed `client.encrypt(component_name=..., plaintext=..., key_name=..., key_wrap_algorithm=...)` returning an object with `.ciphertext`. The actual Python SDK uses `client.encrypt(data=bytes, options=EncryptOptions(...))` and returns a stream-like object where you call `.read()` to get the bytes.
**What was changed:** Rewrote the Python example to use the correct `data` + `options=EncryptOptions(...)` pattern, imported `EncryptOptions`/`DecryptOptions` from the correct module, and used `.read()` to consume the response.

### 4. Supported algorithms table was mostly incorrect
**What was wrong:** The blog listed `RSA-OAEP`, `A256GCM`, and `A128CBC-HS256` as supported algorithms. `RSA-OAEP` (without -256) is not a supported key wrap algorithm. `A256GCM` and `A128CBC-HS256` are not Dapr key wrap algorithms. The blog also conflated key wrap algorithms with data encryption ciphers.
**What was changed:** Replaced the single table with two separate tables: one for key wrap algorithms (`RSA-OAEP-256`, `A256KW`, `A128CBC`, `A192CBC`) and one for data encryption ciphers (`aes-gcm`, `chacha20-poly1305`).

### 5. Go streaming example was fabricated
**What was wrong:** The blog showed a `client.EncryptStream()` method with an `EncryptOptions` struct containing a `DataEncryptionKey` field. No such `EncryptStream` method exists — the standard `Encrypt` method already accepts `io.Reader` for streaming. The field `DataEncryptionKey` does not exist; the correct field is `DataEncryptionCipher`.
**What was changed:** Rewrote the streaming section to show how to use the standard `client.Encrypt()` with a file `io.Reader`, using the correct `DataEncryptionCipher` field and `io.Copy` for output.

## Review Notes
- The Dapr Cryptography API is still in alpha status. API surface may change in future Dapr releases.
- The component type names (`crypto.azure.keyvault`, `crypto.dapr.localstorage`), Azure Key Vault metadata fields, `az keyvault key create` CLI flags, version requirement (v1.11+), and HTTP endpoint paths/method (PUT) were all correct.
- Dapr also supports `crypto.dapr.jwks` and `crypto.dapr.kubernetes` crypto components not mentioned in the post, but this is not an error — the post focuses on the two most common providers.
