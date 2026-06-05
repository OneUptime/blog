# Validation Summary: How to Apply Exception Semantic Conventions for Error Recording

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry exception semantic conventions
- OpenTelemetry Python API
- OpenTelemetry Java API
- Python exception handling
- Java exception handling

## Sources Consulted
- OpenTelemetry semantic conventions for exceptions: https://opentelemetry.io/docs/specs/semconv/exceptions/
- OpenTelemetry semantic conventions for exceptions on spans: https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/
- OpenTelemetry trace exception specification: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java Span Javadoc: https://www.javadoc.io/doc/io.opentelemetry/opentelemetry-api/latest/io/opentelemetry/api/trace/Span.html

## Issues Found
- The post presented exception span events as the primary current convention without noting that OpenTelemetry now deprecates exception semantic conventions on spans in favor of exception logs. Updated the introduction and attribute section to clarify that span events are existing compatibility behavior.
- The post recommended recording exceptions whenever they are thrown, including handled exceptions. Current OpenTelemetry guidance no longer recommends recording handled, non-escaping exceptions as routine span exception events. Updated explanations, diagrams, best practices, and examples to focus span exception events on escaping failures.
- The Python examples manually recorded exceptions inside `start_as_current_span` blocks and then re-raised them. Because OpenTelemetry Python context managers record exceptions and set error status by default on uncaught exceptions, this could produce duplicate exception events. Added `record_exception=False` and `set_status_on_exception=False` where the examples manually record the exception.
- The Python `record_exception` example did not set `exception.escaped` for a re-raised exception. Updated the call to `span.record_exception(e, escaped=True)`.
- The Java example used `AttributeKey.booleanKey(...)` without importing `AttributeKey`. Added the missing import.
- The Java example started a span but did not make it current, which could break context propagation for nested instrumentation. Added `try (Scope scope = span.makeCurrent())` and the required `Scope` import.
- The Java example claimed to record `exception.escaped = true` for payment failures but called `span.recordException(e)` without additional attributes. Updated escaping exception recording to pass `Attributes.of(AttributeKey.booleanKey("exception.escaped"), true)`.
- The retry example recorded handled retry failures as exception events with `exception.escaped = false`. Updated the example to record handled retry attempts as custom `retry.failed` events and reserve the exception semantic convention for the final escaping failure.

## Review Notes
The post is now accurate for current OpenTelemetry guidance while still explaining span exception events for existing instrumentation. Future revisions could add a dedicated section on the newer exception log conventions, but that would be an expansion rather than a correctness fix.
