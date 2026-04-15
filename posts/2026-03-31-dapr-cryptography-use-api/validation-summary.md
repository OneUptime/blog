# Validation Summary: How to Use the Dapr Cryptography API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Cryptography building block
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK (`dapr`)
- Dapr HTTP API (v1.0-alpha1)
- OpenSSL (key generation)
- Azure Key Vault, Kubernetes secrets, local storage, JWKS crypto providers

## Sources Consulted
- Dapr Cryptography API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr local storage crypto component: https://docs.dapr.io/reference/components-reference/supported-cryptography/local-storage/
- Dapr supported cryptography components: https://docs.dapr.io/reference/components-reference/supported-cryptography/
- Dapr cryptography quickstart: https://docs.dapr.io/getting-started/quickstarts/cryptography-quickstart/
- Dapr Go SDK source and docs: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Python SDK crypto example: https://github.com/dapr/python-sdk/blob/main/examples/crypto/crypto.py
- Dapr CLI reference: https://docs.dapr.io/reference/cli/
- Dapr crypto scheme v1: https://github.com/dapr/kit/blob/main/schemes/enc/v1/README.md

## Issues Found

1. **HTTP method incorrect (POST -> PUT)**: The encrypt and decrypt curl examples used `-X POST` but the Dapr Cryptography HTTP API requires `PUT`. Changed both curl commands to use `-X PUT`.

2. **Non-existent CLI command `dapr crypto generate-key`**: The Dapr CLI has no `crypto` subcommand. Replaced with the standard approach using OpenSSL (`openssl rand -out keys/mykey 32`) to generate a 256-bit symmetric key, consistent with Dapr's official quickstart.

3. **Go SDK type names wrong**: `dapr.EncryptRequestOptions` and `dapr.DecryptRequestOptions` do not exist. The correct types are `dapr.EncryptOptions` and `dapr.DecryptOptions`. Fixed both type names.

4. **Go SDK missing imports**: The code used `bytes.NewReader` and `io.ReadAll` but the import block did not include the `bytes` or `io` packages. Added both missing imports.

5. **Key wrap algorithm name**: Changed `"AES"` to `"A256KW"` in the HTTP headers, Go SDK, and Python SDK examples. While some SDKs may accept the shorthand `"AES"`, the canonical algorithm name per the Dapr crypto scheme is `A256KW`.

6. **Python SDK API completely wrong**: The Python SDK does not accept `io.BytesIO` for data or plain `dict` for options. Fixed to use `bytes` for data and typed `EncryptOptions`/`DecryptOptions` dataclass objects from `dapr.clients.grpc._crypto`. Updated the import statement accordingly.

7. **Algorithms table had errors**: Removed `RSA-OAEP` (not a documented Dapr key wrap algorithm; only `RSA-OAEP-256` is supported). Replaced vague `AES` with the specific algorithm identifiers `A256KW`, `A128CBC`, `A192CBC`. Added `ChaCha20-Poly1305` as a supported data encryption cipher. Removed the "Signing" row entirely — sign/verify operations belong to the Subtle Crypto API, which was never enabled by default and was closed as "not planned" (GitHub issue dapr/dapr#6593).

## Review Notes
- The Dapr Cryptography API remains in alpha (`v1.0-alpha1`) as of the current documentation. The API surface may change in future Dapr releases.
- The Dapr docs note that the HTTP APIs for cryptography are "intended for development and testing only" — SDKs using gRPC are recommended for production use. The post could benefit from mentioning this caveat in the future.
- All four listed providers (Azure Key Vault, Kubernetes secrets, local storage, JWKS) are confirmed as supported crypto components.
