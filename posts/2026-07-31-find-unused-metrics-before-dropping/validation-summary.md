# Validation Summary: How to Find Unused Infrastructure Metrics Before Adding `metric_relabel_configs` Drop Rules

## Status
validated

## Post Type
Technical guide / operational governance guide

## Technologies Covered
- Prometheus
- Prometheus TSDB HTTP API
- PromQL
- Metric relabeling
- Prometheus query logging
- Recording and alerting rules
- Remote write, remote read, and federation
- YAML
- ripgrep and curl

## Sources Consulted
- Prometheus configuration and metric relabeling: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs
- Prometheus query log guide: https://prometheus.io/docs/guides/query-log/
- Prometheus HTTP API and TSDB statistics: https://prometheus.io/docs/prometheus/latest/querying/api/#tsdb-stats
- Prometheus jobs, instances, and automatically generated scrape series: https://prometheus.io/docs/concepts/jobs_instances/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus storage and remote storage integrations: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus federation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus instrumentation and label-cardinality guidance: https://prometheus.io/docs/practices/instrumentation/
- Prometheus querying basics and regular-expression behavior: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Local `rg` 15.2.0 and `curl` 8.7.1 command help

## Issues Found
- The `scrape_series_added` query only summed each target's latest value, although that metric reports the approximate number of new series in one scrape and the post used it to assess churn. Changed the query to sum its values over a one-hour range, clarified the meanings of all three scrape queries, and renamed the table column from “Active series” to the more precise “Head series.”
- The TSDB discussion referred generically to “high-value-count labels.” Replaced this with the documented `labelValueCountByLabelName` response field so readers can identify the relevant API data directly.
- The alternatives list suggested replacing a dropped source metric with a recording rule. Recording rules evaluate data after ingestion, so a rule on the same Prometheus cannot read a metric removed by `metric_relabel_configs`. Replaced this with two accurate choices: pre-aggregate upstream for local-ingestion savings, or retain the raw metric locally and remote-write only a recording-rule aggregate when the goal is downstream savings.

## Review Notes
The remaining commands, PromQL expressions, YAML fields, relabeling rules, API path and parameter, query-log metrics, and documentation links are current and technically correct. `scrape_series_added` is explicitly approximate, so its range sum should be treated as a churn estimate rather than an exact series-lifecycle count. The example Prometheus hostname is a documentation placeholder and must be replaced with a reachable deployment endpoint.
