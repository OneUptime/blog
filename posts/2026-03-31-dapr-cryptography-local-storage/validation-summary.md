# Validation Summary: How to Use Dapr Cryptography with Local Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Cryptography building block
- Dapr local storage crypto component (`crypto.dapr.localstorage`)
- Dapr Python SDK (`dapr-python-sdk`)
- Azure Key Vault crypto component (`crypto.azure.keyvault`)
- OpenSSL (key generation)
- JWK (JSON Web Key) format
- Node.js `crypto` module (PEM to JWK conversion)

## Sources Consulted
- Dapr Local Storage Cryptography Component docs: https://docs.dapr.io/reference/components-reference/supported-cryptography/local-storage/
- Dapr Azure Key Vault Cryptography Component docs: https://docs.dapr.io/reference/components-reference/supported-cryptography/azure-key-vault/
- Dapr Cryptography API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr Cryptography How-To Guide: https://docs.dapr.io/developing-applications/building-blocks/cryptography/howto-cryptography/
- Dapr Cryptography Quickstart: https://docs.dapr.io/getting-started/quickstarts/cryptography-quickstart/
- Dapr Python SDK source (dapr/python-sdk on GitHub): `dapr/clients/grpc/client.py` and `dapr/clients/grpc/_crypto.py`
- Dapr components-contrib source: `crypto/localstorage/component.go` and `crypto/localstorage/metadata.go`
- RFC 7517 (JSON Web Key) and RFC 7515 (base64url encoding requirements)

## Issues Found

1. **Broken AES key generation (heredoc prevents command substitution)**: The original used `<< 'EOF'` (single-quoted delimiter) which prevents shell command substitution. The `$(openssl rand -base64 32)` was written as a literal string instead of being evaluated. Fixed by removing quotes from `EOF` and generating the key value into a variable first. Also converted from standard base64 to base64url encoding (replacing `+/` with `-_` and stripping `=` padding) as required by the JWK specification (RFC 7517).

2. **Key filename mismatch**: The AES key file was named `aes-key.json` but the code referenced `aes-256-key`. Dapr's local storage component resolves keys by filename (the key name in the API maps directly to the filename in the configured directory). Fixed by renaming the file to `aes-256-key.json` and using `aes-256-key.json` (with extension) as the key name in code.

3. **Python SDK API: plain dict instead of EncryptOptions/DecryptOptions**: The original code passed a plain dict with camelCase keys (`componentName`, `keyName`, `keyWrapAlgorithm`) as the `options` parameter. The Dapr Python SDK requires `EncryptOptions` and `DecryptOptions` dataclass objects from `dapr.clients.grpc._crypto` with snake_case attributes (`component_name`, `key_name`, `key_wrap_algorithm`). Fixed by importing and using the correct dataclass objects.

4. **Python SDK data parameter type**: The original passed `io.BytesIO(plaintext)` to the `data` parameter. The Dapr Python SDK's `encrypt()` and `decrypt()` methods accept `Union[str, bytes]`, not file-like objects. Fixed by passing `plaintext`/`ciphertext` bytes directly and removing the `import io` statement.

5. **Key name resolution includes file extension**: The "Multiple Keys in a Single Directory" section incorrectly stated that "Each file's base name (without `.json`) is the key name." Dapr's local storage component uses the full filename (including extension) as the key name. Fixed the text and all key name references to include `.json`.

6. **Azure Key Vault metadata field**: The production component example used `vaultURI` with a full URL value. The correct metadata field name is `vaultName`, which takes just the vault name (not the full URI). Fixed field name to `vaultName` and value to `"my-vault"`.

## Review Notes
- The Dapr Python SDK's `encrypt()` and `decrypt()` methods are Alpha APIs and emit `UserWarning` that they are subject to change. The blog post doesn't mention this, which could be noted in a future update.
- The `key_wrap_algorithm="AES"` value is valid at the SDK level (documented in the how-to guide), though the HTTP API uses more specific JWA identifiers like `A256KW`. The blog's usage is correct.
- The Node.js PEM-to-JWK conversion script is syntactically correct and would work with modern Node.js versions that support `crypto.createPrivateKey()` (Node 11+).
- The component type `crypto.dapr.localstorage` and the `path` metadata field are confirmed correct per official documentation.
