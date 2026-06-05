# Validation Summary: How to Choose Between OTLP/gRPC and OTLP/HTTP for Your Application

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Protocol (OTLP)
- OTLP/gRPC
- OTLP/HTTP
- Protocol Buffers
- JSON encoding
- Node.js OpenTelemetry exporters
- gRPC
- HTTP/1.1 and HTTP/2
- TLS
- grpcurl
- AWS, Google Cloud, and Azure hosting considerations

## Sources Consulted
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP exporter configuration docs: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry JavaScript exporter docs: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript OTLP/gRPC package docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry JavaScript OTLP/HTTP JSON package docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-http.html
- Current npm package metadata and runtime checks for `@opentelemetry/exporter-trace-otlp-grpc`, `@opentelemetry/exporter-metrics-otlp-grpc`, `@opentelemetry/exporter-trace-otlp-proto`, `@opentelemetry/exporter-metrics-otlp-proto`, and `@opentelemetry/exporter-trace-otlp-http`
- grpcurl documentation: https://github.com/fullstorydev/grpcurl
- Google Cloud Run gRPC docs: https://docs.cloud.google.com/run/docs/triggering/grpc
- Google Cloud Run HTTP/2 docs: https://docs.cloud.google.com/run/docs/configuring/http2
- Azure App Service gRPC docs: https://learn.microsoft.com/en-us/azure/app-service/configure-grpc
- AWS Prescriptive Guidance for gRPC on ALB/EKS: https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/deploy-a-grpc-based-application-on-an-amazon-eks-cluster-and-access-it-with-an-application-load-balancer.html

## Issues Found
- The Node.js OTLP/gRPC examples used `grpc://` URLs. Current OpenTelemetry JavaScript gRPC exporter docs use `http://` or `https://` endpoint URLs, so the examples and environment-variable snippet now use `https://oneuptime.com:4317`.
- The gRPC examples passed a plain `headers` object. The JavaScript gRPC exporter expects custom metadata as a `grpc.Metadata` object, so the examples now use `Metadata` from `@grpc/grpc-js`.
- The HTTP/protobuf Node.js examples used `@opentelemetry/exporter-*-otlp-http`, which is the JavaScript HTTP/JSON exporter package. The production protobuf examples now use `@opentelemetry/exporter-*-otlp-proto`, while JSON debugging examples use `@opentelemetry/exporter-trace-otlp-http`.
- The examples used `CompressionAlgorithm.GZIP`, but the current CommonJS package entrypoint does not export `CompressionAlgorithm`. The examples now use the supported literal `compression: 'gzip'`.
- Several snippets used native ESM imports that do not run as plain Node.js JavaScript with the current CommonJS package entrypoints. The examples now use `require(...)` syntax.
- The retry section incorrectly implied gRPC retries were inherently built into the protocol and showed invalid `metadata` retry/channel options. It now describes exporter retries based on retryable gRPC status codes and HTTP status/network errors.
- The performance section included unverified measured throughput and latency claims, plus an inaccurate statement that HTTP creates a new connection for every export. These were replaced with more accurate, conditional language based on OTLP request/response behavior and HTTP keep-alive guidance.
- The post claimed OTLP/gRPC throughput benefits from streaming. OTLP export is request/response, so the wording now refers to HTTP/2 multiplexing and flow control.
- The grpcurl example omitted the requirement for server reflection. The post now notes that `grpcurl list` requires reflection or explicit proto files.
- The Cloud Run and Azure App Service sections overstated gRPC limitations. They now reflect that both platforms support gRPC with HTTP/2/configuration caveats.

## Review Notes
The post is now technically valid as a practical decision guide. Some performance recommendations remain qualitative because actual exporter throughput and latency depend heavily on batch size, payload shape, runtime, collector/backend behavior, compression, CPU, and network path.
