# Validation Summary: How to Instrument Go's context.Context with OpenTelemetry for Proper Propagation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go context.Context
- OpenTelemetry Go API and SDK
- OpenTelemetry W3C Trace Context propagation
- OpenTelemetry W3C Baggage propagation
- OpenTelemetry Go HTTP instrumentation (`otelhttp`)
- Go `net/http` handlers and `ServeMux` path values

## Sources Consulted
- Go `context` package documentation: https://pkg.go.dev/context
- Go 1.22 release notes for enhanced `net/http.ServeMux` routing and `Request.PathValue`: https://go.dev/doc/go1.22
- OpenTelemetry Go Getting Started guide: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry Go `trace` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Go `propagation` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry Go `baggage` package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/baggage
- OpenTelemetry Go OTLP gRPC trace exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go `otelhttp` instrumentation documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp

## Issues Found
- Removed an unused `log` import from the tracing initialization snippet so the example compiles.
- Corrected the statement "Every span operation requires a context" to "Starting a span requires a context" because span methods such as `SetAttributes`, `AddEvent`, and `RecordError` operate on the span directly.
- Added missing `fmt` and `go.opentelemetry.io/otel/trace` imports to the HTTP handlers snippet so `fmt.Sprintf` and `trace.WithAttributes` resolve correctly.
- Clarified the `SpanFromContext` comment: `IsRecording()` checks whether telemetry should be added, not whether the span is non-nil or valid.
- Corrected the bad context example wording. Using the original context after `tracer.Start` makes the child span a sibling under the original parent, not necessarily a fully disconnected trace.
- Updated the baggage example to preserve existing baggage with `baggage.FromContext(ctx).SetMember(...)` instead of replacing it with a new baggage object.
- Replaced `baggage.NewMember` with `baggage.NewMemberRaw` for raw user and tenant values, matching current OpenTelemetry Go guidance that `NewMember` expects percent-encoded values.

## Review Notes
- The `/orders/{id}` example relies on Go 1.22 or newer `ServeMux` wildcard routing and `Request.PathValue`.
- `otlptracegrpc.WithInsecure()` is still available, but it disables transport security and is appropriate only for local or explicitly insecure collector connections.
- The examples use semconv `v1.21.0`; this is valid as an import path, but semantic convention import versions and recommended HTTP attribute names may evolve over time.
