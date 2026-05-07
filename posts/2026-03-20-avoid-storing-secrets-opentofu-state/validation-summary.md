# Validation Summary: How to Avoid Storing Secrets in OpenTofu State

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon RDS
- AWS Secrets Manager
- Random Provider
- S3 backend state storage
- KMS-based state encryption

## Sources Consulted
- OpenTofu: Sensitive Data in State - https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu: Ephemeral resources - https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu: Write-only attributes - https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- OpenTofu: State and Plan Encryption - https://opentofu.org/docs/v1.7/language/state/encryption/
- OpenTofu: Command `state pull` - https://opentofu.org/docs/v1.11/cli/commands/state/pull/
- OpenTofu: Command `state rm` - https://opentofu.org/docs/v1.6/cli/commands/state/rm/
- OpenTofu: Import command - https://opentofu.org/docs/cli/import/
- AWS provider: `aws_db_instance` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider: ephemeral `aws_secretsmanager_secret_version` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/secretsmanager_secret_version
- AWS provider: `aws_secretsmanager_secret_version` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Random provider: `random_password` resource - https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- Random provider: ephemeral `random_password` - https://registry.terraform.io/providers/hashicorp/random/latest/docs/ephemeral-resources/password

## Issues Found
- The `aws_db_instance` examples were missing required arguments such as `allocated_storage` and `instance_class`, so they were not runnable as written. I added the required fields and kept the secret-handling focus intact.
- The original "External Secret Store Integration" example still stored the secret in state because it used the managed `random_password` resource and `aws_secretsmanager_secret_version.secret_string`. I changed it to use `ephemeral "random_password"` with the write-only `secret_string_wo` and `secret_string_wo_version` arguments so the secret value is not persisted in state.
- The OpenTofu AWS KMS encryption example was missing the documented `key_spec` setting for the `aws_kms` key provider. I added `key_spec = "AES_256"` and a matching `region` to align the snippet with the official encryption documentation.
- The remediation note used the informal term "reimport". I changed it to the exact OpenTofu command terminology: `tofu state rm` and `tofu import`.

## Review Notes
- Ephemeral resources and write-only attributes require OpenTofu 1.11+ and provider versions that expose those schemas.
- State encryption is available starting in OpenTofu 1.7+, and backend encryption plus OpenTofu encryption are complementary rather than mutually exclusive.
