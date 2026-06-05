# Validation Summary: How to Configure the OTLP gRPC Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP gRPC exporter
- Collector YAML configuration
- TLS and mTLS
- Exporter headers and authentication
- Compression
- Retry and sending queues
- File storage extension
- Batch, resource, resource detection, memory limiter, and transform processors
- Collector internal telemetry

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OTLP gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/otlpexporter
- Collector gRPC configuration package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configgrpc
- Collector exporter helper package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/exporterhelper
- OTTL functions package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- File storage extension package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/storage/filestorage
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector Contrib v0.153.0 binary validation using `otelcol-contrib validate`

## Issues Found
- The post described OTLP/gRPC as bidirectional streaming. OTLP/gRPC export uses gRPC with Protocol Buffers for export requests, so the wording was corrected.
- The basic configuration referenced `otlp` and `batch` components without defining the receiver and processor. Added minimal `receivers` and `processors` sections.
- The compression snippet described a configurable gzip compression level, but the OTLP gRPC exporter config supports compression algorithm selection, not a gzip level field. Removed the unsupported comment.
- The signal-specific endpoint example used an unsupported `endpoint_override` field. Replaced it with guidance to use separate OTLP exporters per signal.
- The transform processor example used `time_now()`, which is not the current OTTL function. Changed it to `Now()`.
- The production and monitoring examples used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated them to use `service.telemetry.metrics.readers` with a Prometheus pull exporter.
- The monitoring and development snippets had duplicate top-level YAML keys. Merged them into valid YAML structures.
- The performance tuning examples placed `batch` settings under the exporter. Moved batching settings to the `processors.batch` configuration.
- The file storage examples used a storage directory that might not exist. Added `create_directory: true` so the examples validate and run as written.

## Review Notes
Validated representative complete configurations with `otelcol-contrib` version 0.153.0. Some snippets remain intentionally partial because they focus on a single exporter setting and assume the surrounding Collector pipeline has already been configured.
