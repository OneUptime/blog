# Validation Summary: How to Handle High-Cardinality Metrics in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics
- Prometheus and PromQL
- Prometheus metric relabeling
- Prometheus recording rules and TSDB retention
- OpenTelemetry Collector

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio metric customization task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- OpenTelemetry Collector telemetry transformation documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector metrics transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/metricstransformprocessor

## Issues Found
- The post said removing `source_principal` could remove a 50x multiplier by itself. This was too absolute because principal labels may be correlated with workload or service-account labels. Updated the wording to say it can significantly reduce cardinality when it is not redundant with labels that remain.
- The Telemetry API response-code CEL expression used single-quoted string literals. Updated it to double-quoted strings to match Istio's metric customization examples.
- The OpenTelemetry Collector `metricstransform` example used `experimental_scale_value`, which scales metric values and does not reduce histogram buckets. Removed that example and kept the Prometheus metric relabeling approach for dropping selected classic histogram bucket series.
- The histogram bucket relabeling example mixed second-style bucket values with Istio's millisecond request duration metric. Updated the example bucket values to millisecond-scale `le` values.
- The recording-rule section implied Prometheus can keep shorter retention for only raw Istio metrics. Core Prometheus retention is global. Reworded the section to explain this limitation and corrected the current `storage.tsdb.retention.time` YAML shape.
- The Prometheus metric relabeling example used a negative lookahead regex, but Prometheus uses RE2 regular expressions, which do not support lookahead. Replaced it with a temporary-label relabeling sequence that collapses non-empty `api_version` values to `other` and restores allowed values.
- The resource-planning section described Prometheus's 1-2 bytes per sample figure as memory usage. Prometheus documents this as average on-disk storage. Updated the bullets to describe disk storage and sample volume instead of giving an inaccurate RAM estimate.

## Review Notes
The remaining examples are version-sensitive to current Istio Telemetry API and Prometheus 3.x configuration behavior. Teams should still verify label usage in their own dashboards and alert rules before removing labels or dropping bucket series.
