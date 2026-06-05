# Validation Summary: How to Fix the Collector Using Excessive Memory When Processing

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Prometheus receiver
- OpenTelemetry filter processor
- OpenTelemetry transform processor
- Prometheus scrape configuration
- Prometheus metric relabeling
- PromQL alerting rules
- Python Prometheus client-style instrumentation

## Sources Consulted
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector processor list and stability documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/processor/filterprocessor
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.153.0/processor/transformprocessor
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus jobs and automatically generated scrape metrics documentation: https://prometheus.io/docs/concepts/jobs_instances/

## Issues Found
- The post said the Collector tracks state for each series specifically for cumulative-to-delta conversions and staleness detection. That was too broad for the Prometheus receiver as described. I changed it to say the Prometheus receiver and downstream components may keep per-series state while scraping, converting, processing, or exporting metrics.
- The post described `prometheus_tsdb_head_series` and `prometheus_target_scrapes_sample_duplicate_total` as `prometheusreceiver` internal metrics, and the duplicate-sample metric was incorrectly described as series created per scrape. I replaced this with the documented Prometheus scrape metadata metrics: `scrape_samples_scraped`, `scrape_samples_post_metric_relabeling`, `scrape_series_added`, plus `prometheus_tsdb_head_series` as a backend Prometheus TSDB metric.
- The `metric_relabel_configs` example applied `labeldrop` to `path` and then immediately tried to normalize the same `path` label. Since relabel rules run in order, the replacement rule would not work after dropping the label. I commented the `labeldrop` alternative so the example now shows a working normalization rule while still documenting the drop option.
- The filter processor example used the legacy `metrics.metric` / `metrics.datapoint` configuration shape. Current documentation recommends `metric_conditions` with OTTL context inference. I updated the example to use `metric_conditions`, `metric.name`, and `datapoint.attributes`.
- The cardinality growth alert used `rate(prometheus_tsdb_head_series[1h]) > 1000` while the annotation described growth by more than 1000 per hour. `rate()` returns a per-second rate, and `prometheus_tsdb_head_series` is a gauge. I changed the expression to `delta(prometheus_tsdb_head_series[1h]) > 1000`.

## Review Notes
The remaining snippets are partial examples rather than complete Collector configurations. In a production config, processors referenced in a pipeline, such as `memory_limiter` and `batch`, still need their own top-level processor definitions.
