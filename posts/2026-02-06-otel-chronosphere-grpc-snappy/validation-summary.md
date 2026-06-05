# Validation Summary: How to Send OpenTelemetry Metrics to Chronosphere via the gRPC OTLP Exporter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry OTLP gRPC exporters
- Chronosphere OTLP ingestion
- Go OpenTelemetry SDK
- Python OpenTelemetry SDK
- gRPC compression
- OpenTelemetry environment variable configuration

## Sources Consulted
- Chronosphere OTLP endpoints documentation: https://docs.chronosphere.io/ingest/metrics-traces/otel/otlp-endpoints
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Go otlpmetricgrpc package documentation: https://go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
- OpenTelemetry Python OTLP exporters documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- gRPC Python compression API documentation: https://grpc.github.io/grpc/python/grpc.html
- OpenTelemetry semantic conventions deployment attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/

## Issues Found
- The post claimed and demonstrated Snappy compression through standard OpenTelemetry Go and Python OTLP gRPC exporter options. Chronosphere supports Snappy, but the standard OpenTelemetry exporter configuration only guarantees gzip support, and the Go `otlpmetricgrpc.WithCompressor` documentation lists `gzip` as the supported compressor. I changed the examples and environment variable from `snappy` to `gzip` and updated the surrounding explanation.
- The Go setup import block included an unused `log` import, and the metric creation example omitted the imports needed for `attribute` and `metric`. I removed `log` and made the metric creation snippet include its required imports.
- The resource examples used the deprecated `deployment.environment` attribute. I changed the Go example to `semconv.DeploymentEnvironmentName` and the Python example to `deployment.environment.name`.
- The Python example used `Compression.Gzip` without importing `Compression`. I added `from grpc import Compression`.
- The environment variable example did not explicitly select gRPC. I added `OTEL_EXPORTER_OTLP_PROTOCOL="grpc"` so the environment configuration matches the gRPC exporter focus of the post.

## Review Notes
Chronosphere recommends using a local OpenTelemetry Collector for processing and batching when possible because direct SDK export can be less reliable. The direct SDK examples are still technically valid for showing exporter configuration.
