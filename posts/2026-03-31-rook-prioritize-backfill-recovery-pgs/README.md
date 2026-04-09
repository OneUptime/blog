# How to Prioritize Backfill and Recovery for PGs in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Recovery, Placement Group, Storage

Description: Learn how to prioritize backfill and recovery operations for placement groups in Ceph to minimize performance impact during cluster healing.

---

## Understanding Backfill and Recovery in Ceph

When Ceph detects that placement groups (PGs) are degraded or inconsistent, it initiates recovery and backfill operations to restore data redundancy. Recovery handles replication after an OSD failure, while backfill migrates data when PGs are remapped to new OSDs. Both processes compete for cluster I/O resources, and tuning their priority is critical in production environments.

## Key Parameters for Prioritization

Ceph exposes several configuration options to control backfill and recovery throughput and priority.

```bash
# Check current recovery and backfill settings
ceph config get osd.0 osd_recovery_op_priority
ceph config get osd.0 osd_backfill_scan_max
```

The main tunables are:

- `osd_recovery_op_priority` - priority of recovery operations (default: 3)
- `osd_backfill_scan_min` - minimum objects scanned per backfill interval
- `osd_backfill_scan_max` - maximum objects scanned per backfill interval
- `osd_max_backfills` - maximum concurrent backfill operations per OSD
- `osd_recovery_max_active` - maximum concurrent recovery operations per OSD

## Speeding Up Recovery

To accelerate recovery after a disk failure or OSD replacement, increase the resource budget for recovery operations:

```bash
# Increase recovery priority and throughput
ceph config set osd osd_recovery_op_priority 63
ceph config set osd osd_max_backfills 5
ceph config set osd osd_recovery_max_active 5
ceph config set osd osd_recovery_max_single_start 5
```

Monitor progress with:

```bash
ceph -s
ceph pg stat
ceph progress
```

## Reducing Recovery Impact on Client I/O

In cases where recovery is impacting production workloads, throttle the recovery process:

```bash
# Throttle recovery to protect client I/O
ceph config set osd osd_recovery_op_priority 1
ceph config set osd osd_max_backfills 1
ceph config set osd osd_recovery_max_active 1
ceph config set osd osd_backfill_scan_min 4
ceph config set osd osd_backfill_scan_max 16
```

You can also set bandwidth limits on recovery:

```bash
ceph config set osd osd_recovery_sleep 0.5
ceph config set osd osd_recovery_sleep_hdd 0.1
ceph config set osd osd_recovery_sleep_ssd 0.0
```

## Prioritizing Specific PGs

For targeted recovery of critical PGs, use the `pg force-recovery` or `pg force-backfill` commands:

```bash
# Force recovery on a specific PG
ceph pg force-recovery 2.1f

# Force backfill on a specific PG
ceph pg force-backfill 2.1f

# Cancel forced operations
ceph pg cancel-force-recovery 2.1f
ceph pg cancel-force-backfill 2.1f
```

## Monitoring Recovery Progress

Use these commands to track recovery status in detail:

```bash
# Show degraded PG summary
ceph health detail | grep degraded

# List PGs in recovery states
ceph pg dump | grep -E "recovering|backfilling"

# Watch recovery progress live
watch -n 5 'ceph -s | grep -A5 io'
```

## Summary

Ceph provides fine-grained control over backfill and recovery operations through config tunables and per-PG commands. Increasing `osd_recovery_op_priority` and `osd_max_backfills` speeds up healing after failures, while reducing these values protects client I/O. Use `pg force-recovery` and `pg force-backfill` to immediately prioritize critical placement groups during emergencies.
