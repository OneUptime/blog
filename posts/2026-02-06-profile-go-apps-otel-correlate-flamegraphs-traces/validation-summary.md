# Validation Summary: How to Profile Go Applications with OpenTelemetry and Correlate Flame Graphs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- runtime/pprof
- net/http/pprof
- OpenTelemetry Go tracing
- OTLP
- pprof flame graphs

## Sources Consulted
- Go runtime/pprof package documentation: https://pkg.go.dev/runtime/pprof
- Go net/http/pprof package documentation: https://pkg.go.dev/net/http/pprof
- Go runtime package documentation for MemProfileRate and SetCPUProfileRate: https://pkg.go.dev/runtime
- Google pprof documentation: https://github.com/google/pprof/blob/main/doc/README.md
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Profiles specification: https://opentelemetry.io/docs/specs/otel/profiles/
- OpenTelemetry Profiles alpha announcement: https://opentelemetry.io/blog/2026/profiles-alpha/
- OpenTelemetry Go OTLP trace exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go trace SDK documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Go net/http instrumentation documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp

## Issues Found
- The post claimed every profile sample gets tagged with trace context. Go's runtime/pprof documentation says pprof labels are currently used by CPU and goroutine profiles, not every profile type. Updated the wording to scope correlation claims to CPU profiles.
- The setup section claimed it used an OpenTelemetry profiling SDK. The code only configured OpenTelemetry tracing, and OpenTelemetry Profiles are still an emerging signal rather than a standard in-process Go profiling SDK in the shown code. Updated the section to describe OpenTelemetry tracing plus Go pprof labels and an external profiler/backend that understands labels.
- The first Go snippet imported `time` without using it. Removed the unused import.
- The router example wrapped only the custom profiling middleware, so `trace.SpanFromContext` would not necessarily find an active server span. Updated the example to wrap the profiling middleware with `otelhttp.NewHandler`, so the request context contains an OpenTelemetry HTTP server span before the profiling middleware reads it.
- The allocation profiling section claimed pprof labels propagate to allocation samples and enable per-trace allocation flame graphs. This is not supported by Go's runtime/pprof labels. Rewrote the section as a caveat: allocation profiles can still be collected, but they are not labeled with trace_id/span_id by pprof labels.
- The pprof collection claim implied any scraper can forward profiles via OTLP. Updated it to clarify that conversion/forwarding via OTLP depends on collector and backend support for OpenTelemetry Profiles.

## Review Notes
- The local environment did not have the `go` binary installed, so I could not compile the snippets locally. Syntax and API usage were reviewed against official Go and OpenTelemetry documentation instead.
- `go tool pprof -http=:8081` with an HTTP(S) profile source is consistent with pprof documentation. The example backend URL remains intentionally backend-specific.
- The post still uses simplified example code that omits some production error handling, such as checking database and JSON errors. That is acceptable for a focused tutorial but should be tightened in a production sample.
