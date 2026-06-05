# Validation Summary: How to Use OpenTelemetry StatsHandler-Based Instrumentation Instead of

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Go
- gRPC-Go
- OpenTelemetry Go
- OpenTelemetry Go Contrib `otelgrpc`
- gRPC `stats.Handler`
- OTLP trace exporter

## Sources Consulted
- OpenTelemetry Go Contrib `otelgrpc` package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- gRPC-Go `stats` package documentation: https://pkg.go.dev/google.golang.org/grpc/stats
- gRPC-Go package documentation for `NewClient`, `Dial`, `StatsHandler`, and `WithStatsHandler`: https://pkg.go.dev/google.golang.org/grpc
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry OTLP trace gRPC exporter documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc

## Issues Found
- The `otelgrpc.WithFilter` customization example used `*otelgrpc.InterceptorInfo`, which is for deprecated interceptor filtering. Current StatsHandler-based `WithFilter` expects `*stats.RPCTagInfo`. Updated the snippet to import `google.golang.org/grpc/stats` and use `info.FullMethodName`.
- The customization example used `otelgrpc.WithSpanNameFormatter`, which is not available in current `otelgrpc`. Removed that option from the StatsHandler example.
- The RPC event description was too narrow and omitted trailers. Updated it to describe begin, headers, payloads, trailers, and end events.
- The interceptor comparison was too absolute. Updated it to clarify that basic interceptor-based instrumentation does not receive the same built-in payload and connection lifecycle callbacks as `stats.Handler`.
- The deprecated interceptor example could be read as current API. Updated the wording to clarify that these helpers existed in older `otelgrpc` versions and are shown only as a migration source pattern.

## Review Notes
The main recommendation is correct: current `otelgrpc` documentation shows `NewClientHandler()` with `grpc.WithStatsHandler` for clients and `NewServerHandler()` with `grpc.StatsHandler` for servers. gRPC-Go's `stats` package still marks its APIs experimental, so future readers should pin and review dependency versions during migration.
