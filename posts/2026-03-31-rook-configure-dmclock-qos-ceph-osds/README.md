# How to Configure DmClock QoS for Ceph OSDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, QoS, DmClock, OSD

Description: Learn how to configure DmClock distributed QoS scheduling for Ceph OSDs to prioritize workloads and prevent noisy-neighbor I/O contention.

---

## What is DmClock?

DmClock is a distributed quality-of-service scheduling algorithm used by Ceph to manage I/O requests across OSDs. It implements a three-parameter QoS model:

- **Reservation** - Minimum guaranteed I/O rate (floor)
- **Weight** - Proportional share of available capacity above reservations
- **Limit** - Maximum allowed I/O rate (ceiling)

This model prevents any single client from monopolizing OSD resources while ensuring critical workloads receive their minimum guaranteed performance.

## Enabling mClock Scheduler

DmClock in Ceph is implemented as the `mclock_scheduler` OSD operation queue. Enable it:

```bash
ceph config set osd osd_op_queue mclock_scheduler
```

Verify it is active:

```bash
ceph config get osd osd_op_queue
```

## Understanding mClock Profiles

Ceph provides built-in mClock profiles that set sensible defaults:

```bash
# Check current profile
ceph config get osd osd_mclock_profile
```

Available profiles:
- `balanced` - Equal weight for client and recovery I/O
- `high_client_ops` - Prioritizes client I/O over recovery
- `high_recovery_ops` - Prioritizes background recovery over client I/O

Set a profile:

```bash
ceph config set osd osd_mclock_profile balanced
```

## Configuring Custom mClock Parameters

For precise control, first switch to the `custom` profile, then set individual parameters. Built-in profiles lock mClock parameters and silently revert manual changes, so the `custom` profile must be active:

```bash
# Enable custom profile to allow manual parameter tuning
ceph config set osd osd_mclock_profile custom


# Set reservations (IOPS guaranteed minimum)
ceph config set osd osd_mclock_scheduler_client_res 500
ceph config set osd osd_mclock_scheduler_background_recovery_res 100
ceph config set osd osd_mclock_scheduler_background_best_effort_res 50

# Set weights (proportional share)
ceph config set osd osd_mclock_scheduler_client_wgt 200
ceph config set osd osd_mclock_scheduler_background_recovery_wgt 50
ceph config set osd osd_mclock_scheduler_background_best_effort_wgt 50

# Set limits (maximum IOPS)
ceph config set osd osd_mclock_scheduler_client_lim 1500
ceph config set osd osd_mclock_scheduler_background_recovery_lim 300
ceph config set osd osd_mclock_scheduler_background_best_effort_lim 200
```

## Applying Per-OSD Configuration

Override settings for specific OSDs that serve different workload types:

```bash
# Higher limit for NVMe OSDs
ceph config set osd.0 osd_mclock_scheduler_client_lim 5000
ceph config set osd.1 osd_mclock_scheduler_client_lim 5000

# Lower limit for slower HDDs
ceph config set osd.8 osd_mclock_scheduler_client_lim 500
ceph config set osd.9 osd_mclock_scheduler_client_lim 500
```

## Verifying mClock Configuration

Check that configuration is applied:

```bash
ceph daemon osd.0 config show | grep mclock
```

Dump the current scheduler state:

```bash
ceph daemon osd.0 dump_op_pq_state
```

## Benchmarking QoS Effectiveness

Test QoS by running competing workloads and measuring allocation:

```bash
# Competing client workload in one pool
rados bench -p test-pool 60 write --no-cleanup &

# Primary client workload in another pool
rados bench -p prod-pool 60 write --no-cleanup

# Compare IOPS - observe how mClock distributes capacity between clients
```

## Summary

DmClock QoS scheduling in Ceph ensures fair and predictable I/O distribution across OSDs using a three-parameter model of reservation, weight, and limit. Enabling the `mclock_scheduler` and choosing an appropriate profile provides immediate improvements over the default `wpq` (WeightedPriorityQueue), while custom parameter tuning allows precise control over how available IOPS are allocated between client and background workloads.
