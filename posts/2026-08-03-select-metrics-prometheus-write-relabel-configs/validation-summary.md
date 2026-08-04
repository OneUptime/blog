# Validation Summary: How to Send Only Selected Metrics with `write_relabel_configs`

## Status
validated

## Post Type
Technical guide / configuration tutorial

## Technologies Covered

- Prometheus 3.13.2
- Prometheus Remote Write
- Prometheus relabeling (`write_relabel_configs`, `metric_relabel_configs`, and target `relabel_configs`)
- Prometheus external labels
- Prometheus recording rules and Agent mode
- PromQL
- `promtool`

## Sources Consulted

- [Prometheus Remote Write configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus relabel configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus metric relabel configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs)
- [Prometheus global configuration and external labels](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#configuration-file)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus Agent mode](https://prometheus.io/docs/prometheus/latest/prometheus_agent/)
- [Prometheus HTTP API status endpoints](https://prometheus.io/docs/prometheus/latest/querying/api/#config)
- [Prometheus `promtool` command reference](https://prometheus.io/docs/prometheus/latest/command-line/promtool/#promtool-check-config)
- [Prometheus 3.13.2 Remote Write queue manager source](https://github.com/prometheus/prometheus/blob/v3.13.2/storage/remote/queue_manager.go)
- [Prometheus 3.13.2 TSDB head metrics source](https://github.com/prometheus/prometheus/blob/v3.13.2/tsdb/head.go)
- [Prometheus Remote Write 2.0 series-label requirements](https://prometheus.io/docs/specs/prw/remote_write_spec_2_0/#series-labels)
- [Prometheus write relabeling demo](https://github.com/prometheus/prometheus/tree/main/documentation/examples/remote_storage)

## Issues Found

1. **Overbroad `metric_relabel_configs` guidance** - The post said to use metric relabeling whenever a metric should not consume local storage, but Prometheus does not apply metric relabeling to automatically generated series such as `up`. Narrowed the guidance to scraped metrics and added the documented exception.

## Review Notes

- All Remote Write YAML examples and the recording-rule example passed syntax and schema checks with `promtool` 3.13.2, the latest Prometheus release at review time.
- The post correctly states that write relabeling runs after external labels and affects only the selected Remote Write destination, while locally stored data remains unchanged in normal Prometheus server mode.
- The `keep`, `drop`, `labeldrop`, missing-label, default-separator, anchored-regex, external-label precedence, and rule-order explanations match the current configuration reference and implementation.
- The sender metrics and labels shown are current in Prometheus 3.13.2. `prometheus_remote_storage_samples_total` is incremented for each send attempt, so retried float samples can be counted more than once. Relabel-dropped float samples use `reason="dropped_series"` in `prometheus_remote_storage_samples_dropped_total`.
- Native histograms have separate Remote Write counters, including `prometheus_remote_storage_histograms_total` and `prometheus_remote_storage_histograms_dropped_total`; operators using native histograms should include those in validation dashboards.
- The `/api/v1/status/config` endpoint and `promtool check config` command are current. Every external link in the post returned HTTP 200 during review.
