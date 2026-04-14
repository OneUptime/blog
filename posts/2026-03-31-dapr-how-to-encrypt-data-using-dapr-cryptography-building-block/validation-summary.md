# Validation Summary: How to Encrypt Data Using Dapr Cryptography Building Block

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Cryptography building block (v1.11+ alpha API)
- Dapr local storage crypto component (`crypto.dapr.localstorage`)
- Dapr Azure Key Vault crypto component (`crypto.azure.keyvault`)
- Dapr HTTP API (`v1.0-alpha1/crypto`)
- Dapr Node.js SDK (`@dapr/dapr`) — gRPC crypto client
- Dapr Python SDK (`dapr-client`) — gRPC crypto client
- OpenSSL (key generation)

## Sources Consulted
- Dapr Cryptography API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr Cryptography overview: https://docs.dapr.io/developing-applications/building-blocks/cryptography/cryptography-overview/
- Dapr supported cryptography components: https://docs.dapr.io/reference/components-reference/supported-cryptography/
- Dapr JS SDK source and crypto examples on GitHub
- Dapr Python SDK source and crypto examples on GitHub

## Issues Found

1. **Fabricated JSON key store format**: The post described a JSON-based key configuration file for the local storage component. In reality, `crypto.dapr.localstorage` reads key files directly from a directory — the filename becomes the key name. Replaced the JSON example with `openssl` commands to generate actual key files.

2. **Node.js: Non-existent `CryptoClient` export**: The post imported `CryptoClient` from `@dapr/dapr`, which does not exist. Removed this import; crypto is accessed via `client.crypto` on `DaprClient`.

3. **Node.js: Wrong API signature for encrypt/decrypt**: The post passed the component name as the first argument (`client.crypto.encrypt(COMPONENT, data, opts)`). The actual API passes data as the first argument and includes `componentName` in the options object (`client.crypto.encrypt(data, { componentName, ... })`). Fixed both encrypt and decrypt calls.

4. **Node.js: Missing gRPC requirement**: Crypto operations in the JS SDK are gRPC-only; they do not work over HTTP. Added `CommunicationProtocolEnum.GRPC` initialization with the correct gRPC port.

5. **Node.js: Wrong `keyWrapAlgorithm` value for SDK**: The SDK uses shorthand values (`'AES'`, `'RSA'`), not the full JWA names (`A256KW`). Changed from `'A256KW'` to `'AES'` in the SDK code. (The HTTP curl example correctly uses `A256KW` for the header.)

6. **Python: Plain dict instead of typed options objects**: The post passed a plain dictionary for `options`. The actual API requires `EncryptOptions` and `DecryptOptions` objects imported from `dapr.clients.grpc._crypto`, using snake_case parameter names (`component_name`, `key_name`, `key_wrap_algorithm`). Fixed imports and option construction.

7. **Python: Missing `.read()` on response**: The `encrypt()` and `decrypt()` methods return a response object, not raw bytes. Added `.read()` calls to extract the byte data.

8. **Python: Missing key name in decrypt options**: Added `key_name` parameter to `DecryptOptions` to match the documented API.

9. **Algorithms section mislabeled AES-CBC**: The post listed `AES-CBC` as a data encryption algorithm. In Dapr's crypto API, CBC variants are key wrapping algorithms, not data ciphers. The actual data encryption ciphers are `aes-gcm` (default) and `chacha20-poly1305`. Reorganized the section to correctly distinguish "Data Encryption Ciphers" from "Key Wrapping Algorithms" and added `A128CBC`/`A192CBC`.

## Review Notes
- The Dapr Cryptography API is still in alpha (`v1.0-alpha1`). The API surface, headers, and SDK methods may change before reaching stable. Readers should check the Dapr docs for the latest API version.
- The HTTP API examples (curl) and SDK examples use different algorithm name formats: HTTP headers use full JWA names (e.g., `A256KW`), while the SDKs use shorthand (e.g., `AES`). This is by design but could confuse readers.
- The Azure Key Vault component example is structurally correct. Actual tenant/client IDs and secret references would need to be configured per environment.
- The post's general architecture explanation and summary are accurate: Dapr does abstract cryptographic operations through the sidecar and supports pluggable key store backends.
