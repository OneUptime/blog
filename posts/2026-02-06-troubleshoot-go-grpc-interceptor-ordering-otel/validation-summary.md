# Validation Summary: How to Troubleshoot Go gRPC Interceptor Ordering Issues That Break

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Go
- gRPC-Go
- gRPC unary and stream interceptors
- gRPC stats handlers
- OpenTelemetry Go
- OpenTelemetry gRPC instrumentation (`otelgrpc`)

## Sources Consulted
- gRPC-Go package documentation for `ChainUnaryInterceptor`, `WithChainUnaryInterceptor`, `NewClient`, `StatsHandler`, and related APIs: https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go stats handler documentation for `stats.Handler` and `TagRPC`: https://pkg.go.dev/google.golang.org/grpc/stats#Handler
- OpenTelemetry `otelgrpc` package documentation for `NewClientHandler` and `NewServerHandler`: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- OpenTelemetry Go trace package documentation for `SpanContextFromContext` and `SpanContext.IsValid`: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Go Contrib release notes documenting removal of deprecated `otelgrpc` interceptor functions: https://github.com/open-telemetry/opentelemetry-go-contrib/releases

## Issues Found
- The post presented `otelgrpc.UnaryServerInterceptor`, `otelgrpc.StreamServerInterceptor`, `otelgrpc.UnaryClientInterceptor`, and `otelgrpc.StreamClientInterceptor` as normal current APIs. Current `otelgrpc` documentation recommends `NewServerHandler` with `grpc.StatsHandler` and `NewClientHandler` with `grpc.WithStatsHandler`, and recent release notes document removal of deprecated interceptor functions. I updated the interceptor examples and explanations to explicitly frame them as legacy guidance for older `otelgrpc` versions, and kept the current recommended stats handler solution as the safest approach.
- The stats handler explanation said it "runs at the transport level" and "processes trace context before any interceptor runs." I tightened this wording to match the gRPC stats handler documentation: stats handlers attach information to the RPC context used for the RPC, which avoids the OpenTelemetry-interceptor ordering problem for application interceptors.

## Review Notes
The gRPC interceptor execution order description is consistent with chained interceptor behavior: interceptors run in the order supplied and return in reverse order. The client example uses `grpc.NewClient`, which is current in gRPC-Go and was added in v1.63.0; projects pinned to older gRPC-Go releases may still use `grpc.Dial` or `grpc.DialContext`.
