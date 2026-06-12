# Validation Summary: How to Handle Sensitive Data in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, variables, outputs, backends, data sources, resources)
- Terraform `random` provider (`random_password`)
- AWS provider (`aws_db_instance`, `aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`, `aws_lambda_function`, S3 backend, KMS)
- HashiCorp Vault provider (`vault_generic_secret`)
- AzureRM provider (`azurerm_key_vault`, `azurerm_key_vault_secret`, `azurerm_mssql_server`)
- Google provider (`google_secret_manager_secret_version`, `google_cloud_run_service`)
- SOPS (Mozilla Secrets OPerationS)
- AWS CLI (`aws secretsmanager get-secret-value`)
- pre-commit framework (`pre-commit-terraform`, `gitleaks`)
- GitHub Actions (TruffleHog)
- IAM policy conditions (`aws:PrincipalTag`)
- `jq` for JSON parsing in shell scripts

## Sources Consulted
- Terraform docs — sensitive variables and outputs: https://developer.hashicorp.com/terraform/language/values/variables#suppressing-values-in-cli-output
- Terraform `random_password` resource: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- AWS provider `aws_secretsmanager_secret_version` (data source): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- AWS provider `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp Vault provider `vault_generic_secret` data source: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/generic_secret
- AzureRM `azurerm_key_vault_secret` data source: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret
- Google `google_secret_manager_secret_version` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/secret_manager_secret_version
- Terraform S3 backend: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform `external` data source: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- SOPS documentation: https://github.com/getsops/sops
- pre-commit-terraform: https://github.com/antonbabenko/pre-commit-terraform
- gitleaks: https://github.com/gitleaks/gitleaks
- TruffleHog GitHub Action: https://github.com/trufflesecurity/trufflehog
- AWS CLI Secrets Manager reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/get-secret-value.html

## Issues Found
No technical issues found.

## Review Notes
- The `vault_generic_secret` data source is still supported but, for KV v2 mounts, the modern recommendation is `vault_kv_secret_v2`. The post's example works for both KV v1 and KV v2 (with appropriate path), so this is not an error.
- For Google Cloud Run, `google_cloud_run_service` is the v1 API. The newer `google_cloud_run_v2_service` is preferred for new code, but the v1 resource remains supported.
- The S3 backend example uses `dynamodb_table` for locking. As of Terraform 1.10, the S3 backend supports native S3-based locking via `use_lockfile = true`, which can replace the DynamoDB table. Both approaches are supported.
- The AWS RDS provider also supports `manage_master_user_password = true` to have RDS provision and rotate the master password via Secrets Manager automatically, avoiding the need to expose the generated password via Terraform state. This is an alternative to the pattern shown but the article's approach is still valid.
- The `external` data source script writes the AWS Secrets Manager `SecretString` directly to stdout. This works as long as the underlying secret JSON contains only string values, which is a requirement of the `external` data source protocol — worth flagging for readers whose secrets contain nested objects or non-string values.
- Pinned tool versions (`pre-commit-terraform v1.83.0`, `gitleaks v8.18.0`) are valid historical releases; readers should pin to current versions when adopting.
- TruffleHog action uses `@main` rather than a pinned SHA/tag, which is a minor supply-chain hygiene concern but a common pattern in documentation.
