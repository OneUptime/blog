# Validation Summary: How to Create Azure Log Analytics Workspace with Custom Tables Using Bicep

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Log Analytics workspaces
- Azure Monitor Logs custom tables
- Azure Monitor Data Collection Rules
- Azure Monitor Data Collection Endpoints
- Azure Logs Ingestion API
- Bicep
- Azure CLI
- Kusto Query Language

## Sources Consulted
- Microsoft Learn: Microsoft.OperationalInsights/workspaces Bicep resource reference, https://learn.microsoft.com/en-us/azure/templates/microsoft.operationalinsights/workspaces
- Microsoft Learn: Microsoft.OperationalInsights/workspaces/tables Bicep resource reference, https://learn.microsoft.com/en-us/azure/templates/microsoft.operationalinsights/2022-10-01/workspaces/tables
- Microsoft Learn: Microsoft.Insights/dataCollectionRules Bicep resource reference, https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/datacollectionrules
- Microsoft Learn: Microsoft.Insights/dataCollectionEndpoints Bicep resource reference, https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/datacollectionendpoints
- Microsoft Learn: Logs Ingestion API in Azure Monitor, https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-ingestion-api-overview
- Microsoft Learn: Data Collection Rules - Create REST API, https://learn.microsoft.com/en-us/rest/api/monitor/data-collection-rules/create?view=rest-monitor-2024-03-11
- Microsoft Learn: Azure Monitor Logs table plans, https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-platform-logs
- Microsoft Learn: Add or delete tables and columns in Azure Monitor Logs, https://learn.microsoft.com/en-us/azure/azure-monitor/logs/create-custom-table
- Microsoft Learn: Manage data retention in a Log Analytics workspace, https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure

## Issues Found
- The post said Basic tables have only 8 days of interactive query retention. Current Azure Monitor documentation describes Basic tables as supporting full KQL on a single table, with lookup to Analytics tables, separate interactive query charges, and total retention up to 12 years. Updated the explanation to match current table plan behavior.
- The Data Collection Rule examples used the 2022-06-01 API and did not mark the rules as direct ingestion rules. Updated the DCE and DCR examples to the current 2024-03-11 API and added `kind: 'Direct'` to the DCRs, matching current Logs Ingestion API examples.
- The ingestion example used a generic `DCR_ID`, which could be confused with the Azure resource ID. The Logs Ingestion API requires the DCR immutable ID in the URL. Updated the Bicep outputs and curl example to use `DCR_IMMUTABLE_ID`.

## Review Notes
The post is technically relevant and the overall workflow is valid. I could not run Bicep compilation locally because neither `bicep` nor `az` is installed in the environment, so validation was performed against Microsoft Learn resource and API references.
