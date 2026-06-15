# Validation Summary: How to Implement Span Events in OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing API and span events
- OpenTelemetry JavaScript / Node.js API
- OpenTelemetry Python API
- OpenTelemetry Go API
- OpenTelemetry Java API
- Exception recording and span status

## Sources Consulted
- OpenTelemetry Tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry JavaScript manual instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python manual instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Go manual instrumentation docs: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Java API docs: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry semantic conventions for recording errors: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/
- OpenTelemetry semantic conventions for exceptions on spans: https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/
- OpenTelemetry span events deprecation guidance: https://opentelemetry.io/blog/2026/deprecating-span-events/

## Issues Found
- The post presented span events as the current default recommendation for new custom event and exception telemetry. OpenTelemetry guidance is moving new event and exception recording toward the Logs API, while preserving existing span-event behavior. Added a short caveat in the introduction.
- JavaScript examples used the numeric status code `2` for errors. Replaced it with `SpanStatusCode.ERROR`, matching the documented JavaScript API and avoiding brittle magic numbers.
- Several JavaScript examples created spans with `tracer.startActiveSpan()` but did not end them. Wrapped the async work in `try` / `finally` blocks and added `span.end()` so spans are closed on both success and failure.
- The Java example caught `Exception` and rethrew it from a method that did not declare a checked exception. Added `throws Exception` to make the example compile.

## Review Notes
The remaining examples are illustrative and depend on application-specific functions such as `validateOrder`, `processPayment`, `cache`, and domain model classes. Those placeholders are reasonable for a blog tutorial. The exception-on-span semantic convention is deprecated in favor of exceptions in logs, but existing span exception events remain supported for compatibility.
