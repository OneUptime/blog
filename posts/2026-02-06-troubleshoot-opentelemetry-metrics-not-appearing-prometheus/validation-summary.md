# Validation Summary: How to Troubleshoot OpenTelemetry Metrics Not Appearing in Prometheus

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry SDK metrics
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus exporter
- OpenTelemetry Collector Transform processor / OTTL
- Prometheus scraping and target health
- Prometheus Remote Write
- Python OpenTelemetry OTLP metric exporter

## Sources Consulted
- OpenTelemetry Collector Prometheus exporter package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/prometheusexporter
- OpenTelemetry Prometheus metrics exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry OTLP metrics exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/otlp/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry Collector Transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- Prometheus OpenTelemetry guide: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus exposition format documentation: https://prometheus.io/docs/instrumenting/exposition_formats/

## Issues Found
- The Prometheus exporter snippet described `metric_expiration` as controlling metric-name normalization. I changed the snippet to use `translation_strategy: UnderscoreEscapingWithSuffixes` for name translation and kept `metric_expiration` only for metric lifetime after metrics stop arriving.
- The transform processor example used `set(name, ...)` and `type == "Sum"` / `type == "Gauge"`, which are not the correct OTTL metric-context paths or enum comparisons. I changed them to `set(metric.name, ...)` with `metric.name` and `metric.type == METRIC_DATA_TYPE_SUM` / `METRIC_DATA_TYPE_GAUGE`.
- The post said Prometheus rejects conflicting metric types silently. I changed this to say scrape or ingestion can fail and the error may be visible in Prometheus target status or collector logs.
- The temporality section said Prometheus only understands cumulative temporality and included an incomplete `preferred_temporality` dictionary. I updated the explanation to note that cumulative temporality is safest for a scrape endpoint and that delta metrics require collector/exporter conversion, then replaced the incomplete Python example with the official `OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE=cumulative` approach before exporter initialization.
- The final checklist said cumulative temporality is strictly required for Prometheus. I changed it to ask whether temporality is cumulative or delta metrics are being converted correctly.

## Review Notes
The article is technically relevant and useful. Some examples remain intentionally environment-dependent, such as Kubernetes or Docker service names (`otel-collector`, `prometheus`) and reachable ports, but the commands and configuration shapes are valid for the troubleshooting scenario described.
