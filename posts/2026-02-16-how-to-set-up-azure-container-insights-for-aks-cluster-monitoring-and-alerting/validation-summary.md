# Validation Summary: How to Set Up Azure Container Insights for AKS Cluster Monitoring and Alerting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Monitor Container Insights
- Log Analytics workspaces
- Azure CLI
- Kubernetes
- Kusto Query Language (KQL)
- Azure Monitor metric alerts
- Azure Monitor log search alerts
- Azure Monitor action groups

## Sources Consulted
- Microsoft Learn: Enable Monitoring for Azure Kubernetes Service (AKS) clusters - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable
- Microsoft Learn: Create log search alerts from Container insights - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-log-alerts
- Microsoft Learn: Monitoring data reference for Azure Kubernetes Service - https://learn.microsoft.com/en-us/azure/aks/monitor-aks-reference
- Microsoft Learn: Recommended alert rules for Kubernetes clusters - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-metric-alerts
- Microsoft Learn: az monitor metrics alert CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Microsoft Learn: az monitor scheduled-query CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Microsoft Learn: az monitor action-group CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Microsoft Learn: Azure Monitor Logs reference for KubePodInventory - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/kubepodinventory
- Microsoft Learn: Azure Monitor Logs reference for ContainerInventory - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerinventory

## Issues Found
- The agent verification commands used older OMS agent names and an invalid AMA pod label. Updated them to check the current AMA logs DaemonSet and deployment names documented by Microsoft.
- The data collection settings command used `az aks update` with unrelated managed identity enabling. Updated it to use `az aks enable-addons --addon monitoring --data-collection-settings`, which matches the documented onboarding/configuration flow.
- The memory-pressure KQL query joined `Perf` rows on exact timestamps and used an allocatable counter that was not aligned with Microsoft's current Container insights alert examples. Updated it to bin readings by one minute and use `memoryCapacityBytes` with `memoryRssBytes`.
- The OOM-kill KQL query projected `ContainerName`, which is not a `ContainerInventory` column, and mislabeled `ContainerHostname` as a namespace. Updated the projection to use `Name` as the container name and `ContainerHostname` as the pod name.
- The high node CPU alert claimed to fire for any single node, but the provided metric condition averages the metric. Updated the description to match the condition.
- The failed pod metric alert used Prometheus-style label syntax, which is not valid for `az monitor metrics alert create`. Updated the condition to Azure CLI metric alert dimension syntax.
- The scheduled query alert used an invalid condition/query shape and `--action` instead of `--action-groups`. Updated the command to use a named query placeholder and the documented action group parameter.
- The action group command used unsupported `--email-receiver` syntax for this CLI command. Updated it to the documented `--action email NAME EMAIL_ADDRESS` syntax.

## Review Notes
The post is technically relevant and valid after the fixes. Some Azure Monitor Container Insights features and alert recommendations continue to evolve, especially around managed Prometheus and recommended alert rules, so future reviews should re-check the Azure Monitor AKS monitoring docs for current best practices.
