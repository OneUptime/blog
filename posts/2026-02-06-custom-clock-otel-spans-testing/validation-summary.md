# Validation Summary: How to Build a Custom Clock for OpenTelemetry Spans in Unit Test

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry Java SDK
- Python unit testing with pytest
- Span timestamps and in-memory span exporters

## Sources Consulted
- OpenTelemetry Python SDK trace source documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Python SDK trace export documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/sdk/trace/export.html
- OpenTelemetry Java SDK documentation: https://opentelemetry.io/docs/languages/java/sdk/
- OpenTelemetry Java `Clock` Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-common/latest/io/opentelemetry/sdk/common/Clock.html
- OpenTelemetry Java `SdkTracerProviderBuilder.setClock` Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-trace/latest/io/opentelemetry/sdk/trace/SdkTracerProviderBuilder.html
- OpenTelemetry Java SDK testing utilities Javadoc: https://javadoc.io/doc/io.opentelemetry/opentelemetry-sdk-testing/latest/

## Issues Found
- The Python custom `SpanProcessor` example relied on private `_start_time` and `_end_time` fields. Current OpenTelemetry Python exposes public `start_time` and `end_time` arguments on span start/end, while `SpanProcessor.on_end` receives a `ReadableSpan`. The post now uses a helper that passes fake-clock timestamps through `tracer.start_as_current_span(..., start_time=...)` and `span.end(end_time=...)`.
- The Python `InMemorySpanExporter` import path was outdated. The post now imports it from `opentelemetry.sdk.trace.export.in_memory_span_exporter`, which works with the current `opentelemetry-sdk` package.
- The Python fixture used the global tracer provider, which can cause test interference because the global provider is not meant to be reset per test. The examples now use `provider.get_tracer("test")` directly.
- The Java section hand-rolled a clock even though the OpenTelemetry Java SDK testing artifact provides `io.opentelemetry.sdk.testing.time.TestClock`. The Java example now uses `TestClock.create()` and `clock.advance(Duration.ofMillis(...))`.

## Review Notes
- The corrected Python example was run against the current `opentelemetry-sdk` package and produced the expected exact durations for the validation, payment, and parent spans.
- The Java API names were checked against the current Maven-published `opentelemetry-sdk-testing` artifact and official Java SDK documentation.
