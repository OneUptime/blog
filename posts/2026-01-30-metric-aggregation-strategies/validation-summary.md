# Validation Summary: How to Build Metric Aggregation Strategies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus recording rules
- Prometheus federation
- Prometheus remote write and relabeling
- OpenTelemetry Collector
- Grafana variables
- Thanos compactor
- Metrics, histograms, aggregation, and downsampling

## Sources Consulted
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus query operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus recording rules configuration: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus recording rule naming practices: https://prometheus.io/docs/practices/rules/
- Prometheus federation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus configuration and relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Grafana Prometheus template variables: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- OpenTelemetry Collector metrics transform processor: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/README.md
- OpenTelemetry Collector metrics transform metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/metricstransformprocessor/metadata.yaml
- Thanos compactor documentation: https://thanos.io/tip/components/compact.md/

## Issues Found
- The opening data point calculation was incorrect. 500 services x 200 metrics x 4 scrapes per minute is 400,000 samples per minute before label cardinality, not 40 million.
- The basic aggregation example used `avg(http_request_duration_seconds) by (region)`, which is misleading for typical Prometheus latency instrumentation because latency is commonly represented by histogram or summary series. Changed it to a gauge-style CPU usage average example.
- The high-cardinality metric illustration was marked as `promql` even though `http_requests_total{service, pod, endpoint, status}` is not valid PromQL selector syntax. Changed the fenced block to `text`.
- Recording rules were described as running at scrape time. Prometheus recording rules are evaluated on rule evaluation intervals, so the wording was corrected.
- The recording rule snippet said it could be placed in `prometheus.yml`. Prometheus rule groups belong in rule files loaded by `prometheus.yml`, so the comment was corrected.
- The hierarchical recording rule example used separate rule groups while implying ordered dependency evaluation. Prometheus guarantees sequential evaluation within a group, so the dependent rules were moved into one group.
- The OpenTelemetry Collector example used the deprecated `metricstransform` component type. Updated it to the current `metrics_transform` component name and adjusted the pipeline reference.
- The OpenTelemetry Collector text implied broad node-level aggregation. The metrics transform processor aggregates within a batch and does not aggregate across batches or multiple sources, so the wording was narrowed.
- The Thanos compactor example was shown as a YAML config under a "Thanos/Cortex" heading. Thanos retention is configured with `thanos compact` CLI flags, so the example and heading were corrected.
- The Grafana variable optimization example used `label_values()` with a PromQL expression, but Grafana documents that `label_values` does not support queries. Replaced it with a `query_result(...)` example and a regex extraction note.

## Review Notes
Prometheus and Thanos behavior can vary in managed backends and Prometheus-compatible systems, especially around downsampling and retention. The corrected post now matches upstream Prometheus, Grafana, OpenTelemetry Collector, and Thanos documentation for the examples shown.
