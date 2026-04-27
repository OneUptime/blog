# Validation Summary: How to Rotate Encryption Keys for OpenTofu State

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (state encryption)
- AWS KMS (`aws_kms` key provider, `aws_kms_key` resource)
- PBKDF2 (`pbkdf2` key provider)
- AES-GCM encryption method
- HCL configuration language

## Sources Consulted
- OpenTofu State and Plan Encryption documentation: https://opentofu.org/docs/language/state/encryption/
- AWS KMS Automatic Key Rotation documentation: https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
- Companion post in the same blog: `posts/2026-02-23-use-opentofu-state-encryption/README.md`

## Issues Found
1. **Missing `terraform { }` wrapper around `encryption { }` blocks (all three HCL examples).** OpenTofu requires the `encryption` block to be nested inside a top-level `terraform` block. The Phase 1, Phase 3, and PBKDF2 rotation examples all showed `encryption { ... }` at the top level, which would be a syntax error. Fixed by wrapping each example in `terraform { ... }` and re-indenting.
2. **Missing `key_spec` field on `aws_kms` key providers (Phase 1 and Phase 3 examples).** The `aws_kms` key provider's documented required fields include both `kms_key_id` and `key_spec`. Without `key_spec`, the provider cannot determine the key length to request from KMS for the AES-GCM method. Added `key_spec = "AES_256"` to each `aws_kms` key_provider block, matching the convention used in the companion post `2026-02-23-use-opentofu-state-encryption`.

## Review Notes
- The three-phase rotation strategy (add new key with fallback, re-encrypt, remove fallback) is consistent with the OpenTofu documentation's described behavior: reads try the primary method first and fall back if needed; writes always use the primary method.
- `tofu apply -refresh-only` is a valid way to force a state write that triggers re-encryption with the new primary method. The OpenTofu docs note that any operation which writes state will re-encrypt; refresh-only is a non-mutating choice and is reasonable to recommend.
- The `aws_kms_key` resource's `enable_key_rotation = true` does cause AWS to rotate the underlying key material annually by default (365-day period), which matches the post's claim. Note: AWS now also supports a configurable `RotationPeriodInDays` (and the AWS provider's `rotation_period_in_days` argument), but the default behavior described is accurate.
- The post does not mention the `enforced = true` option on `state` / `plan` blocks, which is a useful safeguard during rotation but is out of scope for this rotation-focused tutorial.
- The PBKDF2 example does not specify `key_length`, `iterations`, `salt_length`, or `hash_function`. These all have sensible defaults in OpenTofu and are not required, so omitting them is fine, though production users should verify the defaults still meet current guidance (defaults at time of writing: 600,000 SHA-512 iterations, which is acceptable).
