# Validation Summary: How to Send Dapr Logs to Azure Log Analytics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar logging, annotations)
- Azure Kubernetes Service (AKS)
- Azure Monitor Container Insights
- Azure Log Analytics
- Kusto Query Language (KQL)
- Azure CLI (`az` commands)
- Azure Monitor Scheduled Query Rules (alerts)

## Sources Consulted
- Azure Monitor ContainerLog table schema documentation (https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerlog)
- Azure Monitor ContainerLogV2 table schema documentation (https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerlogv2)
- Azure CLI `az monitor log-analytics workspace create` reference (https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace)
- Azure CLI `az monitor scheduled-query create` reference (https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query)
- Azure CLI `az aks enable-addons` reference (https://learn.microsoft.com/en-us/cli/azure/aks)
- Dapr Kubernetes annotations documentation (https://docs.dapr.io/reference/arguments-annotations-overview/)

## Issues Found
1. **`az monitor scheduled-query create` command had incorrect `--condition` and `--condition-query` format:**
   - `--condition "count > 50"` was missing the required named query placeholder. Fixed to `--condition "count 'DaprErrors' > 50"`.
   - `--condition-query` was a bare KQL string instead of the required `Name=query` format. Fixed to `--condition-query DaprErrors="..."`. Also removed the trailing `| count` from the KQL since the aggregation function is specified in the `--condition` parameter, not in the query itself.

## Review Notes
- The post uses the legacy `ContainerLog` table for KQL queries. Microsoft now recommends `ContainerLogV2` as the default for new Container Insights deployments (it includes richer Kubernetes metadata like `PodName` and `PodNamespace` directly). The legacy table still works but a future update could mention `ContainerLogV2` with its `LogMessage` column as an alternative.
- The `--sku PerGB2018` pricing tier in the workspace create command is correct and current.
- All Dapr annotations (`dapr.io/log-as-json`, `dapr.io/log-level`, etc.) are correct per Dapr documentation.
- The JavaScript logging example is syntactically correct and demonstrates a reasonable pattern for structured logging.
