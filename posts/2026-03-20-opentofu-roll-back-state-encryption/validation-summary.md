# Validation Summary: How to Roll Back State Encryption in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (state encryption, encryption block, key providers, methods, fallback)
- HCL configuration
- AWS KMS key provider
- PBKDF2 key provider
- AES-GCM encryption method
- AWS S3 backend
- `tofu` CLI (`init`, `apply -refresh-only`, `state pull`, `state push`, `state list`, `plan`)
- `aws s3 cp` and `jq` for verification

## Sources Consulted
- OpenTofu State Encryption documentation: https://opentofu.org/docs/language/state/encryption/
  - In particular the "Rolling back encryption" section showing the canonical `method "unencrypted" "migrate" {}` pattern
  - The `aws_kms` key provider reference (required fields: `kms_key_id`, `region`, `key_spec`)
  - The `pbkdf2` key provider reference (required: `passphrase` or `chain`)
- OpenTofu CLI documentation for `tofu apply`, `tofu state pull`, `tofu state push`

## Issues Found
1. **Invalid `method = null` syntax (main configuration block).** OpenTofu does not accept `null` as the value of the state `method` attribute. The documented way to write unencrypted state during a rollback is to define an explicit `method "unencrypted" "migrate" {}` block and reference it as `method = method.unencrypted.migrate`. Updated the main rollback example accordingly and added the same `unencrypted` method to the PBKDF2 example. Also updated the prose under "Step 1: Configure Fallback" to describe the correct mechanism.

2. **Missing required `key_spec` field on the `aws_kms` key provider.** The OpenTofu `aws_kms` key provider requires `kms_key_id`, `region`, and `key_spec` (e.g., `"AES_256"`). Added `key_spec = "AES_256"` to the AWS KMS example.

## Review Notes
- The post correctly describes the fallback semantics: OpenTofu writes with `method` and falls back to `fallback.method` when reading existing state, which is exactly how rollback works.
- The `enforced = false` setting is the default; the post calls it out explicitly for clarity, which is fine.
- `tofu apply -refresh-only` is the right command to force a state rewrite without making infrastructure changes.
- The PBKDF2 example only sets `passphrase` — that is acceptable because OpenTofu provides defaults for `key_length`, `iterations`, `salt_length`, and `hash_function`. Note however that to *decrypt* existing state during rollback, those parameters must match what was originally used; if any non-default value was set when encrypting, it must be repeated here. This is a future-improvement note, not an error.
- The `versions.tf` example uses `required_version = ">= 1.7"`. State encryption was introduced in OpenTofu 1.7, so this version constraint is appropriate.
- The "Emergency Recovery" section assumes the user has a pre-encryption backup; this is consistent with OpenTofu guidance to back up state before enabling encryption.
