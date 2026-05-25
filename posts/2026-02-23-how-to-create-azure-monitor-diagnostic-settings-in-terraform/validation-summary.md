# Validation Summary: How to Create Azure Monitor Diagnostic Settings in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AzureRM provider
- Azure Monitor diagnostic settings
- Azure Log Analytics
- Azure Storage
- Azure App Service
- Azure SQL Database
- Azure Key Vault
- Azure Network Security Groups

## Sources Consulted
- HashiCorp Terraform AzureRM provider documentation for `azurerm_monitor_diagnostic_setting`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_diagnostic_setting
- HashiCorp Terraform AzureRM provider documentation for `azurerm_monitor_diagnostic_categories`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/monitor_diagnostic_categories
- Microsoft Learn, Diagnostic settings in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings
- Microsoft Learn, Supported logs for Microsoft.Web/sites: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-web-sites-logs
- Microsoft Learn, Azure App Service monitoring data reference: https://learn.microsoft.com/en-us/azure/app-service/monitor-app-service-reference
- Microsoft Learn, Supported logs for Microsoft.Sql/servers/databases: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-sql-servers-databases-logs
- Microsoft Learn, Supported metrics for Microsoft.Sql/servers/databases: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-sql-servers-databases-metrics
- Microsoft Learn, Supported logs for Microsoft.KeyVault/vaults: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-keyvault-vaults-logs
- Microsoft Learn, Supported metrics for Microsoft.KeyVault/vaults: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-keyvault-vaults-metrics
- Microsoft Learn, Resource logging for a network security group: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-network-nsg-manage-log

## Issues Found
- The post used AzureRM provider `~> 3.0` and `metric` blocks. Updated the provider constraint to `~> 4.0` and replaced `metric` blocks with the current `enabled_metric` block syntax.
- The foundation snippet used `random_string` without declaring the `random` provider. Added an explicit `hashicorp/random` provider requirement.
- The introductory explanation said diagnostic settings are required for most resources to emit platform logs or detailed metrics. Updated it to distinguish resource logs, which are not collected by default, from platform metrics, which Azure Monitor collects automatically.
- The description promised Event Hubs configuration, but the article only demonstrates Log Analytics and Storage destinations. Updated the description to match the actual examples.
- The App Service example claimed to enable all log categories while listing only common categories. Updated the comment to avoid overstating coverage.
- The Azure SQL Database example used the invalid log category `Audit`. Replaced it with the documented `SQLSecurityAuditEvents` category.
- The reusable module always emitted `AllMetrics`, which would be wrong for resources such as Azure SQL Database that use service-specific metric categories like `Basic` and `InstanceAndAppAdvanced`. Added a `metric_categories` variable and updated the SQL module usage.
- The NSG section was titled as flow logs, but the code configured NSG diagnostic resource logs for event and rule counter categories. Renamed the section and comment to match the implementation.
- The conclusion implied diagnostic settings make resources emit metrics. Updated it to describe resource logs and exported metrics accurately.

## Review Notes
- Diagnostic categories vary by resource type and can change over time. The AzureRM `azurerm_monitor_diagnostic_categories` data source is useful for production modules that need to discover supported categories dynamically.
- Storage accounts used as diagnostic destinations must be in the same region as regional monitored resources.
