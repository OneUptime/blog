# Validation Summary: How to Fix Azure Resource Provider Not Registered Error

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HashiCorp)
- AzureRM Terraform Provider (v4.x features)
- Azure CLI (`az`)
- Azure Resource Manager / Resource Providers
- Bash scripting
- Azure RBAC / custom role definitions

## Sources Consulted
- [azurerm_resource_provider_registration | Terraform Registry](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/resource_provider_registration)
- [Azure Resource Manager: 4.0 Overview | Terraform Registry](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-overview)
- [Terraform AzureRM provider 4.0 adds provider-defined functions | HashiCorp blog](https://www.hashicorp.com/en/blog/terraform-azurerm-provider-4-0-adds-provider-defined-functions)
- [Resource provider registration errors | Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-register-resource-provider)
- [Azure resource providers and types | Microsoft Learn](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-providers-and-types)
- [azurerm_sql_server deprecation notice | HashiCorp Help Center](https://support.hashicorp.com/hc/en-us/articles/4554721430803--azurerm-sql-server-resource-deprecated-in-favor-of-azurerm-mssql-server)
- [azurerm_app_service deprecation | hashicorp/azurerm GitHub](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/app_service)

## Issues Found
- The resource-prefix-to-provider table referenced `azurerm_sql_server` and `azurerm_app_service`. Both resources were deprecated in AzureRM provider v3.0 and **removed in v4.0**. Since the post elsewhere uses v4.0-only features (e.g. `resource_provider_registrations`), the table was inconsistent. Updated entries to the current replacements: `azurerm_mssql_server` (Microsoft.Sql) and `azurerm_linux_web_app` (Microsoft.Web).

## Review Notes
- The `resource_provider_registrations` argument shown in Fix 4 is correct for AzureRM provider v4.0+. The full set of valid values is `core`, `extended`, `all`, `none`, and `legacy`; the post only demonstrates `"all"` and `"none"`, which is fine for the examples.
- The Azure CLI commands (`az provider register`, `az provider show`, `az provider list`, `--wait`, `--query`) are all current and correct.
- `Microsoft.Monitor` is a real, registerable Azure resource provider namespace (distinct from the older `Microsoft.Insights` / `Microsoft.OperationalInsights`); listing it alongside the others is accurate.
- The Microsoft.ResourceManager error-message format (`MissingSubscriptionRegistration`, status 409, `aka.ms/rps-not-found`) matches what Azure currently returns.
- `azurerm_virtual_machine` is technically still present in v4.x for legacy/unmanaged-disk scenarios, so it was left in the mapping table — though new configurations should prefer `azurerm_linux_virtual_machine` / `azurerm_windows_virtual_machine`.
- The custom-role JSON in the permissions section is well-formed; `Microsoft.Resources/subscriptions/providers/register/action` is the correct RBAC action for provider registration.
