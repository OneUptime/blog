# Validation Summary: How to Encrypt State with TF_ENCRYPTION in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu state and plan encryption
- TF_ENCRYPTION environment variable
- AWS KMS
- AWS S3 backend state storage
- DynamoDB state locking
- PBKDF2 passphrase-based key derivation
- AES-GCM encryption
- AWS Secrets Manager CLI

## Sources Consulted
- OpenTofu State and Plan Encryption documentation: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu 1.7 State and Plan Encryption documentation: https://opentofu.org/docs/v1.7/language/state/encryption/
- OpenTofu Environment Variables documentation (`TF_ENCRYPTION`): https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu Backend Configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu apply / refresh-only documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu state encryption implementation notes: https://github.com/opentofu/opentofu/blob/main/docs/state_encryption.md
- AWS KMS key rotation documentation: https://docs.aws.amazon.com/kms/latest/developerguide/rotating-keys.html
- AWS CLI Secrets Manager `get-secret-value` documentation: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/get-secret-value.html

## Issues Found
- The AWS KMS key provider examples omitted the required `key_spec` argument. Added `key_spec = "AES_256"` to both AWS KMS encryption examples so the provider configuration matches OpenTofu's documented `aws_kms` key provider requirements and AES-GCM key-size expectations.
- The first encryption example used `fallback { method = method.unencrypted.migration }` without declaring `method "unencrypted" "migration" {}`. Added the unencrypted migration method so the HCL reference is valid.
- The migration example referenced `aws_kms_key.state_encryption.arn` inside the encryption block. OpenTofu encryption configuration must be resolvable during `tofu init` before state is available, so resource references are not appropriate there. Changed it to `var.kms_key_arn`.
- The verification command said encrypted state should appear as binary and not JSON. OpenTofu encrypted state remains JSON containing encryption metadata and ciphertext. Updated the comment to say it should show encrypted JSON metadata/ciphertext rather than plaintext state attributes.

## Review Notes
OpenTofu was not installed in the local workspace, so the snippets were reviewed against official documentation rather than executed with `tofu validate`. The post is technically accurate after the corrections above.
