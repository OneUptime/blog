# How to Create Prometheus Alert Rules for Ceph OSD Down

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Prometheus, Alert, OSD, Monitoring, Kubernetes

Description: Create comprehensive Prometheus alert rules to detect and respond to Ceph OSD failures, covering single OSD down, multiple OSD failures, and OSD flapping scenarios.

---

## Overview

OSD failures are the most common source of Ceph cluster health problems. Well-crafted Prometheus alert rules help you detect OSD issues quickly, distinguish between severity levels, and avoid alert fatigue from transient failures.

## Prerequisites

Ensure Rook monitoring is enabled:

```yaml
spec:
  monitoring:
    enabled: true
```

Verify metrics are exposed:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  curl -s http://rook-ceph-mgr.rook-ceph.svc.cluster.local:9283/metrics | \
  grep "ceph_osd_up"
```

## Basic OSD Down Alert

Alert when a single OSD goes down:

```yaml
groups:
- name: ceph-osd-alerts
  rules:
  - alert: CephOSDDown
    expr: ceph_osd_up == 0
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Ceph OSD {{ $labels.ceph_daemon }} is down"
      description: "OSD {{ $labels.ceph_daemon }} has been down for 1 minute. Check the OSD pod and disk."
      runbook_url: "https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/"
```

## Alert for Degraded Data (OSD Down and In)

This is more critical - data cannot be fully replicated:

```yaml
  - alert: CephOSDDegraded
    expr: (ceph_osd_up == 0) and (ceph_osd_in == 1)
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Ceph data is degraded - OSD {{ $labels.ceph_daemon }} is down but still in the cluster"
      description: "Data cannot be fully replicated. Risk of data loss if another OSD fails."
```

## Alert for Multiple OSD Failures

Escalate when multiple OSDs are down:

```yaml
  - alert: CephMultipleOSDsDown
    expr: sum(ceph_osd_up == bool 0) >= 2
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "{{ $value }} Ceph OSDs are down simultaneously"
      description: "Multiple OSD failure may lead to data unavailability and data loss risk."
```

## Alert for Percentage of OSDs Down

```yaml
  - alert: CephHighPercentageOSDDown
    expr: |
      (count(ceph_osd_up == 0) / count(ceph_osd_up)) > 0.10
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "{{ $value | humanizePercentage }} of Ceph OSDs are down"
```

## Alert for OSD Flapping

Detect OSDs that repeatedly come up and down:

```yaml
  - alert: CephOSDFlapping
    expr: changes(ceph_osd_up[15m]) > 4
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} is flapping ({{ $value }} state changes in 15 min)"
      description: "OSD instability may indicate disk hardware issues or network problems."
```

## Alert for Near-Full OSD

```yaml
  - alert: CephOSDNearFull
    expr: |
      (ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) > 0.85
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "OSD {{ $labels.ceph_daemon }} is {{ $value | humanizePercentage }} full"
```

## Deploying the Alert Rules

Create a PrometheusRule resource:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-osd-alerts
  namespace: rook-ceph
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: ceph-osd-alerts
    rules:
    # ... paste rules above here
```

```bash
kubectl apply -f ceph-osd-alerts.yaml
kubectl -n rook-ceph get prometheusrule ceph-osd-alerts
```

## Testing Alert Rules

```bash
# Force an OSD down to test
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd down 0

# Verify alert fires in Alertmanager
kubectl port-forward svc/alertmanager-operated 9093:9093 -n monitoring
# Then check http://localhost:9093
```

## Summary

Comprehensive Ceph OSD alert rules should cover single OSD failures, degraded data states, multiple simultaneous failures, OSD flapping, and near-full conditions. Use severity levels to distinguish between warnings (single OSD down) and critical alerts (multiple down or degraded data). Always include runbook URLs in annotations for faster incident response.
