# How to Track Ceph Storage Growth Trends in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, Storage, Growth, Trend, Capacity Planning, Monitoring

Description: Use Grafana panels and Prometheus metrics to track Ceph storage growth over time, forecast capacity exhaustion, and plan for cluster expansion proactively.

---

## Why Track Storage Growth

Running out of storage capacity in a Ceph cluster causes write failures and can trigger cascading OSD issues. Tracking growth trends in Grafana lets you forecast when the cluster will reach critical thresholds and plan disk additions before problems occur.

## Key Capacity Metrics

```promql
# Total raw capacity
ceph_cluster_total_bytes{namespace="rook-ceph"}

# Used raw capacity
ceph_cluster_total_used_bytes{namespace="rook-ceph"}

# Available raw capacity
ceph_cluster_available_bytes{namespace="rook-ceph"}

# Per-pool used bytes
ceph_pool_stored{namespace="rook-ceph"}
```

## Building a Capacity Over Time Panel

Create a Time series panel with a 30-day lookback to visualize growth:

```promql
# Cluster used bytes over time
ceph_cluster_total_used_bytes{namespace="rook-ceph"}
```

Set the time range to "Last 30 days" and enable "Fill below to" to shade the area under the curve, making growth visually obvious.

## Calculating Growth Rate

Use `deriv()` to compute the rate of change in bytes per second, then convert to daily growth:

```promql
# Daily storage growth in bytes
deriv(ceph_cluster_total_used_bytes{namespace="rook-ceph"}[7d]) * 86400
```

Display this as a Stat panel labeled "Daily Growth Rate" with a unit of bytes.

## Forecasting Capacity Exhaustion

Use Prometheus's `predict_linear()` function to project when storage will be full:

```promql
# Projected usage percentage in 30 days (using 7-day trend)
(
  predict_linear(ceph_cluster_total_used_bytes{namespace="rook-ceph"}[7d], 86400 * 30)
  / ceph_cluster_total_bytes{namespace="rook-ceph"}
) * 100
```

Create a Stat panel showing the projected usage percentage in 30 days. Add a threshold at 85% to color the panel red when the cluster is on a trajectory toward full.

## Per-Pool Growth Tracking

Track growth per pool to identify which workloads are consuming the most space:

```promql
# Pool-level growth rate (bytes/day)
deriv(ceph_pool_stored{namespace="rook-ceph"}[7d]) * 86400
```

Use a Bar chart panel grouped by the `name` label to compare pool growth rates side by side.

## Setting Up Growth Alerts

Create a Grafana alert that fires when projected usage exceeds 80% in 14 days:

```promql
predict_linear(
  ceph_cluster_total_used_bytes{namespace="rook-ceph"}[14d],
  86400 * 14
) / ceph_cluster_total_bytes{namespace="rook-ceph"} > 0.80
```

Configure the alert to notify the capacity planning team via email with a 24-hour repeat interval.

## Dashboard Layout

```text
Row 1: Current State
  - Used / Total (Gauge)
  - Available Bytes (Stat)
  - Daily Growth Rate (Stat)

Row 2: Trends
  - Cluster Capacity Over 30 Days (Time series with fill)
  - Per-Pool Growth Rate (Bar chart)

Row 3: Forecast
  - Projected Usage in 30 Days (Gauge)
  - Days to 85% Full (Stat)
```

## Summary

Grafana's `predict_linear()` and `deriv()` functions transform raw Ceph capacity metrics into actionable forecasts. By tracking daily growth rates per pool and projecting capacity exhaustion, you can engage in data-driven capacity planning rather than reacting to storage emergencies. Alert rules on forecasted capacity give your team lead time to expand the cluster before workloads are impacted.
