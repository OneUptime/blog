# Validation Summary: How to Troubleshoot the OpenTelemetry Go SDK Silently Dropping Spans When

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Go SDK
- Go
- `sdktrace.TracerProvider`
- `BatchSpanProcessor` and `SimpleSpanProcessor`
- OTLP gRPC trace exporter
- Go HTTP server graceful shutdown
- OpenTelemetry SDK self-observability metrics

## Sources Consulted
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Go getting started documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry Go SDK trace package reference: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Go `batch_span_processor.go` source: https://github.com/open-telemetry/opentelemetry-go/blob/sdk/v1.44.0/sdk/trace/batch_span_processor.go
- OpenTelemetry SDK metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/otel/sdk-metrics/
- Go `net/http.Server.Shutdown` documentation: https://pkg.go.dev/net/http#Server.Shutdown

## Issues Found
- The post said the default span processor in OpenTelemetry Go is `BatchSpanProcessor`. The default `TracerProvider` configuration does not install a span processor by itself; `BatchSpanProcessor` is used when configured with `sdktrace.WithBatcher(exporter)`. Updated the wording to match the Go SDK API.
- The graceful shutdown example reused the same 15-second context for both HTTP server shutdown and tracer provider shutdown. If the server used most or all of that timeout, trace shutdown could immediately fail with a canceled/deadline-exceeded context. Updated the example to use a separate tracer shutdown timeout and to log `srv.Shutdown` errors.
- The verification section called the post-shutdown span a `NoopSpan` and implied that this confirms export success. The Go SDK guarantees methods are no-ops after `TracerProvider.Shutdown`; this confirms no new spans are accepted, not that previous exports succeeded. Updated the wording.
- The post referenced `otel.sdk.trace.spans_exported`, which is not the current SDK metric semantic convention. Updated it to current SDK metric names: `otel.sdk.processor.span.queue.size`, `otel.sdk.processor.span.processed`, and `otel.sdk.exporter.span.exported`.

## Review Notes
The code examples use current, non-deprecated OpenTelemetry Go APIs such as `sdktrace.WithBatcher`, `sdktrace.NewSimpleSpanProcessor`, and `TracerProvider.Shutdown`. `SimpleSpanProcessor` is correctly scoped to development, testing, debugging, or low-volume use because the official Go SDK documentation recommends `BatchSpanProcessor` for production.
