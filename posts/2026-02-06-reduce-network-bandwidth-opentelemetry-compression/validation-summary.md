# Validation Summary: How to Reduce Network Bandwidth with OpenTelemetry Compression (gzip, zstd)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OTLP gRPC exporter and receiver
- OTLP HTTP exporter and receiver
- gzip, zstd, and snappy compression
- Go OpenTelemetry SDK
- Python OpenTelemetry SDK
- Java OpenTelemetry SDK
- JavaScript OpenTelemetry SDK
- Prometheus metrics

## Sources Consulted
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry OTLP specification: https://opentelemetry.netlify.app/docs/specs/otlp/
- OpenTelemetry Collector gRPC config package: https://pkg.go.dev/go.opentelemetry.io/collector/config/configgrpc
- OpenTelemetry Collector HTTP config package: https://pkg.go.dev/go.opentelemetry.io/collector/config/confighttp
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Go OTLP trace gRPC exporter docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Java SDK/exporter docs and Javadocs: https://opentelemetry.io/docs/languages/java/exporters/
- OpenTelemetry JavaScript OTLP gRPC exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html

## Issues Found
- The post implied OpenTelemetry generally supports gzip, zstd, and snappy compression everywhere. The OTLP exporter specification only requires gzip as the standard compression option, while the Collector gRPC client supports gzip, zstd, snappy, and none. Updated the explanation to distinguish specification-level support from Collector-specific support.
- The Collector OTLP gRPC receiver example used `compression: gzip`, but the receiver's gRPC server config does not expose a `compression` field. Removed the invalid field and clarified that compressed requests are accepted through gRPC negotiation when both sides support the compressor.
- The Collector internal telemetry examples used `service.telemetry.metrics.address`, which is ignored in recent Collector releases. Removed that field and kept `level: detailed`.
- The Java example imported `io.grpc.Compression`, which was unused and not needed, while it used `Duration` without importing it. Replaced the import with `java.time.Duration`.
- The JavaScript example imported `CompressionAlgorithm` from the wrong package for the documented OTLP gRPC exporter example, used a non-documented `grpc://` URL scheme, and used the older `addSpanProcessor` pattern. Updated it to import from `@opentelemetry/exporter-trace-otlp-grpc`, use `http://collector:4317` for an insecure gRPC connection, and pass `spanProcessors` into `NodeTracerProvider`.
- The custom compression example described implementing configurable compression in a processor. Processors do not control OTLP transport compression. Reworded it to refer to custom exporters or transport extensions and adjusted the example method shape.
- The monitoring section referenced non-existent Collector metrics `otelcol_exporter_sent_bytes` and `otelcol_receiver_accepted_bytes`. Replaced them with current Collector item counters and the batch processor payload size histogram, and noted that actual compressed network bytes should come from infrastructure, proxy, service mesh, or network metrics.
- The cost calculator output did not match the provided input values. Corrected the printed baseline, compressed cost, monthly savings, annual savings, and ROI.
- The troubleshooting section recommended switching from zstd level 9 to level 3, but zstd levels are not directly configurable in standard OTLP exporter configuration. Replaced the recommendation with supported compressor/disable-compression options.

## Review Notes
- The benchmark figures are presented as scenario-specific illustrative data. Compression ratios and CPU overhead vary heavily with payload size, entropy, batching, CPU model, SDK, and Collector version.
- zstd and snappy are useful in Collector-to-Collector or Collector-to-backend gRPC links when both ends support them, but gzip remains the portable baseline across OTLP SDK implementations and OTLP-compliant servers.
