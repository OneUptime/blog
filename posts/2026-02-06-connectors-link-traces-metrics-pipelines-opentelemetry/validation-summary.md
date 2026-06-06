# Validation Summary: How to Use Connectors to Link Traces and Metrics Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector connectors
- Span Metrics connector
- Service Graph connector
- Sum connector
- Tail Sampling processor
- Filter processor
- Prometheus remote write exporter

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- Span Metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- Service Graph connector package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/servicegraphconnector
- Sum connector package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/sumconnector
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib Docker image validation with `otel/opentelemetry-collector-contrib:0.153.0`

## Issues Found
- Updated Span Metrics connector component names from deprecated `spanmetrics` to current `span_metrics` syntax and removed duplicate default dimensions such as `service.name`, `span.kind`, and `status.code`.
- Removed invalid Span Metrics connector `aggregation`, `errors`, and value-based `exclude_dimensions` configuration. The connector generates calls and duration metrics directly; error rates are derived from status-code dimensions.
- Removed unsupported Service Graph connector `metrics` toggles and request/response size settings. Current configuration supports store, histogram, dimensions, virtual node, flush, and related options, not per-metric enablement blocks.
- Replaced the trace enrichment example that attempted to use `from_context` with metric values. Collector connectors do not inject live metric values into traces that way; the section now uses exemplars to preserve trace context in generated metrics.
- Corrected the sampling section so connectors are used to monitor sampled trace output, not to drive sampling decisions from generated metrics. Removed the unsupported `sampling` connector block.
- Replaced invalid Sum connector aggregation examples with valid `spans`/`source_attribute` configurations that sum numeric span attributes into metrics.
- Removed deprecated `service.telemetry.metrics.address` usage and the invalid internal metrics pipeline that used a Prometheus exporter as a receiver.
- Corrected the Filter processor example because matching OTTL conditions drop telemetry. The updated condition drops lower-value spans and uses valid span time fields.

## Review Notes
Complete standalone YAML examples were validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`. The performance and internal telemetry snippets are partial snippets intended to be added to an existing Collector configuration, so they were reviewed for schema and OTTL correctness rather than standalone startup validity.
