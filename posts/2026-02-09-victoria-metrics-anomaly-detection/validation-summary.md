# Validation Summary: How to Use Victoria Metrics Anomaly Detection for Kubernetes Workload Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StatefulSet and Service manifests
- VictoriaMetrics single-node server
- VictoriaMetrics Operator `VMRule` and `VMAlert`
- MetricsQL / PromQL functions and subqueries
- Grafana query panels

## Sources Consulted
- VictoriaMetrics MetricsQL documentation: https://docs.victoriametrics.com/metricsql/
- VictoriaMetrics single-node documentation and command-line flags: https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/
- VictoriaMetrics GitHub releases: https://github.com/VictoriaMetrics/VictoriaMetrics/releases
- VictoriaMetrics Operator `VMRule` documentation: https://docs.victoriametrics.com/operator/resources/vmrule/
- VictoriaMetrics `vmalert` documentation: https://docs.victoriametrics.com/victoriametrics/vmalert/
- Prometheus querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/

## Issues Found
- The introduction claimed VictoriaMetrics learns normal behavior and seasonal patterns. MetricsQL examples compare against historical baselines; `holt_winters()` is double exponential smoothing, not daily/weekly seasonal modeling. Reworded the affected claims to describe historical baselines and trend smoothing.
- The function list used `outlier_iqr()`, which is not the documented rollup function. Changed it to `outlier_iqr_over_time()`.
- The alert and recording rule examples used `PrometheusRule`, but the examples depend on VictoriaMetrics-only MetricsQL functions such as `mad_over_time()`. Changed those resources to VictoriaMetrics Operator `VMRule` and noted that `VMAlert` consumes them.
- The VictoriaMetrics container tag was pinned to old `v1.95.1`. Updated it to current `v1.144.0`.
- The `range_normalize()` example used an invalid `range_normalize(0, 1, q)` signature. Updated it to the documented `range_normalize(q)` form and added histogram bucket aggregation before `histogram_quantile()`.
- The time-of-day query used `[7d:5m] offset 0h`, which averages the entire previous 7 days rather than sampling the same time of day. Changed the subquery resolution to `[7d:1d]`.
- The traffic alert annotation formatted a raw request rate as a percentage. Changed it to report the request rate with `humanize`.
- The dynamic threshold query added a dimensionless coefficient directly to an average. Changed it to scale `stddev_over_time()` by a bounded variance-aware multiplier.
- The sparse metrics section said it used interpolation, but the query performed short-window smoothing. Corrected the wording.

## Review Notes
The post now validates as a VictoriaMetrics MetricsQL guide. The examples assume the VictoriaMetrics Operator and a `VMAlert` instance are installed for `VMRule` evaluation; the post mentions this but does not include full `VMAlert` deployment setup.
