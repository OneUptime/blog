# Validation Summary: How to Inject Trace IDs and Span IDs into Structured Logs for Bidirectional

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry trace-log correlation
- OpenTelemetry Python logging instrumentation
- Java SLF4J, Logback, MDC, and OpenTelemetry Java agent
- Node.js OpenTelemetry API and Pino
- Go OpenTelemetry API and `log/slog`

## Sources Consulted
- OpenTelemetry Python Contrib logging instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- OpenTelemetry Java instrumentation Logger MDC auto-instrumentation: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/docs/logger-mdc-instrumentation.md
- OpenTelemetry Java agent configuration: https://opentelemetry.io/docs/zero-code/java/agent/configuration/
- OpenTelemetry Java agent supported libraries: https://opentelemetry.io/docs/zero-code/java/agent/supported-libraries/
- Logstash Logback Encoder documentation: https://github.com/logfellow/logstash-logback-encoder
- Pino API documentation: https://github.com/pinojs/pino/blob/main/docs/api.md
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Go trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- Go `log/slog` package documentation: https://pkg.go.dev/log/slog

## Issues Found
- The Python section said the SDK provides a log handler for this example. The reviewed code uses `LoggingInstrumentor` to inject fields into standard library `LogRecord` objects, so the wording was changed to describe Python logging instrumentation.
- The Python JSON formatter referenced `otelTraceFlagss`, which is misspelled and is not one of the documented injected fields. It was changed to the documented `otelTraceSampled` field and emitted as `trace_sampled`.
- The Java agent configuration example used an invalid nested YAML shape and unsupported MDC key settings. It was changed to a valid Java agent properties-file setting: `otel.instrumentation.logback-mdc.enabled=true`.
- The Go `slog` example emitted `trace_id` and `span_id` but not `trace_flags`, while the rest of the post discusses trace flags. It now adds `trace_flags` from the span context.

## Review Notes
The examples are intentionally minimal. In a real application, ensure the OpenTelemetry SDK or JavaScript context manager is initialized before relying on current-span lookups, and pass request contexts to Go `slog` methods such as `InfoContext` so the handler can read the span from `context.Context`.
