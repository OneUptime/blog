# Validation Summary: How to Set Up Azure Monitor for Containers to Monitor AKS Cluster Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Monitor
- Container Insights
- Azure Monitor Agent
- Log Analytics
- Kubernetes ConfigMaps
- Kusto Query Language (KQL)
- Azure CLI

## Sources Consulted
- Microsoft Learn: Enable Monitoring for Azure Kubernetes Service (AKS) Clusters - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable
- Microsoft Learn: Filter and customize data collection for Kubernetes clusters - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-data-collection-configure
- Microsoft Learn: Configure container log collection with ConfigMap - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-data-collection-filter
- Microsoft Learn: Monitoring data reference for Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/monitor-aks-reference
- Microsoft Learn: Azure Monitor Logs reference - KubeNodeInventory - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/kubenodeinventory
- Microsoft Learn: Azure Monitor Logs reference - KubeEvents - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/kubeevents
- Microsoft Learn: Azure Monitor tables for Microsoft.ContainerService/managedClusters - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/microsoft-containerservice_managedclusters
- Microsoft Learn: Azure CLI az monitor scheduled-query reference - https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query?view=azure-cli-latest
- Microsoft Learn: Azure CLI az monitor metrics alert reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert?view=azure-cli-latest
- Microsoft Learn: Azure CLI az monitor log-analytics workspace table reference - https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace/table?view=azure-cli-latest
- Microsoft Learn: Optimize monitoring costs for Container insights - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-cost

## Issues Found
- The post stated that the monitoring agent runs only as a DaemonSet on every node. Updated this to clarify that the node agent runs as a DaemonSet and that additional cluster-level components are used.
- The prerequisites mentioned the `aks-preview` extension as optional for advanced features, but the documented commands shown do not require it. Removed that prerequisite to avoid implying it is needed.
- The verification command comment referred to `omsagent` pods while the command searches for `ama-` pods. Updated the comment to refer to Azure Monitor Agent pods.
- The third setup method described AMA with DCR as a separate newer approach, but the shown flag specifically controls managed identity authentication and is enabled by default for supported AKS versions. Updated the heading and explanation.
- The data collection section implied all collection is controlled by a single ConfigMap. Updated the wording to clarify that the ConfigMap controls agent collection settings.
- The Prometheus ConfigMap example could be read as the preferred production Prometheus setup. Added a note that Azure Monitor managed service for Prometheus is the recommended production Prometheus path.
- The "Container Memory Pressure" KQL query defined an unused `memoryLimits` variable and attempted to use `ContainerInventory.EnvironmentVar` as a memory limit source. Replaced it with a correct memory usage query and renamed the heading.
- The scheduled-query alert examples used invalid `--condition "count > 0"` syntax and did not bind query placeholders with `--condition-query`. Updated both alert commands to use named placeholders.
- The node readiness alert queried `Status == 'NotReady'`, but `KubeNodeInventory.Status` is a comma-separated list of condition types whose status is true. Updated the query to detect nodes whose latest status does not contain `Ready`.
- The high CPU metric alert used an inaccurate metric name in the condition. Updated it to use the AKS metric name `node_cpu_usage_percentage`.
- The table retention command used `--retention-in-days`, which is not the current Azure CLI parameter for `az monitor log-analytics workspace table update`. Updated it to `--retention-time`.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against Microsoft Learn CLI references rather than local `az --help` output.
