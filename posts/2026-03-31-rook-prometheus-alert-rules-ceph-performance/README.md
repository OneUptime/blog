# How to Create Prometheus Alert Rules for Ceph Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Prometheus, Alert, Performance, Latency, Kubernetes

Description: Create Prometheus alert rules to detect Ceph performance degradation including high OSD latency, slow operations, and RGW throughput drops in Rook clusters.

---

## Overview

Performance degradation in Ceph often precedes failures. Prometheus alert rules on latency, throughput, and operation backlogs allow you to detect and respond to performance issues before they affect applications.

## OSD Latency Alerts

Alert on high apply and commit latency:

```yaml
groups:
- name: ceph-performance-alerts
  rules:
  - alert: CephOSDHighApplyLatency
    expr: ceph_osd_apply_latency_ms > 100
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} apply latency is {{ $value }}ms"
      description: "High apply latency suggests CPU or memory pressure on the OSD"

  - alert: CephOSDHighCommitLatency
    expr: ceph_osd_commit_latency_ms > 200
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} commit latency is {{ $value }}ms"
      description: "High commit latency suggests disk I/O bottleneck"

  - alert: CephOSDCriticalLatency
    expr: ceph_osd_commit_latency_ms > 1000
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} is experiencing critical latency: {{ $value }}ms"
```

## Slow Operations Alert

Ceph reports slow operations when ops exceed the `osd_op_complaint_time` threshold (default 30s):

```yaml
  - alert: CephSlowOperations
    expr: ceph_health_detail{name="SLOW_OPS"} > 0
    for: 2m
    labels:
      severity: warning
    annotations:
      summary: "Ceph is experiencing slow operations"
      description: "Investigate OSD and network performance. Run 'ceph health detail' for details."
```

## PG Recovery Performance

Alert when recovery is taking too long or backing up:

```yaml
  - alert: CephRecoverySlowed
    expr: ceph_pg_recovering > 0
    for: 30m
    labels:
      severity: info
    annotations:
      summary: "Ceph PG recovery has been running for 30 minutes"

  - alert: CephHighRecoveryRate
    expr: rate(ceph_osd_recovery_ops[5m]) > 1000
    for: 5m
    labels:
      severity: info
    annotations:
      summary: "Ceph recovery rate is high: {{ $value }} ops/s"
```

## RGW Performance Alerts

```yaml
  - alert: CephRGWHighErrorRate
    expr: |
      (rate(ceph_rgw_failed_req[5m]) /
       rate(ceph_rgw_req[5m])) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "RGW error rate is {{ $value | humanizePercentage }}"

  - alert: CephRGWLowThroughput
    expr: |
      rate(ceph_rgw_get_b[5m]) + rate(ceph_rgw_put_b[5m]) < 1048576
    for: 10m
    labels:
      severity: info
    annotations:
      summary: "RGW throughput has dropped below 1 MiB/s"
```

## Client I/O Throughput Alerts

```yaml
  - alert: CephLowClientReadIOPS
    expr: sum(rate(ceph_osd_op_r[5m])) < 10
    for: 15m
    labels:
      severity: info
    annotations:
      summary: "Ceph client read IOPS has dropped below 10"

  - alert: CephHighClientWriteLatency
    expr: |
      rate(ceph_osd_op_w_latency_sum[5m]) /
      rate(ceph_osd_op_w_latency_count[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph client write latency is {{ $value | humanizeDuration }}"
```

## Deploying Performance Alert Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-performance-alerts
  namespace: rook-ceph
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: ceph-performance-alerts
    rules:
    # ... all rules from above
```

```bash
kubectl apply -f ceph-performance-alerts.yaml
kubectl -n rook-ceph get prometheusrule ceph-performance-alerts
```

## Summary

Ceph performance alerts should cover OSD latency (apply and commit), slow operations, PG recovery backlog, RGW error rates, and client I/O throughput. Use tiered severity levels to distinguish informational trends from critical performance issues. Combine alerts with Grafana dashboards for visual correlation of performance metrics.
