# Validation Summary: How to Measure Infrastructure Metric Cardinality Before It Overloads Prometheus

## Status

validated

## Post Type

Technical guide / capacity-planning and operational monitoring guide

## Technologies Covered

- Prometheus 3.13.1
- PromQL
- Prometheus TSDB Head, WAL, and local storage blocks
- Prometheus HTTP API
- Prometheus scrape metrics and metric relabeling
- promtool
- node_exporter
- curl, jq, and YAML

## Sources Consulted

- Prometheus data model: https://prometheus.io/docs/concepts/data_model/
- Prometheus querying basics and lookback semantics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus HTTP API and TSDB statistics: https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats
- Prometheus jobs, instances, and automatically generated scrape metrics: https://prometheus.io/docs/concepts/jobs_instances/
- Prometheus storage and capacity planning: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus instrumentation and label-cardinality guidance: https://prometheus.io/docs/practices/instrumentation/
- Prometheus scrape configuration, limits, and metric relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Prometheus 3.13.1 release: https://github.com/prometheus/prometheus/releases/tag/v3.13.1
- Prometheus 3.13.1 TSDB Head metric definitions: https://github.com/prometheus/prometheus/blob/v3.13.1/tsdb/head.go
- node_exporter collector guidance: https://github.com/prometheus/node_exporter

## Issues Found

- The post suggested using either the TSDB status API or offline TSDB tools for storage-wide investigations, but `/api/v1/status/tsdb` reports cardinality statistics for the current Head rather than every retained block. Changed the sentence to direct retained on-disk block investigations to offline TSDB tools.

## Review Notes

- All eleven PromQL expressions were parsed successfully with `promtool` 3.13.1.
- The metric relabeling example was validated with `promtool check config` after embedding it in a complete scrape configuration.
- The documented `scrape_series_added` metric is an approximate per-scrape gauge, so it is appropriate for observing where new series appear but should not be treated as an exact cumulative counter.
- Prometheus currently marks `body_size_limit` as experimental; the post's general statement that it is supported is accurate.
