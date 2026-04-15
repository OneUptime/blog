# Validation Summary: How to Decrypt Data Using Dapr Cryptography Building Block

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Cryptography building block
- Go SDK (`github.com/dapr/go-sdk/client`)
- Python SDK (`dapr-ext-grpc`)
- JavaScript SDK (`@dapr/dapr`)
- Dapr HTTP API (alpha)
- AES-GCM envelope encryption
- Local storage cryptography component

## Sources Consulted
- Dapr Cryptography API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr Cryptography How-to guide: https://docs.dapr.io/developing-applications/building-blocks/cryptography/howto-cryptography/
- Dapr Local Storage component reference: https://docs.dapr.io/reference/components-reference/supported-cryptography/local-storage/
- Dapr Go SDK package docs: https://pkg.go.dev/github.com/dapr/go-sdk/client
- Dapr Python SDK source and crypto examples: https://github.com/dapr/python-sdk/tree/main/examples/crypto
- Dapr JS SDK quickstart: https://github.com/dapr/quickstarts/blob/master/cryptography/javascript/sdk/crypto-quickstart/index.mjs
- Dapr Crypto Scheme v1 spec: https://github.com/dapr/kit/blob/main/schemes/enc/v1/README.md

## Issues Found

1. **HTTP method was POST instead of PUT**: The Dapr Cryptography API uses `PUT` for the decrypt endpoint, not `POST`. Changed `curl -X POST` to `curl -X PUT`.

2. **Go SDK struct name was wrong**: The blog used `dapr.DecryptRequestOptions` which does not exist. The correct struct is `dapr.DecryptOptions`. Fixed the struct name.

3. **KeyName incorrectly shown as required for decrypt (all SDKs)**: Dapr's envelope encryption embeds the key reference in the ciphertext header by default. The `KeyName` field is only needed if encryption was performed with `OmitDecryptionKeyName: true`. Removed `KeyName` from all decrypt examples and added clarifying comments. This affected the Go, Python, JavaScript, and HTTP API examples.

4. **Python SDK used incorrect API**: Three errors fixed:
   - `data` parameter accepted `io.BytesIO()` but should receive raw `bytes` directly.
   - `options` parameter used a plain `dict` with camelCase keys, but should use a `DecryptOptions` object with snake_case fields (`component_name`, not `componentName`).
   - Added correct import: `from dapr.clients.grpc._crypto import DecryptOptions`.

5. **Removed unnecessary `import io`**: The Python examples no longer need `io.BytesIO`, so removed the `import io` statement.

6. **HTTP API header removed**: Removed the `dapr-key-name` header from the default HTTP example since the key reference is embedded in the ciphertext. Added a note explaining when to include it.

7. **Description tag was imprecise**: The description mentioned "RSA key wrapping" as if it were the only option. RSA-OAEP-256 is one of several supported key wrapping algorithms (others include A256KW, A128CBC-NOPAD, etc.). Simplified the description to not imply a specific wrapping algorithm.

## Review Notes
- The Dapr Cryptography API is still in alpha (`v1.0-alpha1`). The API surface may change in future Dapr releases.
- The post mentions "AES-256-GCM" in the explanation and summary. The Dapr Crypto Scheme v1 spec says "AES-GCM" without specifying the key size — the actual key size depends on the wrapping key. This is a minor imprecision but not incorrect since AES-256-GCM is the typical configuration.
- The `readCiphertextFromDB` function in the Go example is undefined (used for illustration). This is acceptable for a tutorial.
- The `db` object in the Python example is also undefined (used for illustration). This is acceptable for a tutorial.
- The error handling section uses `strings.Contains` for error matching, which is fragile but acceptable for a tutorial showing the concept.
