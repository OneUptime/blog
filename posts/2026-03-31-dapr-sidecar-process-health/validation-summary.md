# Validation Summary: How to Monitor Dapr Sidecar Process Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar architecture, health APIs, metadata API)
- Kubernetes (liveness/readiness probes, pod annotations)
- Prometheus (metrics collection, AlertManager rules)
- Grafana Loki (log-based querying)

## Sources Consulted
- Dapr Health API reference: https://docs.dapr.io/reference/api/health_api/
- Dapr Sidecar health documentation: https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Metrics overview: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr metrics source (dapr-metrics.md): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr HTTP monitoring source: https://github.com/dapr/dapr/blob/master/pkg/diagnostics/http_monitoring.go

## Issues Found

1. **Misleading health check description**: The post stated the `/v1.0/healthz` endpoint checks "App health check passed (if configured)". In reality, it checks that the app channel is initialized, not that the app itself reports healthy. Changed to "App channel is initialized (if configured)".

2. **Wrong annotation name for liveness probe threshold**: The post used `dapr.io/sidecar-liveness-probe-failure-threshold` but the correct annotation is `dapr.io/sidecar-liveness-probe-threshold` (without "failure"). Fixed the annotation name.

3. **Fabricated metric `dapr_runtime_init_total`**: This metric does not exist in Dapr. Removed it entirely.

4. **Wrong component init metric names**: The post used `dapr_component_init_total{success="true"}` and `dapr_component_init_total{success="false"}`. The actual metrics are `dapr_runtime_component_init_total` (for successful inits) and `dapr_runtime_component_init_fail_total` (for failures) -- they are separate counters, not differentiated by a `success` label. Fixed both metric names.

5. **Wrong gRPC metric name**: The post used `dapr_grpc_server_completed_rpcs` but the correct metric is `dapr_grpc_io_server_completed_rpcs` (note the `_io_` segment). Fixed the metric name.

6. **Wrong HTTP status label name**: The post used `http_status_code` as the label for HTTP server request metrics, but the actual label is `status`. Fixed in both the metrics listing and the AlertManager rules.

7. **Wrong metadata API field name**: The post referenced `activeActorsCount` in the metadata API response, but the correct field is `actors` (an array of objects with `type` and `count`). Fixed the jq command.

## Review Notes
- The `/v1.0/healthz/outbound` endpoint exists for checking component readiness without requiring the app channel to be established. This is useful for readiness probes when apps need to call Dapr APIs during startup. The post could mention this in a future update.
- The `grpc_server_status` label on `dapr_grpc_io_server_completed_rpcs` has a known issue (dapr/dapr#7045) where it may not always be exposed correctly in Prometheus format. Users should verify this works in their environment.
