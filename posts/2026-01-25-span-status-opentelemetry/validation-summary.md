# Validation Summary: How to Implement Span Status in OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry span status
- OpenTelemetry JavaScript API
- OpenTelemetry Python API
- OpenTelemetry semantic conventions for HTTP, database, and messaging spans
- JavaScript
- Python

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry recording errors semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/
- OpenTelemetry exception recording specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry JavaScript Span API documentation: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/

## Issues Found
- The status transition diagram incorrectly said `ERROR` cannot transition to `OK`. OpenTelemetry defines status precedence as `OK > ERROR > UNSET`, with `OK` considered final, so I changed the diagram to show that `ERROR` can be overridden by explicit `OK` and later changes after `OK` are ignored.
- The HTTP examples used the outdated `http.status_code` attribute. Current HTTP semantic conventions use `http.response.status_code`, so I updated the code and explanatory comment.
- The HTTP status mapping section described the 5xx-only rule as applying to all HTTP spans. Current OpenTelemetry guidance distinguishes server and client spans: 4xx server spans are left unset by default, while 4xx client spans should generally be `ERROR` unless application context says otherwise. I updated the wording and best-practice summary.
- The database example used the outdated `db.statement` attribute. Current database semantic conventions use `db.query.text`, so I updated the example.
- The messaging examples used the outdated `messaging.destination` attribute. Current messaging conventions use `messaging.destination.name`, so I updated both examples.
- The `consumeMessage` JavaScript example referenced `message` without defining it. I added `message` to the function parameters.
- The error-handling guidance said to always combine `setStatus(ERROR)` with `recordException()`. Since `recordException()` applies when an exception caused the error, I narrowed the wording to exception-caused errors.
- The best-practice item "Always set ERROR on exceptions" was too broad for handled exceptions that do not make the operation fail. I changed it to apply to exceptions that make the operation fail.

## Review Notes
The examples remain illustrative and omit full tracer provider/exporter setup, channel initialization, and helper implementations such as `doOrderProcessing`, `sanitize_query`, and `categorizeError`. That is acceptable for a span status guide. Some custom attributes such as `batch.*`, `payment.*`, and `db.rows_returned` are not OpenTelemetry semantic convention attributes, but they are clearly domain-specific examples and are technically valid custom span attributes.
