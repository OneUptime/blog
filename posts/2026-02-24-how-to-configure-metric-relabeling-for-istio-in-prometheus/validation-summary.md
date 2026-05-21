# Validation Summary: How to Configure Metric Relabeling for Istio in Prometheus

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Prometheus
- Prometheus Operator
- Kubernetes
- PromQL

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The relabeling overview said Prometheus has two relabeling locations while the section title also referred to write relabeling. I updated it to include `write_relabel_configs` and clarified that write relabeling affects remote write samples, not local Prometheus ingestion.
- The "standard Istio metrics" keep regex omitted histogram `_sum` and `_count` series and omitted the standard gRPC message counters. I expanded the regex so it keeps the Prometheus series emitted for Istio distribution metrics and all documented standard Istio counters.
- The Istio histogram bucket example used an undocumented `ISTIO_METAJSON_STATS_HISTOGRAM_BUCKETS` proxy metadata key. I replaced it with the documented `sidecar.istio.io/statsHistogramBuckets` annotation format.

## Review Notes
The remaining examples are syntactically consistent with Prometheus relabeling and Prometheus Operator `metricRelabelings` conventions. The storage reduction percentage is workload-dependent, so it should be treated as an estimate rather than a guaranteed result.
