# How to Monitor Ceph Recovery Impact on Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Recovery, Performance

Description: Learn how to monitor Ceph recovery operations and their impact on client performance, and how to tune recovery priority and backfill settings to protect production workloads.

---

## Why Recovery Affects Client Performance

When OSDs are added, removed, or fail, Ceph redistributes data through backfill and recovery processes. These operations consume disk IO and network bandwidth, which competes directly with client workloads. Monitoring recovery activity helps you understand the performance impact and tune recovery settings accordingly.

## Check Recovery Status

View current recovery and backfill activity:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph -s
  ceph pg stat
"
```

Look for PG states like `active+recovering`, `active+backfilling`, or `degraded+recovering` in the output.

## Monitor Recovery Throughput in Prometheus

Key metrics for recovery IO:

```bash
# Recovery throughput in bytes/sec
rate(ceph_osd_recovery_bytes[5m])

# Number of recovery operations per second
rate(ceph_osd_recovery_ops[5m])

# Current client IO while recovery is active (summed across all pools)
sum(rate(ceph_pool_wr_bytes[5m]))
sum(rate(ceph_pool_rd_bytes[5m]))
```

Build a Grafana panel overlaying client IOPS and recovery throughput to visualize contention.

## Measure Recovery Speed via CLI

Track recovery progress directly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # List PGs currently in recovery state
  ceph pg ls recovering

  # Watch recovery in real time
  ceph -w | grep -E 'recovery|backfill|degraded'
"
```

## Tune Recovery Priority Settings

Limit recovery IO to protect client performance. These settings control how aggressively Ceph recovers:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Reduce max concurrent backfills per OSD (default: 1)
  ceph tell 'osd.*' injectargs '--osd-max-backfills 1'

  # Increase recovery sleep to throttle throughput (default: 0)
  ceph tell 'osd.*' injectargs '--osd-recovery-sleep 0.1'

  # Set max recovery chunk size
  ceph tell 'osd.*' injectargs '--osd-recovery-max-chunk 8388608'
"
```

For persistent tuning, set these in the CephCluster spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    osd:
      osd_max_backfills: "1"
      osd_recovery_sleep: "0.05"
```

## Prioritize Client IO During Recovery

Use the `osd_client_op_priority` setting to give client operations priority over recovery:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  # Client ops priority (default 63, recovery default 3)
  ceph tell 'osd.*' injectargs '--osd-client-op-priority 63'
  ceph tell 'osd.*' injectargs '--osd-recovery-op-priority 3'
"
```

## Alert on Extended Recovery

Alert when recovery runs longer than expected:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: ceph-recovery-alerts
  namespace: rook-ceph
spec:
  groups:
    - name: ceph-recovery
      rules:
        - alert: CephLongRecovery
          expr: ceph_pg_degraded > 0
          for: 2h
          labels:
            severity: warning
          annotations:
            summary: "Ceph has {{ $value }} degraded PGs for over 2 hours"
```

## Summary

Monitoring Ceph recovery impact involves tracking both recovery throughput and client IO simultaneously in Prometheus, watching PG states for extended degraded periods, and tuning `osd_max_backfills`, `osd_recovery_sleep`, and operation priorities to protect client performance. Overlaying client and recovery IO on a single Grafana panel makes the contention immediately visible.
