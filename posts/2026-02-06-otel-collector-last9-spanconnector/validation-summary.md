# Validation Summary: How to Configure the OpenTelemetry Collector to Export to Last9

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Span Metrics connector
- OTLP receiver and exporter
- Last9 OTLP ingestion
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector Span Metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector service internal telemetry metadata: https://github.com/open-telemetry/opentelemetry-collector/blob/main/service/metadata.yaml
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- Last9 public site, OpenTelemetry compatibility and TraceMetrics references: https://last9.io/
- ToolJet Last9 OpenTelemetry integration documentation: https://docs.tooljet.com/docs/tj-setup/observability/last9/

## Issues Found
- The post used the deprecated `spanmetrics` component type in Collector configuration. Updated examples to use `span_metrics`, which is the current name documented by OpenTelemetry; the old name still works but is deprecated.
- The prose used the informal `SpanConnector` name. Updated body copy to use the official "Span Metrics connector" wording.
- The list of default metric labels omitted `collector.instance.id`, which is included by default in current spanmetrics connector documentation. Added it to the default labels list.
- The verification snippet referenced older connector internal metrics, `otelcol_connector_accepted_spans` and `otelcol_connector_emitted_metric_points`. Updated it to point to current connector internal telemetry counters for consumed and produced items.

## Review Notes
The Last9 OTLP endpoint and Basic authorization examples are plausible for OTLP/gRPC based on public Last9-related integration examples. Last9 account-specific endpoint and auth header values should still be copied from the Last9 integration panel in production.
