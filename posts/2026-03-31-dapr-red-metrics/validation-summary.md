# Validation Summary: How to Implement RED Metrics (Rate, Errors, Duration) for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar metrics, service invocation, pub/sub, state store)
- Prometheus (recording rules, alerting rules, PromQL)
- Grafana (dashboard JSON panels, thresholds)
- Kubernetes (Dapr Configuration CRD, PrometheusRule CRD)

## Sources Consulted
- [Dapr Metrics Configuration](https://docs.dapr.io/operations/observability/metrics/metrics-overview/) - verified metric field names, configuration schema, and rules format
- [Dapr Configuration Spec](https://docs.dapr.io/reference/resource-specs/configuration-schema/) - verified `spec.metrics` (plural) field name and rules structure requiring a `name` field
- [Dapr Metrics Reference (GitHub)](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md) - verified exact metric names including `dapr_runtime_service_invocation_*` prefix and `dapr_http_server_*` metrics
- [Dapr Configuration Overview](https://docs.dapr.io/operations/configuration/configuration-overview/) - verified configuration YAML format and rules example
- [Dapr Observability Overview](https://docs.dapr.io/concepts/observability-concept/) - confirmed metric label availability (status label on HTTP metrics)

## Issues Found

1. **Configuration field name `metric` should be `metrics` (plural)**: The blog used `spec.metric` but current Dapr versions use `spec.metrics`. Changed to `spec.metrics`.

2. **Configuration rules missing `name` field**: Each metric rule must include a `name` field specifying which metric the rule applies to. The original had rules with only `labels` but no metric name. Fixed by adding `name: dapr_runtime_service_invocation_req_sent_total` and restructured to match the official docs example.

3. **Service invocation metric names missing `_runtime_` prefix**: All service invocation metrics in the "Key Metrics" section were missing the `dapr_runtime_` prefix. For example, `dapr_service_invocation_req_sent_total` should be `dapr_runtime_service_invocation_req_sent_total`. Fixed all runtime metric names.

4. **Incorrect response metric name**: The blog listed `dapr_service_invocation_response_recv_total` but the actual metric is `dapr_runtime_service_invocation_res_recv_total` (abbreviated `res`, not `response`). Fixed.

5. **Latency metric measured on wrong side**: The blog used `dapr_service_invocation_req_sent_latency_ms_bucket` but the actual latency histogram is `dapr_runtime_service_invocation_res_recv_latency_ms_bucket` (measured on response receive, not request send). Fixed.

6. **Error rate PromQL used a metric without status labels**: The original error rate expression filtered `dapr_service_invocation_req_sent_total{status=~"5.."}`, but Dapr runtime service invocation counters do not carry HTTP status code labels. Switched all service invocation PromQL (rate, error rate, duration) to use `dapr_http_server_request_count` and `dapr_http_server_latency_bucket`, which do have `app_id`, `method`, and `status` labels.

7. **State store metrics used nonexistent separate counters**: The blog listed `dapr_component_state_get_total` and `dapr_component_state_set_total` but Dapr uses a single `dapr_component_state_count` counter with an `operation` label (values: get, set, delete). Fixed.

## Review Notes
- The pub/sub metric names (`dapr_component_pubsub_ingress_count`, `dapr_component_pubsub_egress_count`, `dapr_component_pubsub_ingress_latencies_bucket`) and the pub/sub PromQL using `status="drop"` are correct.
- The Grafana dashboard JSON panel structure and alerting rule format are syntactically correct.
- The `humanizePercentage` template function in the alert annotation is a valid Prometheus template function.
- The PrometheusRule CRD format (`apiVersion: monitoring.coreos.com/v1`) is correct for the Prometheus Operator.
- The metric rules approach shown in the configuration is considered legacy by Dapr. The current recommended approach for managing HTTP metric cardinality is to use `spec.metrics.http.increasedCardinality: false` or `spec.metrics.http.pathMatching`. A future update could mention this.
