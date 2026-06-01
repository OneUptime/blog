# Validation Summary: How to Manage Multiple Azure Environments Using Terraform Workspaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform state and remote backends
- Terraform AzureRM backend
- AzureRM Terraform provider
- Azure resource groups, virtual networks, subnets, network interfaces, Linux virtual machines, PostgreSQL Flexible Server, and Data Protection Backup Vault
- GitHub Actions

## Sources Consulted
- Terraform workspaces language documentation: https://developer.hashicorp.com/terraform/language/state/workspaces
- Terraform CLI workspace documentation: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform AzureRM backend source implementation: https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/azure/backend_state.go
- Terraform `terraform_data` resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform lifecycle precondition documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AzureRM provider v3.80.0 `azurerm_linux_virtual_machine` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/linux_virtual_machine.html.markdown
- AzureRM provider v3.80.0 `azurerm_postgresql_flexible_server` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/postgresql_flexible_server.html.markdown
- AzureRM provider v3.80.0 `azurerm_data_protection_backup_vault` documentation: https://github.com/hashicorp/terraform-provider-azurerm/blob/v3.80.0/website/docs/r/data_protection_backup_vault.html.markdown

## Issues Found
- The AzureRM provider constraint was `~> 3.80`, but the PostgreSQL Flexible Server example used `version = "16"`. AzureRM v3.80.0 documents PostgreSQL versions `11`, `12`, `13`, `14`, and `15`, so the example was changed to `version = "15"`.
- The PostgreSQL Flexible Server example enabled Active Directory authentication without setting `tenant_id`. AzureRM v3.80.0 requires `tenant_id` when `active_directory_auth_enabled` is `true`, so `data "azurerm_client_config" "current" {}` and `tenant_id = data.azurerm_client_config.current.tenant_id` were added.
- The AzureRM workspace blob path examples used the S3-style `env:/<workspace>/<key>` form. Terraform's AzureRM backend stores non-default workspace state as `<key>env:<workspace>`, so the comment and explanation were corrected.
- The workspace validation snippet used an unused local value. Terraform may not evaluate an unused local, so it would not reliably prevent deployment from an unexpected workspace. The snippet now uses a `terraform_data` resource with a lifecycle `precondition`, which blocks planning/applying when the workspace is not in the allowed list.

## Review Notes
- Terraform was not installed in the local environment, so CLI validation could not be run locally. The review was performed against official HashiCorp Terraform documentation and HashiCorp AzureRM provider source documentation.
- The examples are still illustrative and omit deployment-specific details such as Azure authentication setup, globally unique resource naming, and full PostgreSQL administrator configuration.
