# How to Track ceph_osd_up and ceph_osd_in Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Prometheus, Metric, Monitoring, Kubernetes

Description: Monitor ceph_osd_up and ceph_osd_in Prometheus metrics to track OSD availability and cluster membership, enabling proactive alerts on OSD failures.

---

## Overview

Two fundamental OSD metrics determine cluster health: `ceph_osd_up` (is the OSD process running and reachable?) and `ceph_osd_in` (is the OSD a member of the CRUSH map and receiving data?). Understanding both is essential for monitoring Ceph cluster data availability.

## Understanding the Metrics

- `ceph_osd_up` - value 1 means the OSD is running; 0 means it is down
- `ceph_osd_in` - value 1 means the OSD is in the cluster (receiving PGs); 0 means it is out

An OSD can be:
- **up and in**: Normal, healthy operation
- **down and in**: OSD process failed but still holding PGs - Ceph is degraded
- **up and out**: OSD is running but marked out (no PGs) - safe for maintenance
- **down and out**: OSD is failed and PGs have been moved away

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree
```

## Querying OSD Status in Prometheus

```promql
# All OSDs that are down
ceph_osd_up == 0

# All OSDs that are out
ceph_osd_in == 0

# Count of OSDs up
sum(ceph_osd_up)

# Count of OSDs in
sum(ceph_osd_in)

# OSDs that are down AND in (most critical - degraded)
ceph_osd_up == 0 and ceph_osd_in == 1
```

## Creating Alert Rules

```yaml
groups:
- name: ceph-osd-availability
  rules:
  - alert: CephOSDDown
    expr: ceph_osd_up == 0
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Ceph OSD {{ $labels.ceph_daemon }} is down"
      description: "OSD {{ $labels.ceph_daemon }} has been down for over 1 minute"

  - alert: CephOSDDegraded
    expr: (ceph_osd_up == 0) and (ceph_osd_in == 1)
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Ceph cluster is degraded - OSD {{ $labels.ceph_daemon }} is down but in"

  - alert: CephOSDAvailabilityLow
    expr: (sum(ceph_osd_up) / count(ceph_osd_up)) < 0.75
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Less than 75% of OSDs are running"
```

## Tracking OSD Count Over Time

Monitor total available OSD capacity:

```promql
# Total OSDs
count(ceph_osd_up)

# Up ratio
sum(ceph_osd_up) / count(ceph_osd_up)

# In ratio
sum(ceph_osd_in) / count(ceph_osd_in)
```

## Correlating with Storage Capacity

Combine OSD status with capacity metrics:

```promql
# Total bytes for up OSDs only (filtered by up status)
ceph_osd_stat_bytes * on(ceph_daemon) group_left() ceph_osd_up
```

## Responding to OSD Down Events

When an alert fires for a down OSD:

```bash
# Check which OSD is down
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd stat

# Get more details
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd find <osd-id>

# Check OSD pod status
kubectl -n rook-ceph get pods -l app=rook-ceph-osd

# View OSD logs
kubectl -n rook-ceph logs rook-ceph-osd-<id>-<hash> --tail=100
```

## Grafana Dashboard Panel

Create a time-series panel:

```javascript
// OSD up/down history
Query A: sum(ceph_osd_up) by (ceph_daemon)
Label: "{{ ceph_daemon }} up"

Query B: sum(ceph_osd_in) by (ceph_daemon)
Label: "{{ ceph_daemon }} in"
```

## Summary

`ceph_osd_up` and `ceph_osd_in` are the two most critical OSD metrics in Prometheus. Alert on `ceph_osd_up == 0` for any down OSD and on the combination of down-but-in for degraded cluster conditions. Monitor the ratio of up OSDs to total OSDs for capacity planning and early warning of systemic issues.
