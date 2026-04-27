# Validation Summary: How to Configure State Encryption with PBKDF2 in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (1.7+)
- Terraform configuration language (HCL)
- PBKDF2 (Password-Based Key Derivation Function 2)
- AES-GCM encryption
- S3 backend for state storage
- TF_ENCRYPTION environment variable

## Sources Consulted
- OpenTofu State and Plan Encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu PBKDF2 key provider reference within the encryption docs (defaults: key_length=32, iterations=600000, salt_length=32, hash_function=sha512)
- OpenTofu AES-GCM method reference within the encryption docs

## Issues Found
- **Migration section was technically incorrect.** The original post claimed that adding `enforced = false` to the `state` block would allow OpenTofu to read existing unencrypted state during migration. This is wrong on two counts:
  1. `enforced = false` is the default value, so adding it changes nothing.
  2. To read existing unencrypted state, OpenTofu requires a `fallback` block referencing an `unencrypted` method — this is the documented migration path.

  Fix: Replaced the migration example with the correct pattern using a `method "unencrypted" "migrate" {}` block and a `fallback { method = method.unencrypted.migrate }` inside the `state` block. Also corrected the migration command from `tofu apply -refresh-only` to `tofu apply`, and updated the conclusion to reflect the correct migration approach.

## Review Notes
- The `terraform { required_version = ">= 1.7" }` constraint is honored by OpenTofu 1.7+, but the same constraint would also be satisfied by Terraform 1.7+, which does not implement the OpenTofu `encryption` block. Readers using Terraform would receive an error on the unknown block. This is a documented OpenTofu/Terraform fork divergence and outside the scope of a technical fix.
- The PBKDF2 configuration options shown (key_length=32, iterations=600000, salt_length=32, hash_function="sha512") match the OpenTofu defaults exactly — they are illustrative but redundant unless the reader wants to customize them.
- The OpenTofu PBKDF2 provider enforces a 16-character minimum passphrase and a 200,000 iteration minimum. The post does not call this out explicitly, but the example values comply.
- The `TF_ENCRYPTION` HCL example is correct; OpenTofu also supports a JSON form, which the post does not mention but does not need to.
