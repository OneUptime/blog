# How to Understand OSD Recovery Process in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Recovery, Storage

Description: Understand the Ceph OSD recovery lifecycle - from degraded detection to full replication - and how Rook orchestrates recovery in Kubernetes environments.

---

## What Is OSD Recovery?

When an OSD fails or is removed, Ceph begins recovery to restore the cluster to its target replication or erasure-coded state. Recovery involves copying missing object replicas from surviving OSDs to either the returning OSD or a new one.

Recovery is distinct from backfill:
- **Recovery** - restores objects to their correct OSDs after a peer rejoins
- **Backfill** - moves objects to a new OSD that was not previously a member of the PG

## Recovery Lifecycle

The process follows these stages:

1. OSD goes down - PGs become `degraded`
2. Ceph waits `osd_recovery_delay_start` seconds (default 0)
3. Recovery threads select PGs and begin copying objects
4. PGs transition: `degraded` -> `recovering` -> `active+clean`

Check current recovery state:

```bash
ceph -s
```

Example output during recovery:

```yaml
health: HEALTH_WARN
        Degraded data: 23/150 objects degraded (15.333%)
        recovery: 12345 kB/s, 4 keys/s, 1 objects/s
```

## Key Recovery Metrics

Monitor recovery in detail:

```bash
ceph osd pool stats
ceph pg dump | grep -E "recovering|degraded"
```

Watch live recovery progress:

```bash
watch -n 2 ceph -s
```

Get per-OSD recovery statistics:

```bash
ceph osd perf
```

## Recovery Parameters

Important recovery configuration keys:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `osd_recovery_max_active` | 3 | Max concurrent recovery ops per OSD |
| `osd_recovery_op_priority` | 3 | Priority relative to client I/O |
| `osd_recovery_sleep` | 0 | Delay between recovery ops (seconds) |
| `osd_backfill_scan_min` | 64 | Min objects per backfill scan |

View current settings:

```bash
ceph config get osd osd_recovery_max_active
```

## Rook-Ceph Recovery Configuration

In Rook, configure recovery parameters via the CephCluster spec or config overrides:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephConfig:
    osd:
      osd_recovery_max_active: "3"
      osd_recovery_op_priority: "3"
      osd_recovery_sleep: "0"
```

Apply at runtime using the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_recovery_max_active 3
```

## Recovery and Data Availability

During recovery:
- Data remains readable and writable on healthy PGs
- Degraded PGs continue to serve normal reads and writes as long as `min_size` is still met
- If the number of available replicas for a PG drops below `min_size`, reads and writes to that PG are blocked

Monitor minimum size compliance:

```bash
ceph osd pool get <pool-name> min_size
ceph osd pool get <pool-name> size
```

## Summary

Ceph OSD recovery is an automated process that restores data redundancy after OSD failures. Understanding the recovery lifecycle, key parameters, and health indicators helps operators ensure recovery completes efficiently without starving client I/O. Rook exposes these settings through the CephCluster CRD for Kubernetes-native management.
