# Validation Summary: How to Send Dapr Metrics to Azure Monitor

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Dapr (sidecar and control plane metrics)
- Azure Monitor managed service for Prometheus
- Azure Managed Grafana
- Azure Kubernetes Service (AKS)
- Azure CLI (`az aks`, `az alerts-management`)
- Prometheus scrape configuration
- PromQL

## Sources Consulted
- Dapr source code: `pkg/metrics/options.go` (default metrics port and path)
- Dapr source code: `pkg/diagnostics/http_monitoring.go` (metric names)
- Dapr Helm charts: `charts/dapr/values.yaml` and deployment templates
- Dapr docs - Configure metrics: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr docs - Observe metrics with Grafana: https://docs.dapr.io/operations/observability/metrics/grafana/
- Azure CLI reference for `az aks update` with `--enable-azure-monitor-metrics`
- Azure docs - Customize Prometheus scrape configuration: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configuration
- Azure docs - Prometheus metric alerts: https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/prometheus-alerts
- Azure CLI reference for `az alerts-management prometheus-rule-group`: https://learn.microsoft.com/en-us/cli/azure/alerts-management/prometheus-rule-group
- Azure docs - Query Prometheus metrics via API: https://learn.microsoft.com/en-us/azure/azure-monitor/metrics/prometheus-api-promql
- Grafana dashboard library: https://grafana.com/grafana/dashboards/

## Issues Found

1. **Incorrect Dapr metrics path annotation**: The `prometheus.io/path` annotation was set to `"/metrics"` but Dapr serves metrics at the root path `"/"`. Changed to `prometheus.io/path: "/"`.

2. **Invalid Grafana dashboard ID**: The post referenced Grafana dashboard ID `15401` for Dapr system services, but this ID does not exist in the Grafana dashboard library. Dapr provides dashboard JSON files via GitHub releases (e.g., `grafana-system-services-dashboard.json`). Updated the instructions to download from the Dapr GitHub releases page.

3. **Wrong CLI command for Prometheus alerts**: The post used `az monitor scheduled-query create` with PromQL queries, but this command operates on Log Analytics workspaces using KQL (Kusto Query Language), not PromQL. Replaced with `az alerts-management prometheus-rule-group create`, which is the correct command for creating Prometheus alert rules with PromQL expressions against Azure Monitor workspaces.

4. **`az monitor metrics list` cannot query Prometheus metrics**: The post used `az monitor metrics list` to query Dapr Prometheus metrics from an Azure Monitor workspace, but this command queries Azure platform metrics, not Prometheus metrics. Replaced with a `curl` command using the Prometheus query API endpoint (`https://<query-endpoint>.prometheus.monitor.azure.com/api/v1/query`), which is the correct way to programmatically query Prometheus metrics.

## Review Notes
- The post does not mention `dapr-sidecar-injector` or `dapr-scheduler` in the custom scrape config for control plane components. These are also Dapr control plane services that expose metrics on port 9090. Authors may want to add them for complete coverage.
- The `az aks update --enable-azure-monitor-metrics` command and its associated flags (`--azure-monitor-workspace-resource-id`, `--grafana-resource-id`) were verified as correct.
- The Dapr metric name `dapr_http_server_request_count` was verified as correct.
- The ConfigMap name (`ama-metrics-prometheus-config`), namespace (`kube-system`), and data key (`prometheus-config`) for Azure Monitor metrics addon custom scrape config were all verified as correct.
- Dapr control plane service names (`dapr-operator`, `dapr-sentry`, `dapr-placement-server`) and their metrics port (9090) were verified as correct.
