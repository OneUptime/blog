# Validation Summary: How to Set Per-Job Scrape Intervals Without Making Alerts Blind to Stale Series

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus scrape configuration
- PromQL range selectors, subqueries, and over-time functions
- Prometheus alerting and recording rules
- Prometheus staleness and lookback behavior
- Prometheus service discovery and automatically generated scrape metrics
- Prometheus Node Exporter collector filtering and textfile metrics

## Sources Consulted

- [Prometheus configuration reference](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus querying basics and staleness](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/)
- [Prometheus Node Exporter documentation](https://github.com/prometheus/node_exporter/blob/master/README.md)
- [Prometheus downloads](https://prometheus.io/download/)

## Issues Found

No technical issues found.

## Review Notes

- The scrape configuration, two alert-rule examples, and all 11 distinct PromQL expressions were syntax-checked successfully with `promtool` 3.13.2.
- The example metric names `inventory_events_total` and `hardware_asset_count` are illustrative exporter-provided metrics; deployments must substitute metrics exposed by their own inventory collector.
- No deprecated PromQL functions, configuration fields, or alerting-rule fields were found.
