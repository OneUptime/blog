# Validation Summary: How to Monitor Binding Trigger Performance in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Prometheus (metrics collection and querying)
- Zipkin (distributed tracing)
- Node.js with prom-client library
- Kubernetes (for service discovery and pod annotations)
- PromQL (Prometheus query language)

## Sources Consulted
- [Dapr Configuration Schema Spec](https://docs.dapr.io/reference/resource-specs/configuration-schema/) — verified the `spec.metrics` field name and available sub-fields
- [Dapr Metrics Overview](https://docs.dapr.io/operations/observability/metrics/metrics-overview/) — verified default metrics port (9090) and configuration approach
- [Dapr Metrics Reference (GitHub)](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md) — verified exact binding metric names: `dapr_component_input_binding_count`, `dapr_component_input_binding_latencies`, `dapr_component_output_binding_count`, `dapr_component_output_binding_latencies`
- [Dapr Prometheus Setup Guide](https://docs.dapr.io/operations/observability/metrics/prometheus/) — verified the Prometheus scrape configuration including relabel rules and annotation labels

## Issues Found

1. **Incorrect metric names in metrics table**: The post used fabricated metric names (`dapr_component_input_binding_success_total`, `dapr_component_input_binding_failure_total`, `dapr_component_output_binding_success_total`, `dapr_component_output_binding_failure_total`, `dapr_component_output_binding_latency`). Dapr uses unified counter metrics with a `status` label rather than separate success/failure counters. Corrected to the actual names: `dapr_component_input_binding_count`, `dapr_component_input_binding_latencies`, `dapr_component_output_binding_count`, `dapr_component_output_binding_latencies`. Also added the previously missing `dapr_component_input_binding_latencies` metric.

2. **Wrong Configuration field name**: `spec.metric` (singular) was changed to `spec.metrics` (plural) to match the actual Dapr Configuration resource schema.

3. **Non-existent `port` field in Configuration**: The `port: 9090` field was removed from the metrics Configuration block. The metrics port is configured via the `--metrics-port` daprd CLI flag or the `dapr.io/metrics-port` Kubernetes annotation, not in the Configuration resource.

4. **Missing Prometheus relabel rule**: Added the `dapr.io/enable-metrics` annotation filter (`__meta_kubernetes_pod_annotation_dapr_io_enable_metrics`) to the Prometheus scrape config, matching the official Dapr documentation.

5. **PromQL queries used wrong metric names**: Updated all PromQL queries to use the correct metric names with `status` label selectors (e.g., `dapr_component_input_binding_count{status="failure"}` instead of `dapr_component_input_binding_failure_total`). Also corrected the histogram bucket metric from `dapr_component_output_binding_latency_bucket` to `dapr_component_output_binding_latencies_bucket`.

6. **Alerting rules used wrong metric names**: Updated both alert expressions to use the corrected metric names consistent with the PromQL fixes above.

7. **Unused import in JavaScript code**: Removed the unused `Counter` import from the `prom-client` require statement, since only `Histogram` and `register` are used in the code example.

## Review Notes
- The error rate PromQL query was simplified from `failure / (success + failure)` to `failure / total` since Dapr uses a single counter with a `status` label, making the total (without label filter) directly available.
- The tracing configuration section is correct and matches the current Dapr documentation for Zipkin integration.
- The prom-client JavaScript code correctly demonstrates the `startTimer` / `end` pattern for histogram instrumentation.
- The latency alerting threshold of 2 seconds and error rate threshold of 0.05 events/sec are reasonable defaults but would need tuning per deployment.
