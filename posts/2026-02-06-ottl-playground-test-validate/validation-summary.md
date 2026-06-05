# Validation Summary: How to Use the OTTL Playground to Test and Validate Transform Processor

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- Debug exporter
- OTLP receiver
- telemetrygen
- Docker
- Bash and curl

## Sources Consulted
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md
- OpenTelemetry OTTL Span Context README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OpenTelemetry OTTL Functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Debug Exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry telemetrygen README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/README.md
- Runtime validation with `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.153.0`
- Runtime flag check with `ghcr.io/open-telemetry/opentelemetry-collector-contrib/telemetrygen:latest traces --help`

## Issues Found
- The transform processor examples used unprefixed span paths such as `attributes["test.result"]`, `status.code`, and `name` inside `context: span`. These still validate in Collector Contrib 0.153.0, but the Collector emits a warning that it rewrote them to include the context prefix and asks users to rewrite them accordingly. Updated the examples to the current documented path style: `span.attributes[...]`, `span.status.code`, and `span.name`.

## Review Notes
- Verified the corrected Collector configuration with `otelcol-contrib validate` in the current contrib container image. It returned exit code 0 with no output.
- Verified the OTLP/HTTP curl payload is accepted by the Collector and produces a transformed span with `test.result` and `Status code: Error`.
- Verified the telemetrygen flags shown in the post are present in current `telemetrygen traces --help`.
- The post title mentions the OTTL Playground, but the body focuses on local Collector, Docker, validation, telemetrygen, and script-based testing rather than a hosted or UI playground.
