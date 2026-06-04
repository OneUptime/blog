# Validation Summary: How to configure OpenTelemetry with Prometheus for metrics export

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- OTLP metrics export over gRPC
- Prometheus remote write
- Prometheus scraping
- PromQL

## Sources Consulted
- OpenTelemetry Collector Prometheus Remote Write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Python metrics SDK documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus HTTP API remote write receiver documentation: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- Prometheus command-line flag documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus querying functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The remote write exporter used the deprecated Collector component name `prometheusremotewrite`. Updated it to `prometheus_remote_write`, the current documented component name, and updated the pipeline reference.
- The remote write section implied Prometheus can be used generally as a push-based metrics destination without mentioning that the receiver must be enabled. Added the required `--web.enable-remote-write-receiver` flag and noted Prometheus documentation's low-volume caveat.
- The PromQL examples did not match the `namespace: otel` setting in the Prometheus exporter configuration. Updated the scraped metric names to use the `otel_` prefix.
- The error-rate query filtered on a `status` label that the Python example did not record. Added a `status` attribute to the counter measurement.
- The p95 histogram query used `histogram_quantile` directly over bucket rates. Updated it to aggregate buckets with `sum by (le)` before calculating the overall quantile.
- The best-practice recommendation for remote write and high cardinality was too broad for Prometheus' built-in remote write receiver. Reworded it to distinguish remote-write-compatible backends from using Prometheus' receiver as a high-volume scraping replacement.

## Review Notes
The Python SDK example uses current metric APIs and a valid OTLP/gRPC exporter endpoint. The Collector Prometheus exporter settings shown are current, but production configurations should usually be explicit about which resource attributes become metric labels to control cardinality.
