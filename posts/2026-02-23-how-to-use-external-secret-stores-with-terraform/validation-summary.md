# Validation Summary: How to Use External Secret Stores with Terraform

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Terraform
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- Azure Key Vault
- Azure Database for PostgreSQL Flexible Server
- Google Secret Manager
- Google Cloud SQL
- HashiCorp Vault
- SOPS
- 1Password Terraform provider
- Terraform External provider
- GitHub Actions OIDC for AWS

## Sources Consulted
- Terraform documentation: Manage sensitive data in your configuration: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Terraform documentation: Ephemeral block reference: https://developer.hashicorp.com/terraform/language/ephemeral
- Terraform AWS provider documentation for `aws_secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- Terraform AWS provider documentation for `aws_ssm_parameter`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- Terraform AWS provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AzureRM provider documentation for `azurerm_key_vault_secret`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret
- Terraform AzureRM provider documentation for `azurerm_postgresql_server` and deprecation notice: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_server.html
- Terraform AzureRM provider documentation for `azurerm_postgresql_flexible_server`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server
- Terraform Google provider documentation for `google_secret_manager_secret_version`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/secret_manager_secret_version
- Terraform Google provider documentation for `google_sql_user`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_user
- Terraform Vault provider documentation for `vault_kv_secret_v2`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/kv_secret_v2
- Terraform Vault provider documentation for `vault_aws_access_credentials`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/aws_access_credentials
- SOPS project documentation: https://github.com/getsops/sops
- Terraform SOPS provider documentation: https://registry.terraform.io/providers/carlpett/sops/latest/docs
- 1Password Terraform provider documentation: https://developer.1password.com/docs/terraform/
- 1Password Terraform provider `onepassword_item` data source documentation: https://registry.terraform.io/providers/1Password/onepassword/latest/docs/data-sources/item
- Terraform External provider documentation: https://registry.terraform.io/providers/hashicorp/external/latest/docs/data-sources/external
- GitHub Actions `configure-aws-credentials` documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The post stated that secrets always end up in Terraform state. Updated this to explain that regular data sources and resource arguments usually persist values in state, while Terraform 1.11+ can avoid this only for provider-supported write-only arguments and ephemeral values.
- The Azure example used `azurerm_postgresql_server`, which is deprecated and tied to Azure Database for PostgreSQL Single Server retirement. Replaced it with `azurerm_postgresql_flexible_server` and the current `administrator_password` argument.
- The SOPS section described SOPS as "by Mozilla". Updated it to say SOPS is now maintained by the getsops project.
- The 1Password example used outdated provider configuration fields `url` and `token`. Replaced them with the current `connect_url` and `connect_token` fields, updated the provider version constraint to `~> 3.0`, and used a vault ID variable because the current data source schema requires a vault UUID.
- The comparison table implied SOPS provides audit logging through Git logs. Changed this to "No (Git history only)" because Git history tracks file changes, not secret access.
- The comparison table listed Vault cost only as "License". Updated it to "OSS/HCP/License" to reflect current deployment and licensing options.
- The "Handle Missing Secrets Gracefully" example used `try()` around a Vault data source reference. Terraform `try()` does not catch provider read failures for missing data sources, so the example was narrowed to handling missing keys in an existing secret with `lookup()`.
- The "Use Data Sources, Not Resources" note said resource-managed secret values always put values in state. Updated the wording to account for provider-supported write-only arguments.

## Review Notes
The examples are intentionally partial snippets and omit required surrounding resource arguments such as database instance names, locations, SKUs, and provider authentication. That is acceptable for the article's focus, but readers still need complete provider-specific resource configuration in production.
