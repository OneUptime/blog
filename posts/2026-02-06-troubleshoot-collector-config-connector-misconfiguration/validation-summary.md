# Validation Summary: How to Troubleshoot Collector Config Validation Not Catching Connector

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector connectors
- Span Metrics connector
- Count connector
- Debug exporter
- Prometheus Remote Write exporter
- otel-cli

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- Span Metrics connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- Count connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/countconnector/README.md
- Prometheus Remote Write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- otel-cli README: https://github.com/equinix-labs/otel-cli

## Issues Found
- The post used the deprecated `spanmetrics` connector type throughout. Updated the examples and explanatory text to use the current `span_metrics` component type.
- The post used the deprecated `prometheusremotewrite` exporter type. Updated examples to use the current `prometheus_remote_write` component type.
- The Count connector example used `traces:` for custom span counts. Updated it to `spans:`, which is the documented Count connector key for span count metrics.
- The Prometheus metric example used `span_duration_milliseconds_bucket`, which does not match the current Span Metrics connector metric naming. Updated it to `traces_span_metrics_duration_milliseconds_bucket`.
- The testing command implied that `localhost:8889/metrics` is always available. Clarified that this check applies when a Prometheus exporter is enabled.

## Review Notes
The examples are still intentionally focused on connector wiring and omit some surrounding component definitions, such as OTLP receiver and exporter endpoint details. A complete runnable Collector config would need those definitions, but the connector-specific wiring shown in the post now matches current OpenTelemetry documentation.
