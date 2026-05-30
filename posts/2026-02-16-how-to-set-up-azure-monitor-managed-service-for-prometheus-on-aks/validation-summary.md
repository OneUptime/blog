# Validation Summary: How to Set Up Azure Monitor Managed Service for Prometheus on AKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure Monitor managed service for Prometheus
- Azure Monitor workspaces
- Azure Managed Grafana
- Azure CLI
- Kubernetes ConfigMaps
- PromQL
- Prometheus recording and alerting rules

## Sources Consulted
- Microsoft Learn: Enable monitoring for Azure Kubernetes Service clusters - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable
- Microsoft Learn: Default Prometheus metrics configuration in Azure Monitor - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-default
- Microsoft Learn: Customize scraping of Prometheus metrics in Azure Monitor using ConfigMap - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configuration
- Microsoft Learn: Create custom Prometheus scrape job from your Kubernetes cluster using ConfigMap - https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configmap
- Microsoft Learn: Connect Grafana to Azure Monitor managed service for Prometheus - https://learn.microsoft.com/en-us/azure/azure-monitor/metrics/prometheus-grafana
- Microsoft Learn: Azure Monitor managed service for Prometheus rule groups - https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/prometheus-rule-groups
- Microsoft Learn: Azure CLI az alerts-management prometheus-rule-group - https://learn.microsoft.com/en-us/cli/azure/alerts-management/prometheus-rule-group
- Microsoft Learn: Azure CLI az grafana - https://learn.microsoft.com/en-us/cli/azure/grafana
- Azure prometheus-collector sample ConfigMap - https://github.com/Azure/prometheus-collector/blob/main/otelcollector/configmaps/ama-metrics-settings-configmap.yaml

## Issues Found
- The prerequisites incorrectly required the `aks-preview` extension. Current Microsoft documentation says the `aks-preview` extension should be uninstalled for AKS Azure Monitor metrics onboarding with Azure CLI 2.49.0 or higher. I replaced this with the relevant `amg` and `alertsmanagement` extension note and added the missing resource provider registrations.
- The AKS prerequisite used a fixed Kubernetes 1.25-or-later statement, while the current documented prerequisite is managed identity authentication for the cluster. I changed the prerequisite accordingly.
- The article described the deployed collector as a DaemonSet named `ama-metrics` on every node. Current docs verify the Linux node DaemonSet as `ama-metrics-node`, with separate `ama-metrics` replica pods and `ama-metrics-ksm` pods. I corrected the explanation and verification commands.
- The default scrape target list omitted the currently documented `networkobservabilityRetina` default target. I added it to the list.
- The recording and alerting rule examples used `az monitor account rule-group create` with `--azure-monitor-workspace-ids` and `--scope-cluster-id`, which does not match the current Azure CLI command reference. I changed the examples to `az alerts-management prometheus-rule-group create` with `--scopes`, `--cluster-name`, `--rules`, `--interval`, and `--enabled`.
- The metric-filtering ConfigMap used the older flat schema. Current Azure Monitor managed Prometheus settings use schema v2 with `cluster-metrics` and nested settings. I updated the example to include `schema-version: v2`, `config-version`, `cluster-metrics`, `default-targets-scrape-enabled`, `default-targets-metrics-keep-list`, and `minimal-ingestion-profile`.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI validation was performed against current Microsoft Learn command references instead of local `az --help` output. The PromQL examples are syntactically valid, but the histogram example is intentionally minimal and may need aggregation by labels such as `le` and route/service labels for production dashboards.
