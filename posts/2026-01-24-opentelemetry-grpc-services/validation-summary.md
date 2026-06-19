# Validation Summary: How to Configure OpenTelemetry for gRPC Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing, metrics, propagation, resources, and semantic conventions
- gRPC client, server, metadata, interceptors, and streaming RPCs
- Python OpenTelemetry SDK and `opentelemetry-instrumentation-grpc`
- Node.js OpenTelemetry SDK and `@opentelemetry/instrumentation-grpc`
- Go OpenTelemetry SDK, `otelgrpc`, and `grpc-go`
- Java OpenTelemetry SDK and `opentelemetry-grpc-1.6`
- OpenTelemetry Collector OTLP receiver, attributes processor, filter processor, batch processor, and OTLP exporter

## Sources Consulted
- OpenTelemetry Python gRPC instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/grpc/grpc.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry B3 propagator package: https://pypi.org/project/opentelemetry-propagator-b3/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JavaScript gRPC instrumentation types: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-instrumentation-grpc/src/types.ts
- OpenTelemetry Go `otelgrpc` package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- OpenTelemetry Java gRPC instrumentation README: https://github.com/open-telemetry/opentelemetry-java-instrumentation/blob/main/instrumentation/grpc-1.6/library/README.md
- OpenTelemetry gRPC semantic conventions: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/

## Issues Found
- Updated the Node.js setup from direct `NodeTracerProvider`, `Resource`, and `addSpanProcessor()` usage to the current `NodeSDK`, `resourceFromAttributes()`, and `spanProcessors` configuration used by OpenTelemetry JavaScript SDK 2.x.
- Added the missing Node.js SDK/resource/semantic-convention package install comments required by the revised Node.js example.
- Updated the Go automatic gRPC instrumentation example from deprecated `otelgrpc` interceptor functions and deprecated `grpc.Dial()` to `otelgrpc.NewServerHandler()`, `otelgrpc.NewClientHandler()`, `grpc.StatsHandler()`, `grpc.WithStatsHandler()`, and `grpc.NewClient()`.
- Updated the Go semantic convention import from `go.opentelemetry.io/otel/semconv/v1.21.0` to a current versioned semconv package.
- Removed unused Go imports from manual client-side and bidirectional streaming snippets.
- Updated the Go manual client span attributes from older RPC semantic convention keys to current `rpc.system.name`, `rpc.method`, and `rpc.response.status_code`; the error path now records the actual gRPC status from `status.Code(err)`.
- Replaced the Java example's fragile `ResourceAttributes` import with explicit `AttributeKey.stringKey()` resource attributes, and changed version comments to placeholders instead of stale pinned versions.
- Added the missing `opentelemetry-propagator-b3` installation note for the Python B3 propagation example.
- Replaced magic numeric JavaScript span status codes with `SpanStatusCode.OK` and `SpanStatusCode.ERROR`.
- Updated the gRPC span-status mapping to match current server-side gRPC semantic conventions: only `UNKNOWN`, `DEADLINE_EXCEEDED`, `UNIMPLEMENTED`, `INTERNAL`, `UNAVAILABLE`, and `DATA_LOSS` are marked as errors for server spans.
- Updated old semantic convention attributes such as `rpc.system`, `rpc.service`, `rpc.grpc.status_code`, `net.peer.name`, `net.peer.port`, `net.sock.peer.addr`, and `deployment.environment` to current attributes such as `rpc.system.name`, `rpc.method`, `rpc.response.status_code`, `server.address`, `server.port`, `network.peer.address`, and `deployment.environment.name`.
- Updated the Collector filter processor example from the older `spans.exclude.match_type/span_names` form to the current OTTL `trace_conditions` form with `error_mode: ignore`.

## Review Notes
The Java snippet still uses placeholder application classes such as `MyServiceImpl`, and several snippets use generated protobuf types such as `UserServiceClient` as illustrative placeholders. That is appropriate for this tutorial, but readers need to replace them with their generated service code.
