# Validation Summary: How to Create Azure Diagnostic Settings with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Azure Resource Manager (`azurerm`) provider
- Azure Monitor diagnostic settings
- Azure Log Analytics
- Azure App Service
- Azure SQL Database
- Azure Key Vault
- Azure Kubernetes Service (AKS)

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/index
- AzureRM 4.0 upgrade guide: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/4.0-upgrade-guide
- `azurerm_monitor_diagnostic_setting` resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- Azure Monitor diagnostic settings: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings
- Azure App Service monitoring data reference: https://learn.microsoft.com/en-us/azure/app-service/monitor-app-service-reference
- Azure SQL Database monitoring data reference: https://learn.microsoft.com/en-us/azure/azure-sql/database/monitoring-sql-database-azure-monitor-reference
- Supported logs for `Microsoft.Sql/servers/databases`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-sql-servers-databases-logs
- Supported metrics for `Microsoft.Sql/servers/databases`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-sql-servers-databases-metrics
- Azure Key Vault monitoring data reference: https://learn.microsoft.com/en-us/azure/key-vault/general/monitor-key-vault-reference
- AKS monitoring data reference: https://learn.microsoft.com/en-us/azure/aks/monitor-aks-reference
- Azure SQL auditing setup: https://learn.microsoft.com/en-us/azure/azure-sql/database/auditing-setup

## Issues Found
- The post pinned `hashicorp/azurerm` to `~> 3.0`, but the examples were reviewed against current AzureRM 4.x behavior. I updated the version constraint to `~> 4.0`.
- With AzureRM 4.x, `subscription_id` is required for plan/apply unless `ARM_SUBSCRIPTION_ID` is set. I added `subscription_id = var.subscription_id` to the provider configuration.
- The `azurerm_monitor_diagnostic_setting` examples used `metric { enabled = true }`, which is not the current resource syntax. I replaced these with `enabled_metric { category = ... }`.
- The App Service comments described `AppServiceHTTPLogs`, `AppServiceAppLogs`, and `AppServiceAuditLogs` too broadly. I corrected the comments to match the official category meanings and runtime caveats.
- The conclusion implied that Azure SQL audit logs are enabled by diagnostic settings alone. I corrected it to note that Azure SQL Database auditing must be enabled separately before `SQLSecurityAuditEvents` can be routed.

## Review Notes
- The selected log and metric categories are valid for the examples shown, but supported categories are resource-specific and can change over time. In production modules, `azurerm_monitor_diagnostic_categories` is useful for discovering categories dynamically.
