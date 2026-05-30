# Validation Summary: How to View and Query Logs from Azure Container Apps in Log Analytics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Apps
- Azure Monitor Log Analytics
- Azure CLI
- KQL
- Azure Monitor scheduled query alerts
- Log Analytics workspace data export
- Node.js structured logging with Pino

## Sources Consulted
- Microsoft Learn: Azure Container Apps logging options: https://learn.microsoft.com/en-us/azure/container-apps/log-options
- Microsoft Learn: Azure Container Apps log streaming: https://learn.microsoft.com/en-us/azure/container-apps/log-streaming
- Microsoft Learn: Azure CLI `az containerapp env`: https://learn.microsoft.com/en-us/cli/azure/containerapp/env?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az containerapp logs`: https://learn.microsoft.com/en-us/cli/azure/containerapp/logs?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az monitor scheduled-query`: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az monitor log-analytics workspace data-export`: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/data-export?view=azure-cli-latest
- Microsoft Learn: Log Analytics workspace data export: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/logs-data-export
- Microsoft Learn: Manage data retention in a Log Analytics workspace: https://learn.microsoft.com/en-us/azure/azure-monitor/logs/data-retention-configure
- Microsoft Learn: Azure Container Apps Log Analytics table guidance: https://learn.microsoft.com/en-us/azure/container-apps/log-monitoring
- Microsoft Learn: KQL string operators: https://learn.microsoft.com/en-us/kusto/query/datatypes-string-operators

## Issues Found
- The Log Analytics configuration example used the workspace customer ID and shared key. Current Container Apps logging options document using `--logs-destination log-analytics` with the Log Analytics workspace resource ID, so the example was updated and an existing-environment `az containerapp env update` command was added.
- The scheduled query alert example used `--condition "count > 50"` and passed the query directly to `--condition-query`. Current Azure CLI syntax requires a named query placeholder in `--condition` and a matching placeholder assignment in `--condition-query`, so the example now uses `ContainerAppErrors`.
- The data export example used `--table-names`, but the current Azure CLI parameter is `--tables`/`-t`. The command was corrected and `--enable true` was added to match the documented pattern.
- The Log Analytics retention statement only mentioned a 730-day limit. Current docs distinguish analytics retention up to 730 days from longer total retention, so the wording was corrected.
- The KQL tip said KQL processes data chronologically. The useful guidance is that a time filter reduces scanned data, so the chronology claim was removed.

## Review Notes
The KQL examples are appropriate for Container Apps logs stored directly in Log Analytics, where the documented table and column names include `_CL` and `_s` suffixes. Microsoft also documents Azure Monitor diagnostic settings as an alternate destination where table and column names can omit those suffixes; the post is explicitly scoped to Log Analytics, so no broader rewrite was needed.
