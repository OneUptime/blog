# Validation Summary: How to Use the Debug Exporter to Troubleshoot Collector Pipelines

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Debug Exporter
- OpenTelemetry Collector OTLP receiver and exporter
- OpenTelemetry Collector filter, batch, transform, attributes, and probabilistic sampler processors
- OpenTelemetry spanmetrics connector
- OpenTelemetry Collector zPages and pprof extensions
- OpenTelemetry Collector internal telemetry
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Debug Exporter README: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/debugexporter@v0.153.0
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Filter Processor context inference blog and compatibility notes: https://opentelemetry.io/blog/2026/ottl-context-inference-come-to-filterprocessor/
- OpenTelemetry Collector troubleshooting documentation for zPages and pprof: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector Contrib v0.153.0 Docker image validation with `otelcol-contrib validate`

## Issues Found
- The attributes processor example set both `value` and `from_attribute` in the same `upsert` action. Current Collector validation rejects actions with multiple value sources, so I removed `from_attribute` and kept the intended redaction value.
- The multi-pipeline routing example used filter conditions in the wrong direction. The filter processor drops telemetry that matches a condition, so the high-priority pipeline was dropping critical spans and the standard pipeline was dropping non-critical spans. I inverted both conditions.
- The debug exporter sampling explanation described `sampling_initial` as the first telemetry items in full. The debug exporter samples log messages per sampling interval, then logs every Nth message according to `sampling_thereafter`, so I corrected the wording.
- The advanced example used `service.telemetry.metrics.address`, which is no longer valid in current Collector configuration. I replaced it with the current Prometheus pull reader configuration using `metrics.readers`.
- The zPages comment described zPages as live metrics. zPages exposes live Collector debug pages, so I adjusted the comment.
- The basic verbosity explanation used an invented output string. I changed it to describe the documented single-line summary and count fields.

## Review Notes
The corrected representative configurations were validated against `otel/opentelemetry-collector-contrib:0.153.0` using `otelcol-contrib validate`. The filter processor examples still use the legacy `traces.span` configuration shape, which remains supported and backwards compatible according to current OpenTelemetry documentation, although newer Collector versions also support top-level `trace_conditions`, `metric_conditions`, `log_conditions`, and `profile_conditions`.
