# Validation Summary: How to Fix 'Span Link Missing' Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python API and SDK
- Distributed tracing
- Span links
- W3C Trace Context
- OpenTelemetry Collector
- OTLP
- YAML
- Python
- curl

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python tracing API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Python propagation API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The message-processing example extracted non-standard `traceparent-trace-id` and `traceparent-span-id` headers. W3C Trace Context uses a single `traceparent` header plus optional `tracestate`, so the example now uses OpenTelemetry propagation extraction and builds a link from the extracted span context.
- The post stated that span links cannot be added after span creation and that `span.add_link()` does not exist. Current OpenTelemetry Python supports `Span.add_link`; the post now explains that creation-time links are preferred because head sampling decisions can only consider data present at span creation.
- The invalid-context example returned `Link(...)` without importing `Link`. The import was corrected, and the validation now uses `context.is_valid`.
- The exported JSON example used non-hex characters in the linked trace ID and span ID. Those IDs were corrected to valid hexadecimal strings.
- The Collector batching comment implied batch size must account for multiple links. The batch processor batches spans, metrics, or logs by record count; the comment now describes tuning batching for traffic volume.
- The post claimed most backends support querying spans by links. This is backend-specific, so the wording now says some backends support it and advises checking backend API documentation.
- The retry section said retries link to the original attempt, but the code linked to the previous attempt. The prose and docstring now match the code.

## Review Notes
The examples remain illustrative and assume application-specific helper objects such as `message`, `handle_message`, `split_data`, and `process_data` exist. Link attribute names such as `link.type` are custom attributes, not OpenTelemetry semantic convention requirements.
