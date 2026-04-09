# How to Monitor ceph_mon_quorum_status Metric

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Quorum, Prometheus, Metric, Kubernetes

Description: Use the ceph_mon_quorum_status Prometheus metric to track monitor quorum health and alert on quorum loss before it causes cluster unavailability.

---

## Overview

Ceph monitors form a quorum using the Paxos algorithm. If quorum is lost (a majority of monitors is not available), the entire Ceph cluster becomes unavailable. The `ceph_mon_quorum_status` metric tracks whether each monitor is in quorum.

## Understanding the Metric

The `ceph_mon_quorum_status` metric has a label `ceph_daemon` identifying each monitor and a value of 1 (in quorum) or 0 (not in quorum):

```promql
ceph_mon_quorum_status
```

Example output:

```text
ceph_mon_quorum_status{ceph_daemon="mon.a"} 1
ceph_mon_quorum_status{ceph_daemon="mon.b"} 1
ceph_mon_quorum_status{ceph_daemon="mon.c"} 0
```

Monitor `c` is out of quorum in this example.

## Checking Monitor Status

Verify monitor quorum from the command line:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon stat

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph quorum_status | jq '.'
```

## Querying in Prometheus

Check total monitors in quorum:

```promql
# Count of monitors in quorum
count(ceph_mon_quorum_status == 1)

# Count of monitors out of quorum
count(ceph_mon_quorum_status == 0)

# Any monitor not in quorum
ceph_mon_quorum_status == 0
```

Check that quorum is met (majority of monitors are in quorum):

```promql
# Ratio of in-quorum monitors (should be > 0.5)
sum(ceph_mon_quorum_status) / count(ceph_mon_quorum_status)
```

## Creating Alert Rules

Alert when a monitor drops out of quorum:

```yaml
groups:
- name: ceph-mon-quorum
  rules:
  - alert: CephMonitorNotInQuorum
    expr: ceph_mon_quorum_status == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Ceph monitor {{ $labels.ceph_daemon }} is not in quorum"
      description: "Monitor {{ $labels.ceph_daemon }} has been out of quorum for over 1 minute"

  - alert: CephQuorumAtRisk
    expr: sum(ceph_mon_quorum_status) <= (count(ceph_mon_quorum_status) / 2)
    for: 30s
    labels:
      severity: critical
    annotations:
      summary: "Ceph quorum is at risk - cluster may become unavailable"
```

## Monitoring Monitor Ranks and Versions

Additional monitor metrics to watch:

```promql
# Monitor metadata (version, hostname)
ceph_mon_metadata

# Monitor clock skew
ceph_mon_clock_skew_seconds
```

Alert on excessive clock skew (can cause quorum issues):

```yaml
  - alert: CephMonitorClockSkew
    expr: abs(ceph_mon_clock_skew_seconds) > 0.05
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Monitor clock skew detected: {{ $value }}s"
```

## Building a Quorum Dashboard

Grafana panel configuration for quorum visualization:

```javascript
// Table panel showing monitor status
Query: ceph_mon_quorum_status
Legend: {{ceph_daemon}}

// Gauge showing quorum percentage
Query: sum(ceph_mon_quorum_status) / count(ceph_mon_quorum_status) * 100
Thresholds: 0-60 red, 60-80 yellow, 80-100 green
```

## Recovering from Quorum Loss

If quorum is lost, follow these recovery steps:

```bash
# Check which monitors are running
kubectl -n rook-ceph get pods -l app=rook-ceph-mon

# Check monitor logs
kubectl -n rook-ceph logs rook-ceph-mon-a-<hash> --tail=100

# Recover quorum by extracting and reinserting the monmap (use with extreme care)
# See Rook disaster recovery docs for the full procedure:
# https://rook.io/docs/rook/latest/Troubleshooting/disaster-recovery/
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph-monstore-tool /tmp/mon-store rebuild
```

## Summary

The `ceph_mon_quorum_status` metric provides per-monitor quorum status, essential for detecting and alerting on monitor failures. Monitor the ratio of in-quorum monitors to ensure a majority remains healthy, alert when any monitor drops to 0, and track clock skew to prevent quorum instability in Rook-managed Ceph clusters.
