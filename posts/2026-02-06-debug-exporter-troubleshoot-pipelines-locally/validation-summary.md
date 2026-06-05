# Validation Summary: How to Use the Debug Exporter to Troubleshoot Pipelines Locally

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector debug exporter
- OTLP receiver and exporter
- Batch processor
- Attributes processor
- Filter processor
- Tail sampling processor
- Collector pipeline configuration

## Sources Consulted
- OpenTelemetry Collector troubleshooting docs: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry tail sampling sample configuration: https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/

## Issues Found
- The post described the debug exporter as always printing full telemetry records to stdout. Updated the wording to match current behavior: the exporter writes to the Collector's logs or configured output paths, and full telemetry content is produced with `verbosity: detailed`.
- The basic verbosity example used older-style `TracesExporter`, `MetricsExporter`, `LogsExporter`, and `#spans`-style fields. Updated the example to match the current debug exporter summary shape with `Traces`, `Metrics`, `Logs`, `otelcol.signal`, and count fields.
- The normal and detailed verbosity examples did not match the current documented output shape. Updated them to reflect current normal one-line-per-record output and detailed `ResourceSpans` / `ScopeSpans` formatting.
- The filter processor example used the older nested `traces.span` configuration and unqualified `name` path. Updated it to the current `trace_conditions` style with `span.name` and `error_mode: ignore`.
- The separate debug pipeline example referenced `filter/debug-only` without defining it. Added a minimal `filter/debug-only` processor definition so the snippet is self-contained.

## Review Notes
- The debug exporter output format is explicitly documented as unstable, so examples should be treated as representative rather than a guaranteed byte-for-byte format.
- The tail sampling example is technically valid, but production deployments should also consider the documented requirement that all spans for a trace reach the same Collector instance before tail sampling decisions are made.
