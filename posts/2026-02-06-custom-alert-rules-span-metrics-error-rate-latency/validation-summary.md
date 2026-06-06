# Validation Summary: How to Build Custom Alert Rules from OpenTelemetry Span Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry span metrics connector
- OpenTelemetry semantic conventions
- Prometheus exporter
- PromQL alert rules
- Prometheus histograms and exemplars
- Grafana exemplar navigation

## Sources Consulted
- OpenTelemetry Collector span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector span metrics connector source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/connector.go
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The Collector configuration used the deprecated `spanmetrics` component type. Updated examples to use the current `span_metrics` component type.
- The generated metric naming was incomplete for current connector defaults. Added `namespace: ""` and `histogram.unit: ms` so the Prometheus examples using `calls_total` and `duration_milliseconds_bucket` are accurate.
- The configuration used deprecated `dimensions_cache_size`. Replaced it with `aggregation_cardinality_limit`, which is the current connector option for limiting tracked dimension combinations.
- The examples used older HTTP semantic convention attribute names (`http.method` and `http.status_code`). Updated them to `http.request.method` and `http.response.status_code`, and updated the Prometheus label selector to `http_response_status_code`.
- The P99 latency annotation used `humanizeDuration` on a millisecond-valued query result. Changed it to display the millisecond value directly.
- The per-endpoint latency text overstated the mapping between span name and route/RPC method. Reworded it to match OpenTelemetry HTTP span naming guidance.
- The histogram cardinality estimate counted only configured bucket boundaries. Updated it to include the implicit `+Inf` bucket plus `_sum` and `_count` series for classic Prometheus histograms.
- The exemplar section did not mention that the Collector Prometheus exporter only exports exemplars with OpenMetrics enabled. Added `enable_open_metrics: true` in the Prometheus exporter configuration and qualified the Grafana exemplar statement.

## Review Notes
The corrected examples intentionally set an empty connector namespace to preserve the short Prometheus metric names used throughout the post. Without that setting, current connector defaults prepend the `traces.span.metrics` namespace before Prometheus name translation.
