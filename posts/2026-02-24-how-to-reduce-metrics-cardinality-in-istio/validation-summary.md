# Validation Summary: How to Reduce Metrics Cardinality in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics
- Prometheus and PromQL
- Prometheus metric relabeling
- Prometheus Operator ServiceMonitor, PodMonitor, PrometheusRule, and Prometheus resources

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio customizing metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio metrics and logs FAQ: https://istio.io/latest/about/faq/metrics-and-logs/
- Prometheus configuration reference for metric relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Telemetry API examples used `REQUEST_BYTES` and `RESPONSE_BYTES`, but the current Istio Telemetry metric enum names are `REQUEST_SIZE` and `RESPONSE_SIZE`. Updated the YAML and phased plan to use the correct enum values.
- The histogram text stated fixed default bucket counts and exact savings. Reworded it to the technically accurate point that Prometheus histograms create bucket series plus `_sum` and `_count` series for each unique label combination, and made the duration-bucket filtering guidance version-neutral.
- The Prometheus metric relabeling example attempted to collapse HTTP status codes into classes. Metric relabeling rewrites or drops samples before ingestion but does not aggregate sample values, and rewriting multiple series to the same labels can create duplicate label sets. Replaced that part with a drop-only example and directed status-code rollups to recording rules.
- The Envoy metric relabeling comment said "except a few key ones" while the rule dropped all `envoy_.*` metrics. Updated the comment to match the rule.

## Review Notes
The post is technically valid after these corrections. The percentage savings are workload-dependent estimates, so teams should treat them as rough guidance and measure before and after applying changes.
