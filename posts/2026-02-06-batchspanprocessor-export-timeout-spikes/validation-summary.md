# Validation Summary: How to Configure BatchSpanProcessor Export Timeout to Prevent Data Loss During

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry BatchSpanProcessor
- OpenTelemetry OTLP exporters
- Java OpenTelemetry SDK
- Python OpenTelemetry SDK
- Go OpenTelemetry SDK
- Node.js OpenTelemetry SDK
- OpenTelemetry environment variables

## Sources Consulted
- OpenTelemetry environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Java SDK configuration: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Java SDK/exporter documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java `BatchSpanProcessorBuilder` Javadocs: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-trace/latest/io/opentelemetry/sdk/trace/export/BatchSpanProcessorBuilder.html
- OpenTelemetry Java `OtlpGrpcSpanExporterBuilder` Javadocs: https://javadoc.io/doc/io.opentelemetry/opentelemetry-exporter-otlp/latest/io/opentelemetry/exporter/otlp/trace/OtlpGrpcSpanExporterBuilder.html
- OpenTelemetry Python SDK `BatchSpanProcessor` source documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/trace/export.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Go SDK trace package: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Go OTLP gRPC trace exporter package: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry JS BatchSpanProcessor configuration docs: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.BatchSpanProcessorBrowserConfig.html

## Issues Found
- The Python example implied that `export_timeout_millis` actively controls the BatchSpanProcessor export timeout. Current Python SDK documentation says that option is accepted but not used, with no way currently to pass the timeout to export. I added a caveat in the Python code and timeout explanation, while preserving the example shape.
- The "Two Levels of Timeout" section stated that there are always two effective timeouts. I qualified this to SDKs that enforce both settings and added the Python caveat.
- The queue-sizing section claimed the example configuration could survive a 4-minute backend outage without dropping spans. BatchSpanProcessor queues can buffer new spans while exports are blocked, but failed export batches are not retained indefinitely by the SDK. I changed the text to describe the calculation as a rough upper bound for queued new spans, not a lossless outage guarantee.
- The environment variable snippet could be read as universally effective for Python. I added a note that Python currently accepts but does not enforce `OTEL_BSP_EXPORT_TIMEOUT`.

## Review Notes
The Java and Go code examples use current, non-deprecated APIs for configuring OTLP exporter timeouts and BatchSpanProcessor options. The default values for BatchSpanProcessor queue size, batch size, schedule delay, and export timeout match the OpenTelemetry specification. The recommended timeout formulas remain heuristic guidance rather than specification-backed rules.
