# Validation Summary: How to Export Azure Advisor Recommendations to a CSV or Power BI Report

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Azure Advisor
- Azure Resource Graph
- Azure CLI
- Azure PowerShell Az.ResourceGraph
- Power BI / Power Query Azure Resource Graph connector
- Azure Functions for Python
- Azure SDK for Python
- Azure Blob Storage
- Azure Monitor Logs / Log Analytics

## Sources Consulted
- Azure Advisor portal basics: https://learn.microsoft.com/en-us/azure/advisor/advisor-get-started
- Advisor data in Azure Resource Graph: https://learn.microsoft.com/en-us/azure/advisor/advisor-azure-resource-graph
- Azure CLI `az graph query` reference: https://learn.microsoft.com/en-us/cli/azure/graph?view=azure-cli-latest
- Azure PowerShell `Search-AzGraph` reference: https://learn.microsoft.com/en-us/powershell/module/az.resourcegraph/search-azgraph
- Azure Resource Graph Power BI connector quickstart: https://learn.microsoft.com/en-us/azure/governance/resource-graph/power-bi-connector-quickstart
- Azure Resource Graph Power Query connector: https://learn.microsoft.com/en-us/power-query/connectors/azure-resource-graph
- Azure Resource Graph REST API: https://learn.microsoft.com/en-us/rest/api/azureresourcegraph/resourcegraph/resources/resources?view=rest-azureresourcegraph-resourcegraph-2024-04-01
- Azure Resource Graph Python SDK `QueryRequest`: https://learn.microsoft.com/en-us/python/api/azure-mgmt-resourcegraph/azure.mgmt.resourcegraph.models.queryrequest?view=azure-python
- Power BI scheduled refresh documentation: https://learn.microsoft.com/en-us/power-bi/connect-data/refresh-scheduled-refresh
- Azure Monitor Logs ingestion API and custom tables: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/custom-logs-overview

## Issues Found
- The introduction said the post covered three approaches, but the post has four methods. Changed it to say four approaches and included PowerShell automation.
- The cost recommendation query projected `annualSavingsAmount` as a string and then sorted by it. Changed it to `todouble(...)` so `order by AnnualSavings desc` sorts numerically.
- The Power BI scheduled refresh section said reports could refresh hourly without qualification. Changed it to "daily or multiple times per day" because refresh frequency depends on Power BI capacity and refresh limits.
- The Python Azure Function passed a raw dictionary to `ResourceGraphClient.resources(...)`. Updated the sample to import and use `QueryRequest(query=query)`, which matches the current Azure Resource Graph Python SDK model.
- The blob upload sample would fail if the same daily blob name already existed, such as after a retry. Added `overwrite=True` to make the scheduled snapshot idempotent.

## Review Notes
- Azure CLI was not installed in the local environment, so CLI validation was performed against the official Microsoft Azure CLI reference instead of local `az --help` output.
- Azure Resource Graph and the Power BI connector return up to 1,000 records by default unless pagination or connector options are used. The post's `--first 1000` examples are valid, but larger environments may need skip tokens or connector advanced options.
- The Power BI Azure Resource Graph connector is import-only and available in supported Power BI/Fabric products. The post's connector workflow is correct, but future improvements could mention this limitation explicitly.
