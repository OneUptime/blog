# How to Fix MON_DISK_CRIT Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Monitor, Disk, Emergency

Description: Learn how to urgently resolve the MON_DISK_CRIT health error in Ceph when monitor disk space drops critically low to prevent cluster unavailability.

---

## Understanding MON_DISK_CRIT

`MON_DISK_CRIT` is a critical-level health check that fires when monitor disk space drops below 5% available (by default). Unlike `MON_DISK_LOW` which is a warning, this condition can prevent monitors from writing state updates, potentially causing the cluster to go read-only or lose quorum.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_ERR critically low disk space on mons
[ERR] MON_DISK_CRIT: mon.a has critically low disk space
    mon.a disk space is 3% of 50GB, below 5% threshold
```

## Immediate Emergency Actions

When disk is critically low, act fast. First, compact the monitor store:

```bash
ceph tell mon.a compact
```

Next, identify and remove unnecessary files from the monitor host:

```bash
# Check what is consuming space
du -sh /var/lib/ceph/mon/ceph-a/* | sort -h
du -sh /var/log/ceph/ | sort -h

# Clear old Ceph logs (safe to delete old rotated logs)
find /var/log/ceph -name "*.gz" -mtime +7 -delete
find /var/log/ceph -name "*.log.*" -mtime +3 -delete
```

## Freeing Space from OSD Journals (if on same partition)

If OSD journal or WAL/DB devices share the same partition as the monitor, check for oversized WAL/DB files:

```bash
du -sh /var/lib/ceph/osd/*/
```

If OSD data is on the same disk, consider migrating OSDs to a dedicated device.

## Expanding PVC in Rook

In Rook deployments, immediately resize the monitor PVC:

```bash
# Check current size
kubectl -n rook-ceph get pvc rook-ceph-mon-a

# Patch to a larger size
kubectl -n rook-ceph patch pvc rook-ceph-mon-a \
  --type=merge -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
```

Monitor the resize operation:

```bash
kubectl -n rook-ceph describe pvc rook-ceph-mon-a | grep -A5 Conditions
```

## Migrating the Monitor to a New Node

If the current node cannot provide more disk space, migrate the monitor.

In Rook/cephadm deployments, use the orchestrator to manage monitor placement:

```bash
# Remove the struggling monitor
ceph orch daemon rm mon.a

# Add a new monitor on a host with sufficient space
ceph orch daemon add mon <new-hostname>
```

For manual (non-orchestrator) deployments, remove the old monitor and bootstrap a new one:

```bash
# Remove the struggling monitor from the cluster
ceph mon rm a

# On the new host, prepare and start the monitor daemon
# (requires copying the monmap and mon keyring, then running ceph-mon --mkfs)
```

Wait for the new monitor to sync and rejoin quorum:

```bash
ceph mon stat
ceph quorum_status -f json-pretty
```

## Adjusting Critical Threshold Temporarily

As a temporary measure while expanding capacity:

```bash
ceph config set mon mon_data_avail_crit 2
```

Do not leave this lowered permanently - restore it after resolving the issue:

```bash
ceph config rm mon mon_data_avail_crit
```

## Verifying Recovery

After freeing space or expanding storage:

```bash
df -h /var/lib/ceph/mon/
ceph health detail
```

Confirm the cluster transitions from `HEALTH_ERR` to `HEALTH_WARN` or `HEALTH_OK`.

## Setting Up Pre-emptive Alerts

Configure Prometheus to alert well before reaching critical levels:

```yaml
- alert: CephMonDiskAlmostFull
  expr: node_filesystem_avail_bytes{mountpoint="/var/lib/ceph/mon"} / node_filesystem_size_bytes{mountpoint="/var/lib/ceph/mon"} < 0.25
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Ceph monitor disk is {{ $value | humanizePercentage }} free"
```

## Summary

`MON_DISK_CRIT` is an emergency condition requiring immediate action. Compact the monitor store, clear old log files, and expand the PVC or underlying disk as quickly as possible. If expansion is not possible, migrate the monitor to a new node with adequate storage. Always alert at 25-30% free space to avoid reaching the critical threshold.
