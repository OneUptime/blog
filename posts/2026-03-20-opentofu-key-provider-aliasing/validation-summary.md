# Validation Summary: How to Use Key Provider Aliasing in OpenTofu State Encryption (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu state encryption (`encryption` block)
- HCL configuration language
- `aws_kms` key provider
- `pbkdf2` key provider
- `aes_gcm` encryption method
- `state`, `plan`, `fallback`, and `remote_state_data_sources` blocks

## Sources Consulted
- OpenTofu state encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu `aws_kms` key provider section (required attributes: `kms_key_id`, `key_spec`, `region`)
- OpenTofu `pbkdf2` key provider section (required attribute: `passphrase`, minimum 16 chars)
- OpenTofu `aes_gcm` method reference
- Sibling post `2026-02-23-use-opentofu-client-side-state-encryption/README.md` (cross-reference for established conventions in this blog)

## Issues Found
- **Missing `terraform { }` wrapper around every `encryption { }` block.** All four code examples (Basic Aliasing, Key Rotation, Mixed Key Provider Strategy, and Aliasing with Remote State Sources) showed the `encryption` block at the top level. Per the official OpenTofu docs, the `encryption` block must live inside a `terraform { }` block — otherwise the configuration is invalid HCL for OpenTofu and would not parse. Wrapped each example in `terraform { ... }` and re-indented the contents accordingly.
- **Missing required `key_spec` attribute on every `aws_kms` key provider.** The `aws_kms` key provider requires three attributes: `kms_key_id`, `key_spec`, and `region`. The post's `aws_kms` blocks only declared `kms_key_id` and `region`, which would fail at `tofu init` with a missing required argument error. Added `key_spec = "AES_256"` to all six `aws_kms` blocks (matching the value used in the existing `2026-02-23-use-opentofu-client-side-state-encryption` post).

## Review Notes
- Reference syntax `key_provider.<TYPE>.<ALIAS>` and `method.<TYPE>.<ALIAS>` is correct.
- The `state { method = ... fallback { method = ... } }` rotation pattern matches the documented OpenTofu fallback semantics (write with primary, read-decrypt attempts primary then fallback).
- The `remote_state_data_sources { default { method = ... } }` block is valid; per-source overrides would use a nested `remote_state_data_source "<name>" { method = ... }` block, which the post does not need to demonstrate.
- The `pbkdf2` examples only set `passphrase`, which is fine — `key_length`, `iterations`, `salt_length`, and `hash_function` all have sensible defaults. Worth noting (not fixed): OpenTofu requires the passphrase to be at least 16 characters, so `var.new_passphrase` and friends must satisfy that at runtime.
- The title carries a trailing "(2)" which appears to be an editorial numbering artifact rather than a technical issue; left untouched per the "do not make stylistic changes" rule.
