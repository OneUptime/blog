# How to Track ceph_pg_active Metric

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, PG, Placement Group, Prometheus, Metric, Kubernetes

Description: Monitor the ceph_pg_active metric to track Placement Group activity in Ceph, enabling alerts when PGs become inactive or stuck in abnormal states.

---

## Overview

Placement Groups (PGs) are the internal sharding mechanism Ceph uses to distribute data across OSDs. The `ceph_pg_active` metric counts the number of PGs in the active state - PGs that are not active cannot serve I/O and indicate a cluster health problem.

## Understanding PG States

A PG passes through multiple states. The key states to monitor:

| State | Meaning |
|-------|---------|
| active | PG is active and can serve I/O |
| clean | PG has the correct number of replicas |
| active+clean | Normal healthy state |
| degraded | Fewer replicas than required |
| recovering | Data being replicated |
| backfilling | PG is being backfilled |
| stale | Primary OSD has not reported in |
| peering | OSDs negotiating PG state |

Check PG status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg stat

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck
```

## Key PG Metrics in Prometheus

```promql
# Active PGs
ceph_pg_active

# Clean PGs (fully healthy)
ceph_pg_clean

# Degraded PGs
ceph_pg_degraded

# Total PGs
ceph_pg_total
```

## Calculating Active PG Ratio

```promql
# Percentage of PGs that are active
(ceph_pg_active / ceph_pg_total) * 100

# PGs that are NOT active
ceph_pg_total - ceph_pg_active
```

## Creating Alert Rules

```yaml
groups:
- name: ceph-pg-health
  rules:
  - alert: CephPGsNotActive
    expr: ceph_pg_total - ceph_pg_active > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "{{ $value }} Ceph PGs are not active"
      description: "Some Placement Groups are inactive and cannot serve I/O"

  - alert: CephPGsNotClean
    expr: ceph_pg_total - ceph_pg_clean > 0
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "{{ $value }} Ceph PGs are not clean"

  - alert: CephPGsDegraded
    expr: ceph_pg_degraded > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "{{ $value }} Ceph PGs are degraded - data at risk"
```

## Investigating Inactive PGs

When `ceph_pg_active` drops below `ceph_pg_total`:

```bash
# Find which PGs are not active
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | grep -v "active+clean"

# Get detail on stuck PGs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck inactive

# Query a specific PG's state
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg <pg-id> query

# Force a specific PG to re-peer
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg repeer <pg-id>
```

## Monitoring PG Scrub Activity

Track PG scrubbing progress:

```promql
# PGs currently scrubbing
ceph_pg_scrubbing

# Deep scrub progress
ceph_pg_deep_scrubbing
```

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | grep scrubbing
```

## Grafana Panel for PG States

```javascript
// Stacked bar chart showing all PG states
Query A: ceph_pg_active
Label: "Active"
Query B: ceph_pg_degraded
Label: "Degraded"
Query C: ceph_pg_total - ceph_pg_active - ceph_pg_degraded
Label: "Other"
```

## Summary

`ceph_pg_active` is a critical health indicator - any PG not in the active state cannot serve I/O. Monitor the ratio of active-to-total PGs, alert when inactive PGs appear, and investigate using `ceph pg dump_stuck inactive` to identify OSDs causing PG peering failures.
