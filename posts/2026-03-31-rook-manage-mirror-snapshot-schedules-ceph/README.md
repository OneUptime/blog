# How to Manage Mirror Snapshot Schedules in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RBD, Snapshot, Schedule, Mirroring

Description: Learn how to list, update, remove, and troubleshoot mirror snapshot schedules in Ceph for effective RBD mirroring management.

---

## Overview

Managing snapshot schedules in Ceph involves listing active schedules, checking their status, updating intervals, removing stale schedules, and diagnosing issues when snapshots are not being created as expected. This guide covers the full lifecycle of snapshot schedule management.

## Listing All Schedules

View all configured snapshot schedules at every level:

```bash
# List global schedules
rbd mirror snapshot schedule ls

# List pool-level schedules
rbd mirror snapshot schedule ls --pool replicapool

# List image-level schedules
rbd mirror snapshot schedule ls --pool replicapool --image myimage

# List everything recursively
rbd mirror snapshot schedule ls --recursive
```

## Checking Schedule Status

The schedule status shows when each image is next scheduled and when it last ran:

```bash
# Check status for a pool
rbd mirror snapshot schedule status --pool replicapool

# Output shows:
# POOL        NAMESPACE  IMAGE     SCHEDULE_TIME
# replicapool            myimage   2026-03-31T01:00:00
```

Check the MGR log if schedules are not executing:

```bash
ceph log last 50 | grep snapshot_schedule
```

## Updating a Schedule

Ceph does not have a direct update command. To change an interval, remove the old schedule and add a new one:

```bash
# Remove the old 1-hour schedule
rbd mirror snapshot schedule remove --pool replicapool 1h

# Add a new 30-minute schedule
rbd mirror snapshot schedule add --pool replicapool 30m 00:00:00
```

## Removing Schedules

```bash
# Remove a specific interval at global level
rbd mirror snapshot schedule remove 24h

# Remove pool-level schedule
rbd mirror snapshot schedule remove --pool replicapool 1h

# Remove image-level schedule
rbd mirror snapshot schedule remove --pool replicapool --image myimage 15m
```

## Troubleshooting Missed Schedules

If snapshots are not being created, check:

```bash
# Check MGR module status
ceph mgr module ls | grep rbd_support

# Re-enable the module if needed
ceph mgr module disable rbd_support
ceph mgr module enable rbd_support

# Check for errors in the MGR log
ceph log last 100 | grep -i "snapshot\|error"

# Verify mirroring is enabled on the image
rbd mirror image info replicapool/myimage
```

## Verifying Snapshot Creation

After confirming schedules are set, verify that snapshots are being created:

```bash
# List snapshots for an image
rbd snap ls replicapool/myimage

# Filter for mirror snapshots only
rbd snap ls replicapool/myimage | grep "mirror.primary"

# Count snapshots to verify frequency
rbd snap ls replicapool/myimage | grep "mirror.primary" | wc -l
```

## Automating Schedule Audits

Use a script to audit all mirrored images and check their schedule status:

```bash
#!/bin/bash
POOL="replicapool"
echo "=== Mirror Snapshot Schedule Audit ==="
echo ""
echo "Pool-level schedules:"
rbd mirror snapshot schedule ls --pool $POOL

echo ""
echo "Schedule status:"
rbd mirror snapshot schedule status --pool $POOL
```

## Summary

Managing Ceph mirror snapshot schedules requires using the `rbd mirror snapshot schedule` sub-commands to list, add, and remove entries. Updates require removing the old schedule and adding a new one. Troubleshooting starts with checking the `rbd_support` MGR module status and reviewing MGR logs for scheduling errors.
