# Validation Summary: How to Use OpenTelemetry with Go's Built-In net/http/pprof for Profiling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- OpenTelemetry Go API and SDK
- OTLP trace exporter over gRPC
- Go `net/http`
- Go `net/http/pprof`
- Go `runtime/pprof`
- `go tool pprof`

## Sources Consulted
- Go `net/http/pprof` package documentation: https://go.dev/pkg/net/http/pprof/
- Go `runtime/pprof` package documentation: https://pkg.go.dev/runtime/pprof
- OpenTelemetry Go trace API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Go trace SDK documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Go sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry OTLP trace gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.21.0

## Issues Found
- The original imports used both `net/http/pprof` and `runtime/pprof` under the same package name, while also importing OpenTelemetry API and SDK trace packages as `trace`. Updated the examples to use `httppprof`, `runtimepprof`, `sdktrace`, and `oteltrace` aliases so the code references the correct packages.
- The original code imported `net/http/pprof` as a blank import but later called exported handlers such as `pprof.Index`. Changed it to an aliased normal import because manual registration on a custom `ServeMux` requires direct access to those handlers.
- The `captureProfilesForSpan`, `UploadProfile`, and `ContinuousProfiler` examples used `trace.Span` and `trace.Tracer` while `trace` referred to the SDK package. Updated these references to the OpenTelemetry API trace package.
- `ProfileCollector.UploadProfile` read profile data into `data` but did not use it, which would produce an unused local variable compile error in Go. Updated the logging line to include `len(data)`.
- `runtime/pprof.StartCPUProfile` can only run one CPU profile at a time. Added a mutex around CPU profile capture and deferred `StopCPUProfile` after a successful start.
- The prose implied that CPU profiles captured after a slow request precisely represent that completed request. Clarified that Go CPU profiles are process-wide interval samples and are most useful when relevant work is active during the capture window.
- Replaced an unsupported fixed CPU profiling overhead claim with a more general statement that CPU profiling adds overhead during capture.

## Review Notes
Local compilation and `go tool pprof --help` verification could not be run because the Go toolchain is not installed in this workspace. The review was performed against official Go and OpenTelemetry documentation and static code inspection.
