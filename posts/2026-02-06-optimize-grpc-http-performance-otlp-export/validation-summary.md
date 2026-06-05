# Validation Summary: How to Optimize gRPC vs HTTP Performance for OTLP Export

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OTLP/gRPC exporter and receiver configuration
- OTLP/HTTP exporter and receiver configuration
- OpenTelemetry Go SDK trace exporters
- gRPC, HTTP/1.1, HTTP/2, Protocol Buffers, JSON Protobuf encoding
- TLS, compression, batching, retry, and exporter queues

## Sources Consulted
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector OTLP receiver source: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/config.go
- OpenTelemetry Collector gRPC config source: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/configgrpc.go
- OpenTelemetry Collector HTTP server/client config source: https://github.com/open-telemetry/opentelemetry-collector/tree/main/config/confighttp
- OpenTelemetry Collector OTLP exporter source: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/config.go
- OpenTelemetry Collector OTLP/HTTP exporter source: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/config.go
- OpenTelemetry Go OTLP gRPC trace exporter docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go OTLP HTTP trace exporter docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp

## Issues Found
- The post described OTLP/gRPC export as bidirectional streaming and recommended gRPC for streaming/server-push needs. OTLP Export is a request/response protocol with unary export calls, so the text now describes concurrent unary export requests over HTTP/2 streams.
- The post implied OTLP/HTTP typically uses generic JSON or Protobuf. OTLP/HTTP uses binary Protobuf or JSON-encoded Protobuf, so the wording was corrected.
- The performance and cost numbers were phrased as broadly guaranteed. They are workload-dependent, so the text now frames them as illustrative examples and uses conditional wording.
- The HTTP OTLP receiver used `compression: gzip`, which is not a current HTTP server receiver field. It now uses `compression_algorithms: ["", "gzip"]` to accept uncompressed and gzip-compressed requests.
- The Go gRPC exporter example used `grpc.UseCompressor("gzip")` through dial options. It now uses the OpenTelemetry Go SDK's `otlptracegrpc.WithCompressor("gzip")` option.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored in current Collector versions as of v0.123.0. The example now sets `level: detailed` without the obsolete address field.
- The compression guidance said to always use gzip or zstd. It now notes gzip support generally and zstd only when both ends support it, with a CPU/bandwidth trade-off.

## Review Notes
The remaining benchmark values are retained as illustrative examples rather than universal claims. Actual gRPC versus HTTP performance depends on exporter language, encoding, TLS, compression, batch size, network path, backend behavior, and Collector version.
