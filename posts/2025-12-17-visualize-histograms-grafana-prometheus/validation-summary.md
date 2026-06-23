# Validation Summary: How to Visualize Histograms in Grafana with Prometheus

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus classic histograms
- Prometheus native histograms
- Grafana dashboards
- Grafana heatmap, time series, and bar gauge panels

## Sources Consulted
- Prometheus documentation: Histograms and summaries - https://prometheus.io/docs/practices/histograms/
- Prometheus documentation: Query functions, including `histogram_quantile`, `rate`, and `increase` - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus specification: Native Histograms - https://prometheus.io/docs/specs/native_histograms/
- Grafana documentation: Prometheus query editor - https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana documentation: Heatmap visualization - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/heatmap/
- Grafana documentation: Bar gauge visualization - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/bar-gauge/

## Issues Found
- The TL;DR said to use native histograms whenever Prometheus is 2.40+. Prometheus 2.40 introduced native histograms experimentally behind a feature flag, and current Prometheus versions still require native histogram scraping to be enabled. Updated the wording to avoid implying version alone is sufficient.
- The TL;DR said to always include the `le` label in aggregations. This is true for classic histograms but not native histograms. Clarified that the requirement applies to classic histogram aggregations.
- The heatmap setup used "Data format: Time series buckets" and instructed readers to enable "Calculate from data." Grafana's Prometheus query editor documents the Heatmap format as the setting that converts cumulative Prometheus histograms to regular buckets. Updated the setup to use query format "Heatmap" and keep "Calculate from data" disabled for already bucketed Prometheus histogram data.
- The bar gauge section described `sum(increase(..._bucket[5m])) by (le)` as a current distribution. Classic histogram buckets are cumulative, so that query returns cumulative bucket counts rather than per-bucket distribution counts. Renamed and reworded the section to describe cumulative buckets accurately.
- The NaN troubleshooting example attributed NaN to "no data in time range." Prometheus documents `histogram_quantile` returning NaN for histograms with zero observations; no matching data more commonly yields no series. Updated the wording to "no observations in time range."
- The native histogram section described automatic bucketing and listed benefits too broadly. Updated the section to reflect documented native histogram behavior: no `_bucket` suffix for native histogram queries, no `le` label required for native aggregation, one time series per histogram, and quantile error governed by configured resolution.

## Review Notes
The classic histogram PromQL examples for percentiles, label grouping, average latency, request rate, SLO percentage, and Apdex were syntactically correct and aligned with Prometheus documentation. The SLO and Apdex examples assume the exact classic histogram bucket boundaries shown in the label matchers, which is required for exact classic-histogram threshold calculations.
