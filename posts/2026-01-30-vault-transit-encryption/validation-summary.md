# Validation Summary: How to Build Vault Transit Encryption

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- HashiCorp Vault (Transit secrets engine)
- Vault CLI (`vault` command)
- Vault HTTP API
- HCL (policy language)
- Node.js (`node-vault` library)
- Python (`hvac` library)
- AES-256-GCM, ChaCha20-Poly1305, RSA-4096, ECDSA P-256 cryptographic algorithms
- Convergent encryption

## Sources Consulted
- HashiCorp Vault Transit Secrets Engine docs: https://developer.hashicorp.com/vault/docs/secrets/transit
- HashiCorp Vault Transit API docs: https://developer.hashicorp.com/vault/api-docs/secret/transit
- hvac (Python) Transit usage docs: https://python-hvac.org/en/stable/usage/secrets_engines/transit.html
- node-vault npm package documentation: https://www.npmjs.com/package/node-vault
- Vault policy syntax reference: https://developer.hashicorp.com/vault/docs/concepts/policies

## Issues Found
1. **Missing `import os` in Python code example** — The Python code uses `os.environ['VAULT_ADDR']` and `os.environ['VAULT_TOKEN']` but the `os` module was never imported. Added `import os` at the top of the Python snippet so the example runs without `NameError`.

## Review Notes
- All Vault CLI commands (`vault secrets enable transit`, `vault write -f transit/keys/<name>`, `vault write -f transit/keys/<name>/rotate`, `vault read transit/keys/<name>`, etc.) match the current official documentation.
- The ciphertext format `vault:v1:<base64>` is accurate, including the version-prefix semantics during key rotation.
- Key type names (`aes256-gcm96` as default, `rsa-4096`, `chacha20-poly1305`, `ecdsa-p256`) are all valid.
- Convergent encryption correctly notes that both `convergent_encryption=true` and `derived=true` must be set together — this is a required pairing.
- The `min_decryption_version` and `auto_rotate_period` config fields are correctly named and described.
- Node.js (`node-vault`) example correctly shows base64 encoding of plaintext before the API call and accesses `result.data.ciphertext`, matching how Vault's response structure is surfaced by the library.
- Python (`hvac`) `client.secrets.transit.encrypt_data(name=..., plaintext=...)` signature and `result['data']['ciphertext']` access pattern are correct.
- The HCL policy examples use the correct `update` capability for encrypt/decrypt/rewrap paths.
- Security tradeoff note around convergent encryption (leakage of duplicate values) is accurate.
- Minor stylistic note (not changed): the post says "AES-256-GCM key by default"; the precise internal type name is `aes256-gcm96` (the 96 refers to the nonce size), but the human-readable description is fine for a tutorial.
