# Validation Summary: How to Build a Fan-Out Pipeline That Sends Traces to Multi Backends

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP receiver and exporters
- Collector fan-out pipelines
- Collector retry and sending queue settings
- Collector internal telemetry metrics
- Docker Compose
- Jaeger
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector architecture documentation: https://opentelemetry.io/docs/collector/architecture/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Jaeger getting started documentation: https://www.jaegertracing.io/docs/2.19/getting-started/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- OneUptime Host OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The OneUptime exporter used a non-documented OTLP gRPC endpoint (`https://otlp.oneuptime.com:4317`). Updated it to the documented OTLP HTTP endpoint (`https://oneuptime.com/otlp`) and changed the exporter type to `otlphttp/oneuptime`.
- The Collector configuration used `${ONEUPTIME_TOKEN}` interpolation. Updated it to the current documented Collector environment provider syntax, `${env:ONEUPTIME_TOKEN}`.
- The Jaeger endpoint in the complete config used a Kubernetes service name while the post's Docker Compose example was local. Updated it to `jaeger:4317`, which works on the Compose network.
- The Docker Compose example used the older Jaeger all-in-one image and exposed port `14250`, which is not the OTLP gRPC port used by the Collector config. Updated the Jaeger image to the current documented Jaeger 2.19 image and kept only the UI port published to avoid host port conflicts with the Collector.
- The monitoring snippet used `service.telemetry.metrics.address`, which is ignored as of OpenTelemetry Collector v0.123.0. Replaced it with the current `metrics.readers.pull.exporter.prometheus` configuration and set `without_type_suffix` / `without_units` so the metric names in the post remain accurate.

## Review Notes
- Verified the full Collector configuration and the retry/queue exporter snippet with `otel/opentelemetry-collector-contrib:latest validate`.
- The fan-out explanation is accurate: the Collector pipeline sends a copy of each data element to each exporter in the pipeline.
- The internal metric names are accurate with the updated Prometheus reader options.
