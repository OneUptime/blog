# Validation Summary: How to Implement USE Metrics (Utilization, Saturation, Errors) for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Prometheus (metrics collection and alerting)
- PromQL (Prometheus Query Language)
- Grafana (dashboards)
- Kubernetes (ServiceMonitor, PrometheusRule CRDs)
- Helm
- USE Method (Brendan Gregg's Utilization, Saturation, Errors framework)

## Sources Consulted
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr metrics reference (GitHub): https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Grafana dashboards (GitHub): https://github.com/dapr/dapr/tree/master/grafana
- Dapr Configuration spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Prometheus Operator CRD documentation (ServiceMonitor, PrometheusRule)

## Issues Found

1. **`spec.metric` should be `spec.metrics` (plural)**: The Dapr Configuration YAML used `spec.metric.enabled` but the correct field name is `spec.metrics.enabled`. Fixed to `spec.metrics`.

2. **`dapr_component_service_invocation_latencies_count` does not exist**: This metric name is fabricated. The correct Dapr service invocation metrics use the `dapr_runtime_service_invocation_*` prefix. Replaced with `dapr_runtime_service_invocation_req_sent_total`.

3. **`dapr_component_state_query_total` does not exist**: The correct state store metric is `dapr_component_state_count`. Replaced all occurrences (utilization queries, error queries, and alerting rules).

4. **`dapr_actor_pending_actor_calls` missing `_runtime_` prefix**: The correct metric name is `dapr_runtime_actor_pending_actor_calls`. Fixed in both the saturation query and the alerting rule.

5. **`dapr_actor_active_actors` and `dapr_actor_max_active_actors` do not exist**: There is no active actors gauge or max active actors metric in Dapr. Replaced the ratio query with `dapr_runtime_actor_activated_total` which is a real actor metric.

6. **`dapr_http_server_active_requests` does not exist**: Dapr does not expose an active/inflight HTTP requests gauge. Replaced with a `rate()` query on the existing `dapr_http_server_request_count` metric.

7. **`dapr_http_server_latency_ms_bucket` incorrect name**: The `_ms` suffix is not part of the Dapr metric name. The correct histogram metric is `dapr_http_server_latency`, which produces `dapr_http_server_latency_bucket` in Prometheus. Fixed all occurrences.

8. **`dapr.io/sidecar-metrics-enabled` is a fabricated annotation/label**: This label does not exist in Dapr. Replaced ServiceMonitor selector with `dapr.io/enabled: "true"` and updated the pod annotation comments accordingly.

9. **`dapr.io/enable-metrics` annotation replaced**: Changed to the standard `dapr.io/enabled` annotation which is the documented Dapr sidecar injection annotation.

10. **Grafana Dashboard ID 11150 does not exist**: The blog referenced importing "the official Dapr dashboard (ID: 11150)" but this dashboard ID is not associated with Dapr. Dapr provides official dashboard JSON files in the GitHub repository (`grafana-system-services-dashboard.json`, `grafana-sidecar-dashboard.json`, `grafana-actor-dashboard.json`). Replaced with instructions to download from the Dapr GitHub repo.

## Review Notes
- The overall conceptual framework (applying USE method to Dapr) is sound and well-structured.
- The PromQL query patterns are correct in structure even though many referenced incorrect metric names.
- The Prometheus Operator CRD formats (ServiceMonitor, PrometheusRule) are correctly structured.
- The `dapr_component_pubsub_ingress_latencies_bucket` metric in the Pub/Sub Lag section is technically valid as a histogram bucket reference, but using a raw histogram bucket as a saturation signal is unusual — typically you would use `histogram_quantile()` over it. Left as-is since it is not strictly incorrect.
- The `redis_stream_length` metric referenced in the Pub/Sub Lag section is a Redis exporter metric, not a Dapr metric. This is correctly noted in the post as being backend-specific.
