# Validation Summary: How to Convert Prometheus Metrics to OTLP Format

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry metrics data model
- Prometheus exposition format
- Prometheus Remote Write
- Prometheus native histograms
- Collector Prometheus receiver
- Collector Prometheus Remote Write receiver
- Collector metrics transform, resource, batch, OTLP, and debug components

## Sources Consulted
- OpenTelemetry metrics data model: https://opentelemetry.io/docs/specs/otel/metrics/data-model/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector Prometheus receiver resource attribute mapping: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/resource_attribute_mapping.md
- OpenTelemetry Collector Prometheus Remote Write receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusremotewritereceiver/README.md
- OpenTelemetry Collector metrics transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus native histograms specification: https://prometheus.io/docs/specs/native_histograms/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- Corrected the counter conversion wording. The original text said the Collector "tracks resets"; the reviewed docs support cumulative counter conversion, while reset information depends on start timestamp/source metadata, so the wording was narrowed to cumulative temporality.
- Corrected the resource attributes section. The Prometheus receiver maps scrape target metadata such as `job` and `instance` to resource attributes, so the example was changed from copying those labels with the resource processor to adding an additional resource attribute.
- Corrected the Prometheus Remote Write receiver component name from `prometheusremotewrite` to `prometheus_remote_write`, matching current Collector contrib documentation.
- Updated the Prometheus Remote Write configuration to specify Remote Write 2.0 with `protobuf_message: io.prometheus.write.v2.Request` and noted the need for `--enable-feature=metadata-wal-records` so type, unit, and help metadata are available.
- Corrected native histogram scraping configuration by adding `scrape_native_histograms: true` and a full `scrape_protocols` list that includes `PrometheusProto`.
- Clarified native histogram version status: introduced experimentally in Prometheus 2.40 and stable in Prometheus 3.8, with scraping still explicitly enabled.
- Corrected the summary metrics explanation. OTLP does have a Summary data type, but it is legacy, so the original "no direct summary type" claim was inaccurate.
- Corrected the unit metadata pitfall. The current Prometheus receiver exposes experimental `trim_metric_suffixes`; it does not generally extract units from metric name suffixes into the OTLP unit field by default.

## Review Notes
The post is technically relevant and now aligns with current OpenTelemetry Collector and Prometheus documentation. The Prometheus Remote Write receiver is alpha and version-sensitive because it implements Remote Write 2.0, so future Collector or Prometheus releases may require another compatibility review.
