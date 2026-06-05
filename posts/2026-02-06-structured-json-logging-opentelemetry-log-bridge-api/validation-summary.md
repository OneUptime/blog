# Validation Summary: How to Use Structured JSON Logging with OpenTelemetry Log Bridge API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Logs and Log Bridge API
- OpenTelemetry Python SDK
- OpenTelemetry Python logging instrumentation
- Python standard library logging
- OTLP gRPC exporters
- OpenTelemetry Collector and Collector Contrib
- Flask

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK logging handler source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/_logs/_internal.html
- OpenTelemetry Python Contrib logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry Logs specification and logging approach: https://opentelemetry.io/docs/specs/otel/logs/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector component listings for processors and exporters: https://opentelemetry.io/docs/collector/components/processor/ and https://opentelemetry.io/docs/collector/components/exporter/

## Issues Found
- The setup snippet used `opentelemetry.sdk._logs.LoggingHandler`, which current OpenTelemetry Python Contrib documentation identifies as deprecated. Updated the package install command to include `opentelemetry-instrumentation-logging`, set the OTel logger provider globally with `set_logger_provider`, and used `LoggingInstrumentor().instrument(log_handler_level=logging.INFO)` to install the replacement bridge handler.
- The Collector section said the config sent logs to both the OTLP backend and a local file, but the logs pipeline only listed `exporters: [otlp]`. Updated it to `exporters: [otlp, file]`.
- The Collector config used `resourcedetection`, which is not in the core Collector distribution. Updated the prose to call it a Collector Contrib config.

## Review Notes
- Local checks: installed the current OpenTelemetry packages into `/tmp/otel-review-pkg` with `pip --target`, inspected current API signatures, ran a setup smoke test that created the tracer and installed the logging handler, parsed all Python/YAML/JSON snippets, and validated `validation.json` with `jq`.
- The JSON log example is illustrative rather than an exact OTLP file exporter payload shape, which is acceptable because the post says it will look "something like this."
