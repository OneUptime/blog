# How to Create Prometheus Alert Rules for Ceph Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Prometheus, Alert, Health, Monitoring, Kubernetes

Description: Create Prometheus alert rules covering all Ceph health checks including monitor quorum, OSD health, PG states, and overall cluster status for Rook deployments.

---

## Overview

Ceph exposes a rich set of health-related metrics in Prometheus. This guide covers building a comprehensive set of health alert rules that mirrors what `ceph health detail` reports, enabling automated notification of all cluster health changes.

## Cluster Health Status Alerts

The top-level health metric:

```yaml
groups:
- name: ceph-health-alerts
  rules:
  - alert: CephHealthWarning
    expr: ceph_health_status == 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph cluster health is WARN"
      description: "Run 'ceph health detail' to see specific health checks"

  - alert: CephHealthError
    expr: ceph_health_status == 2
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Ceph cluster health is ERROR - immediate action required"
```

## Monitor Health Alerts

```yaml
  - alert: CephMonitorNotInQuorum
    expr: ceph_mon_quorum_status == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Monitor {{ $labels.ceph_daemon }} is not in quorum"

  - alert: CephMonitorClockSkew
    expr: abs(ceph_mon_clock_skew_seconds) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Monitor clock skew: {{ $value }}s (max 0.05s)"
      description: "Fix NTP synchronization to prevent quorum instability"
```

## OSD Health Alerts

```yaml
  - alert: CephOSDDown
    expr: ceph_osd_up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} is down"

  - alert: CephOSDWeightZero
    expr: ceph_osd_weight == 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} has zero weight - not receiving data"
```

## PG Health Alerts

```yaml
  - alert: CephPGsDegraded
    expr: ceph_pg_degraded > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "{{ $value }} Ceph PGs are degraded - data is under-replicated"

  - alert: CephPGsNotClean
    expr: ceph_health_detail{name="PG_NOT_CLEAN"} > 0
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "Ceph PGs have been unclean for 15 minutes"

  - alert: CephPGsBackfillBlocked
    expr: ceph_health_detail{name="PG_BACKFILL_FULL"} > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph backfill is blocked due to full OSDs"
```

## Device Health Alerts

```yaml
  - alert: CephDeviceHealthDegraded
    expr: ceph_health_detail{name="DEVICE_HEALTH"} > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph has detected degraded device health"
      description: "Check 'ceph device ls' for devices with health issues"

  - alert: CephDeviceHealthPredictedFailure
    expr: ceph_health_detail{name="DEVICE_HEALTH_TOOMANY"} > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph has devices predicted to fail soon"
```

## Pool Health Alerts

```yaml
  - alert: CephPoolFull
    expr: ceph_health_detail{name="POOL_FULL"} > 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "A Ceph pool is full - writes are blocked"

  - alert: CephPoolNearFull
    expr: ceph_health_detail{name="POOL_NEAR_FULL"} > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "A Ceph pool is near full"
```

## Deploying All Health Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-health-alerts
  namespace: rook-ceph
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: ceph-health-alerts
    rules:
    # ... all rules from above
```

```bash
kubectl apply -f ceph-health-alerts.yaml
kubectl -n rook-ceph get prometheusrule
```

## Summary

Comprehensive Ceph health alerting requires covering the cluster health status metric, monitor quorum and clock skew, OSD up/down states and weights, PG degraded and unclean conditions, backfill capacity, device health predictions, and pool capacity. Organizing these into severity levels ensures on-call teams receive appropriately prioritized notifications for each type of health event.
