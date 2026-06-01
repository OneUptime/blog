# Validation Summary: How to Optimize Azure Log Analytics Workspace Costs with Data Retention

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Monitor Logs
- Azure Log Analytics workspaces
- Azure CLI
- Log Analytics table retention and long-term retention
- Search jobs and data restore
- Kusto Query Language (KQL)
- Data Collection Rules and transformations
- Azure Monitor Logs commitment tiers

## Sources Consulted
- Microsoft Learn: Manage data retention in a Log Analytics workspace - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure
- Microsoft Learn: Azure Monitor Logs cost calculations and options - https://learn.microsoft.com/en-us/azure/azure-monitor/logs/cost-logs
- Microsoft Learn: az monitor log-analytics workspace - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace
- Microsoft Learn: az monitor log-analytics workspace table - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/table
- Microsoft Learn: az monitor log-analytics workspace table search-job - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/table/search-job
- Microsoft Learn: az monitor log-analytics workspace table restore - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/table/restore
- Microsoft Learn: Transformations in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-transformations
- Microsoft Learn: Create a transformation in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-transformations-create
- Microsoft Azure: Azure Monitor pricing - https://azure.microsoft.com/en-us/pricing/details/monitor/
- Azure Retail Prices API for Azure Monitor East US meters - https://prices.azure.com/api/retail/prices

## Issues Found
- The retention section stated that the first 31 days are free without qualifying the table plan. Updated it to specify that 31 days applies to Analytics Logs, while Basic and Auxiliary Logs include 30 days and Sentinel/Application Insights can have different included retention.
- The workspace-level retention section implied the setting applies uniformly to all table plans. Updated it to clarify that this workspace-level retention setting applies to Analytics tables by default.
- The restore CLI example used `--table`, which is not a valid parameter for `az monitor log-analytics workspace table restore create`. Replaced it with the documented `--restore-source-table` option.
- The retention cost example had incorrect arithmetic and reported about `$19,667 per month`. Corrected the calculation to about `$590 per month` for 100 GB/day retained for 59 billable days at `$0.10/GB-month`.
- The post recommended using DCR transformations to deduplicate before ingestion. Azure Monitor transformations are applied per record and do not support general stateful deduplication, so this was changed to guidance about avoiding duplicate collection paths.
- The commitment tier section said overage is billed at the pay-as-you-go rate. Microsoft documentation says overage is billed at the same effective per-GB rate as the selected commitment tier, so the wording was corrected.

## Review Notes
The Azure CLI examples for workspace retention, table retention, total retention, search jobs, and commitment tier configuration match the current Microsoft Learn CLI reference. Pricing values in the post are approximate and region-dependent; the reviewed examples are reasonable as illustrative values, but readers should still check the Azure pricing page or Azure Pricing Calculator for their region and contract.
