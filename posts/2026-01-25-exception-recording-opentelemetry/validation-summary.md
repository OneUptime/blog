# Validation Summary: How to Implement Exception Recording in OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry JavaScript API
- OpenTelemetry Python API
- Node.js
- Express
- Python
- Flask / Werkzeug error handling
- SQL-style trace backend querying

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript Span API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry trace exception specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry exception attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/exception/
- Flask error handling documentation: https://flask.palletsprojects.com/en/stable/errorhandling/

## Issues Found
- JavaScript examples passed custom attributes as the second argument to `span.recordException()`. The current OpenTelemetry JavaScript Span API defines that argument as an optional timestamp, not attributes. Updated the examples to call `span.recordException(error)` and then add contextual data with `span.setAttributes(...)`.
- The "Exception Event Attributes" JavaScript snippet also implied custom attributes could be passed to `recordException()`. Updated it to add custom context as span attributes instead.
- The custom Python `traced_operation` context manager manually recorded and set status for exceptions while `tracer.start_as_current_span()` defaults to `record_exception=True` and `set_status_on_exception=True`, which could duplicate exception events. Updated the span creation call to disable those defaults inside this custom handler.
- The Flask error handler defined `status_code` only inside the `span.is_recording()` block and used `status_code` later, which could raise `UnboundLocalError` if the span was not recording. It also checked `status_code` instead of Werkzeug `HTTPException.code` for standard Flask HTTP exceptions. Updated the handler to compute `status_code` before span recording and use `HTTPException.code` when applicable.

## Review Notes
- The SQL queries are backend-specific examples; real column names vary by tracing backend and storage schema.
- The examples are illustrative and assume surrounding application functions, tracer setup, exporters, and framework instrumentation are configured elsewhere.
