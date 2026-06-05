# Validation Summary: How to Instrument Go gRPC Services with OpenTelemetry Interceptors

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- gRPC-Go
- OpenTelemetry Go SDK
- OpenTelemetry Go gRPC instrumentation
- OTLP trace exporter
- Distributed tracing

## Sources Consulted
- OpenTelemetry Go gRPC instrumentation package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- OpenTelemetry Go trace API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Go propagation documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry gRPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry Go tracetest package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace/tracetest

## Issues Found
- The post used `otelgrpc.UnaryServerInterceptor`, `StreamServerInterceptor`, `UnaryClientInterceptor`, and `StreamClientInterceptor`, which are no longer the current documented OpenTelemetry Go gRPC instrumentation API. Updated the article to use `grpc.StatsHandler(otelgrpc.NewServerHandler())` and `grpc.WithStatsHandler(otelgrpc.NewClientHandler())`.
- The post used deprecated `grpc.Dial`. Updated the client example to use `grpc.NewClient`.
- The OpenTelemetry setup imported unused `log` and `time` packages. Removed those imports.
- The setup claimed automatic cross-service propagation but did not configure a text-map propagator. Added `otel.SetTextMapPropagator` with TraceContext and Baggage propagation.
- The error-handling example passed gRPC status codes to `span.SetStatus`, but the OpenTelemetry API requires `go.opentelemetry.io/otel/codes`. Updated the example to use `otelCodes.Error` and `otelCodes.Ok` for span status while retaining gRPC codes for returned RPC errors.
- The error-handling example expected `fetchUserFromDB` to return `(*pb.User, error)`, conflicting with the earlier helper returning only `*pb.User`. Added a separate `fetchUserFromDBWithError` helper for the error-handling snippet.
- The distributed tracing snippet had an unused `user` variable and did not check the auth RPC error before using the authorization result. Updated the snippet to discard the unused user response and return auth call errors.
- The test example asserted an exact span name that did not match the documented gRPC semantic convention shape. Updated it to check for the expected `UserService/GetUser` method suffix and set the test tracer provider globally.

## Review Notes
The article is technically relevant and salvageable, but the original framing around OpenTelemetry gRPC interceptors was outdated. Current OpenTelemetry Go gRPC examples should use stats handlers. The examples still use placeholder protobuf package names and service definitions, so they remain illustrative rather than copy-paste complete applications.
