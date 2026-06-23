# Validation Summary: How to Implement OpenTelemetry Tracing for gRPC Services

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Go
- gRPC
- Protocol Buffers
- OpenTelemetry Go SDK
- OpenTelemetry gRPC instrumentation (`otelgrpc`)
- OpenTelemetry trace context propagation
- OpenTelemetry Collector
- Jaeger
- Docker Compose

## Sources Consulted
- OpenTelemetry Go `otelgrpc` package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- OpenTelemetry Go semantic conventions package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv
- OpenTelemetry semantic conventions for gRPC: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- Jaeger getting started documentation: https://www.jaegertracing.io/docs/1.76/getting-started/

## Issues Found
- The article described `otelgrpc` automatic instrumentation as interceptor-based, but the code correctly uses `NewServerHandler` / `NewClientHandler` with gRPC stats handlers. Updated the description and explanatory comments to use "instrumentation" / "stats handler" terminology.
- The server streaming examples checked EOF with `err.Error() == "EOF"`. Replaced this with `err == io.EOF` and added the required `io` import.
- The custom interceptor snippet created `tracer` variables that were never used, which would make the Go example fail to compile. Removed those unused variables and the now-unused `otel` import.
- The semantic convention example used deprecated `semconv.NetPeerName`. Replaced it with `semconv.ServerAddress` and `semconv.ServerPort`.
- The test snippet aliased the SDK trace package as `trace` and then used API span-kind constants from the wrong package. Updated imports to use `sdktrace` and `oteltrace` aliases.
- The test snippet took addresses of range variables, which is unsafe for the stated Go 1.21 baseline. Updated loops to take addresses from the slice by index.
- The streaming trace test expected custom `stream.messages_*` attributes on auto-instrumented spans. Updated it to check for `message` events, matching `otelgrpc.WithMessageEvents`.
- The Jaeger Docker Compose comment labeled port `14250` as OTLP. Updated the comment to identify it as Jaeger collector gRPC (`model.proto`).

## Review Notes
The review verified the examples against official documentation, but local compilation was not possible because the `go` toolchain is not installed in this environment. The post pins `semconv/v1.24.0`; that package remains available, but future maintenance should consider updating semantic convention imports alongside OpenTelemetry Go SDK upgrades.
