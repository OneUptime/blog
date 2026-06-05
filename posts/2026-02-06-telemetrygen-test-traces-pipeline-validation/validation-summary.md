# Validation Summary: How to Generate Test Traces with telemetrygen for Pipeline Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- telemetrygen
- OTLP gRPC
- Collector filter processor
- Collector tail sampling processor
- Collector debug exporter
- Collector internal metrics
- Docker
- GitHub Actions

## Sources Consulted
- OpenTelemetry Collector Contrib telemetrygen README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/README.md
- Current `telemetrygen traces --help` from `ghcr.io/open-telemetry/opentelemetry-collector-contrib/telemetrygen:latest`
- OpenTelemetry Collector Contrib telemetrygen module file: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/telemetrygen/go.mod
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Protocol trace protobuf definition: https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/trace/v1/trace.proto
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Live Collector debug exporter output from `ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.149.0`

## Issues Found
- The `go install` requirement said Go 1.21+. The current telemetrygen module declares Go 1.25.0, so the installation comment now says Go 1.25+ for the current latest version.
- Several examples used numeric `--status-code` values incorrectly for telemetrygen. The examples now use `Ok` and `Error` names to avoid ambiguity.
- The filter processor example used the older `traces.span` configuration style. It now uses the current `trace_conditions` form with `error_mode: ignore`.
- The health-check filter test used `--otlp-attributes`, which creates resource attributes, while the filter condition checked span attributes. The examples now use `--telemetry-attributes` for span attributes.
- The load-test section described `--rate 1000` as 1000 traces per second and calculated 6000 spans per second. Current telemetrygen help describes the rate as spans per second per worker, so the explanation and throughput estimate were corrected.
- The CI verification step grepped for `TracesExporter`, which does not match current debug exporter output. It now checks for the trace signal marker in Collector logs.

## Review Notes
The examples use `latest` container tags, so exact behavior can change with future telemetrygen or Collector releases. Pinning versions would make CI validation more reproducible.
