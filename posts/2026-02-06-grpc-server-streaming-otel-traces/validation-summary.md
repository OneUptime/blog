# Validation Summary: How to Trace gRPC Server Streaming RPCs with OpenTelemetry and Capture Stream

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Protocol Buffers
- gRPC server streaming RPCs
- OpenTelemetry Go tracing and metrics
- OpenTelemetry RPC semantic conventions
- Prometheus and PromQL

## Sources Consulted
- OpenTelemetry Go metric API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry semantic conventions for gRPC: https://opentelemetry.io/docs/specs/semconv/rpc/grpc/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- gRPC Go basics and streaming documentation: https://grpc.io/docs/languages/go/basics/

## Issues Found
- The post used older OpenTelemetry RPC semantic attributes, including `rpc.system` and `rpc.service`. Updated the examples to use `rpc.system.name` and a fully qualified `rpc.method` value, matching the current gRPC semantic conventions.
- The span examples did not consistently record `rpc.response.status_code` and `error.type` on success and error paths. Added status-code attributes for stream completion, cancellation, send errors, and client receive errors.
- The server example did not record stream duration on every stream exit path. Added duration recording for source-closed and send-error paths so the metric matches the post's claim of capturing full stream duration.
- The description and intro claimed per-message timing, but the code captures time to first message rather than timing every message. Reworded the claim to match the implementation.
- The PromQL average-duration query used `histogram_avg(grpc_server_stream_duration[5m])`, which is not correct for the classic Prometheus histogram series produced by default OpenTelemetry-to-Prometheus name translation. Replaced it with a `_sum` / `_count` rate calculation and included the `_milliseconds` unit suffix expected from the metric's `ms` unit.

## Review Notes
The examples remain illustrative and assume surrounding application types such as `PriceSource`, generated protobuf code, tracer/meter provider setup, and client-side imports. That is acceptable for the scope of the post, but a future version could mention that stock symbols may be high-cardinality metric labels in real systems.
