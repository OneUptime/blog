# Validation Summary: How to Configure the OTel Arrow Receiver in the Collector as a Drop-In

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OTel Arrow receiver and exporter
- OTLP over gRPC
- OTLP over HTTP
- Collector YAML configuration
- Collector self-observability metrics
- grpcurl

## Sources Consulted
- OpenTelemetry Collector Contrib otelarrowreceiver README, https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/otelarrowreceiver
- OpenTelemetry Collector Contrib otelarrowreceiver config source, https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/otelarrowreceiver/config.go
- OpenTelemetry Collector Contrib otelarrowexporter README, https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/otelarrowexporter
- OpenTelemetry OTLP trace service proto, https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/collector/trace/v1/trace_service.proto
- OTel Arrow service proto, https://github.com/open-telemetry/otel-arrow/blob/main/proto/opentelemetry/proto/experimental/arrow/v1/arrow_service.proto
- OpenTelemetry blog: OpenTelemetry Protocol with Apache Arrow in Production, https://opentelemetry.io/blog/2024/otel-arrow-production/
- OpenTelemetry Collector Contrib v0.153.0 Docker image validation, ghcr.io/open-telemetry/opentelemetry-collector-releases/opentelemetry-collector-contrib:0.153.0

## Issues Found
- The post treated the OTel Arrow receiver as a drop-in replacement for both OTLP/gRPC and OTLP/HTTP. The current `otelarrowreceiver` only configures `protocols.grpc` and `protocols.arrow`; `protocols.http` is invalid. Updated the post to describe it as a drop-in replacement for OTLP/gRPC and kept OTLP/HTTP on a separate `otlp/http` receiver.
- The configuration snippets placed `arrow.memory_limit_mib` under `protocols.grpc`. The receiver config expects `arrow` as a sibling of `grpc` under `protocols`. Moved the Arrow block to the validated location.
- The full pipeline used only `[otelarrow]` as the receiver for every signal while also claiming OTLP/HTTP continued to work. Updated the pipelines to include both `otelarrow` and `otlp/http`.
- The grpcurl example used hexadecimal strings for `trace_id` and `span_id`, but grpcurl follows protobuf JSON mapping where `bytes` fields are base64-encoded. Replaced the values with base64 encodings of the same IDs and added a note about supplying proto files when reflection is unavailable.
- The monitoring section listed undocumented metrics and labels such as `otelcol_receiver_otelarrow_active_streams` and `transport="arrow"`. Replaced them with documented receiver metrics: `otelcol_receiver_recv`, `otelcol_receiver_recv_wire`, `arrow_memory_inuse`, and standard accepted span metrics.
- The rollback section implied all Arrow exporters always fall back automatically. Updated it to note that fallback applies unless `arrow.disable_downgrade` is set to `true`.

## Review Notes
- The corrected full Collector configuration was validated with `otelcol-contrib validate` using the official v0.153.0 contrib image.
- The grpcurl example targets the correct OTLP trace service method.
