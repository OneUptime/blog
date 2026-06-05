# Validation Summary: How to Monitor gRPC Deadline Propagation and Timeout Cascades

## Status
validated

## Post Type
Tutorial / observability guide

## Technologies Covered
- gRPC
- Go context deadlines
- OpenTelemetry Go tracing
- OpenTelemetry Go metrics
- OpenTelemetry gRPC instrumentation
- Distributed trace waterfall analysis

## Sources Consulted
- gRPC deadlines guide: https://grpc.io/docs/guides/deadlines/
- gRPC HTTP/2 protocol specification: https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md
- gRPC Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- OpenTelemetry Go gRPC instrumentation documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- OpenTelemetry Go metric API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Go trace API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- Go context package documentation: https://pkg.go.dev/context

## Issues Found
- The server setup used `otelgrpc.UnaryServerInterceptor()`. Current OpenTelemetry Go gRPC instrumentation documents `otelgrpc.NewServerHandler()` with `grpc.StatsHandler()` for server instrumentation, so I updated the registration snippet to use `grpc.StatsHandler(otelgrpc.NewServerHandler())` and kept the custom deadline interceptor in `grpc.ChainUnaryInterceptor`.
- The metrics snippet used `otel.Meter("grpc-deadlines")` but did not import `go.opentelemetry.io/otel`. I added the missing import so the snippet uses the current OpenTelemetry Go metric API correctly.
- The `ProcessOrder` handler snippet assigned `inventory` and `err` but did not handle them or return a response. I added basic error handling, marked the illustrative response as used, and returned an empty response so the snippet is syntactically valid as a handler example.

## Review Notes
The article's explanation of gRPC deadlines, deadline-to-timeout conversion, and deadline propagation matches the official gRPC guidance. The custom span attribute names are application-specific rather than OpenTelemetry semantic convention attributes, which is acceptable for the described use case.
