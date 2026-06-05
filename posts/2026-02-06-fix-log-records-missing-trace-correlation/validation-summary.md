# Validation Summary: How to Fix Log Records Missing Trace Correlation Because the Logging Framework

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry trace-log correlation
- OpenTelemetry Python logs and traces
- Python standard logging
- OpenTelemetry Java agent
- SLF4J / Logback MDC
- OpenTelemetry JavaScript API
- Winston
- Pino
- OpenTelemetry Go API
- zap
- Kubernetes `kubectl logs`

## Sources Consulted
- OpenTelemetry specification: Trace Context in non-OTLP Log Formats: https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/
- OpenTelemetry specification: Trace API and SpanContext IDs: https://opentelemetry.io/docs/specs/otel/trace/api
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python `LoggingHandler` API docs: https://opentelemetry-python.readthedocs.io/en/latest/sdk/_logs.html
- OpenTelemetry Python OTLP log exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Java instrumentation Logback MDC appender docs: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/logback/logback-mdc-1.0/library/README.md
- OpenTelemetry Java agent docs: https://opentelemetry.io/docs/zero-code/java/agent/
- OpenTelemetry Java Spring starter instrumentation config showing Logback MDC property: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/out-of-the-box-instrumentation/
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Go getting started docs: https://opentelemetry.io/docs/languages/go/getting-started/

## Issues Found
- The Python example configured only the OpenTelemetry log provider, then created a span with `trace.get_tracer(...)`. Without a configured trace provider, the span would be non-recording and would not provide real trace IDs. I added a minimal OpenTelemetry trace provider and OTLP span exporter setup before creating the tracer.
- The Python console formatter checked `span.is_recording()` before adding IDs. A valid non-recording span context can still carry trace context, while an invalid context is the actual condition to guard against. I changed the formatter to use `ctx.is_valid`.
- The Java Logback snippet used `io.opentelemetry.instrumentation.logback.appender.v1_0.OpenTelemetryAppender`, which is the Logback appender for emitting OpenTelemetry logs, not the MDC appender that injects `trace_id` and `span_id` for `%X{...}` patterns. I changed it to the documented `io.opentelemetry.instrumentation.logback.mdc.v1_0.OpenTelemetryAppender` and wrapped the console appender as shown in the official documentation.
- The Go zap snippet used `context.Context` but did not import the standard library `context` package. I added the missing import so the snippet compiles.

## Review Notes
The article is technically relevant and the corrected examples align with current OpenTelemetry documentation. The Java section still assumes the required Logback MDC instrumentation dependency or Java agent is present; that is acceptable for a focused troubleshooting post, but a future revision could show the Maven or Gradle dependency explicitly.
