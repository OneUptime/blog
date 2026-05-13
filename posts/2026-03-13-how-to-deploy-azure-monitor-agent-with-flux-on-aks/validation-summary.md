# Validation Summary: How to Deploy Azure Monitor Agent with Flux on AKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Monitor Agent
- Container Insights
- Azure Monitor managed service for Prometheus
- Log Analytics workspace
- Azure Monitor workspace
- Azure Monitor Data Collection Rules
- Kubernetes ConfigMaps
- Flux Kustomization

## Sources Consulted
- Microsoft Learn: Enable monitoring for Azure Kubernetes Service clusters - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable
- Microsoft Learn: Filter and customize data collection for Kubernetes clusters - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-data-collection-configure
- Microsoft Learn: Configure container log collection with ConfigMap - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-data-collection-configmap
- Microsoft Learn: Customize collection of Prometheus metrics using ConfigMap - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configuration
- Microsoft Learn: Create custom Prometheus scrape job using ConfigMap - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configmap
- Microsoft Learn: Create data collection rules using JSON - https://learn.microsoft.com/en-us/azure/azure-monitor/data-collection/data-collection-rule-create-edit
- Microsoft Learn: Azure CLI `az monitor account` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/account
- Microsoft Learn: Azure CLI `az monitor data-collection rule` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/rule
- Microsoft Learn: Azure CLI `az monitor data-collection rule association` reference - https://learn.microsoft.com/en-us/cli/azure/monitor/data-collection/rule/association
- Microsoft Learn: Azure Managed Prometheus rule groups - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/prometheus-rule-groups
- Flux documentation: Kustomization API - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Microsoft Docker Provider ConfigMap template - https://raw.githubusercontent.com/microsoft/Docker-Provider/ci_prod/kubernetes/container-azm-ms-agentconfig.yaml

## Issues Found
- The post used managed Prometheus ConfigMaps without enabling managed Prometheus or creating an Azure Monitor workspace. I added Azure Monitor workspace creation and `az aks update --enable-azure-monitor-metrics`.
- The DCR example used inline `--data-flows` and `--destinations` arguments and omitted the Container Insights extension data source. I replaced it with a JSON rule file passed through `--rule-file` and added a DCR association to the AKS resource.
- The AMA metrics settings ConfigMap used the older `default-scrape-settings-enabled` key. I updated it to the current `cluster-metrics.default-targets-scrape-enabled` and `controlplane-metrics.default-targets-scrape-enabled` format.
- The verification command used a label selector for `ama-metrics` that is not shown in Microsoft troubleshooting guidance. I changed it to check for `ama-metrics` pods by name.
- The Log Analytics query used the deprecated `ContainerLog` table even though current Azure CLI onboarding defaults to `ContainerLogV2`. I changed the query to `ContainerLogV2`.
- The alerts section described a ConfigMap as alert rules and used a separate ConfigMap name. I changed the wording to alertable metric thresholds and targeted the supported `container-azm-ms-agentconfig` ConfigMap.

## Review Notes
The tutorial is now technically aligned with current Azure Monitor and Flux documentation. The DCR example is intentionally basic; for production changes, Microsoft recommends starting from the DCR created during onboarding or from an exported DCR definition before applying advanced transformations.
