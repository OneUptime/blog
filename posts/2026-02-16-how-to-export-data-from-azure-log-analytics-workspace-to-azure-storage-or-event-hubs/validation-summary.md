# Validation Summary: Export Data from Azure Log Analytics Workspace to Azure Storage or Event Hubs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Log Analytics workspace data export
- Azure Monitor Logs
- Azure Storage accounts and blob lifecycle management
- Azure Event Hubs
- Azure CLI
- ARM templates
- Azure Data Explorer / Kusto external tables

## Sources Consulted
- Microsoft Learn: Log Analytics workspace data export in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-data-export
- Microsoft Learn: Azure CLI `az monitor log-analytics workspace data-export` - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/data-export
- Microsoft Learn: ARM template reference for `Microsoft.OperationalInsights/workspaces/dataExports` - https://learn.microsoft.com/en-us/azure/templates/microsoft.operationalinsights/workspaces/dataexports
- Microsoft Learn: Azure CLI `az storage account create` - https://learn.microsoft.com/en-us/cli/azure/storage/account
- Microsoft Learn: Azure CLI `az eventhubs namespace create` - https://learn.microsoft.com/en-us/cli/azure/eventhubs/namespace
- Microsoft Learn: Azure CLI `az storage account management-policy create` - https://learn.microsoft.com/en-us/cli/azure/storage/account/management-policy
- Microsoft Learn: Kusto external tables - https://learn.microsoft.com/en-us/kusto/query/schema-entities/external-tables
- Microsoft Learn: Create and alter Azure Storage external tables in Kusto - https://learn.microsoft.com/en-us/kusto/management/external-tables-azure-storage

## Issues Found
- Removed `AzureDiagnostics` from the example list of supported export tables and from the ARM template sample because Microsoft lists it under unsupported tables for Log Analytics data export.
- Clarified custom log table support. DCR-created custom logs can be exported, while custom logs created with the legacy HTTP Data Collector API cannot.
- Corrected the prerequisite wording from workspace pricing tiers to supported table plans. Azure documentation describes support for Analytics and Basic table plans and excludes Auxiliary.
- Updated permissions to mention the Azure Event Hubs Data Owner role for Event Hubs exports, matching the documented Event Hubs write and list-keys requirements.
- Corrected exported storage container and Event Hub naming examples from lowercase table names to the documented `am-` plus original table name format, such as `am-SecurityEvent`.
- Updated the Azure Data Explorer external table example from deprecated `kind=blob` to current `kind=storage`, and corrected the container casing in the connection string.
- Corrected the cost section. Data export is billed per GB exported, so it is not free.
- Clarified that export rules do not filter data, while workspace transformations can filter or modify incoming data before export.

## Review Notes
The Azure CLI command group could not be checked locally because `az` is not installed in this workspace, so command syntax was validated against Microsoft Learn instead. The article remains a valid technical tutorial after the corrections.
