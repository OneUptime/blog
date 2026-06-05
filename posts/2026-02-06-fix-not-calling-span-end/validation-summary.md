# Validation Summary: How to Fix the Mistake of Not Calling Span.End()

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry JavaScript API
- OpenTelemetry Java API
- OpenTelemetry Python API
- Span processors and exporters
- ESLint custom rules

## Sources Consulted
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- ESLint rules reference: https://eslint.org/docs/latest/rules/

## Issues Found
- The post said the span processor never receives the span and implied `span.end()` simply passes the span to the processor. The OpenTelemetry SDK specification defines both start and end processor hooks; the export path depends on the ended-span hook. Updated the text to say `span.end()` triggers the `SpanProcessor` end hook and that the processor never receives the completed span for export.
- The post used absolute wording that missing `end()` is "almost always" the reason for incomplete traces. Other causes, such as sampling and configuration, can also produce missing spans. Changed this to "often" while preserving the point of the article.
- The summary said every `startSpan()` needs `span.end()`. The OpenTelemetry API specification notes non-recording spans are no-op spans, so the more accurate rule is every recording/manual span should be ended. Updated the wording to "Every recording `startSpan()` needs a `span.end()`."
- The ESLint section said there is no off-the-shelf rule for this exact case. I narrowed that claim to "no standard ESLint core rule" because project-specific or third-party rules may exist.

## Review Notes
The JavaScript, Java, and Python examples use current OpenTelemetry APIs. Java `Scope` management with try-with-resources plus `span.end()` in `finally` matches the Java documentation. Python `start_as_current_span` correctly ends spans when the context manager exits.
