# How to Create Prometheus Alert Rules for Ceph PG Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Prometheus, Alert, PG, Placement Group, Kubernetes

Description: Build targeted Prometheus alert rules for Ceph Placement Group issues including degraded, stuck, inconsistent, and undersized PG states in Rook clusters.

---

## Overview

Placement Group (PG) states determine whether Ceph data is accessible and properly replicated. PG issues range from minor (backfilling after OSD addition) to critical (degraded PGs where data is under-replicated). This guide covers alert rules for all important PG states.

## PG State Metrics Reference

Key PG metrics available in Prometheus:

```promql
ceph_pg_active        # PGs serving I/O
ceph_pg_clean         # PGs with full replica count
ceph_pg_degraded      # PGs with fewer replicas than required
ceph_pg_undersized    # PGs with fewer OSDs than pool size
ceph_pg_stale         # PGs whose primary hasn't reported
ceph_pg_peering       # PGs currently peering
ceph_pg_backfilling   # PGs being backfilled
ceph_pg_recovering    # PGs with data being recovered
ceph_pg_inconsistent  # PGs with inconsistent data (needs scrub repair)
ceph_pg_total         # Total PG count
```

## Critical PG Alerts

Alert on conditions that risk data loss:

```yaml
groups:
- name: ceph-pg-alerts
  rules:
  - alert: CephPGsDegraded
    expr: ceph_pg_degraded > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "{{ $value }} Ceph PGs are degraded"
      description: "Degraded PGs have fewer replicas than required. Data is at risk if more OSDs fail."

  - alert: CephPGsUndersized
    expr: ceph_pg_undersized > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "{{ $value }} Ceph PGs are undersized"
      description: "Fewer active OSDs than the pool's size (replication factor) setting"

  - alert: CephPGsInconsistent
    expr: ceph_pg_inconsistent > 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "{{ $value }} Ceph PGs have inconsistent data"
      description: "Run 'ceph pg repair <pgid>' to resolve. Potential data corruption."
```

## Warning-Level PG Alerts

```yaml
  - alert: CephPGsStale
    expr: ceph_pg_stale > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "{{ $value }} Ceph PGs are stale"
      description: "Primary OSD has not reported. Check OSD status."

  - alert: CephPGsNotActive
    expr: ceph_pg_total - ceph_pg_active > 0
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "{{ $value }} Ceph PGs are not active"
      description: "Inactive PGs cannot serve client I/O"
```

## Recovery and Backfill Alerts

```yaml
  - alert: CephPGsLongRecovery
    expr: ceph_pg_recovering > 0
    for: 60m
    labels:
      severity: warning
    annotations:
      summary: "{{ $value }} PGs have been recovering for over 60 minutes"
      description: "Long recovery may indicate slow disks or network issues"

  - alert: CephPGsLongBackfill
    expr: ceph_pg_backfilling > 0
    for: 120m
    labels:
      severity: info
    annotations:
      summary: "{{ $value }} PGs have been backfilling for over 2 hours"
```

## Peering Stuck Alert

```yaml
  - alert: CephPGsStuckPeering
    expr: ceph_pg_peering > 0
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "{{ $value }} Ceph PGs stuck in peering for 15 minutes"
      description: "Check if required OSDs are available for these PGs to peer"
```

## PG Count Change Alert

Alert when total PG count drops unexpectedly:

```yaml
  - alert: CephPGCountDrop
    expr: |
      (ceph_pg_total offset 5m) - ceph_pg_total > 10
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph PG count dropped by {{ $value }}"
```

## Deploying PG Alert Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-pg-alerts
  namespace: rook-ceph
  labels:
    prometheus: kube-prometheus
    role: alert-rules
spec:
  groups:
  - name: ceph-pg-alerts
    rules:
    # ... all rules from above
```

```bash
kubectl apply -f ceph-pg-alerts.yaml

# Verify rule is loaded
kubectl -n rook-ceph get prometheusrule ceph-pg-alerts
```

## Investigating PG Issues When Alerts Fire

```bash
# See all non-clean PGs
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump_stuck

# Repair inconsistent PG
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg repair 1.0

# Prioritize recovery of a PG
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg force-recovery 1.0
```

## Summary

Ceph PG alert rules should cover critical states (degraded, undersized, inconsistent) with short for-durations, warning states (stale, inactive, peering) with medium durations, and informational states (long recovery, backfilling) with longer durations. Use `ceph pg dump_stuck` to investigate when alerts fire and `ceph pg repair` for inconsistencies.
