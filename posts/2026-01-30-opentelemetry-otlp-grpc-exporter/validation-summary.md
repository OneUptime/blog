# Validation Summary: How to Implement OpenTelemetry OTLP gRPC Exporter

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OTLP over gRPC and HTTP
- OpenTelemetry JavaScript / Node.js SDK and OTLP gRPC exporters
- OpenTelemetry Python SDK and OTLP gRPC exporters
- OpenTelemetry Go SDK and OTLP gRPC exporters
- gRPC TLS, metadata headers, compression, and grpcurl troubleshooting
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry protocol exporter specification and retry behavior: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry JavaScript NodeSDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript OTLP gRPC trace exporter package documentation: https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-grpc
- OpenTelemetry JavaScript OTLP gRPC logs exporter package documentation: https://www.npmjs.com/package/@opentelemetry/exporter-logs-otlp-grpc
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Python logs SDK documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/_logs.html
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- Go OTLP trace gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- Go OTLP metric gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- Go OTLP log gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc
- Go logs SDK package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/log
- grpcurl documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The introduction described OTLP/gRPC exporter behavior as using bidirectional streaming. The OTLP specification defines exporter requests as unary `Export` requests after the gRPC transport is established, so this was changed to persistent HTTP/2 connections and multiplexed requests.
- The comparison table described OTLP/HTTP as "connection per request" and compression as optional only for HTTP. This was corrected to reflect request-response HTTP with possible connection reuse and gzip support for both transports.
- The Node.js example used deprecated/outdated resource and NodeSDK log processor APIs. It was updated to `resourceFromAttributes`, `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `logRecordProcessors`.
- The Python section claimed to configure all signal types but only configured traces and metrics. It now includes `OTLPLogExporter`, `LoggerProvider`, `BatchLogRecordProcessor`, `LoggingHandler`, and logger provider shutdown.
- The Go installation and setup configured traces and metrics but omitted logs. It now includes the OTLP log gRPC exporter and Go logs SDK setup, with logger provider shutdown.
- The Go example used older gRPC and semantic convention versions. It was updated to `grpc.NewClient`, `semconv/v1.26.0`, and a default service name when `SERVICE_NAME` is unset.
- The Python TLS and compression snippets had incomplete or incorrect imports. They now import `grpc` for TLS credentials and `Compression` from `grpc`.
- The Go compression snippet combined `WithGRPCConn` with exporter connection options. It now uses exporter-managed endpoint options with `WithCompressor("gzip")`.
- The Node.js batch processor section described processor settings as retry configuration. It was renamed and clarified as batch and queue configuration.
- The grpcurl troubleshooting command was described as a generic connectivity test. It now notes that `grpcurl ... list` requires server reflection.

## Review Notes
- OpenTelemetry logs support is still more version-sensitive than traces and metrics in some language SDKs, especially Go where logs are documented as experimental.
- I verified the Python telemetry setup by importing and initializing it against current `opentelemetry-api`, `opentelemetry-sdk`, and `opentelemetry-exporter-otlp-proto-grpc` packages in an isolated temporary install.
- I verified the JavaScript `CompressionAlgorithm` import against current npm packages; despite the trace exporter README showing a different import in one example, the working current export is from `@opentelemetry/otlp-exporter-base`.
