# Validation Summary: How to Choose Infrastructure Metric Retention Without Overloading Prometheus

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- PromQL
- Prometheus TSDB, head block, WAL, and block compaction
- Time-based and size-based metric retention
- Prometheus remote write and metric relabeling
- Prometheus recording rules
- Prometheus Node Exporter filesystem metrics
- Capacity planning, backups, and high availability

## Sources Consulted

- [Prometheus local storage, retention, sizing, backup, and disk-buffer documentation](https://prometheus.io/docs/prometheus/latest/storage/)
- [Prometheus TSDB configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#tsdb)
- [Prometheus command-line reference](https://prometheus.io/docs/prometheus/latest/command-line/prometheus/)
- [Prometheus remote write configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write)
- [Prometheus metric relabeling configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs)
- [Prometheus remote write tuning and resource-usage guidance](https://prometheus.io/docs/practices/remote_write/)
- [Prometheus native histogram specification and TSDB encoding overview](https://prometheus.io/docs/specs/native_histograms/)
- [Prometheus recording rule documentation](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus TSDB statistics API](https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats)
- [Prometheus snapshot API](https://prometheus.io/docs/prometheus/latest/querying/api/#snapshot)
- [Prometheus TSDB head self-metric definitions](https://github.com/prometheus/prometheus/blob/main/tsdb/head.go)
- [Prometheus per-scrape metric definitions](https://github.com/prometheus/prometheus/blob/main/scrape/scrape.go)
- [Prometheus Node Exporter documentation](https://github.com/prometheus/node_exporter)

## Issues Found

- The append-rate explanation treated the sum of float and native-histogram appends as a uniform input to the bytes-per-sample estimate. A native histogram is one structured sample containing a count, sum, and buckets, so its storage cost is not directly comparable to one float sample. The text now identifies the histogram type as native histograms and tells readers to inspect rates by `type` and measure disk use when native histograms are material.

## Review Notes

- All seven PromQL expressions parsed successfully with `promtool` 3.13.2.
- The TSDB retention YAML structure and values were checked against the Prometheus 3.13.2 configuration schema.
- The runtime-reloadable retention fields and deprecated command-line flags are current for Prometheus 3.13.2. Older Prometheus releases or deployment operators may require version-specific configuration, as the post already notes.
- The documented `160GB` value uses Prometheus's power-of-two size units and therefore represents 160 GiB.
- All links in the post were reachable and pointed to the intended resources at review time.
