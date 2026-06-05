# Validation Summary: How to Monitor OTel Arrow Stream Health and Compression Ratios

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol with Apache Arrow
- OpenTelemetry Collector Contrib otelarrow exporter
- OpenTelemetry Collector Contrib otelarrow receiver
- Prometheus
- Grafana

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector Contrib otelarrow exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/otelarrowexporter
- OpenTelemetry Collector Contrib otelarrow receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/otelarrowreceiver
- OTel Arrow project README: https://github.com/open-telemetry/otel-arrow

## Issues Found
- The internal telemetry configuration used `service.telemetry.metrics.address`, which is ignored in OpenTelemetry Collector v0.123.0 and later. Updated the snippet to configure the Prometheus pull reader with `host`, `port`, `without_type_suffix`, and `without_units`.
- The post referenced non-existent otelarrow exporter metrics such as `otelcol_otelarrow_exporter_compression_ratio`, `otelcol_otelarrow_exporter_active_streams`, `otelcol_otelarrow_exporter_stream_reconnections_total`, `otelcol_otelarrow_exporter_configured_streams`, and `otelcol_otelarrow_exporter_errors_total`. Replaced these with documented otelarrow exporter metrics including `otelcol_exporter_sent`, `otelcol_exporter_sent_wire`, and standard Collector export failure counters.
- The post referenced non-existent receiver metrics such as `otelcol_otelarrow_receiver_memory_usage_bytes`, `otelcol_otelarrow_receiver_active_streams`, and `otelcol_otelarrow_receiver_backpressure_events_total`. Replaced these with documented receiver-side metrics including `arrow_memory_inuse`, `otelcol_receiver_recv`, `otelcol_receiver_recv_wire`, and `otelcol_otelarrow_admission_waiting_bytes`.
- The dashboard and alert examples used the same non-existent metrics. Updated the PromQL expressions to use documented byte counters, admission pressure, and standard export failure counters.
- The benchmarking example implied the core `otlp` exporter exposes `otelcol_exporter_sent_wire`. Adjusted the note to compare against a parallel `otelarrow` exporter configured with `arrow.disabled: true`.

## Review Notes
The corrected alert threshold for `arrow_memory_inuse` assumes the receiver's default 128 MiB Arrow memory limit. Deployments with a custom `arrow.memory_limit_mib` should adjust that threshold.
