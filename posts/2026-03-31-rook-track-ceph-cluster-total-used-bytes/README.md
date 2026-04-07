# How to Track ceph_cluster_total_used_bytes Metric

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity, Prometheus, Metric, Storage, Kubernetes

Description: Monitor ceph_cluster_total_used_bytes to track raw storage consumption trends, forecast capacity needs, and configure automated scaling in Rook-Ceph.

---

## Overview

`ceph_cluster_total_used_bytes` measures the total raw bytes currently written to all OSDs in the Ceph cluster, including all replicas and metadata. It is the numerator in cluster utilization calculations and the key metric for consumption trending.

## Difference from Pool Bytes Used

`ceph_cluster_total_used_bytes` reflects the total at the OSD level (raw), while `ceph_pool_bytes_used` reflects logical data per pool (before replication). For a 3-replica pool:

- Pool bytes used: 10 GB (logical)
- Cluster total used bytes contribution: 30 GB (3 replicas)

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df
```

## Querying the Metric

```promql
# Current raw usage
ceph_cluster_total_used_bytes

# Convert to GiB for readability
ceph_cluster_total_used_bytes / (1024^3)

# Usage percentage
ceph_cluster_total_used_bytes / ceph_cluster_total_bytes * 100

# Available raw bytes
ceph_cluster_total_bytes - ceph_cluster_total_used_bytes
```

## Trending and Forecasting

Analyze growth trends to predict capacity needs:

```promql
# Hourly growth rate
rate(ceph_cluster_total_used_bytes[1h]) * 3600

# 7-day linear prediction
predict_linear(ceph_cluster_total_used_bytes[7d], 86400 * 30)
```

This predicts where usage will be in 30 days based on the past 7-day trend.

## Alert Rules for Consumption Rate

```yaml
groups:
- name: ceph-usage-trending
  rules:
  - alert: CephRapidStorageGrowth
    expr: |
      rate(ceph_cluster_total_used_bytes[1h]) * 3600 > 1073741824
    for: 30m
    labels:
      severity: warning
    annotations:
      summary: "Ceph is consuming more than 1 GiB/hour of raw storage"
      description: "Current hourly rate: {{ $value | humanize }}B/h"

  - alert: CephClusterWillFillIn7Days
    expr: |
      predict_linear(ceph_cluster_total_used_bytes[7d], 86400 * 7) >
      ceph_cluster_total_bytes
    for: 1h
    labels:
      severity: critical
    annotations:
      summary: "Ceph cluster predicted to be full within 7 days"
```

## Breaking Down Usage by Component

Identify the largest consumers:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df detail

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados df
```

Compare with pool-level data:

```promql
# Sum of all pool raw usage
sum(ceph_pool_raw_bytes_used)

# Cluster total used
ceph_cluster_total_used_bytes
```

Compare these two values side by side. The difference is overhead from metadata pools and system data.

## Integrating with Cluster Autoscaling

Use the metric value to trigger node scaling:

```bash
# Example script to check and scale
USED=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph df --format json | jq '.stats.total_used_bytes')
TOTAL=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph df --format json | jq '.stats.total_bytes')
PCT=$(echo "scale=0; $USED * 100 / $TOTAL" | bc)

if [ "$PCT" -gt 75 ]; then
  echo "Storage at ${PCT}% - consider expanding cluster"
fi
```

## Grafana Panel Configuration

```javascript
// Current usage as a stat panel
Query: ceph_cluster_total_used_bytes
Unit: bytes (auto)
Color scheme: Thresholds (green -> yellow at 75%, red at 85%)

// Usage over time
Query A: ceph_cluster_total_used_bytes (label: "Used")
Query B: ceph_cluster_total_bytes (label: "Total")
Chart type: Time series
```

## Summary

`ceph_cluster_total_used_bytes` is the key metric for consumption trending in Rook-Ceph clusters. Use `rate()` for growth velocity alerting, `predict_linear()` for 7-30 day capacity forecasting, and compare with `ceph_cluster_total_bytes` for percentage calculations. Integrate with alerting to trigger storage expansion planning before capacity is exhausted.
