# Validation Summary: How to Implement Contract Testing for OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing and spans
- OpenTelemetry semantic conventions for HTTP and database spans
- Python OpenTelemetry SDK
- JavaScript/TypeScript OpenTelemetry SDK
- YAML contract definitions
- GitHub Actions CI
- Python unittest and pytest

## Sources Consulted
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Python InMemorySpanExporter source: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py
- OpenTelemetry JavaScript ReadableSpan API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-trace-base.ReadableSpan.html

## Issues Found
- The post used the older HTTP attribute name `http.status_code` in the introductory example. Changed it to the current stable semantic convention `http.response.status_code`.
- The database contract used older experimental database semantic convention attributes: `db.system`, `db.name`, `db.operation`, and `db.statement`. Updated them to the current stable attributes `db.system.name`, `db.namespace`, `db.operation.name`, and `db.query.text`.
- The database span name pattern required whitespace after the operation, which would incorrectly reject a valid low-cardinality span name such as `SELECT`. Updated the pattern to allow either whitespace or the end of the string after the operation.
- The Python validator said optional attributes should be type-checked when present, but it only validated required attributes. Added optional-attribute validation.
- The Python validator could raise a runtime error when range checks were performed after a type mismatch. Refactored attribute validation so type errors are reported before range, allowed-value, or length checks run.
- The Python validator used `isinstance(value, int)`, which accepts booleans because `bool` subclasses `int` in Python. Changed the check to require the exact expected scalar type.
- The Python test imported `InMemorySpanExporter` from `opentelemetry.sdk.trace.export.in_memory`, which is not the current SDK module path. Updated it to `opentelemetry.sdk.trace.export.in_memory_span_exporter`.
- The TypeScript example imported `SpanStatusCode` but did not use it. Removed the unused import to avoid failures in strict TypeScript builds.

## Review Notes
- The examples remain illustrative and depend on application-specific helper functions such as `simulate_get_request`, `fetch_users_from_db`, and `handleTestRequest`.
- Current OpenTelemetry database semantic conventions include a migration period where some instrumentations may still emit older experimental attributes unless configured for stable database conventions.
