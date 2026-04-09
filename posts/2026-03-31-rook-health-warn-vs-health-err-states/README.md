# How to Understand HEALTH_WARN vs HEALTH_ERR States in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Health Check

Description: Understand the difference between HEALTH_WARN and HEALTH_ERR in Ceph, what each state means for cluster operations, and how to respond to each.

---

## Ceph Health State Overview

Ceph expresses its overall health through three states: `HEALTH_OK`, `HEALTH_WARN`, and `HEALTH_ERR`. Understanding the difference between `HEALTH_WARN` and `HEALTH_ERR` is essential for prioritizing responses and avoiding unplanned data loss or downtime.

Get the current state at any time:

```bash
ceph health
```

Or for detailed breakdown:

```bash
ceph health detail
```

## HEALTH_OK

`HEALTH_OK` means the cluster is fully operational, all OSDs are up and in, all placement groups are active and clean, and no significant configuration issues have been detected.

```text
HEALTH_OK
```

## HEALTH_WARN

`HEALTH_WARN` indicates a condition that requires attention but does not currently prevent the cluster from serving data. The cluster is still functional. Warnings are informational alerts about suboptimal configurations, non-critical missing features, or minor operational issues.

Common HEALTH_WARN conditions:

```text
HEALTH_WARN 3 osds down
[WRN] OSD_DOWN: 3 osds down
    osd.12 (root=default,host=node3) is down
    osd.13 (root=default,host=node3) is down
    osd.14 (root=default,host=node3) is down
```

Other examples of warnings: clock skew detected, nearfull OSDs, telemetry not configured, deprecated settings in use.

## HEALTH_ERR

`HEALTH_ERR` indicates a critical condition that may already be preventing the cluster from servicing some or all I/O. This demands immediate action. Examples include insufficient OSDs for replication, placement groups stuck, or insufficient monitors for quorum.

Sample error state:

```text
HEALTH_ERR 15 pgs not active; 30 pgs degraded
[ERR] PG_AVAILABILITY: 15 pgs not active
    pg 2.20 is stuck inactive for 3600 sec, current state unknown
[WRN] PG_DEGRADED: 30 pgs degraded
    pg 2.1f is active+degraded, acting [0,2]
```

## Key Differences

| Aspect | HEALTH_WARN | HEALTH_ERR |
|---|---|---|
| Data availability | Usually intact | May be degraded or unavailable |
| I/O impact | Typically none | Possible I/O errors or slowness |
| Response urgency | Address soon | Address immediately |
| Auto-recovery | Often self-resolving | Rarely self-resolving |

## Responding in Rook Environments

Access the Ceph CLI via the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

For warnings, triage with:

```bash
ceph health detail
ceph status
```

For errors, also check OSD and placement group state immediately:

```bash
ceph osd stat
ceph pg stat
ceph pg dump_stuck
```

## Alerting on Health States

In Prometheus-based monitoring (as provided by Rook), the `ceph_health_status` metric tracks the numeric value of health state (0=OK, 1=WARN, 2=ERR). Set up alerts:

```yaml
- alert: CephHealthError
  expr: ceph_health_status == 2
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Ceph cluster is in HEALTH_ERR state"

- alert: CephHealthWarn
  expr: ceph_health_status == 1
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "Ceph cluster has HEALTH_WARN conditions"
```

## Summary

`HEALTH_WARN` represents non-critical conditions that need attention but do not block cluster I/O, while `HEALTH_ERR` indicates critical failures that may already be causing data unavailability or I/O errors. Always triage `HEALTH_ERR` immediately using `ceph health detail`, `ceph osd stat`, and `ceph pg dump_stuck`. Configure Prometheus alerts for both states to ensure timely notification.
