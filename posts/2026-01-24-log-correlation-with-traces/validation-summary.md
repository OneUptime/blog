# Validation Summary: How to Handle Log Correlation with Traces

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry logs
- Python logging
- Go `log/slog`
- OpenTelemetry Collector
- OTLP
- Distributed trace and log correlation

## Sources Consulted
- OpenTelemetry context propagation documentation: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python logs auto-instrumentation example: https://opentelemetry.io/docs/zero-code/python/logs-example/
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Go `trace` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry deployment resource semantic convention: https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/

## Issues Found
- The Python log filter and debug helper checked `span.is_recording()` before adding correlation IDs. That can drop valid span context for non-recording spans, while OpenTelemetry correlation is based on a valid `SpanContext` containing trace and span IDs. Changed both examples to read `span.get_span_context()` and check `ctx.is_valid`.
- The Go example used `otel.Tracer("my-service")` without configuring a tracer provider, so it would use the global no-op provider in a standalone application and would not reliably produce valid IDs. Added a minimal SDK `TracerProvider`, registered it globally, and shut it down on exit.
- The Collector example used the deprecated `deployment.environment` attribute. Changed it to the current semantic convention `deployment.environment.name`.
- The Collector example used `${BACKEND_TOKEN}` for environment variable expansion. Changed it to the documented `${env:BACKEND_TOKEN}` syntax.
- The Collector pipeline listed `batch` before `resource`. Changed the order to `resource, batch` so enrichment happens before batching/export.

## Review Notes
- Python code blocks were parsed successfully with `ast.parse`, and the local OpenTelemetry API exposes `trace.Status` and `trace.StatusCode`.
- Go is not installed in this review environment, so the Go example could not be compiled locally. The API usage was checked against official OpenTelemetry Go documentation.
- The OpenTelemetry Python logs APIs still use underscored modules such as `opentelemetry.sdk._logs` in current examples; this is common in the Python SDK, but logs-related APIs have historically had more churn than tracing APIs.
