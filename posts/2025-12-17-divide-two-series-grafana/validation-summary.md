# Validation Summary: How to Divide Two Series in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana
- Prometheus
- PromQL
- Grafana transformations
- Grafana server-side expressions
- Grafana dashboard panel JSON
- Prometheus recording rules

## Sources Consulted
- Prometheus documentation: Operators and vector matching, https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus documentation: Functions, including `clamp_min`, https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Recording rules, https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Grafana documentation: Transform data, including Add field from calculation and Rename by regex, https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Grafana documentation: Write expression queries, including math operators and expression joining behavior, https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/expression-queries/
- Grafana documentation: Configure standard options, including percent units and thresholds, https://grafana.com/docs/grafana/latest/panels-visualizations/configure-standard-options/

## Issues Found
- The Grafana transformation instructions said to choose a standalone **Binary operation** transformation. Grafana documents this as the **Binary operation** mode inside the **Add field from calculation** transformation. Updated the steps to use the correct transformation and mode.
- The advanced Grafana math expression claimed `($A / $B) * 100` included null handling and showed C-style ternary syntax, which is not part of Grafana's documented math expression operators. Updated the text to describe the percentage calculation accurately and replaced the ternary with documented comparison/arithmetic behavior.
- The PromQL `or vector(1)` division-by-zero example only supplied a fallback for missing denominators, not present zero values. Updated it to apply the fallback after filtering zero denominators.
- The `ignoring(method)` example could create ambiguous many-to-one matching by comparing a single-method left side to all methods on the right. Updated the right side selector to keep the example one-to-one.
- The `group_left(job)` example described keeping labels from the left side, but Prometheus group modifier label lists include labels from the one-side of the match. Removed the label list and added selectors that make the right-hand side unique per `instance`, so the example correctly keeps the additional labels from the left-hand, higher-cardinality side.

## Review Notes
The examples are generally valid as illustrative PromQL and Grafana patterns. The `or vector(0)` and `or vector(1)` fallback examples are most reliable for fully aggregated series with no labels; label-aware defaults require more careful matching in real dashboards.
