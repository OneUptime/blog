# Validation Summary: How to Write Integration Tests That Verify Trace Data with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing and context propagation
- OpenTelemetry Collector
- OTLP/gRPC and OTLP/HTTP JSON
- Docker Compose
- Node.js HTTP server
- Python pytest and requests
- GitHub Actions CI

## Sources Consulted
- OpenTelemetry OTLP Specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP Exporter Configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry Collector Configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector file exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/fileexporter
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/otlphttpexporter
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- Docker Compose file reference, version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- pytest-timeout documentation: https://pypi.org/project/pytest-timeout/

## Issues Found
- Replaced the deprecated/removed Collector `logging` exporter example with the current `debug` exporter and `verbosity: detailed`, matching current Collector documentation.
- Updated the Collector file exporter path to use a writable mounted directory, because the official `otel/opentelemetry-collector-contrib` image does not provide a generally writable filesystem by default.
- Added an `otlp_http/test` exporter configured with `encoding: json` and `compression: none` so the in-memory Node.js backend actually receives OTLP/HTTP JSON at `/v1/traces`.
- Updated the Docker Compose example to remove the obsolete top-level `version` field, mount the Collector config at `/etc/otelcol-contrib/config.yaml`, mount the writable file exporter directory, and start the `trace-server` service that the tests query.
- Added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` to the service examples so the `http://collector:4317` endpoint is unambiguous for OTLP/gRPC export.
- Fixed the Node.js OTLP JSON parsing example to preserve span attributes as OTLP key-value arrays and include resource attributes, where `service.name` is stored.
- Fixed the Python service-name assertions to query the test backend by resource `service.name` instead of searching raw span JSON, because `service.name` is a resource attribute, not a span field.
- Added missing `X-Trace-Id` assertions in tests that used the trace ID for polling.

## Review Notes
The examples remain illustrative and assume the instrumented services add an `X-Trace-Id` response header for test correlation. That header is not part of W3C Trace Context or OpenTelemetry by default, so services must implement it explicitly.
