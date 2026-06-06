# Validation Summary: How to Avoid the Anti-Pattern of Using the Debug Exporter in Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry debug exporter
- OpenTelemetry OTLP exporter
- OpenTelemetry zPages extension
- OpenTelemetry probabilistic sampler processor
- OpenTelemetry Collector internal telemetry metrics
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporter component list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector zPages extension README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/extension/zpagesextension
- OpenTelemetry Collector probabilistic sampler processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/probabilisticsamplerprocessor
- OpenTelemetry Collector OTLP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md

## Issues Found
- The post described the debug exporter as writing every telemetry item directly to stdout. Current debug exporter behavior uses the Collector's internal logger by default, with log output going to stderr by default unless configured otherwise. Updated the wording to say it writes through the Collector's configured log output.
- The post implied all debug output is one stdout log entry per span. Current documentation says detailed verbosity outputs all details of every telemetry record and typically uses multiple lines per record. Updated the disk usage section to describe multiple log lines and stdout or stderr capture.
- The post made a specific unsupported claim that the debug exporter can consume 2-3x more CPU than OTLP. Replaced it with a more defensible statement that human-readable serialization can add significant CPU overhead under load.
- Several Collector YAML snippets referenced `otlp`, `batch`, and `memory_limiter` components without defining them. Added minimal receiver and processor definitions so the examples are complete.
- The internal metrics example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `service.telemetry.metrics.readers` Prometheus pull reader configuration and set `without_type_suffix` and `without_units` so the listed metric names match the exposed names.
- The zPages section implied `/debug/tracez` shows recent production telemetry spans. Current zPages documentation describes TraceZ as a Collector diagnostic route for internal spans and error samples. Updated the wording accordingly.
- The introductory wording said the debug exporter should "never" be used in production and that it can "crash" the Collector. Adjusted this to avoid overstating the claim while preserving the production anti-pattern guidance.

## Review Notes
The guidance is technically sound after the corrections. The debug exporter remains alpha and its output format is explicitly unstable, so future posts should avoid depending on exact debug output formatting.
