# Validation Summary: How to Create Label Filters Based on Metric Results in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana dashboard variables
- Grafana Prometheus data source template variables
- Grafana transformations
- Prometheus
- PromQL
- Prometheus recording rules
- Kubernetes metrics from kube-state-metrics/cAdvisor

## Sources Consulted
- Grafana documentation: Prometheus template variables, including `query_result()`, `label_values()`, regex extraction, refresh options, and multi-value behavior: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana documentation: Add variables, including query variable refresh behavior and selection options: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana documentation: Transform data, including "Filter data by values" and "Extract fields" transformations: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Prometheus documentation: Querying operators, including comparison operators, the `bool` modifier, and logical/set operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus documentation: Querying basics, including subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus documentation: Recording rules syntax and behavior: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- Fixed an invalid PromQL chained comparison in the "Warning" pod example. PromQL does not support `> 0.7 and < 0.9` without repeating the left-hand expression, so the query now compares the CPU ratio on both sides of the `and`.
- Corrected the chained-variable explanation. Grafana supports chained variables through interpolation, but it does not provide a generic variable-query switch based on another variable's selected text.
- Fixed recording rule examples that were named as boolean helpers but used filtering comparisons. The rules now use PromQL's `> bool` modifier so later comparisons to `1` work as described.
- Replaced `label_values(... == 1, label)` examples with `query_result(... == 1)` plus regex extraction. Grafana's classic `label_values()` helper filters by metric/selector, not arbitrary PromQL value comparisons.
- Fixed the anomaly-detection PromQL example by using subquery syntax on parenthesized aggregate expressions before passing them to `avg_over_time()` and `stddev_over_time()`.
- Corrected the "High CPU" panel query so it compares CPU usage against CPU limits rather than comparing raw CPU seconds rate directly to `0.8`.
- Removed `cacheTimeout` from the variable settings example because it is not documented as a Grafana variable refresh option in current Grafana documentation.

## Review Notes
The examples still use fixed PromQL windows such as `[5m]`, which are valid, but Grafana's current Prometheus documentation recommends `$__rate_interval` for dashboard rate queries when the query should adapt to the dashboard time range and scrape interval. Recording rules should continue to use fixed ranges.
