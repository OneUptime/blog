# Validation Summary: How to Use the Span Metrics Connector to Generate RED Metrics from Trace Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Span Metrics Connector
- OpenTelemetry semantic conventions
- Prometheus Remote Write
- PromQL
- YAML collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib Span Metrics Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector exporter components documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector processor components documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/

## Issues Found
- The collector examples used the deprecated `spanmetrics` component ID. Updated the examples and surrounding explanation to use the current `span_metrics` connector name.
- The generated metrics section said the connector generates three metrics by default. Updated it to explain that the connector generates `calls` and `duration` metric streams by default, with error rate derived from the `status_code` dimension on `calls`.
- The duration PromQL examples used `duration_seconds_bucket`, but the connector default duration unit is currently milliseconds. Added `histogram.unit: s` and second-based bucket values so the Prometheus metric name matches the queries.
- The main collector config included an invalid `resource/metrics` processor with `upsert` actions that had no `value`, `from_attribute`, or `from_context`. Removed that processor and included `deployment.environment` as a span metrics dimension instead.
- The original `exclude_dimensions` example listed high-cardinality attributes that were not default span metrics dimensions. Changed the example to omit high-cardinality attributes from `dimensions` and use `aggregation_cardinality_limit`, which replaces deprecated `dimensions_cache_size`.
- The Prometheus metric example mixed dotted OpenTelemetry attribute names with Prometheus-normalized metric names. Updated the example to use Prometheus-normalized metric and label names.
- The PromQL examples counted all span kinds. Added `span_kind="SPAN_KIND_SERVER"` filters so the request-rate, error-rate, and latency examples reflect service request RED metrics.

## Review Notes
The post is technically valid after the corrections. The Span Metrics Connector is still marked alpha in the upstream Collector Contrib documentation, and the upstream docs note a pending/default-unit transition for duration metrics; the post now avoids relying on that default by setting `histogram.unit: s` explicitly.
