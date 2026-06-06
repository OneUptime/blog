# Validation Summary: How to Handle Secrets in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL configuration, sensitive variables, remote state)
- HashiCorp Vault (KV v2, dynamic database credentials, AWS secrets engine)
- AWS Secrets Manager (data sources, managed RDS master passwords, KMS)
- AWS RDS (`manage_master_user_password`)
- AWS S3 backend (encryption, DynamoDB locking)
- Azure Key Vault (`azurerm` provider)
- Google Cloud Secret Manager
- SOPS (with AWS KMS, `carlpett/sops` Terraform provider)
- direnv (`.envrc`)
- GitHub Actions and GitLab CI for CI/CD secret injection

## Sources Consulted
- HashiCorp Vault Terraform provider docs — https://registry.terraform.io/providers/hashicorp/vault/latest/docs
- `vault_generic_secret` data source — https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/generic_secret
- `vault_aws_access_credentials` data source — https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/aws_access_credentials
- AWS Terraform provider — `aws_db_instance`, `aws_secretsmanager_secret*`, `aws_s3_bucket_server_side_encryption_configuration` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Azure Terraform provider — `azurerm_key_vault`, `azurerm_mssql_server` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Google Terraform provider — `google_secret_manager_secret_version` — https://registry.terraform.io/providers/hashicorp/google/latest/docs
- SOPS (CNCF Sandbox project) — https://www.cncf.io/projects/sops/ and https://github.com/getsops/sops
- Terraform S3 backend docs — https://developer.hashicorp.com/terraform/language/backend/s3
- `carlpett/sops` provider — https://registry.terraform.io/providers/carlpett/sops/latest

## Issues Found

1. **Non-existent Vault data source.** The "Dynamic Database Credentials with Vault" section used `data "vault_database_credentials"` with `backend` and `role` arguments. This data source does not exist in the HashiCorp Vault Terraform provider. The conventional way to fetch dynamic credentials from Vault's database secrets engine is `data "vault_generic_secret"` with `path = "<mount>/creds/<role-name>"`. I rewrote the snippet to use `vault_generic_secret` with `path = "database/creds/app-readonly"` and updated the downstream `kubernetes_secret` references to use the `.data["username"]` / `.data["password"]` map accessors that `vault_generic_secret` exposes.

2. **Outdated "Mozilla SOPS" attribution.** SOPS was donated to the CNCF as a Sandbox project on 2023-05-17, and its Go module / GitHub home moved from `go.mozilla.org/sops` to `github.com/getsops/sops`. I updated the Method 6 intro to describe SOPS as "a CNCF Sandbox project, originally created by Mozilla" rather than "Mozilla SOPS."

## Review Notes

- **S3 backend `dynamodb_table` is deprecated.** The Encrypted S3 Backend example uses `dynamodb_table = "terraform-locks"`. This still works but is deprecated as of Terraform 1.11; the modern replacement is `use_lockfile = true` for S3-native state locking (no DynamoDB table required). Both can be configured simultaneously during migration. The post's example remains correct as written and continues to work, so I left it alone, but a future revision could mention `use_lockfile`.
- **Vault `vault_aws_access_credentials` `type = "sts"`** is valid (`creds` and `sts` are the two accepted values), so no change was needed. Note that Vault 1.13.0 had a known issue where STS credentials could null out — readers running that exact Vault version may want to be aware.
- **Azure Key Vault inline `access_policy` block** is not deprecated, but it conflicts with the separate `azurerm_key_vault_access_policy` resource on the same vault. The example is correct, but readers mixing approaches should pick one.
- **`google_secret_manager_secret_version` short-name form** (`secret = "production-database-password"`) is valid only when a default project is configured on the Google provider. The post does not show provider configuration; readers without a default project would need the full `projects/{project}/secrets/{name}` form.
- **`aws_db_instance` with `skip_final_snapshot = false`** requires `final_snapshot_identifier`. The Vault example correctly sets both; the AWS Secrets Manager and SOPS examples set `skip_final_snapshot = false` without `final_snapshot_identifier`. These snippets are illustrative and would error at `terraform apply`; readers should add `final_snapshot_identifier` or set `skip_final_snapshot = true` in non-prod. Left as-is since fixing each snippet adds noise without changing the educational intent.
- The post's `data "external"` SOPS example assumes SOPS emits a flat string-keyed JSON object, which the example file satisfies. Nested JSON values would break the `external` provider's string-only contract — readers should prefer the `carlpett/sops` provider for non-trivial files (which the post already recommends as Option 2).
