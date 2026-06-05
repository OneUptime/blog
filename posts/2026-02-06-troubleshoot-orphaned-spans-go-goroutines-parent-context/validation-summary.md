# Validation Summary: How to Troubleshoot Orphaned Spans in Go When Goroutines Do Not Receive the

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- Goroutines
- `context.Context`
- OpenTelemetry Go tracing API
- OpenTelemetry Go SDK trace testing utilities

## Sources Consulted
- Go `context` package documentation: https://pkg.go.dev/context
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Go getting started documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry Go SDK trace package: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Go SDK `tracetest` package: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace/tracetest

## Issues Found
- The test example called an undefined `convertSpans(spans)` helper after `exporter.GetSpans()`. The official `tracetest` API returns `SpanStubs`, which provides `Snapshots()` to return `[]sdktrace.ReadOnlySpan`, so the example now calls `spans.Snapshots()`.
- The comment saying `context.Background()` was implicit was inaccurate in the shown code because `context.Background()` was passed explicitly. The comment now says the root span is created because `context.Background()` has no parent span.
- The production heuristic stated that single-span traces are a strong signal that context propagation is broken. Single-span traces can also be legitimate or caused by sampling/export behavior, so the wording now describes unexpected clusters of single-span traces as a useful signal rather than a definitive indicator.

## Review Notes
The core explanation is correct: OpenTelemetry Go stores the active span in `context.Context`, `tracer.Start(ctx, ...)` uses that context to determine the parent span, and Go contexts may be safely passed to functions running in different goroutines. The examples are partial snippets and assume surrounding definitions such as `tracer`, `Order`, `validateInventory`, and `chargePayment`.
