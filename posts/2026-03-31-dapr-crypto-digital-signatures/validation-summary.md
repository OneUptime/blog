# Validation Summary: How to Use Dapr Crypto API for Digital Signatures

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime) — Subtle Cryptography building block
- Go (HTTP-based Dapr integration)
- Python (HTTP-based Dapr integration)
- OpenSSL (key generation)
- ECDSA / RSA-PSS / RSA-PKCS1 / Ed25519 signing algorithms
- Azure Key Vault (as a crypto provider)
- JWT (JSON Web Tokens)

## Sources Consulted
- Dapr Cryptography building block documentation: https://docs.dapr.io/developing-applications/building-blocks/cryptography/
- Dapr gRPC proto definitions (`dapr/proto/runtime/v1/crypto.proto`) — `SubtleSignAlpha1` and `SubtleVerifyAlpha1` message definitions
- Dapr HTTP API source (`pkg/api/http/subtlecrypto.go`) — endpoint route registration at `/v1.0-alpha1/subtlecrypto/{name}/sign` and `/v1.0-alpha1/subtlecrypto/{name}/verify`
- Dapr Go SDK (`github.com/dapr/go-sdk/client`) — verified only `Encrypt`/`Decrypt` methods exist, no sign/verify wrappers
- Dapr Python SDK (`dapr/clients/grpc/client.py`) — verified only `encrypt`/`decrypt` methods exist, no sign/verify wrappers
- Dapr crypto algorithm constants (`dapr/kit/crypto/consts.go`) — supported signature algorithms
- Dapr local storage component (`crypto/localstorage/component.go`) — key file format and extension handling
- Dapr subtle crypto feature gating — requires `subtlecrypto` build tag

## Issues Found

1. **Fabricated Go SDK methods (Critical):** The post used `client.Crypto().SignBytes()` and `client.Crypto().VerifyBytes()` with types like `dapr.SignBytesOptions` and `dapr.VerifyBytesOptions`. These methods and types do not exist in the Dapr Go SDK. The Go SDK only exposes `Encrypt`/`Decrypt` for the high-level crypto API. Replaced all Go examples with direct HTTP calls to the correct Dapr subtle crypto endpoints.

2. **Fabricated Python SDK methods (Critical):** The post used `await client.sign_bytes()` and `await client.verify_bytes()`. These methods do not exist in the Dapr Python SDK. Additionally, the Python SDK client is synchronous, not async, so the `async/await` pattern was also wrong. Replaced with direct HTTP calls using the `requests` library.

3. **Wrong HTTP API endpoint paths (Critical):** The post used `/v1.0-alpha1/crypto/{component}/sign` and `/v1.0-alpha1/crypto/{component}/verify`. The correct paths are `/v1.0-alpha1/subtlecrypto/{component}/sign` and `/v1.0-alpha1/subtlecrypto/{component}/verify`. The `/crypto/` prefix is only for the high-level encrypt/decrypt API.

4. **Wrong request field name (Critical):** The post used `value` as the field for data to sign. The actual field is `digest` — the subtle crypto API expects pre-hashed data (a digest), not raw data. Updated all examples to hash the payload with SHA-256 before calling the sign endpoint.

5. **Missing feature gating note (Major):** The subtle crypto API requires the `subtlecrypto` build tag to be enabled on the Dapr sidecar. Without it, all subtle crypto methods return `ErrAPIUnimplemented`. Added a prominent note about this requirement.

6. **Missing algorithms in table (Minor):** The algorithm table omitted RS384 and RS512 (RSA-PKCS1 with SHA-384 and SHA-512). Added these entries.

7. **Architecture diagram labels:** Updated `SignBytes`/`VerifyBytes` to `SubtleSign`/`SubtleVerify` in the Mermaid diagram to reflect actual API naming.

## Review Notes
- The subtle crypto sign/verify API is an alpha feature in Dapr. The `/v1.0-alpha1/` prefix in the endpoint path reflects this. Users should be aware that the API surface may change in future Dapr releases.
- Since no Go or Python SDK wrappers exist for subtle crypto operations, all code examples now use direct HTTP calls. This is the correct approach until SDK support is added.
- The component type names (`crypto.dapr.localstorage`, `crypto.azure.keyvault`) and key generation commands (OpenSSL ECDSA P-256) were correct in the original post.
- The JWT signing example is a valid use case but users should be aware that building custom JWT signing logic carries security risks — consider using established JWT libraries where possible.
