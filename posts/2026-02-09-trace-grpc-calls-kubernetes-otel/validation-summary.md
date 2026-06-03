# Validation Summary: How to Trace gRPC Calls Across Kubernetes Services with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- gRPC
- Go
- OpenTelemetry
- OpenTelemetry OTLP gRPC exporter
- Grafana Tempo
- W3C Trace Context

## Sources Consulted
- OpenTelemetry Go gRPC instrumentation package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry resource documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry gRPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry RPC semantic convention migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/rpc-migration/
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana TraceQL query documentation: https://grafana.com/docs/tempo/latest/traceql/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The Go gRPC instrumentation examples used older `otelgrpc` interceptor functions. Updated the examples and surrounding text to use `grpc.StatsHandler(otelgrpc.NewServerHandler())` and `grpc.WithStatsHandler(otelgrpc.NewClientHandler())`, which are the current documented APIs.
- The server example used `attribute.Float64` and `attribute.String` without importing the OpenTelemetry `attribute` package. Added the missing import.
- The Go examples did not explicitly configure W3C trace propagation, so trace context propagation could be a no-op depending on global configuration. Added `otel.SetTextMapPropagator` with Trace Context and Baggage propagators.
- The post stated that message sizes are captured without noting that `otelgrpc` records message size events when message events are configured. Made the text explicit and enabled received/sent message events in the handlers.
- The tracer initialization hardcoded exporter options while the Kubernetes deployment configured OpenTelemetry environment variables. Updated the exporter initialization to read OTLP settings from the environment and added resource initialization from environment variables.
- The client example used deprecated `grpc.Dial`. Updated it to `grpc.NewClient`.
- The Tempo search examples posted JSON bodies to `/api/search`, which does not match the documented Tempo search examples. Replaced them with `curl -G` requests using URL-encoded TraceQL queries.
- The Tempo queries used older RPC semantic convention attributes and numeric gRPC status codes. Updated them to current RPC semantic convention names such as `rpc.system.name` and `rpc.response.status_code` with string status values.

## Review Notes
The streaming snippet is partial and assumes surrounding imports and generated protobuf types. That is acceptable for a focused method-level example, but a future revision could mention the required imports (`fmt`, `time`, `attribute`) if the post wants every snippet to compile standalone.
