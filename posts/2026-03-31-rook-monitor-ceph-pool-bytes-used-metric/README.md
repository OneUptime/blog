# How to Monitor ceph_pool_bytes_used Metric

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Prometheus, Metric, Capacity, Kubernetes

Description: Track ceph_pool_bytes_used to monitor per-pool storage consumption, set capacity alerts, and plan storage expansion for Rook-Ceph deployments.

---

## Overview

`ceph_pool_bytes_used` tracks the amount of data stored in each Ceph pool in bytes. Monitoring this metric helps detect runaway storage consumers, enforce quotas, and plan timely capacity expansions before pools reach their limits.

## Understanding the Metric

The metric includes a `pool_id` and `name` label:

```promql
ceph_pool_bytes_used
```

Sample output:

```text
ceph_pool_bytes_used{name="replicapool",pool_id="1"} 5.36e+10
ceph_pool_bytes_used{name="device_health_metrics",pool_id="2"} 2048
ceph_pool_bytes_used{name=".rgw.root",pool_id="3"} 4096
```

Check from the CLI:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df detail
```

## Related Pool Metrics

Several companion metrics provide fuller context:

```promql
# Maximum bytes the pool is allowed to use
ceph_pool_max_avail

# Number of objects in the pool
ceph_pool_objects

# Raw bytes stored (including replication overhead)
ceph_pool_stored_raw
```

## Calculating Pool Usage Percentage

```promql
# Pool usage percentage
(ceph_pool_bytes_used / (ceph_pool_bytes_used + ceph_pool_max_avail)) * 100
```

## Creating Capacity Alert Rules

```yaml
groups:
- name: ceph-pool-capacity
  rules:
  - alert: CephPoolUsageWarning
    expr: |
      (ceph_pool_bytes_used /
       (ceph_pool_bytes_used + ceph_pool_max_avail)) * 100 > 75
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Ceph pool {{ $labels.name }} is over 75% full"
      description: "Pool usage: {{ $value | printf \"%.1f\" }}%"

  - alert: CephPoolUsageCritical
    expr: |
      (ceph_pool_bytes_used /
       (ceph_pool_bytes_used + ceph_pool_max_avail)) * 100 > 85
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Ceph pool {{ $labels.name }} is over 85% full"
```

## Trend Analysis for Capacity Planning

Use Prometheus range queries to predict when a pool will fill:

```promql
# Growth rate over 24 hours (bytes per second)
deriv(ceph_pool_bytes_used[24h])

# Predicted time to full (in seconds)
(ceph_pool_max_avail) / deriv(ceph_pool_bytes_used[24h])
```

## Setting Pool Quotas

To prevent a single pool from consuming all cluster space:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set-quota replicapool max_bytes 1099511627776

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get-quota replicapool
```

## Grafana Dashboard Panel

Create a bytes used over time panel:

```javascript
// Stacked area chart of all pools
Query: sum by(name) (ceph_pool_bytes_used)
Legend: "{{ name }}"
Unit: bytes
```

Create a table panel for current usage:

```javascript
Query: ceph_pool_bytes_used / (ceph_pool_bytes_used + ceph_pool_max_avail) * 100
Column: "Pool", "Usage %"
Sort: descending by "Usage %"
```

## Summary

`ceph_pool_bytes_used` is the primary metric for per-pool capacity monitoring in Ceph. Combine it with `ceph_pool_max_avail` to calculate usage percentage, set alerts at 75% and 85%, and use rate-of-change queries for capacity planning. Apply Ceph pool quotas to prevent individual pools from consuming all cluster storage.
