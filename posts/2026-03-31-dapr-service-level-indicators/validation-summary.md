# Validation Summary: How to Implement Service Level Indicators (SLI) for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Prometheus (metrics collection and querying)
- Kubernetes (deployment annotations, Helm chart, service discovery)
- PromQL (Prometheus Query Language)
- gRPC and HTTP service invocation
- Pub/Sub messaging

## Sources Consulted
- [Dapr Metrics Overview](https://docs.dapr.io/operations/observability/metrics/metrics-overview/) — verified metric names, default port (9090), and configuration options
- [Dapr Configuration Schema Reference](https://docs.dapr.io/reference/resource-specs/configuration-schema/) — verified Configuration CRD field names (`metrics`, `latencyDistributionBuckets`)
- [Dapr Configuration Overview](https://docs.dapr.io/operations/configuration/configuration-overview/) — verified Configuration spec structure
- [Dapr Metrics Reference (GitHub)](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md) — verified exact Prometheus metric names for HTTP, gRPC, and Pub/Sub
- [Dapr Helm Chart values.yaml (GitHub)](https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml) — verified Helm chart value structure and metrics enablement
- [Dapr Operator Subchart values.yaml (GitHub)](https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_operator/values.yaml) — confirmed no per-component `metrics.enabled` fields exist
- [Dapr Annotations Reference](https://docs.dapr.io/reference/arguments-annotations-overview/) — verified `dapr.io/enabled` annotation
- [Dapr Prometheus Integration](https://docs.dapr.io/operations/observability/metrics/prometheus/) — verified Prometheus scrape configuration
- [Dapr Configuration Go Source (GitHub)](https://github.com/dapr/dapr/blob/master/pkg/config/configuration.go) — verified both `metric` (legacy) and `metrics` (current) are supported in code

## Issues Found

### 1. Incorrect Helm chart values for enabling metrics
- **What was wrong:** The post used `--set dapr_operator.metrics.enabled=true`, `--set dapr_sentry.metrics.enabled=true`, and `--set dapr_placement.metrics.enabled=true`. These are not valid Helm values in the Dapr chart — the individual component subcharts do not have `metrics.enabled` fields.
- **What was changed:** Replaced with `--set global.prometheus.enabled=true`, which is the correct Helm value for enabling Prometheus metrics across all Dapr components.
- **Why:** The Dapr Helm chart controls metrics via `global.prometheus.enabled` (defaults to `true`). Per-component metrics flags do not exist.

### 2. Incorrect HTTP latency histogram metric name
- **What was wrong:** The PromQL query used `dapr_http_server_request_latency_ms_bucket` as the histogram metric name.
- **What was changed:** Corrected to `dapr_http_server_latency_bucket`, which is the actual Prometheus histogram bucket metric emitted by Dapr sidecars.
- **Why:** The Dapr HTTP server latency metric is named `dapr_http_server_latency` (not `dapr_http_server_request_latency_ms`). Prometheus automatically appends `_bucket` for histogram queries.

### 3. Incorrect Dapr Configuration field names
- **What was wrong:** The Configuration YAML used `spec.metric.latencyDistribution` with a list of values.
- **What was changed:** Corrected to `spec.metrics.latencyDistributionBuckets`.
- **Why:** The current Dapr Configuration spec uses `metrics` (plural) as the section name, and the field for custom histogram buckets is `latencyDistributionBuckets` (not `latencyDistribution`). While `metric` (singular) is still accepted as a legacy alias in the Go source, the official documentation uses `metrics`.

## Review Notes
- The Prometheus scrape configuration for Dapr sidecars is correct: the relabel config properly filters on `dapr.io/enabled` annotations and targets port 9090.
- All PromQL queries use valid syntax and correct metric/label names (after fixes): `dapr_http_server_request_count` with `status` label, `dapr_grpc_io_server_completed_rpcs` with `grpc_server_status` label, and `dapr_component_pubsub_ingress_count` with `success` label are all verified.
- The Prometheus recording rules syntax is correct.
- Metrics are enabled by default in Dapr's Helm chart (`global.prometheus.enabled: true`), so the Helm upgrade command shown is technically redundant but serves a useful educational purpose by making the setting explicit.
