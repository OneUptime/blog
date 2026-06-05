# Validation Summary: How to Build a Custom Propagator for Legacy Trace Context Formats

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry context propagation
- OpenTelemetry Python API
- OpenTelemetry Java API
- W3C Trace Context
- Custom text map propagators

## Sources Consulted
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python `CompositePropagator` documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/propagators.composite.html
- OpenTelemetry Python `TextMapPropagator` documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/propagators/textmap.html
- OpenTelemetry Python `SpanContext` documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Java `TextMapPropagator` Javadocs: https://javadoc.io/static/io.opentelemetry/opentelemetry-context/1.20.1/io/opentelemetry/context/propagation/TextMapPropagator.html
- OpenTelemetry Java `SpanContext` Javadocs: https://javadoc.io/static/io.opentelemetry/opentelemetry-api/1.47.0/io/opentelemetry/api/trace/SpanContext.html
- OpenTelemetry Java `Span` Javadocs: https://www.javadoc.io/static/io.opentelemetry/opentelemetry-api/1.25.0/io/opentelemetry/api/trace/Span.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The legacy span ID example used `789xyz`, which is not a valid hexadecimal span ID. Changed it to `789abc` so the example matches the code's hex parsing and OpenTelemetry/W3C ID requirements.
- The Python example imported `TraceContextTextMapPropagator` from `opentelemetry.propagators.textmap`, which is not the current import path. Changed it to `opentelemetry.trace.propagation.tracecontext`.
- The Python example imported `Context` twice and imported unused `List`. Removed the duplicate and unused imports.
- The legacy format included `X-MyCompany-Baggage`, but neither the Python nor Java custom propagator implemented that legacy baggage header. Removed the unsupported header and corresponding Python field so the documented legacy format matches the implementation.
- The Python comment said non-hex characters were removed, but the code only removed dashes and surrounding whitespace before parsing. Updated the comment to match the behavior.
- The composite propagator explanation implied simple fallback behavior. OpenTelemetry Python runs propagators in configured order, and later extractors can override earlier values for the same context key. Updated the comments and configured the legacy propagator before W3C Trace Context so W3C wins when both are present.
- The Python sampling check handled lowercase `true` only. Made it case-insensitive for `true`.
- The Java example omitted imports and a `padLeft` helper, so it would not compile as shown. Added the required imports and helper method.
- The Java example inserted the extracted span with `context.with(Span.wrap(sc))`. Updated it to `Span.wrap(sc).storeInContext(context)`, which matches the OpenTelemetry Java Span API.
- The Java example now checks `sc.isValid()` after creating the remote parent context so malformed IDs leave the incoming context unchanged.
- The Java uppercase conversion used the default locale. Updated it to `Locale.ROOT`.

## Review Notes
- Python snippets were executed successfully against the current `opentelemetry-api` package installed into a temporary `/tmp` target directory.
- Java was reviewed against official Javadocs because `java` and `javac` are not installed in this environment.
