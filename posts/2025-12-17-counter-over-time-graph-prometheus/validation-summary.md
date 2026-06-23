# Validation Summary: How to Create Counter Over Time Graph in Prometheus

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Grafana
- Prometheus recording rules
- Monitoring counters

## Sources Consulted
- Prometheus documentation: Metric types - Counter: https://prometheus.io/docs/concepts/metric_types/
- Prometheus documentation: Querying functions (`rate`, `increase`, `irate`, `resets`, `_over_time`): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus documentation: Recording rules best practices: https://prometheus.io/docs/practices/rules/
- Grafana documentation: Prometheus query editor and `$__interval`: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana documentation: Prometheus template variables: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana documentation: Time series visualization options: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Grafana documentation: Standard field options and units: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-standard-options/

## Issues Found
- The post described `irate()` as good for alerting on sudden changes. Prometheus documentation recommends `irate()` for graphing volatile, fast-moving counters and recommends `rate()` for alerts because brief rate changes can interfere with alert `FOR` behavior. Changed the guidance to say `irate()` is good for graphing volatile, fast-moving counters and renamed the table use case from "Alert on spikes" to "Graph volatile spikes."
- The "rate of sum" anti-pattern used `rate(sum(http_requests_total)[5m])`, which is not valid PromQL range-selector syntax because range selectors apply to vector selectors, not arbitrary aggregate expressions. Changed it to the valid subquery form `rate(sum(http_requests_total)[5m:])` while preserving the warning that aggregating before `rate()` prevents per-series reset detection.
- The cumulative query example was labeled as "requests today," but the query computes an approximate rolling 1-day total, not a calendar-day total. Updated the surrounding wording and comment to describe it as a rolling last-day total.
- The troubleshooting section said counter resets can cause spikes. Since Prometheus `rate()`, `increase()`, and `irate()` adjust for counter resets, this was too broad. Reworded it to recommend checking resets when spikes line up with restarts.

## Review Notes
The main guidance is consistent with official Prometheus recommendations: counters are cumulative and monotonically increasing except for resets, `rate()` and `increase()` adjust for resets, and `rate()` should be applied before aggregation. Grafana panel JSON examples are illustrative partial panel models rather than complete dashboard exports; the field units and visualization options used are consistent with Grafana's documented standard/custom field options.
