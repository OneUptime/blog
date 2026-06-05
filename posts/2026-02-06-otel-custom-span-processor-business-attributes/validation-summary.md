# Validation Summary: How to Create a Custom SpanProcessor That Enriches Spans with Business-Specific

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing SDK
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- Python
- Java
- Flask
- OTLP trace exporting

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Python SDK trace source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Java SDK documentation for custom SpanProcessor examples: https://opentelemetry.io/docs/languages/java/sdk/

## Issues Found
- The post said both `BatchSpanProcessor` and `SimpleSpanProcessor` handle batching and exporting. `SimpleSpanProcessor` exports ended spans immediately and does not batch them, so the wording was corrected.
- The Python processor docstring said it reads from external services during span creation. OpenTelemetry span processor callbacks run synchronously and should not block, so the wording was changed to local or cached clients and the wrap-up now warns not to block span creation.
- The Flask example created a new `BusinessAttributeProcessor` instance instead of using the same processor instance registered with the `TracerProvider`. The example now imports and uses the registered processor instance.
- The Java `SpanProcessor` example omitted current required interface methods `shutdown()` and `forceFlush()`, and omitted the imports needed by the snippet. These were added with successful `CompletableResultCode` return values.

## Review Notes
The examples intentionally use application-specific placeholders such as `FeatureFlagClient`, `PricingService`, `get_authenticated_user`, and `process_checkout`; these are acceptable for a tutorial but would need concrete implementations in a runnable sample application. For async Python web frameworks, thread-local context should be replaced with context-local storage.
