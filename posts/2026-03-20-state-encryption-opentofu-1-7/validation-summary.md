# Validation Summary: How to Use State Encryption Introduced in OpenTofu 1.7

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- OpenTofu 1.7 state and plan encryption
- OpenTofu HCL encryption configuration
- PBKDF2 key provider
- AES-GCM encryption method
- AWS KMS key provider
- GCP KMS key provider
- OpenTofu CLI `tofu apply`

## Sources Consulted
- OpenTofu 1.7 State and Plan Encryption documentation: https://opentofu.org/docs/v1.7/language/state/encryption/
- OpenTofu 1.11 State and Plan Encryption documentation: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu 1.8 release documentation for early variable and locals evaluation: https://opentofu.org/docs/v1.8/intro/whats-new/
- OpenTofu 1.7 `apply` command documentation: https://opentofu.org/docs/v1.7/cli/commands/apply/
- OpenTofu 1.7 `plan` command documentation for `-refresh=false`: https://opentofu.org/docs/v1.7/cli/commands/plan/
- OpenTofu 1.7 release announcement: https://opentofu.org/blog/opentofu-1-7-0/
- AWS KMS `GenerateDataKey` API reference: https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
- Google Cloud KMS CryptoKey REST resource documentation: https://cloud.google.com/kms/docs/reference/rest/v1/projects.locations.keyRings.cryptoKeys

## Issues Found
1. **OpenTofu 1.7 example used variables in encryption configuration**: The PBKDF2 example used `var.state_encryption_passphrase`, but variables and locals for encryption configuration were introduced in OpenTofu 1.8. Replaced it with a literal placeholder and added a note to supply real OpenTofu 1.7 passphrases through `TF_ENCRYPTION`.
2. **`enforced = false` was described as the migration mechanism**: OpenTofu 1.7 requires an explicit `method "unencrypted" "migrate" {}` and a `fallback` block to read existing plaintext state. Updated the PBKDF2 comments, migration steps, and summary to describe the `unencrypted` fallback as the migration path.
3. **AWS KMS `key_spec` comment was inaccurate**: The post described `key_spec` as key context for access control. AWS KMS uses `KeySpec` to choose data key length, so the comment now says it generates a 256-bit data key for AES-GCM.
4. **GCP KMS example omitted required `key_length`**: OpenTofu's GCP KMS key provider requires `key_length`, and AES-GCM needs a 16, 24, or 32-byte key. Added `key_length = 32`.
5. **AWS KMS rotation providers omitted required `key_spec`**: Both AWS KMS key providers in the rotation example need `key_spec`. Added `key_spec = "AES_256"` to both.
6. **Migration command used an unnecessary refresh override**: `tofu apply -refresh=false` is a valid planning option, but the OpenTofu migration docs instruct running `tofu apply`. Replaced it with `tofu apply` to match the documented migration flow and avoid recommending skipped refresh by default.
7. **Summary overstated what `enforced` controls**: The post said `enforced` controls migration safety. Updated the summary to say that the `unencrypted` fallback controls plaintext migration and `enforced` can prevent unencrypted writes after migration.
8. **Description referred to Terraform state files**: Changed the description to OpenTofu state files for accuracy in an OpenTofu-specific post.

## Review Notes
- The OpenTofu 1.7 documentation is no longer actively maintained, so the examples were checked against both 1.7 and current 1.11 documentation where applicable.
- The current OpenTofu docs support variable-based encryption configuration, but that is an OpenTofu 1.8+ feature and is not accurate for a post specifically about OpenTofu 1.7.
- No local `tofu` or `terraform` binary was available in the workspace, so validation was based on official documentation rather than local CLI execution.
