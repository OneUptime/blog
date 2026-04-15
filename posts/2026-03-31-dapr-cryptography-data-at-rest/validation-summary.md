# Validation Summary: How to Use Dapr Cryptography for Data at Rest Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Cryptography building block
- Dapr Python SDK (`dapr-client`)
- Azure Key Vault (as crypto component backend)
- PostgreSQL (database schema)
- AWS S3 (boto3, for encrypted file storage)
- RSA-OAEP-256 key wrapping
- Base64 encoding for ciphertext storage

## Sources Consulted
- Dapr Cryptography API reference: https://docs.dapr.io/reference/api/cryptography_api/
- Dapr Python SDK source code (encrypt/decrypt API, EncryptOptions/DecryptOptions dataclasses): https://github.com/dapr/python-sdk
- Dapr Azure Key Vault crypto component reference: https://docs.dapr.io/reference/components-reference/supported-cryptography/azure-keyvault/
- Dapr Python SDK crypto examples: https://github.com/dapr/python-sdk/tree/master/examples/crypto
- Dapr Cryptography overview: https://docs.dapr.io/developing-applications/building-blocks/cryptography/cryptography-overview/
- Previously validated Dapr Cryptography blog posts in this repository (sensitive-data, encrypt-files, use-api) for consistent API usage patterns

## Issues Found

1. **Component YAML: wrong metadata field name** - The component configuration used `vaultURI` with a full URL value (`https://my-vault.vault.azure.net`). The correct metadata field for the Azure Key Vault crypto component is `vaultName`, and the value should be just the vault name (e.g., `my-vault`), not the full URI. Fixed to `vaultName: "my-vault"`.

2. **Python SDK `encrypt()` options format incorrect (three code blocks)** - The `encrypt_field()`, `save_document()`, and `save_customer_bulk()` functions all passed `options` as a plain dictionary with camelCase keys (`"componentName"`, `"keyName"`, `"keyWrapAlgorithm"`). The Dapr Python SDK requires an `EncryptOptions` dataclass instance with snake_case fields (`component_name`, `key_name`, `key_wrap_algorithm`). Fixed all three call sites to use `EncryptOptions(...)` and added the necessary import from `dapr.clients.grpc._crypto`.

3. **Python SDK `decrypt()` options format incorrect** - The `decrypt_field()` function passed `options` as a plain dictionary. Fixed to use `DecryptOptions(component_name=..., key_name=...)` and added the import.

4. **Python SDK `data` parameter wrapped in `io.BytesIO` (four code blocks)** - All encrypt and decrypt calls wrapped the input data in `io.BytesIO(...)`. The Dapr Python SDK `encrypt()` and `decrypt()` methods accept `Union[str, bytes]` directly, not a BytesIO stream. Fixed all calls to pass bytes directly. Removed the unused `import io` from the Encryption Helper imports.

## Review Notes
- The Dapr Cryptography API remains in alpha (`v1.0-alpha1`) as of the current documentation. The API surface may change in future Dapr releases.
- The `RSA-OAEP-256` key wrap algorithm value used throughout the post is valid and confirmed in multiple Dapr sources.
- The database schema, SQL queries, and data model patterns are technically sound. The approach of storing base64-encoded ciphertext in TEXT columns is a reasonable pattern for application-level encryption.
- The architecture diagram accurately describes how Dapr Cryptography mediates between the application and key vault.
- The `save_document` function stores the original filename in unencrypted S3 metadata — this is a minor information leakage concern but is acceptable for an illustrative example.
- The bulk insert pattern (`save_customer_bulk`) only encrypts `name` and `ssn` (2 fields) but the SQL insert has 4 placeholders, which is consistent since it includes `id` and `email` as well. The schema columns don't perfectly match (missing `phone_enc` and `address_enc`), but this is acceptable as a simplified performance illustration.
