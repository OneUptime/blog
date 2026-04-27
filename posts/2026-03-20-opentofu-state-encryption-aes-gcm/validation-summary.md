# Validation Summary: How to Use AES-GCM Encryption Method for State in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (state encryption feature)
- AES-GCM (Advanced Encryption Standard in Galois/Counter Mode)
- PBKDF2 key provider
- AWS KMS key provider
- HCL configuration language

## Sources Consulted
- [OpenTofu State Encryption documentation](https://opentofu.org/docs/language/state/encryption/)
- OpenTofu AES-GCM method reference (same page, `aes_gcm` section)
- OpenTofu AWS KMS key provider reference (same page, `aws_kms` section)
- OpenTofu PBKDF2 key provider reference (same page, `pbkdf2` section)

## Issues Found
- **Missing required `key_spec` field in AWS KMS examples.** Both AWS KMS configurations in the post (the "AES-GCM with AWS KMS" section and the "Multiple Methods for Key Rotation" section) omitted the `key_spec` field, which is required by the OpenTofu `aws_kms` key provider and must match the encryption method's key length (e.g., `AES_256` for AES-GCM). Added `key_spec = "AES_256"` to all three `key_provider "aws_kms"` blocks so the examples will actually work.

## Review Notes
- The encryption block correctly resides inside the `terraform {}` block (verified against official docs).
- Method block syntax `method "aes_gcm" "name" { keys = key_provider.x.y }` is correct, including the plural `keys` field name.
- The `state {}`, `plan {}`, and `fallback {}` blocks and the `enforced` flag are all documented as described.
- The claim that "AES-GCM is the only built-in method" is accurate for production encryption; an `unencrypted` method also exists, but it is intentionally only used for migration purposes, so the simplification is acceptable in context.
- The PBKDF2 example uses only `passphrase`, which is sufficient because all other PBKDF2 fields (`key_length`, `iterations`, `salt_length`, `hash_function`) have sensible defaults. Real-world deployments may want to set `iterations` explicitly, but the example as written is valid.
- Cryptographic claims about AES-GCM (confidentiality, GCM authentication tag for integrity, unique nonce per encryption) are technically accurate.
