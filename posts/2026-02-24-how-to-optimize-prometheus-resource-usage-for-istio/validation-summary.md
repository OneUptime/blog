# Validation Summary: How to Optimize Prometheus Resource Usage for Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Prometheus
- Prometheus Operator
- Kubernetes
- PromQL
- Grafana
- Thanos
- Envoy sidecars

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio secure metrics scraping documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus query log guide: https://prometheus.io/docs/guides/query-log/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The opening sentence described Prometheus as Istio's default metrics backend. Istio's documentation says standard Istio metrics are exported in Prometheus format by default, while Prometheus itself is an integration/add-on. Updated the wording to avoid implying Prometheus is always installed as the backend.
- The Envoy scrape-target reduction example selected pods by container name but did not configure the Istio metrics path or select the Envoy Prometheus telemetry port. Updated it to use `metrics_path: /stats/prometheus` and the documented `.*-envoy-prom` container port-name relabeling pattern.
- The scrape-subsetting explanation implied exact service-level visibility after dropping 60% of pods. Updated it to state that exact aggregate totals are lost and the remaining visibility is sampled.
- The metric keep-list mixed sidecar Istio metrics with `pilot_*` control-plane metrics in the same sidecar-oriented example. Removed the `pilot_*` metrics from that keep-list.
- The Prometheus Operator sharding example named the single Prometheus custom resource `prometheus-shard-0`, which can imply users should create one CR per shard. Updated the name to `prometheus`; `spec.shards: 3` is the field that tells the operator to create shards.
- The query log comment said it logs slow queries, but Prometheus query logging logs all queries. Updated the example path and comment to describe logging all queries while troubleshooting.
- The query-latency PromQL example did not aggregate histogram buckets before `histogram_quantile`. Updated it to `sum by (le) (...)` for a global p99 query latency.

## Review Notes
The resource sizing numbers and the "50% or more" reduction claim are reasonable operational guidelines, but they are workload-dependent estimates rather than guarantees. Prometheus query logs should be enabled temporarily or paired with log rotation because Prometheus does not rotate them itself.
