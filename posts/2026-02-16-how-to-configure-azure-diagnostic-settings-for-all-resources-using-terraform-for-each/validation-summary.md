# Validation Summary: How to Configure Azure Diagnostic Settings for All Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AzureRM Terraform provider
- Azure Monitor diagnostic settings
- Azure Log Analytics
- Azure CLI
- Azure Storage
- Azure Key Vault
- Azure App Service
- Azure SQL Database
- Azure Cosmos DB
- Azure Cache for Redis

## Sources Consulted
- HashiCorp Terraform AzureRM provider documentation for `azurerm_monitor_diagnostic_setting`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/monitor_diagnostic_setting.html.markdown
- HashiCorp Terraform AzureRM provider documentation for `azurerm_monitor_diagnostic_categories`: https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/d/monitor_diagnostic_categories.html.markdown
- Microsoft Learn, Diagnostic settings in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/platform/diagnostic-settings
- Microsoft Learn, Azure CLI `az monitor diagnostic-settings`: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings
- Microsoft Learn, Supported Resource log categories for Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/logs-index
- Microsoft Learn, Supported logs for Microsoft.KeyVault/vaults: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-keyvault-vaults-logs
- Microsoft Learn, Supported logs for Microsoft.Storage/storageAccounts/blobServices: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-storage-storageaccounts-blobservices-logs
- Microsoft Learn, Supported logs for Microsoft.Web/sites: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-web-sites-logs
- Microsoft Learn, Supported logs for Microsoft.Sql/servers/databases: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-sql-servers-databases-logs
- Microsoft Learn, Supported logs for Microsoft.DocumentDB/DatabaseAccounts: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-documentdb-databaseaccounts-logs
- Microsoft Learn, Supported logs for Microsoft.Cache/redis: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-logs/microsoft-cache-redis-logs
- Microsoft Learn, Supported metrics for Microsoft.Storage/storageAccounts: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-storage-storageaccounts-metrics
- Microsoft Learn, Supported metrics for Microsoft.Sql/servers/databases: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-sql-servers-databases-metrics

## Issues Found
- The Terraform examples used the older `metric` block with an `enabled` argument. Current AzureRM provider documentation uses `enabled_metric` for `azurerm_monitor_diagnostic_setting`, and the enabled state is represented by including the block. Updated the dynamic metric examples and storage account example to use `enabled_metric`.
- The storage account example included a disabled `Capacity` metric block. The current `enabled_metric` block does not support `enabled = false`, and Microsoft documentation shows storage `Capacity` metrics are not exportable through diagnostic settings. Removed the disabled block and kept the exportable `Transaction` metric category.
- The introductory storage log example described `StorageRead`, `StorageWrite`, and `StorageDelete` as storage account logs. Microsoft documents those categories for storage service resources such as `Microsoft.Storage/storageAccounts/blobServices`, so the wording now says "Storage blob service."
- The Cosmos DB metric category was listed as `Requests`. Azure diagnostic settings commonly require `AllMetrics` as the diagnostic metric category for Cosmos DB accounts, so the example was changed to `AllMetrics`.

## Review Notes
The Azure CLI category discovery command is valid. The post correctly notes that diagnostic categories vary by resource type and that the `azurerm_monitor_diagnostic_categories` data source can discover supported categories at plan time. Future improvements could mention category groups such as `allLogs` and `audit`, but that is optional and not required for correctness.
