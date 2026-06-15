# Validation Summary: How to Configure Retry Policies in OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry JavaScript SDK and OTLP HTTP exporters
- OpenTelemetry Python SDK and OTLP gRPC exporter
- OpenTelemetry Collector exporter retry and sending queue configuration
- OpenTelemetry Collector internal telemetry metrics
- OTLP/HTTP and OTLP/gRPC retry behavior

## Sources Consulted
- OpenTelemetry JavaScript OTLP HTTP trace exporter README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/exporter-trace-otlp-http/README.md
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Python OTLP gRPC exporter source: https://github.com/open-telemetry/opentelemetry-python/blob/main/exporter/opentelemetry-exporter-otlp-proto-grpc/src/opentelemetry/exporter/otlp/proto/grpc/exporter.py
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Collector headers_setter extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/headerssetterextension/README.md

## Issues Found
- The Node.js section implied retry policy settings are configurable through `OTLPExporterNodeConfigBase`. Updated it to clarify that Node.js OTLP HTTP exporters have a built-in retry policy, while timeout and concurrency are configurable and retry backoff settings are not currently customizable.
- The Python section incorrectly stated that `BatchSpanProcessor` has its own retry logic for failed exports. Removed that claim because retry behavior belongs to exporters, not the default span processor.
- The Python gRPC example used `localhost:4317` without a scheme. Updated the default endpoint to `http://localhost:4317`, matching current Python exporter behavior and official examples for insecure local gRPC.
- The shared `OTEL_EXPORTER_OTLP_ENDPOINT` example used port `4317` while the Node.js examples use HTTP exporters. Updated the example and comments to explain the transport-specific default ports.
- The Collector queue comments and sizing guidance treated `queue_size` as individual telemetry items. Updated them to reflect that Collector sending queues are measured in requests/batches by default, unless `sizer: items` is configured.
- The HTTP status-code table incorrectly grouped `500-503` as retryable. Updated it to match the OTLP/HTTP specification: 429, 502, 503, and 504 are retryable response codes.
- The `headers_setter` custom retry example used an unsupported `retry_count` context value and did not wire the extension into the exporter. Replaced it with a valid example showing separate exporters with different `retry_on_failure` settings.
- The Collector internal telemetry example used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Updated it to use the current Prometheus pull reader configuration.

## Review Notes
The Collector internal telemetry schema is still evolving, and metric names can differ between OTLP output and Prometheus exposition because of Prometheus suffix conventions. The post now uses current Collector configuration syntax, but readers on older Collector versions may still see older examples using `service.telemetry.metrics.address`.
