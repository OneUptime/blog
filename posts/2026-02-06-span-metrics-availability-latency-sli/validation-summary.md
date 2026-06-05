# Validation Summary: How to Use OpenTelemetry Span Metrics to Derive Availability and Latency SLIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry span metrics connector
- OpenTelemetry filter processor and OTTL
- OpenTelemetry HTTP semantic conventions
- Prometheus exporter
- PromQL histograms and recording rules

## Sources Consulted
- OpenTelemetry Collector Contrib span metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Contrib Prometheus exporter README: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/prometheusexporter
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry tracing API span status documentation: https://opentelemetry.io/docs/specs/otel/trace/api
- Prometheus histogram query documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The post used the deprecated `spanmetrics` connector type. Updated configuration examples to use the current `span_metrics` connector name.
- The main Collector example configured `service.name` as an explicit dimension, but `service.name` is already a default span metrics dimension and current Collector validation rejects duplicate dimension names. Removed the duplicate explicit dimension.
- The main Collector example used deprecated `dimensions_cache_size`. Replaced it with `aggregation_cardinality_limit`, which is the current span metrics connector setting.
- The HTTP dimensions used older semantic-convention names `http.method` and `http.status_code`. Updated them to `http.request.method` and `http.response.status_code`.
- The main example said it derived metrics only from server spans, but the configuration did not filter non-server spans. Added a filter processor with `span.kind != SPAN_KIND_SERVER`.
- The first filtering fix initially would have filtered spans before the tracing backend as well as before span metrics. Adjusted the examples to use separate traces pipelines so filtering applies only to the span metrics connector while full traces still go to the tracing backend.
- The "Retroactive SLIs" wording overstated what Collector config changes can do. Changed it to clarify that new dimensions apply to newly processed spans, not historical telemetry already exported.

## Review Notes
Collector configuration snippets were validated with `otelcol-contrib` version 0.153.0. The referenced OneUptime link returned HTTP 200. The PromQL examples are syntactically consistent with Prometheus histogram and recording-rule documentation, assuming the default Prometheus translation exposes span metrics as `calls_total` and `duration_milliseconds_*`.
