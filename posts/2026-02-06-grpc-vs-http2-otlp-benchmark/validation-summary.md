# Validation Summary: How to Benchmark gRPC vs HTTP/2 Performance for OTLP Export

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector
- OTLP/gRPC
- OTLP/HTTP with protobuf or JSON encoding
- Prometheus and PromQL
- Python OpenTelemetry SDK and OTLP exporters

## Sources Consulted
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Protocol Exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter helper sending queue documentation: https://go.opentelemetry.io/collector/exporter/exporterhelper
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- Prometheus UTF-8 metric name documentation: https://prometheus.io/docs/guides/utf8/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The post stated that both OTLP/gRPC and OTLP/HTTP run over HTTP/2. OTLP/gRPC runs over HTTP/2, but the OTLP specification says OTLP/HTTP implementations may use HTTP/1.1 or HTTP/2. Updated the wording.
- The Collector examples used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. Replaced it with the current `readers.pull.exporter.prometheus.host` and `port` configuration.
- Several PromQL examples used older or non-current internal metric names, including `otelcol_receiver_accepted_spans_total`, `process_resident_memory_bytes`, `process_cpu_seconds_total`, and `otelcol_exporter_send_latency_bucket`. Updated them to current Collector internal metrics and current request latency metrics.
- The `histogram_avg(otelcol_processor_batch_batch_send_size[1m])` example was not a correct PromQL expression for the classic Prometheus histogram form exposed by the Collector. Replaced it with a `_sum` / `_count` rate calculation.
- The performance result wording was too absolute for benchmark guidance. Changed "generally wins" language to "often" and "usually" to avoid presenting environment-dependent performance as guaranteed.

## Review Notes
The Python load generator imports and exporter construction are consistent with the current OpenTelemetry Python OTLP exporter APIs. The benchmark still depends on Collector and Prometheus versions because internal telemetry naming changed across recent Collector releases, especially for dotted HTTP/RPC metric names.
