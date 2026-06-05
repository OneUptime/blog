# Validation Summary: How to Configure the Prometheus Exporter in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Prometheus exporter
- OpenTelemetry Collector processors: filter, metricstransform, resource, batch, memory_limiter
- Prometheus scrape configuration
- Kubernetes NetworkPolicy
- Consul service discovery
- PromQL alerting

## Sources Consulted
- OpenTelemetry Collector Prometheus exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/README.md
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector metricstransform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- Resource attribute mapping was described as automatic direct label conversion. Updated the text to state that resource attributes are exposed through `target_info` by default and only copied onto every metric label when `resource_to_telemetry_conversion.enabled` is set.
- Filter processor examples used legacy `metrics.exclude.metric_names` configuration. Updated them to the current OTTL-based `metric_conditions` format.
- The `metricstransform` regex example referenced `$${1}` without defining a capture group. Updated the regex to capture the suffix of `http.server.*` metrics.
- The high-cardinality label troubleshooting example filtered metric names while describing label filtering. Updated it to drop datapoints based on `user_id`, `trace_id`, and `request_id` attributes.
- The high availability section claimed Prometheus automatically deduplicates metrics with identical label sets. Updated the wording to explain that Prometheus stores scraped series by label set and needs distinct labels when replicas must be differentiated.
- The internal metrics examples used incorrect metric names. Updated them to current Collector internal telemetry names, including `otelcol_exporter_sent_metric_points_total`, `otelcol_exporter_queue_size`, and `otelcol_exporter_send_failed_metric_points_total`.

## Review Notes
The Prometheus exporter configuration fields used in the post (`endpoint`, `namespace`, `const_labels`, `send_timestamps`, `metric_expiration`, and `resource_to_telemetry_conversion`) are valid. The exporter supports `translation_strategy` for more explicit metric-name translation control; that could be mentioned in a future update, but it is not required for correctness.
