# Validation Summary: How to Configure AKS Monitoring with Container Insights Using OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Azure Resource Manager provider (`azurerm`)
- Azure Kubernetes Service (AKS)
- Azure Monitor Container Insights
- Azure Monitor managed service for Prometheus
- Azure Monitor alerts
- Azure CLI
- Log Analytics and KQL

## Sources Consulted
- Azure Monitor: Enable monitoring for AKS clusters: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable
- Azure Monitor: Troubleshoot collection of container logs in Azure Monitor: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-troubleshoot
- Azure Kubernetes Service: Supported Kubernetes versions in AKS: https://learn.microsoft.com/en-us/azure/aks/supported-kubernetes-versions
- Azure Kubernetes Service: Monitoring data reference for AKS: https://learn.microsoft.com/en-us/azure/aks/monitor-aks-reference
- Azure Monitor: Recommended alert rules for Kubernetes clusters: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-metric-alerts
- Azure CLI reference for `az monitor log-analytics query`: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics?view=azure-cli-latest
- Terraform Registry: `azurerm_kubernetes_cluster`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Terraform Registry: `azurerm_monitor_data_collection_rule`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_data_collection_rule
- Terraform Registry: `azurerm_monitor_alert_prometheus_rule_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/monitor_alert_prometheus_rule_group
- Microsoft Azure managed Prometheus Terraform template: https://github.com/Azure/prometheus-collector/tree/main/AddonTerraformTemplate
- Microsoft Container Insights MSI Terraform template: https://github.com/microsoft/Docker-Provider/tree/ci_prod/scripts/onboarding/aks/onboarding-msi-terraform

## Issues Found
- The AKS node pool snippet used `enable_auto_scaling`, which is outdated for the current AzureRM provider. I changed it to `auto_scaling_enabled` so the example matches current provider syntax.
- The post pinned `kubernetes_version = "1.28"`, which is out of support as of May 7, 2026 according to current AKS version support documentation. I removed the hardcoded version so the example does not point readers at an unsupported cluster version.
- The Container Insights example enabled `msi_auth_for_monitoring_enabled = true` without also creating the required log collection DCR and DCRA. Microsoft’s troubleshooting and onboarding documentation explicitly calls out that these resources are required for Terraform-based managed-identity log collection, so I added them.
- The managed Prometheus example was incomplete for current onboarding guidance. I added the AKS `monitor_metrics` block and a `azurerm_monitor_data_collection_endpoint` referenced by the Prometheus DCR to align the snippet with current Azure onboarding templates and provider capabilities.
- The alert examples used legacy Container Insights metric alerts (`Insights.Container/*` namespaces and `oomKilledContainerCount`). Microsoft retired these legacy metric alerts on May 31, 2024, so I replaced them with supported examples: an AKS platform metric alert for node CPU and a managed Prometheus rule group for OOM-killed containers.
- The Log Analytics query example used `ContainerLog`, while current managed-identity onboarding recommends `ContainerLogV2` for new deployments. I updated the query and clarified the `--workspace` placeholder to use the Log Analytics workspace GUID expected by Azure CLI.

## Review Notes
- The Prometheus example now reflects the same-region, non-private-cluster case. Private clusters and certain region-mismatch scenarios require extra DCE/DCRA handling in Microsoft’s official templates.
- The post still uses `azurerm_log_analytics_solution`, which remains documented by the provider, but modern AKS monitoring onboarding is primarily driven by DCR/DCRA resources.
- If cost optimization is a priority, Microsoft’s current AKS monitoring guidance recommends carefully selecting Container Insights log streams when managed Prometheus is enabled, instead of collecting every stream by default.
