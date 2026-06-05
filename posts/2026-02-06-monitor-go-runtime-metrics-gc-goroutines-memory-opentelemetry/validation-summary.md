# Validation Summary: How to Monitor Go Runtime Metrics (GC, Goroutines, Memory) with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- OpenTelemetry Go SDK metrics
- OpenTelemetry Go contrib runtime instrumentation
- OTLP metrics over gRPC
- Go runtime memory, goroutine, scheduler, and garbage collection metrics

## Sources Consulted
- OpenTelemetry Go contrib runtime instrumentation package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/runtime
- OpenTelemetry Go metric API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Go SDK metric package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- OpenTelemetry semantic conventions for Go runtime metrics: https://opentelemetry.io/docs/specs/semconv/runtime/go-metrics/
- Go runtime package documentation: https://pkg.go.dev/runtime

## Issues Found
- The introduction stated that runtime instrumentation is built into the Go SDK. Updated it to identify the OpenTelemetry Go contrib runtime instrumentation package, which is where `go.opentelemetry.io/contrib/instrumentation/runtime` lives.
- The setup code discussed scheduler metrics but did not register the runtime producer required for scheduler histograms. Added `metric.WithProducer(runtime.NewProducer())` to the periodic reader.
- The setup comment said automatic instrumentation captures GC, memory, and goroutine metrics. Updated it to memory, goroutine, and scheduler metrics because current `runtime.Start` emits `go.memory.*`, `go.goroutine.count`, `go.processor.limit`, and `go.config.gogc`; GC count and pause metrics are not part of the default `Start` metric list.
- The key metric names used deprecated `process.runtime.go.*` names. Replaced them with current OpenTelemetry Go runtime metric names such as `go.memory.used`, `go.memory.allocated`, `go.memory.allocations`, `go.goroutine.count`, `go.memory.gc.goal`, and `go.schedule.duration`.
- The custom runtime metrics snippet imported `time` without using it. Removed the unused import.
- The GC monitor recorded only one elapsed interval when multiple GC cycles occurred between calls. Updated it to initialize from current `runtime.MemStats` values and use the `PauseEnd` ring buffer to record intervals for each observed GC cycle.
- The memory leak detector recorded heap deltas into an `Int64Counter`, which can become negative when heap usage drops. Changed the allocation-rate counter to use positive deltas from `runtime.MemStats.TotalAlloc`, which is cumulative, while keeping heap growth rate based on `HeapAlloc`.

## Review Notes
The code examples were checked against current official documentation, but local compilation could not be run because the `go` command is not installed in this workspace.
