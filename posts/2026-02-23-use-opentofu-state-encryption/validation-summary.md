# Validation Summary: How to Use OpenTofu State Encryption

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform/OpenTofu state files
- OpenTofu state and plan encryption
- PBKDF2
- AES-GCM
- AWS KMS
- Google Cloud KMS
- GitHub Actions
- AWS S3 backend storage

## Sources Consulted
- OpenTofu State and Plan Encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu v1.8 State and Plan Encryption documentation: https://opentofu.org/docs/v1.8/language/state/encryption/
- OpenTofu state pull command documentation: https://opentofu.org/docs/cli/commands/state/pull/
- OpenTofu plan command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu apply command documentation: https://opentofu.org/docs/cli/commands/apply/
- AWS KMS GenerateDataKey API documentation: https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
- AWS KMS data keys documentation: https://docs.aws.amazon.com/kms/latest/developerguide/data-keys.html
- OpenTofu client-side state encryption RFC / implementation notes: https://github.com/opentofu/opentofu/issues/874

## Issues Found
- The GCP KMS example used `key_length = 256`, but OpenTofu documents `key_length` in bytes and AES-GCM requires a 16, 24, or 32 byte key. Changed it to `key_length = 32`.
- The AWS KMS benefits section said key material never leaves KMS. AWS KMS data-key workflows can return plaintext data keys to the caller, while KMS key material remains protected by KMS. Changed the wording to say KMS key material never leaves the service unencrypted.
- The `enforced = true` explanation implied it could prevent someone from removing the encryption configuration entirely. OpenTofu documents `enforced` as a fail-closed guard inside encryption configuration, especially useful when the actual method is supplied by environment configuration. Updated the explanation accordingly.
- The raw-state verification example described encrypted state as binary and not readable JSON. OpenTofu encrypted state can still be a JSON wrapper with encrypted content. Updated the wording to say it should not expose plain state values.

## Review Notes
The main OpenTofu encryption syntax, PBKDF2 example, AES-GCM method references, fallback migration pattern, key rotation pattern, plan encryption example, and saved-plan commands match official documentation. The local `tofu` binary was not installed, so CLI behavior was verified against official OpenTofu command documentation instead of local command output.
