# How to Monitor Capacity Trends in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Capacity, Prometheus, Grafana, Trend

Description: Monitor Ceph cluster capacity trends using Prometheus metrics and Grafana dashboards to predict when you'll run out of storage and plan expansion proactively.

---

## Overview

Monitoring capacity trends allows you to predict storage exhaustion weeks or months in advance rather than reacting to full alerts. This guide covers setting up capacity monitoring with Prometheus and Grafana for Rook-Ceph clusters.

## Key Capacity Metrics

| Metric | Description |
|--------|-------------|
| `ceph_cluster_total_bytes` | Total raw capacity |
| `ceph_cluster_total_used_bytes` | Total raw bytes used |
| `ceph_osd_stat_bytes` | Per-OSD total capacity |
| `ceph_osd_stat_bytes_used` | Per-OSD bytes used |
| `ceph_pool_stored` | Logical bytes stored per pool |

## Step 1 - Verify Prometheus is Collecting Ceph Metrics

```bash
kubectl -n rook-ceph get servicemonitor
kubectl -n monitoring get pod | grep prometheus

# Test metric exists
curl -s http://prometheus:9090/api/v1/query?query=ceph_cluster_total_bytes | \
  jq '.data.result[0].value[1]'
```

## Step 2 - Check Current Capacity via CLI

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Overall cluster capacity
ceph df

# Per-pool breakdown
ceph df detail

# Per-OSD breakdown (identify imbalanced OSDs)
ceph osd df tree
```

## Step 3 - Prometheus Queries for Capacity Trends

Cluster utilization percentage:

```promql
ceph_cluster_total_used_bytes / ceph_cluster_total_bytes * 100
```

Predicted time to reach 80% full (using linear regression over 7 days):

```promql
(0.80 * ceph_cluster_total_bytes - ceph_cluster_total_used_bytes)
/
(deriv(ceph_cluster_total_used_bytes[7d]) * 86400)
```

This gives days until 80% utilization at the current growth rate.

Daily growth rate in bytes:

```promql
deriv(ceph_cluster_total_used_bytes[24h]) * 86400
```

## Step 4 - Grafana Dashboard Panels

Add these panels to a Ceph capacity dashboard:

```json
{
  "panels": [
    {
      "title": "Cluster Capacity Used %",
      "type": "gauge",
      "targets": [{
        "expr": "ceph_cluster_total_used_bytes / ceph_cluster_total_bytes * 100",
        "legendFormat": "Used %"
      }],
      "thresholds": {
        "steps": [
          {"color": "green", "value": null},
          {"color": "yellow", "value": 70},
          {"color": "red", "value": 80}
        ]
      }
    },
    {
      "title": "Days Until 80% Full",
      "type": "stat",
      "targets": [{
        "expr": "(0.80 * ceph_cluster_total_bytes - ceph_cluster_total_used_bytes) / (deriv(ceph_cluster_total_used_bytes[7d]) * 86400)"
      }]
    },
    {
      "title": "Capacity Used Over Time",
      "type": "timeseries",
      "targets": [{
        "expr": "ceph_cluster_total_used_bytes",
        "legendFormat": "Used"
      }, {
        "expr": "ceph_cluster_total_bytes * 0.80",
        "legendFormat": "80% threshold"
      }]
    }
  ]
}
```

## Step 5 - Set Up Prometheus Alerting Rules

```yaml
groups:
- name: ceph-capacity-trends
  rules:
  - alert: CephCapacityGrowthWarning
    expr: |
      (0.80 * ceph_cluster_total_bytes - ceph_cluster_total_used_bytes)
      / (deriv(ceph_cluster_total_used_bytes[7d]) * 86400) < 30
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Ceph will reach 80% capacity in less than 30 days"
      description: "Estimated {{ $value | printf \"%.0f\" }} days until 80% full"

  - alert: CephCapacityGrowthCritical
    expr: |
      (0.80 * ceph_cluster_total_bytes - ceph_cluster_total_used_bytes)
      / (deriv(ceph_cluster_total_used_bytes[7d]) * 86400) < 7
    for: 30m
    labels:
      severity: critical
    annotations:
      summary: "Ceph will reach 80% capacity in less than 7 days"
```

## Step 6 - Per-Pool Capacity Reporting

```bash
#!/bin/bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash -c "
echo '=== Pool Capacity Report ==='
ceph df detail --format json | jq -r '
  .pools[] |
  [.name,
   (.stats.stored | . / 1099511627776 | tostring + \" TiB\"),
   (.stats.percent_used * 100 | tostring + \"%\")] |
  @tsv
' | column -t"
```

## Summary

Capacity trend monitoring transforms reactive capacity management into proactive planning. By using Prometheus's `predict_linear` or `deriv` functions on capacity metrics, you can forecast storage exhaustion weeks in advance. Configure alerts at 30 and 7 days before projected capacity limits to trigger procurement processes before you run out of space. Weekly capacity reports help teams understand growth patterns and validate expansion plans.
