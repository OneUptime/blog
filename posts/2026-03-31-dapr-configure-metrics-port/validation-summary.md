# Validation Summary: How to Configure Dapr Metrics Port

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (sidecar and control plane)
- Prometheus (metrics scraping and PromQL queries)
- Kubernetes (Deployments, annotations, service discovery)
- Helm (Dapr chart configuration)
- Grafana (dashboard setup)

## Sources Consulted
- Dapr Metrics Overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Prometheus Integration: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr Annotations Reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Grafana Integration: https://docs.dapr.io/operations/observability/metrics/grafana/
- Dapr Helm Chart Deployment: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr source code (metrics exporter): https://github.com/dapr/dapr

## Issues Found

1. **Incorrect state store metric name**: The PromQL example used `dapr_component_state_get_latencies_ms_bucket`, but the actual Dapr metric is `dapr_component_state_latencies_bucket`. Dapr state metrics do not distinguish between get/set/delete at the metric name level, and the `_ms` suffix is not part of the exported name. Fixed to `dapr_component_state_latencies_bucket`.

2. **Incorrect Helm chart values for control plane metrics**: The post used per-component Helm values (`dapr_operator.metrics.enabled`, `dapr_operator.metrics.port`, `dapr_sentry.metrics.enabled`, `dapr_placement.metrics.enabled`), but the Dapr Helm chart uses global Prometheus settings: `global.prometheus.enabled` and `global.prometheus.port`. Fixed the Helm command to use the correct global values.

3. **Inconsistent control plane scrape target ports**: The scrape config showed the operator and sentry on port 8080 and placement on 9090, but since Dapr uses a global prometheus port (default 9090) for all control plane components, all targets should use the same port. Fixed all targets to use port 9090.

4. **Unverifiable Grafana dashboard IDs**: The post referenced Grafana dashboard IDs 14234 and 14235, which returned 404 errors on Grafana.com. The official Dapr documentation provides dashboard JSON files from the Dapr GitHub repository instead. Updated the comment to reference the official source at https://github.com/dapr/dapr/tree/master/grafana.

## Review Notes
- The default metrics port of 9090 is confirmed correct per official documentation.
- The Kubernetes annotations (`dapr.io/enable-metrics`, `dapr.io/metrics-port`) are correct and current.
- The Prometheus relabel config for sidecar scraping follows the correct pattern from official docs.
- The PromQL metric names `dapr_http_server_request_count` and `dapr_component_pubsub_ingress_count` are confirmed correct per Dapr source code.
- The second Prometheus relabel rule (setting `__metrics_path__` to `/metrics`) is redundant since `/metrics` is already the default scrape path, but it is not incorrect.
- Metric naming conventions may evolve in future Dapr versions as the project continues its migration to OpenTelemetry-based metrics.
