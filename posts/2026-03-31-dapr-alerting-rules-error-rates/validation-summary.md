# Validation Summary: How to Create Alerting Rules for Dapr Error Rates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Prometheus (monitoring and alerting)
- PromQL (Prometheus Query Language)
- Kubernetes (PrometheusRule CRD via kube-prometheus / prometheus-operator)
- Dapr Resiliency CRD

## Sources Consulted
- Dapr Observability Metrics documentation — https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Prometheus metrics setup — https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr source code for metric definitions (OpenCensus metric registration)
- Dapr Resiliency overview — https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Prometheus Operator PrometheusRule CRD documentation — https://prometheus-operator.dev/docs/api-reference/api/
- Google SRE Workbook — Alerting on SLOs (burn rate methodology)

## Issues Found

1. **Incorrect metric name: `dapr_service_invocation_req_sent_total`** — The correct metric name is `dapr_runtime_service_invocation_req_sent_total` (missing `runtime_` segment). Fixed in the metrics list.

2. **Incorrect metric names: `dapr_state_get_total` / `dapr_state_set_total`** — These metrics do not exist. Dapr uses a single `dapr_component_state_count` metric with an `operation` label (values: `get`, `set`, `delete`, `bulk`) to distinguish operations. Fixed the metrics list and the `DaprStateStoreWriteErrorRate` alert expression to use `dapr_component_state_count{operation="set"}`.

3. **Incorrect label name: `storeName`** — The state store annotation referenced `{{ $labels.storeName }}`, but the actual label on `dapr_component_state_count` is `component`. Fixed to `{{ $labels.component }}`.

4. **Incorrect metric name: `dapr_pubsub_publish_count`** — The correct metric for pub/sub publish (egress) operations is `dapr_component_pubsub_egress_count`. Fixed in the metrics list and the `DaprPubSubDeliveryErrorRate` alert expression.

5. **Testing section: circuit breaker misrepresented as fault injection** — The original testing section showed a Dapr Resiliency CRD with a circuit breaker policy and described it as "fault injection." Dapr's Resiliency CRD supports only timeouts, retries, and circuit breakers — not fault injection. A circuit breaker does not inject errors; it opens after detecting failures. Replaced with a simpler and correct approach: sending requests to a non-existent Dapr app to generate 5xx errors in the metrics.

6. **Burn rate description: "14x" should be "14.4x"** — The alert expression uses a 14.4 burn rate multiplier, but the description annotation said "14x faster than normal." Fixed to "14.4x" for accuracy.

## Review Notes
- The `success` label with `"true"`/`"false"` string values on state and pub/sub metrics was verified as correct.
- The `dapr_http_server_request_count` metric name and its `status`/`app_id` labels are correct.
- The PrometheusRule CRD structure (`monitoring.coreos.com/v1`) and PromQL syntax are correct throughout.
- The burn rate math (14.4 * 0.01 = 0.144 threshold for a 99% SLO) follows the Google SRE Workbook methodology correctly.
- The state store and pub/sub alert expressions do not use `sum() by()` aggregation, unlike the HTTP alerts. This means they produce per-component series, which may be intentional for granular alerting but is inconsistent with the HTTP alert pattern. Not changed, as both approaches are valid.
- The `humanizePercentage` Prometheus template function and `$labels`/`$value` template variables are used correctly.
