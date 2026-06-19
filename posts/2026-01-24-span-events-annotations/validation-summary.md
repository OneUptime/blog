# Validation Summary: How to Handle Span Events and Annotations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- Span events and exception events
- OpenTelemetry Python API
- OpenTelemetry JavaScript API
- OpenTelemetry Go API
- OpenTelemetry semantic conventions
- Mermaid diagrams

## Sources Consulted
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry exception recording specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript Span API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry Go trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry URL semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/url/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry span events deprecation notice: https://opentelemetry.io/blog/2026/deprecating-span-events/

## Issues Found
- The Node.js example used numeric status code `2` directly. Changed it to `SpanStatusCode.ERROR` and imported `SpanStatusCode`, matching the public JavaScript API.
- The Go example assigned `validationResult` but never used it, which would cause a Go compile error. Changed it to `_` because the sample only uses the returned error.
- The Python exception example used `Status` and `StatusCode` without importing them. Added the missing import.
- The Python exception example represented `exception.escaped` as a manual event attribute. Changed it to the public `record_exception(..., escaped=...)` argument.
- The JavaScript exception example passed attributes as the second argument to `recordException`, but the JavaScript API accepts only an exception and optional timestamp. Moved the contextual data to span attributes and called `recordException(error)` separately.
- The semantic convention example used deprecated or old attribute names including `http.method`, `http.url`, `db.system`, `db.operation`, `db.statement`, and `db.rows_affected`. Updated them to current conventions such as `http.request.method`, `url.path`, `db.system.name`, `db.operation.name`, `db.query.text`, and `db.response.returned_rows`.
- The filtering exporter example mutated private span internals with `span._events`, which is not supported by the public Python SDK exporter API. Replaced it with a public-API helper that samples before calling `span.add_event`.

## Review Notes
OpenTelemetry announced in 2026 that span event APIs are expected to be deprecated in favor of log-based events for new instrumentation. Existing span events remain valid in the trace data model, but future updates to this post should consider adding guidance for the Logs API migration path.
