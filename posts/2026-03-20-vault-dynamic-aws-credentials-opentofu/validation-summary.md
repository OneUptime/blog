# Validation Summary: How to Generate Dynamic AWS Credentials with Vault and OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (AWS Secrets Engine)
- OpenTofu (Terraform-compatible)
- HashiCorp Vault Terraform Provider (`vault_aws_secret_backend`, `vault_aws_secret_backend_role`, `vault_aws_access_credentials`)
- AWS IAM (assume role, IAM users, STS)
- HCL configuration language

## Sources Consulted
- HashiCorp Vault Terraform Provider docs — `vault_aws_secret_backend` resource (https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/aws_secret_backend)
- HashiCorp Vault Terraform Provider docs — `vault_aws_secret_backend_role` resource (https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/aws_secret_backend_role)
- HashiCorp Vault Terraform Provider docs — `vault_aws_access_credentials` data source (https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/aws_access_credentials)
- terraform-provider-vault GitHub source (`website/docs/r/aws_secret_backend.html.md`, `aws_secret_backend_role.html.md`, `d/aws_access_credentials.html.md`)

## Issues Found
1. **Conflicting `vault_mount` and `vault_aws_secret_backend` at the same path.** The original snippet declared `vault_mount.aws` (type "aws") and then `vault_aws_secret_backend.aws` at the same path. The `vault_aws_secret_backend` resource creates its own mount, so applying both would fail with a "path is already in use" error from Vault. **Fix:** removed the standalone `vault_mount` resource and updated the role `backend` references from `vault_mount.aws.path` to `vault_aws_secret_backend.aws.path` (in both the initial example and the multi-account section).
2. **Missing `external_id` on the Vault role.** The IAM trust policy required `sts:ExternalId = "vault-aws-secrets-engine"`, but the corresponding `vault_aws_secret_backend_role` did not configure `external_id`. Without it, Vault would not include the external ID in its `AssumeRole` call and credential generation would fail. **Fix:** added `external_id = "vault-aws-secrets-engine"` to the `opentofu_deployer` role to match the trust policy condition.

## Review Notes
- The post correctly uses `credential_type = "assumed_role"` and `"iam_user"` (both are valid; `federation_token` is the third supported value, not used here).
- `data "vault_aws_access_credentials"` `type = "sts"` and the exported `access_key`, `secret_key`, `security_token` fields are accurate per the provider docs.
- The AWS provider arguments `access_key`, `secret_key`, `token` are the correct names for STS credentials.
- The "IAM Role for Vault to Use" section references `data.aws_caller_identity.vault` and `aws_iam_policy.opentofu_deploy` without defining them in-snippet; these are clearly illustrative scaffolding and not technical errors.
- The conclusion's claim that `assumed_role` does not require `iam:CreateUser` and that STS credentials expire automatically is accurate; Vault still tracks the lease in both cases, but only `iam_user` requires Vault to actively delete an IAM user on revocation.
