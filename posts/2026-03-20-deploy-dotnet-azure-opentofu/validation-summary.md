# Validation Summary: How to Deploy a .NET Application with OpenTofu on Azure

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible HCL syntax)
- Terraform azurerm provider (v3.x/v4.x resources)
- Azure App Service (Linux Web App)
- Azure App Service Plan
- Azure SQL Database (azurerm_mssql_server / azurerm_mssql_database)
- Azure Key Vault (RBAC authorization, secrets)
- Azure Managed Identity (System-Assigned)
- Azure App Service Deployment Slots
- Azure Application Insights (workspace-based)
- Azure CLI (`az webapp deployment slot swap`)
- .NET 8

## Sources Consulted
- azurerm provider docs — `azurerm_service_plan`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- azurerm provider docs — `azurerm_linux_web_app`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app
- azurerm provider docs — `azurerm_linux_web_app_slot`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_web_app_slot
- azurerm provider docs — `azurerm_mssql_server`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_server
- azurerm provider docs — `azurerm_mssql_database`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- azurerm provider docs — `azurerm_key_vault` and `azurerm_key_vault_secret`
- azurerm provider docs — `azurerm_application_insights`
- Azure App Service Key Vault references: https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references
- Azure CLI docs — `az webapp deployment slot swap`: https://learn.microsoft.com/en-us/cli/azure/webapp/deployment/slot
- Azure App Service connection string types (SQLServer, SQLAzure, MySql, PostgreSQL, etc.)

## Issues Found
No technical issues found. Spot checks:
- `azurerm_service_plan` with `os_type` + `sku_name` (`P2v3`, `B2`) — valid SKUs and arguments.
- `azurerm_linux_web_app` `site_config.application_stack.dotnet_version = "8.0"` — supported value for .NET 8.
- `identity { type = "SystemAssigned" }` and reading `identity[0].principal_id` for `azurerm_role_assignment` — correct usage pattern.
- `azurerm_mssql_server.azuread_administrator` block with `login_username`, `object_id`, `azuread_authentication_only` — correct field names.
- `azurerm_key_vault` with `enable_rbac_authorization = true` and `purge_protection_enabled` — valid arguments.
- Key Vault reference syntax `@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.db_connection.id})` — the `id` of `azurerm_key_vault_secret` is the data-plane secret URI, which is what `SecretUri=` expects.
- `azurerm_linux_web_app_slot` uses `app_service_id` (correct attribute name; legacy `azurerm_app_service_slot` used `app_service_name`).
- `connection_string` block with `type = "SQLServer"` — valid enum value.
- `azurerm_application_insights` with `application_type = "web"` and `workspace_id` (workspace-based App Insights) — current best practice.
- `az webapp deployment slot swap` flags (`--resource-group`, `--name`, `--slot`, `--target-slot`) — all correct.

## Review Notes
- The post references `azurerm_log_analytics_workspace.main` in the Application Insights resource without defining it earlier in the post; readers will need to add a Log Analytics Workspace resource for the configuration to apply. This is a minor completeness issue, not a correctness issue.
- The same applies to the variables (`var.environment`, `var.location`, `var.sql_admin_password`, `var.admin_object_id`) — they are referenced but not declared. Acceptable for a focused tutorial but worth noting.
- The connection string stored in Key Vault uses SQL authentication. For production it would be preferable to use Azure AD / managed identity end-to-end (no SQL admin password at all), but the post's approach is valid and commonly used.
- The staging deployment slot does not declare a managed identity or Key Vault role assignment of its own. If/when the slot is configured to read Key Vault references, it would need its own identity and role assignment (slots have separate principal IDs from the parent app).
- `prevent_destroy = true` in the `lifecycle` block is a literal (must be a constant); it is correctly used here without a variable interpolation.
