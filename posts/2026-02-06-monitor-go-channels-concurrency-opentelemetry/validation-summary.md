# Validation Summary: How to Monitor Go Channels and Concurrency Patterns with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Goroutines
- Channels
- Worker pools
- Fan-out/fan-in concurrency patterns
- Pipeline concurrency patterns
- OpenTelemetry Go tracing
- OpenTelemetry Go metrics
- OTLP gRPC exporters
- Go runtime metrics

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Go metric API package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry OTLP trace gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.40.0
- OpenTelemetry Go runtime metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/runtime/go-metrics/
- Go context package documentation: https://pkg.go.dev/context
- Go language specification for channel receive and close behavior: https://go.dev/ref/spec

## Issues Found
- The setup snippet imported `log` without using it. Removed the unused import so the snippet is syntactically correct.
- The setup snippet used older semantic convention key constants from `semconv/v1.21.0`. Updated it to `semconv/v1.40.0` and the current `semconv.ServiceName` / `semconv.ServiceVersion` helpers.
- The concurrency challenges section said context switching between goroutines loses trace continuity. Clarified that trace continuity is lost when `context.Context` is not passed explicitly.
- The channel send metric was incremented before the send succeeded, so canceled sends could be counted as successful sends. Moved the counter update after a successful send.
- Channel send and receive spans always set `blocked=false`, even when the operation could have waited. Added an initial non-blocking select path so the `blocked` attribute reflects whether the operation waited.
- Channel receive did not distinguish a closed channel from a valid zero value. Added the comma-ok receive check and return an error when the channel is closed.
- Worker pool task processing started spans from the pool background context, so submitted work was not trace-linked to the submitter span. Added a task context field and stored a cancellation-detached submit context for later processing.
- The worker pool task-duration metric used `task_id` as a metric attribute, which can create high-cardinality time series. Removed `task_id` from the metric attributes while keeping the task ID on spans.
- The fan-out result channel stored results as `interface{}` and used a type assertion back to `R`. Made `FanOutResult` generic to keep the result path type-safe.
- The fan-out function could deadlock when called with `numWorkers <= 0`. Added an explicit validation error.
- Item-level fan-out spans did not record processor errors. Added span error recording and an error attribute.
- The goroutine monitor used a non-standard metric name `runtime.goroutines`. Updated it to the OpenTelemetry Go runtime semantic convention `go.goroutine.count` with unit `{goroutine}`.
- The complete example ignored errors from `NewGoroutineMonitor`. Added error handling.

## Review Notes
The OpenTelemetry Go metric APIs used in the post, including synchronous gauges with `Record`, counters with `Add`, histograms with `Record`, and OTLP gRPC exporter options such as `WithEndpoint` and `WithInsecure`, match the current package documentation. I could not compile the snippets locally because the `go` toolchain is not installed in this workspace.
