# Validation Summary: How to Fix 'Invalid Protobuf' Errors in OTLP Export

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OpenTelemetry Python OTLP exporters
- Protocol Buffers
- gRPC
- HTTP
- nginx reverse proxying
- TLS and compression

## Sources Consulted
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry SDK OTLP exporter configuration docs: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Collector OTLP receiver README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector batch processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Python OTLP exporter API docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python OTLP HTTP trace exporter source docs: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/exporter/otlp/proto/http/trace_exporter.html
- OpenTelemetry Python OTLP gRPC trace exporter source docs: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/exporter/otlp/proto/grpc/trace_exporter.html

## Issues Found
- The Collector OTLP HTTP exporter example used the deprecated `otlphttp` component name. I changed it to `otlp_http`, which is the current documented component name; the old alias still exists but is deprecated.
- The nginx snippet used `$content_type`, which is not the correct request-header variable for preserving the incoming `Content-Type`. I changed it to `$http_content_type`.
- The protobuf version mismatch section overstated normal SDK/Collector minor-version incompatibility and implied unknown newer fields commonly cause parse failures. I revised it to reflect protobuf wire compatibility for stable OTLP signals and limited the warning to very old Collectors, unstable signals, or mismatched generated protobuf packages.
- The debug exporter comment said `verbosity: basic` prints the first span from each batch. The official debug exporter docs say `basic` prints a single-line summary, so I corrected the comment.
- The prevention section recommended keeping SDK and Collector versions in lockstep. I narrowed that to keeping SDK exporter packages and generated protobuf packages compatible and keeping the Collector reasonably current.

## Review Notes
The remaining examples matched the official OTLP defaults and configuration shapes: OTLP/gRPC defaults to port 4317, OTLP/HTTP defaults to port 4318 and `/v1/{signal}` paths, HTTP protobuf uses `Content-Type: application/x-protobuf`, HTTP JSON uses `Content-Type: application/json`, `OTEL_EXPORTER_OTLP_PROTOCOL` accepts `grpc`, `http/protobuf`, and `http/json`, Collector `max_recv_msg_size_mib` is a valid gRPC receiver setting, and the Python OTLP exporter constructor parameters shown are current.
