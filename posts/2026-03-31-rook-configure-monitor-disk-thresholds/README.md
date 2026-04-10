# How to Configure Monitor Disk Space Thresholds (MON_DISK_LOW, MON_DISK_CRIT)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Storage, Alerting

Description: Configure Ceph monitor disk space thresholds MON_DISK_LOW and MON_DISK_CRIT to control health warnings and protect monitor stability in Rook.

---

## Why Monitor Disk Space Thresholds Matter

Ceph monitors store the Paxos database, cluster maps, and transaction logs on disk. If a monitor's data volume fills up, the monitor cannot write new state and will crash, potentially causing quorum loss. Ceph has built-in disk space monitoring for MONs with three configurable thresholds:

- `MON_DISK_LOW` - warning threshold. Default: 30% of total disk space remaining. Generates `HEALTH_WARN`.
- `MON_DISK_CRIT` - critical threshold. Default: 5% remaining. Generates `HEALTH_ERR` and the monitor may stop accepting writes.
- `MON_DISK_BIG` - alert when the monitor database is unexpectedly large. Default: 15 GB.

## Checking Current Disk Health Status

View active monitor disk alerts:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph health detail | grep -E "MON_DISK|disk"
```

Check actual disk usage for monitor data directories:

```bash
# For host-path monitors
NODE=$(kubectl -n rook-ceph get pod rook-ceph-mon-a-<suffix> -o jsonpath='{.spec.nodeName}')
kubectl debug node/$NODE --image=busybox -- df -h /host/var/lib/rook/

# For PVC-backed monitors
kubectl -n rook-ceph exec -it rook-ceph-mon-a-<suffix> -- \
  df -h /var/lib/ceph/mon
```

## Viewing Current Threshold Configuration

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config show mon.a | grep -E "mon_data_avail"
```

## Adjusting MON_DISK_LOW Threshold

Change the warning threshold from the default 30% to a lower value if your monitors have small data volumes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mon mon_data_avail_warn 15
```

This sets the warning threshold to 15% free space.

## Adjusting MON_DISK_CRIT Threshold

Change the critical threshold:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mon mon_data_avail_crit 2
```

## Adjusting the MON_DISK_BIG Threshold

If monitors legitimately store large databases, increase the size warning threshold:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mon mon_data_size_warn 20000000000
```

This sets the threshold to 20 GB (value is in bytes).

## Expanding Monitor PVC Storage

When monitor disk usage genuinely approaches limits, expand the PVC:

```bash
kubectl -n rook-ceph patch pvc rook-ceph-mon-a \
  --type merge \
  -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

Verify the expansion completed:

```bash
kubectl -n rook-ceph get pvc rook-ceph-mon-a
```

## Compacting Monitor Data

Reduce monitor data size by triggering a compaction:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell mon.a compact
```

This compacts the RocksDB database backing the monitor, reclaiming space from deleted entries.

## Summary

Monitor disk thresholds `MON_DISK_LOW` and `MON_DISK_CRIT` protect against monitor data volume exhaustion. Adjust thresholds via `mon_data_avail_warn` and `mon_data_avail_crit` configuration settings. Expand PVCs proactively when usage trends upward, and use `ceph tell mon.a compact` to reclaim space from accumulated monitor database entries.
