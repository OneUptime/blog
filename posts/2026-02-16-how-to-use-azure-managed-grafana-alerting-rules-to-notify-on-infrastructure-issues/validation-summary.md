# Validation Summary: How to Use Azure Managed Grafana Alerting Rules to Notify

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Managed Grafana
- Grafana Alerting
- Azure Monitor Metrics and Logs
- Azure CLI
- Grafana Alerting Provisioning HTTP API
- Kusto Query Language (KQL)
- Prometheus and PromQL
- Slack, email, PagerDuty, and webhook contact points

## Sources Consulted
- Azure CLI `az grafana` reference: https://learn.microsoft.com/en-gb/cli/azure/grafana?view=azure-cli-latest
- Azure Managed Grafana Azure Monitor data source documentation: https://learn.microsoft.com/en-us/azure/azure-monitor/visualize/visualize-use-managed-grafana-how-to
- Azure Managed Grafana authentication and managed identity permissions: https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-authentication-permissions
- Azure Managed Grafana data source management: https://learn.microsoft.com/en-us/azure/managed-grafana/how-to-data-source-plugins-managed-identity
- Grafana Azure Monitor data source documentation: https://grafana.com/docs/grafana/latest/datasources/azure-monitor/
- Azure Monitor supported metrics for Microsoft.Compute/virtualMachines: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-virtualmachines-metrics
- Grafana alert rule documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/
- Grafana expression query documentation: https://grafana.com/docs/grafana-cloud/visualizations/panels-visualizations/query-transform-data/expression-queries/
- Grafana contact point documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/
- Grafana silence documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/create-silence/
- Grafana Alerting Provisioning HTTP API: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/alerting_provisioning/
- Grafana panel alert rule documentation: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-alerts-panels/
- Azure Monitor managed service for Prometheus with Grafana: https://learn.microsoft.com/en-us/azure/azure-monitor/metrics/prometheus-grafana

## Issues Found
- The Azure CLI create command used `--sku Standard`, but the current `az grafana create` reference uses `--sku-tier Standard`. Updated the command.
- The VM metric `OS Disk Used Percentage` is not a supported `Microsoft.Compute/virtualMachines` Azure Monitor metric. Replaced the example with `OS Disk IOPS Consumed Percentage`, which is a supported metric.
- The article listed Log Analytics and Application Insights as additional data sources even though current Azure Managed Grafana exposes those Azure Monitor capabilities through the Azure Monitor data source. Reworded that sentence to avoid implying they must be added separately.
- The multi-condition example used `Available Memory MB`, which is not the documented Azure Monitor VM metric name. Updated it to `Available Memory Bytes` with the equivalent 512 MiB threshold.
- The Log Analytics section described adding a separate "Azure Log Analytics" data source. Current Grafana Azure Monitor support exposes Azure Monitor Logs through the Azure Monitor data source, so the setup steps were corrected.
- The notification policy API example used string `matchers`. The provisioning API documents structured `object_matchers`; updated the JSON payload accordingly.
- The dashboard-panel alert creation flow used an outdated path through panel edit mode. Updated it to the current panel menu path, `More > New alert rule`.
- The API example in the maintenance section described creating a silence but used the mute timings endpoint. Updated the wording and comment to describe a recurring mute timing that can be attached to notification policies.

## Review Notes
The provisioning API endpoint used in the article is still documented, but Grafana now marks several alert-rule provisioning endpoints as deprecated in favor of newer App Platform alerting APIs. The contact point, policy, and mute timing examples remain useful for current automation, but future revisions should consider the newer API direction as Grafana versions advance.
