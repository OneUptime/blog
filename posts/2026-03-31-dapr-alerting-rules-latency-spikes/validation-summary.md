# Validation Summary: How to Create Alerting Rules for Dapr Latency Spikes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar metrics and observability)
- Prometheus (alerting rules, recording rules, histogram_quantile)
- Prometheus Operator (PrometheusRule CRD)
- PromQL
- Kubernetes (kubectl port-forward)
- k6 (load testing)
- promtool (rule validation)

## Sources Consulted
- Dapr metrics reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr observability docs: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr sidecar injector docs: https://docs.dapr.io/concepts/dapr-services/sidecar-injector/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- k6 running documentation: https://grafana.com/docs/k6/latest/get-started/running-k6/

## Issues Found

1. **All four Dapr metric names were fabricated/incorrect.** The post used non-existent metric names with a `_msec` suffix pattern. Fixed:
   - `dapr_http_server_request_duration_msec` → `dapr_http_server_latency` (actual Dapr HTTP server histogram)
   - `dapr_service_invocation_req_sent_total` → `dapr_runtime_service_invocation_res_recv_latency_ms` (the original was a counter metric with `_total` suffix, not a histogram — it cannot be used with `histogram_quantile` and does not belong in a latency metrics table)
   - `dapr_state_get_duration_msec` → `dapr_component_state_latencies` (actual state component latency histogram)
   - `dapr_pubsub_publish_duration_msec` → `dapr_component_pubsub_egress_latencies` (actual pub/sub egress latency histogram)

2. **All PromQL expressions referenced non-existent `_bucket` series.** Updated all `rate()` calls to use the correct bucket metric names derived from the corrected histogram names (e.g., `dapr_http_server_latency_bucket`).

3. **State store label name was wrong.** Changed `$labels.storeName` to `$labels.component` and updated the recording rule `sum() by (storeName, le)` to `sum() by (component, le)` to match the actual label exposed by `dapr_component_state_latencies`.

4. **Port-forward command targeted the wrong service.** `dapr-sidecar-injector` is the MutatingAdmissionWebhook service for sidecar injection — it does not expose application-level Dapr metrics. Changed to `kubectl port-forward deploy/<app-name> 9090:9090 -n <app-namespace>` which correctly targets the Dapr sidecar running alongside an application pod.

5. **Grep pattern in curl command was wrong.** Updated from `grep dapr_http_server_request_duration` to `grep dapr_http_server_latency` to match the corrected metric name.

## Review Notes
- The alerting rules use `rate()` without `sum by (le)` aggregation. This is valid and produces per-label-set p99 values (one alert per unique app/component). The recording rules section correctly shows the aggregated form with `sum() by (..., le)`. This is a reasonable split for the tutorial's purpose.
- The PrometheusRule CRD format, PromQL histogram_quantile pattern, promtool command, and k6 command syntax are all correct.
- The post does not specify a Dapr version. Dapr metric names have changed across versions — the corrected names reflect the metrics as documented in the current Dapr development metrics reference.
- Threshold values (500ms, 200ms, 300ms, 2000ms) are reasonable defaults but will vary by workload.
