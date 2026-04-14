# Validation Summary: How to Send Dapr Traces to Azure Application Insights

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Azure Application Insights
- Azure Monitor
- OpenTelemetry Collector (with Azure Monitor exporter)
- Kubernetes
- Azure CLI
- KQL (Kusto Query Language)

## Sources Consulted
- [Dapr Configuration spec reference](https://docs.dapr.io/reference/resource-specs/configuration-schema/)
- [Configure Dapr to send distributed tracing data](https://docs.dapr.io/operations/observability/tracing/setup-tracing/)
- [Using OpenTelemetry Collector to send traces to App Insights | Dapr Docs](https://docs.dapr.io/operations/observability/tracing/otel-collector/open-telemetry-collector-appinsights/)
- [Dapr arguments and annotations reference](https://docs.dapr.io/reference/arguments-annotations-overview/)
- [az monitor app-insights component | Microsoft Learn](https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component)
- [az monitor log-analytics workspace | Microsoft Learn](https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics/workspace)
- [az monitor scheduled-query | Microsoft Learn](https://learn.microsoft.com/en-us/cli/azure/monitor/scheduled-query)
- [OpenTelemetry Collector contrib — Azure Monitor exporter](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/azuremonitorexporter)

## Issues Found

### 1. `az monitor app-insights component create --workspace` required full resource ID
- **What was wrong:** The `--workspace` flag was passed the short workspace name (`dapr-workspace`) instead of the full Azure resource ID. The Azure CLI requires the full resource ID for this parameter.
- **What was changed:** Replaced the bare workspace name with a subshell that retrieves the full resource ID via `az monitor log-analytics workspace show --query id -o tsv`.
- **Why:** The command would fail at runtime because Azure CLI cannot resolve a workspace from just its short name in this context.

### 2. `az monitor scheduled-query create --condition` used SQL syntax instead of KQL
- **What was wrong:** The `--condition` parameter contained SQL-like syntax (`SELECT * FROM dependencies WHERE duration > 1000`). Azure scheduled query rules require KQL, and the condition must use a named placeholder with the actual KQL query provided via `--condition-query`.
- **What was changed:** Replaced the SQL syntax with the correct format: `--condition "count 'HighLatencyQuery' > 10"` with a separate `--condition-query HighLatencyQuery="dependencies | where duration > 1000"`. Also updated `--scopes` to show a more realistic resource ID format.
- **Why:** The original command would fail because the condition parser expects a KQL query reference, not embedded SQL.

## Review Notes
- The OTel Collector configuration (exporter name `azuremonitor`, fields `connection_string`, `maxbatchsize`, `maxbatchinterval`) is correct and matches the official contrib exporter.
- The Dapr Configuration resource (`apiVersion: dapr.io/v1alpha1`, tracing otel fields `endpointAddress`, `isSecure`, `protocol`) is correct per official Dapr docs.
- The KQL queries use the correct `dependencies` table and valid column names (`cloud_RoleName`, `timestamp`, `name`, `duration`, `success`, `resultCode`, `target`).
- Dapr does not have a native direct integration with Application Insights — the OTel Collector approach described is the officially documented path.
- The `samplingRate: "1"` (string format, meaning 100%) is correct per Dapr docs.
