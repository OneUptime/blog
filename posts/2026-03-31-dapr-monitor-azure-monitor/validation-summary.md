# Validation Summary: How to Monitor Dapr on Azure with Azure Monitor

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Azure Kubernetes Service (AKS)
- Azure Monitor
- Azure Application Insights
- OpenTelemetry Collector
- Prometheus metrics
- Zipkin tracing
- KQL (Kusto Query Language)
- Azure CLI (`az monitor`)

## Sources Consulted
- Dapr Configuration spec documentation — https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr observability and metrics documentation — https://docs.dapr.io/operations/observability/metrics/
- Dapr distributed tracing documentation — https://docs.dapr.io/operations/observability/tracing/
- OpenTelemetry Collector Azure Monitor exporter documentation — https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/azuremonitorexporter
- Azure CLI `az monitor metrics alert create` reference — https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Application Insights KQL schema (requests table, cloud_RoleName field) — https://learn.microsoft.com/en-us/azure/azure-monitor/app/data-model

## Issues Found

1. **Misleading statement about Zipkin traces on port 9411**: The original text stated "Dapr emits Prometheus metrics on port 9090 and Zipkin traces on port 9411." This implied Dapr exposes or listens on port 9411, which is incorrect. Dapr sends traces TO a configured Zipkin-compatible collector endpoint (where the collector listens on 9411). Fixed the wording to: "Dapr exposes Prometheus metrics on port 9090 and can send traces in Zipkin format to a configured collector endpoint."

2. **Incorrect Dapr Configuration field name `metric` (singular)**: The YAML configuration used `spec.metric.enabled: true`, but the correct Dapr Configuration schema field is `spec.metrics.enabled` (plural). Using the singular form would be silently ignored by Dapr, meaning metrics configuration would fall back to defaults rather than being explicitly set. Fixed `metric` to `metrics`.

## Review Notes
- The OpenTelemetry Collector config uses `targets: ["dapr-sidecar:9090"]` as a static scrape target. In a real Kubernetes deployment, "dapr-sidecar" would not resolve as a service name since Dapr sidecars are injected into application pods. In practice, you would use Kubernetes service discovery (`kubernetes_sd_configs`) with pod annotations (`prometheus.io/scrape` and `prometheus.io/port`) that Dapr automatically adds. This is acceptable as a simplified illustration of the concept.
- The `connection_string: "InstrumentationKey=<YOUR_KEY>"` format works but is the minimal form. The full Application Insights connection string (including `IngestionEndpoint`) is recommended for production use, especially for sovereign clouds or private link scenarios.
- The `az monitor metrics alert create` command is structurally correct. The `--condition` syntax shown is a simplified form; actual metric alert conditions may need metric namespace qualification depending on the Azure CLI version.
- All KQL queries are syntactically correct and use valid Application Insights table/field names.
