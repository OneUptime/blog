# Validation Summary: How to Monitor Payment Card Tokenization and Detokenization Service Performance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP gRPC exporters
- Payment card tokenization and detokenization
- PCI DSS/tokenization security guidance
- HSM dependency monitoring

## Sources Consulted
- OpenTelemetry Python documentation: https://opentelemetry.io/docs/languages/python/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- PCI Security Standards Council Tokenization Product Security Guidelines: https://www.pcisecuritystandards.org/documents/Tokenization_Product_Security_Guidelines.pdf

## Issues Found
- The setup snippet imported and instantiated `BatchSpanExporter`, which is not the documented OpenTelemetry Python batching API. Changed it to `BatchSpanProcessor`, matching the official OTLP exporter examples.
- The tracing snippet used plain deterministic SHA-256 hashes of PANs/tokens as telemetry attributes and cache/audit identifiers. Replaced those with keyed HMAC-based correlation identifiers so the example does not imply that an unkeyed PAN hash is safe for telemetry correlation.
- The detokenization code block began with an indented method outside a class, making the standalone Python snippet syntactically invalid. Added a minimal `TokenizationService` class context around the method.
- The unauthorized detokenization branch used `trace.StatusCode.ERROR` directly. Updated the example to import `Status` and `StatusCode` and call `span.set_status(Status(StatusCode.ERROR, ...))`, matching the OpenTelemetry Python documentation pattern.
- The conclusion described traces as the audit trail. Adjusted the wording to make dedicated audit logs the audit system of record, with trace data as supporting operational evidence.

## Review Notes
All Python snippets now pass syntax parsing. The examples still use placeholder application functions and dependencies such as `generate_format_preserving_token`, `check_detokenize_authorization`, `record_detokenize_audit_log`, HSM client methods, and token-store/cache methods; those are acceptable for this tutorial because the post focuses on OpenTelemetry instrumentation rather than full tokenization implementation.
