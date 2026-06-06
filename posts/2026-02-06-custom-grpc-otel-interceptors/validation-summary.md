# Validation Summary: How to Build Custom gRPC OpenTelemetry Interceptors for Business-Specific Span

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- gRPC Go
- OpenTelemetry Go
- OpenTelemetry gRPC instrumentation (`otelgrpc`)
- gRPC metadata and unary interceptors
- OpenTelemetry span attributes and events

## Sources Consulted
- OpenTelemetry gRPC Go instrumentation package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- gRPC Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC Go metadata package documentation: https://pkg.go.dev/google.golang.org/grpc/metadata
- gRPC Go stats package documentation: https://pkg.go.dev/google.golang.org/grpc/stats
- gRPC metadata guide: https://grpc.io/docs/guides/metadata/
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The filtering interceptor claimed it could skip tracing by removing or making an existing span non-recording. That is not how `otelgrpc` filtering works: spans are created by the stats handler, and OpenTelemetry provides `otelgrpc.WithFilter` to decide whether a request should be instrumented before the span is created. I replaced the interceptor with a `FilteringOption` using `otelgrpc.WithFilter` and `stats.RPCTagInfo.FullMethodName`, and updated the server setup to pass that option to `otelgrpc.NewServerHandler`.
- The sampling interceptor claimed it could sample traces after a span already existed. OpenTelemetry sampling decisions are made when a span starts, and later attributes cannot change that decision. I changed the example to sample only expensive business-detail enrichment by passing a context flag that the business interceptor checks before extracting request and response payload attributes.
- The first Go snippet referenced generated protobuf types through `pb` without importing a protobuf package alias. I added a placeholder generated package import so the example shows where those types come from.
- The client interceptor used `time.Now`, `time.Since`, and `time.Millisecond` without showing the `time` import. I added the missing import to the snippet.

## Review Notes
- The examples are still illustrative and use placeholder protobuf types and package paths; readers must replace `example.com/yourapp/gen/pb` with their generated protobuf package.
- For true trace sampling, configure the OpenTelemetry SDK sampler or provide attributes at span creation time. Interceptors that run after span creation are appropriate for enrichment and events, not changing the sampling decision.
