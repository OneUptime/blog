# Validation Summary: How to Configure Docker Compose Services to Export OTLP Traces to a Sidecar

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Docker Compose
- Docker health checks
- Python Flask instrumentation
- Node.js OpenTelemetry SDK

## Sources Consulted
- OpenTelemetry Collector Docker installation docs: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector troubleshooting docs: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector logging-to-debug exporter migration notice: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry OTLP exporter configuration docs: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python exporter docs: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry JavaScript zero-code instrumentation docs: https://opentelemetry.io/docs/zero-code/js/
- OpenTelemetry JavaScript instrumentation libraries docs: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JavaScript exporter docs: https://opentelemetry.io/docs/languages/js/exporters/
- Docker Compose startup order docs: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose legacy version docs: https://docs.docker.com/reference/compose-file/legacy-versions/

## Issues Found
- The Collector configuration used the removed `logging` exporter. Current Collector releases removed `logging` in favor of `debug`, so the example would fail with a current `otel/opentelemetry-collector-contrib` image. Replaced `logging` with `debug`, changed `loglevel: info` to `verbosity: normal`, and updated the pipeline exporter list.
- The Compose examples used `otel/opentelemetry-collector-contrib:latest`, which made the removed `logging` exporter issue more likely and is not a reproducible tutorial target. Pinned the image to `0.153.0`, matching the current official Collector Docker docs checked during review.
- The main Compose snippet included the obsolete top-level `version: "3.8"` key. Removed it to match the current Compose Specification guidance.
- The healthcheck example used `wget`, but the official Collector image does not include `wget`, `curl`, or a shell. Replaced the healthcheck command with the Collector's built-in `otelcol-contrib validate --config=/etc/otelcol-contrib/config.yaml` command and adjusted the surrounding explanation so it no longer claims the check proves the OTLP receiver is accepting traces.

## Review Notes
Verified the corrected Collector configuration with `otel/opentelemetry-collector-contrib:0.153.0 validate --config=/etc/otelcol-contrib/config.yaml`. The Python and Node.js examples use current OpenTelemetry package names and setup patterns. The healthcheck is now runnable with the official image, but it validates configuration rather than performing an HTTP readiness probe against the `health_check` extension; a future post could show a derived Collector image with an HTTP client if endpoint-level readiness is required.
