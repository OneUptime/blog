# Validation Summary: How to Convert Spans to Metrics Using the Span Metrics Connector

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenTelemetry Collector
- Span Metrics connector
- Service Graph connector
- Filter processor
- Transform processor
- Prometheus Remote Write exporter
- PromQL

## Sources Consulted
- OpenTelemetry Collector Contrib Span Metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector Contrib Span Metrics connector config.go: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/config.go
- OpenTelemetry Collector Contrib Filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib Service Graph connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/servicegraphconnector/README.md
- OpenTelemetry Collector Contrib Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/

## Issues Found
- The post used deprecated component aliases `spanmetrics`, `servicegraph`, and `prometheusremotewrite`. Updated examples to `span_metrics`, `service_graph`, and `prometheus_remote_write`.
- Several Span Metrics connector fields were not supported: `metrics_names`, `enable_error_metrics`, `error_conditions`, `dimensions_defaults`, and `value_attributes`. Removed or replaced them with supported configuration patterns.
- The post repeated default Span Metrics dimensions such as `service.name`, `span.name`, `span.kind`, and `status.code` inside `dimensions`, which the connector rejects as duplicates. Removed those duplicate dimension entries.
- Metric-name examples and PromQL queries used custom names that the connector cannot configure directly. Updated them to the current default calls and duration metric names with namespace-based Prometheus normalization.
- Filter processor examples used deprecated config shape and inverted keep/drop logic. Updated them to `trace_conditions` and corrected the conditions to drop matching spans.
- HTTP semantic convention attributes used deprecated names such as `http.method`, `http.status_code`, and `http.scheme`. Updated examples to `http.request.method`, `http.response.status_code`, and `url.scheme`.
- Internal telemetry snippets used `service.telemetry.metrics.address`, which is ignored in current Collector versions. Replaced with the documented Prometheus pull reader configuration.
- Sampling guidance implied sampling before metric generation was a safe optimization. Updated it to keep span metric generation unsampled while sampling trace export separately.

## Review Notes
The Span Metrics connector is still listed as alpha in OpenTelemetry Collector Contrib documentation. The old `spanmetrics` alias still works today, but it is deprecated and should not be used in new examples.
