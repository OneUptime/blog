# Validation Summary: How to Configure the Collector to Scrape Prometheus Self-Monitoring Metrics

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- Prometheus receiver
- OTLP exporter
- Filter processor
- Metrics transform processor
- Resource processor
- Batch processor
- Debug exporter
- Prometheus scrape configuration

## Sources Consulted
- OpenTelemetry Collector Prometheus Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector Filter Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Metrics Transform Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector Group By Attributes Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbyattrsprocessor/README.md
- OpenTelemetry Collector Debug Exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector Internal Telemetry Documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Prometheus and OpenMetrics Compatibility Specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Prometheus Configuration Documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found

1. **Outdated filter processor syntax**: Replaced the old `metrics.include.match_type` example with the currently documented OTTL-based `metric_conditions` form. The new condition drops metrics whose names do not match the intended allowlist prefixes.

2. **Deprecated logging exporter**: Replaced the `logging` exporter and `loglevel` setting with the current `debug` exporter and `verbosity` setting.

3. **Missing Collector distribution caveat**: Added a note that the `metricstransform` processor requires a Collector distribution that includes contrib processors, such as the contrib or Kubernetes distribution.

4. **Incorrect `_total` suffix claim**: Corrected the statement that Prometheus counter suffixes are stripped during Prometheus-to-OTLP conversion. Current OpenTelemetry compatibility guidance preserves Prometheus metric names by default; suffix trimming only happens when the Prometheus receiver's `trim_metric_suffixes` option is enabled.

5. **Incorrect staleness configuration explanation**: Replaced the claim that `scrape_timeout` configures staleness after missing scrapes. `scrape_timeout` controls the maximum duration of an individual scrape request.

6. **Deprecated internal telemetry address setting**: Replaced `service.telemetry.metrics.address` with the current `service.telemetry.metrics.readers.pull.exporter.prometheus.host` and `port` configuration.

7. **Incorrect deduplication claim**: Changed the HA Prometheus section to explain that `groupbyattrs` promotes attributes to resource attributes for grouping; it does not deduplicate identical series.

8. **Unreliable verification command**: Replaced the `grep "MetricsExported"` log check, which depended on old logging exporter output, with a generic log check for export errors.

## Review Notes
- The Prometheus receiver scrape configuration structure is valid because the receiver embeds standard Prometheus scrape configuration.
- The Prometheus-to-OTLP type mapping table is consistent with the OpenTelemetry Prometheus compatibility specification.
- The Collector internal metrics listed are current OTLP/internal metric names; Prometheus endpoint suffix behavior can vary if a custom internal Prometheus reader is configured without `without_type_suffix` and `without_units`.
