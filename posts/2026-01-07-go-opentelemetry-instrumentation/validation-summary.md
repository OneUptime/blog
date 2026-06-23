# Validation Summary: How to Instrument Go Applications with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Go
- OpenTelemetry Go API and SDK
- OTLP trace exporter over gRPC
- net/http instrumentation with otelhttp
- Gin instrumentation with otelgin
- Echo instrumentation with otelecho
- gRPC instrumentation with otelgrpc
- W3C Trace Context and baggage propagation
- OpenTelemetry sampling and resource configuration

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Go getting started guide: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry Go instrumentation guide: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Go instrumentation libraries guide: https://opentelemetry.io/docs/languages/go/libraries/
- OpenTelemetry Go sampling guide: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Go resources guide: https://opentelemetry.io/docs/languages/go/resources/
- OpenTelemetry Go exporters guide: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- otelhttp package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- otelgin package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin
- otelecho package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/github.com/labstack/echo/otelecho
- otelgrpc package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- otlptracegrpc package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry trace API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry SDK trace documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry semantic conventions v1.24.0 documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.24.0
- gRPC Go package documentation: https://pkg.go.dev/google.golang.org/grpc

## Issues Found
- The tracer setup passed a caller-owned gRPC connection to `otlptracegrpc.WithGRPCConn` but returned only `tp.Shutdown`. The official exporter documentation states the caller must close a connection passed through `WithGRPCConn`, so the shutdown function now closes the connection and error paths clean it up.
- The gRPC section described the current `otelgrpc` examples as interceptor-based. Current `otelgrpc` documentation uses `grpc.StatsHandler` / `grpc.WithStatsHandler` with `NewServerHandler` and `NewClientHandler`, so the wording and comments were updated to "stats handlers."
- The gRPC client example passed `attribute.String(...)` directly to `tracer.Start`, which expects `trace.SpanStartOption` values. It now imports `go.opentelemetry.io/otel/trace` and wraps the attribute with `trace.WithAttributes(...)`.
- The message queue consumer comment said the consumer span was linked to the producer, but the code extracts propagated context and creates a child/continued span rather than a span link. The comment now says it continues the propagated trace.
- The production sampler comment claimed it sampled 10% of traces but always sampled errors. The shown SDK sampler is a head sampler and cannot decide based on later span errors, so the comment now describes parent-based ratio sampling and the post notes that preserving all error traces requires tail sampling in the OpenTelemetry Collector.
- The performance optimization snippet referenced `*resource.Resource` without importing `go.opentelemetry.io/otel/sdk/resource`. The missing import was added.

## Review Notes
The examples are still illustrative and contain application-specific placeholders such as generated protobuf packages, `InitTracer`, `publishToQueue`, and `processMessage`. The local environment did not have the Go toolchain installed, so compile verification could not be run here; API checks were performed against official OpenTelemetry and gRPC documentation.
