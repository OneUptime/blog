# Validation Summary: How to Fix 'Context Canceled' Errors in OpenTelemetry

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Go API and OTLP gRPC exporter
- OpenTelemetry Python API
- OpenTelemetry Collector exporter configuration
- Go `context` and `net/http`
- FastAPI `BackgroundTasks`

## Sources Consulted
- Go `net/http` request context documentation: https://pkg.go.dev/net/http#Request.Context
- Go `context` package documentation: https://pkg.go.dev/context
- OpenTelemetry Go trace API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Go OTLP gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/trace.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector exporter helper configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- FastAPI background tasks documentation: https://fastapi.tiangolo.com/tutorial/background-tasks/
- FastAPI `BackgroundTasks` reference: https://fastapi.tiangolo.com/reference/background/

## Issues Found
- The Go request-context example implied that `span.End()` itself may fail with `context canceled`. OpenTelemetry span `End` does not take a context and completes the span; the failure risk is background work that continues to use a canceled request context. Updated the comment to make that distinction.
- The Go detached background-context examples used `trace.ContextWithSpan` with the active span. Updated them to use `trace.ContextWithSpanContext(context.Background(), span.SpanContext())`, which preserves trace identity without copying the request cancellation signal.
- The Python fix imported `set_span_in_context` from `opentelemetry.trace.propagation`, which is not the current documented location, and the import was unused. Removed the incorrect unused import and an unused `contextvars` import.
- The async Python example imported `set_span_in_context` but did not use it. Removed the unused import.
- The Go debug-context snippet imported `time` but did not use it, which would not compile. Removed the import.
- The Go debug-context snippet said the watcher goroutine's stack trace would find the cancellation source. That stack trace only shows where the watcher runs after cancellation. Updated the comment to avoid overstating what it can diagnose.

## Review Notes
The post remains a high-level troubleshooting guide. The Go snippets are partial examples and assume surrounding imports, tracer setup, and helper functions. FastAPI `BackgroundTasks` is suitable for lightweight same-process background work; long-running or durable jobs should use a dedicated worker system.
