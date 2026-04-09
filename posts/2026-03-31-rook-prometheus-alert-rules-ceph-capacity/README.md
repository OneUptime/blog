# How to Create Prometheus Alert Rules for Ceph Capacity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Prometheus, Alert, Capacity, Storage, Kubernetes

Description: Build Prometheus alert rules that warn on Ceph storage capacity thresholds at cluster, pool, and OSD levels to prevent storage exhaustion.

---

## Overview

Ceph becomes read-only when raw capacity reaches the `full_ratio` (default 95%). The `backfillfull_ratio` (default 90%) prevents backfill and recovery operations, and `nearfull_ratio` (default 85%) triggers health warnings. Alert rules at 75% and 85% provide sufficient warning time to expand capacity before hitting these hard limits.

## Understanding Ceph Capacity Limits

Check current thresholds:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd dump | grep -E "full_ratio|nearfull_ratio|backfillfull_ratio"
```

Default output:

```text
full_ratio 0.95
backfillfull_ratio 0.9
nearfull_ratio 0.85
```

## Cluster-Level Capacity Alerts

```yaml
groups:
- name: ceph-capacity-alerts
  rules:
  - alert: CephClusterNearFull
    expr: |
      (ceph_cluster_total_used_bytes / ceph_cluster_total_bytes) > 0.75
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "Ceph cluster storage is {{ $value | humanizePercentage }} full"
      description: "Plan capacity expansion. Cluster will reject writes at 90%."

  - alert: CephClusterHighUsage
    expr: |
      (ceph_cluster_total_used_bytes / ceph_cluster_total_bytes) > 0.85
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Ceph cluster storage critically high: {{ $value | humanizePercentage }}"
      description: "Add OSDs immediately. Cluster will enter read-only mode at 95%."

  - alert: CephClusterFull
    expr: |
      (ceph_cluster_total_used_bytes / ceph_cluster_total_bytes) > 0.90
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Ceph cluster is FULL - writes are being rejected"
```

## Pool-Level Capacity Alerts

```yaml
  - alert: CephPoolNearFull
    expr: |
      (ceph_pool_bytes_used /
       (ceph_pool_bytes_used + ceph_pool_max_avail)) > 0.75
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Ceph pool {{ $labels.name }} is {{ $value | humanizePercentage }} full"

  - alert: CephPoolCritical
    expr: |
      (ceph_pool_bytes_used /
       (ceph_pool_bytes_used + ceph_pool_max_avail)) > 0.85
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Ceph pool {{ $labels.name }} is critically full: {{ $value | humanizePercentage }}"
```

## OSD-Level Capacity Alerts

Alert on individual OSD near-full conditions (can cause data imbalance):

```yaml
  - alert: CephOSDNearFull
    expr: |
      (ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) > 0.85
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} is {{ $value | humanizePercentage }} full"
      description: "Unbalanced OSD may require reweighting"

  - alert: CephOSDFull
    expr: |
      (ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) > 0.95
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} is FULL"
```

## Predictive Capacity Alert

Alert when cluster will fill within 7 days:

```yaml
  - alert: CephCapacityExhaustionPredicted
    expr: |
      predict_linear(ceph_cluster_total_used_bytes[7d], 86400 * 7) >
      ceph_cluster_total_bytes * 0.90
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Ceph cluster predicted to exceed 90% capacity within 7 days"
      description: "Current growth trend indicates capacity exhaustion soon."
```

## Deploying the PrometheusRule

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-capacity-alerts
  namespace: rook-ceph
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: ceph-capacity-alerts
    rules:
    # ... rules from above
```

```bash
kubectl apply -f ceph-capacity-alerts.yaml
```

## Summary

Ceph capacity alert rules should operate at three levels: cluster (75% warn, 85% critical), pool (individual pool thresholds), and OSD (per-disk near-full). Add a `predict_linear` alert for proactive 7-day forecasting. This multi-tier approach ensures you have sufficient warning time to expand capacity before hitting Ceph's hard limits at 90-95%.
