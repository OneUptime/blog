# Validation Summary: How to Use OpenTelemetry Span Status Correctly for Accurate Error Classification

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry span status codes
- OpenTelemetry semantic conventions for HTTP, gRPC, database spans, errors, and exceptions
- OpenTelemetry Python tracing API
- Prometheus-style metrics queries

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Recording Errors semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry gRPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python Span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html

## Issues Found
- The post originally described `UNSET` as ambiguous rather than the normal default for operations that complete without errors in instrumentation libraries. Updated the wording to match the OpenTelemetry Trace API and Recording Errors guidance.
- The post recommended setting `OK` for ordinary successful operations and business outcomes. Updated examples and the decision helper to leave status `UNSET` by default, while keeping `OK` as an explicit application-level override when needed.
- The HTTP examples used the older `http.status_code` attribute name. Updated it to the current semantic convention attribute, `http.response.status_code`.
- The HTTP 4xx guidance was too broad because OpenTelemetry treats client and server spans differently. Scoped the example to HTTP server 4xx responses.
- The HTTP 5xx helper duplicated the HTTP status code in the span status description. Removed the duplicate description and added `error.type` for the error classification.
- The gRPC mapping was incomplete and used `OK` for status code 0. Updated it for gRPC server spans so only `UNKNOWN`, `DEADLINE_EXCEEDED`, `UNIMPLEMENTED`, `INTERNAL`, `UNAVAILABLE`, and `DATA_LOSS` map to `ERROR`; all other canonical gRPC server status codes shown map to `UNSET`.
- The Prometheus example implied a universal metric and label name. Added a caveat that exact metric and label names depend on the backend or span-to-metrics processor.

## Review Notes
The Python snippets are illustrative and depend on surrounding application objects such as `tracer`, `db`, `gateway`, and Flask imports. All Python code blocks were checked with `python3` AST parsing for syntax validity.
