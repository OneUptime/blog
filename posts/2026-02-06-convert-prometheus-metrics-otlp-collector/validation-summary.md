# Validation Summary: How to Convert Prometheus Metrics to OTLP Format Using the Collector

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Collector
- Prometheus receiver
- OTLP exporter
- Prometheus exporter
- Metrics transform processor
- Filter processor
- Resource processor
- Prometheus scrape configuration

## Sources Consulted
- OpenTelemetry Collector Prometheus receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector Prometheus receiver resource attribute mapping: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/resource_attribute_mapping.md
- OpenTelemetry Collector metrics transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector Prometheus exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The post used the deprecated `metricstransform` processor type. Updated the example to `metrics_transform`, matching the current Collector contrib component name.
- The metrics transform regex replacement used `system.$1`. Updated it to `system.$${1}` because Collector configuration treats `$` as environment-variable syntax and current metrics transform examples use escaped dollar signs with `${1}` capture expansion.
- The resource processor example tried to map `job` and `instance` with `from_attribute`, but the Prometheus receiver already maps those to `service.name` and `service.instance.id` resource attributes. Replaced that with a valid resource enrichment example.
- The transform example comment said it aggregated across instances, but the operation only added a label. Updated the comment to match the configuration.
- The Prometheus receiver example used `report_extra_scrape_metrics`, which is not a current receiver field. Moved the documented `extra_scrape_metrics: true` setting into the Prometheus scrape config.
- The internal telemetry example configured `service.telemetry.metrics.address`, which current Collector docs say is ignored as of Collector v0.123.0. Removed the obsolete field and kept the supported `level: detailed` setting.

## Review Notes
- The Prometheus receiver is beta for metrics and supports Prometheus scrape configuration, service discovery, relabeling, target metadata mapping, exemplars, and Prometheus-to-OTLP conversion as described.
- `trim_metric_suffixes` is documented as experimental. The post now uses it correctly, but readers should treat its behavior as subject to change.
- The `metrics_transform` processor is in the contrib and Kubernetes distributions, not every custom Collector build.
