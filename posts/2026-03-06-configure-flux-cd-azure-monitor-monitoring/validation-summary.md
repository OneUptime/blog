# Validation Summary: How to Configure Flux CD with Azure Monitor for Monitoring

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD
- Azure Kubernetes Service (AKS)
- Azure Monitor Container Insights
- Azure Monitor managed service for Prometheus
- Azure Monitor Agent
- Log Analytics and KQL
- Prometheus Operator PodMonitor and PrometheusRule
- Azure Managed Grafana
- Flux notification-controller and Azure Event Hub

## Sources Consulted
- Azure Monitor managed Prometheus custom scrape ConfigMap documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/prometheus-metrics-scrape-configmap
- Azure Monitor AKS monitoring enablement documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable
- Azure CLI `az monitor scheduled-query` reference: https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query
- Azure CLI `az grafana data-source` reference: https://learn.microsoft.com/en-us/cli/azure/grafana/data-source
- Azure Monitor ContainerLogV2 schema documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/container-insights-logs-schema
- Azure Monitor KubePodInventory query reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/queries/kubepodinventory/
- Azure Monitor KubeEvents table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/kubeevents
- Azure Monitor managed Prometheus rule group documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/essentials/prometheus-rule-groups
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux monitoring guide: https://fluxcd.io/flux/guides/monitoring/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Prometheus Operator PodMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Azure Monitor custom scrape ConfigMap built an invalid `__address__` value from only the Prometheus port annotation and did not consistently restrict targets to Flux's metrics port. Replaced the per-controller jobs with one Flux controller scrape job that keeps Flux controller pods and the declared `http-prom` container port, matching Flux's default metrics endpoint.
- The architecture diagram implied Prometheus metrics are stored only in Log Analytics. Updated the storage node to include Azure Monitor Workspace, which is where Azure Monitor managed Prometheus data is stored.
- The Prometheus alert rule example was presented without noting that `PrometheusRule` is a Prometheus Operator CRD, not an Azure Monitor managed Prometheus rule group resource. Added a sentence making the example conditional on using Prometheus Operator.
- The container log KQL used the legacy `ContainerLog` table and legacy column names. Updated it to the current `ContainerLogV2` table and columns: `PodNamespace`, `ContainerName`, and `LogMessage`.
- The Azure Managed Grafana data source JSON used an incomplete Prometheus data source configuration. Updated the URL placeholder and added the documented `httpMethod: "POST"` and managed identity credential shape.
- The Flux Event Hub provider used `notification.toolkit.fluxcd.io/v1`, which is not the current documented notification API version, and used an Event Hub URL in `.spec.address`. Updated the API version to `v1beta3` and changed the example to the documented SAS-based secret format, where the connection string is stored under the secret's `address` key.

## Review Notes
- The Azure Monitor scheduled query alert syntax and KubePodInventory query fields match current Azure documentation, but the alert is a pod/container health signal rather than a direct Flux reconciliation condition alert.
- Azure managed Prometheus alerting in Azure Monitor uses Azure Prometheus rule groups. The post now keeps the `PrometheusRule` example scoped to Prometheus Operator, but a future improvement could add an Azure-native rule group example.
