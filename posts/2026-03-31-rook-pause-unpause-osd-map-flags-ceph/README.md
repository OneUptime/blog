# How to Use the pause and unpause OSD Map Flags in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Flag, Maintenance, Storage

Description: Learn how the Ceph pause flag halts all client reads and writes and when to use it for emergency cluster freeze or maintenance operations.

---

The `pause` flag is one of the most powerful OSD map flags in Ceph. When set, it immediately stops all client read and write operations across the entire cluster. Understanding it is essential for emergency procedures and certain migration scenarios.

## What pause Does

When `pause` is set in the OSD map, all Ceph clients that receive the updated map will block their I/O. Existing in-flight operations complete, but no new reads or writes are accepted by OSDs. Monitors, managers, and OSD daemons themselves continue to run.

This is a cluster-wide operation - it affects every pool and every client simultaneously.

## Setting pause

```bash
ceph osd set pause
```

All clients receive the new OSD map epoch and freeze their I/O. Confirm:

```bash
ceph osd dump | grep flags
# flags pauserd,pausewr

ceph status
# HEALTH_WARN pauserd,pausewr flag(s) set
```

## Unsetting pause (unpause)

```bash
ceph osd unset pause
```

Clients receive the updated map and resume I/O immediately.

## Use Case - Emergency Freeze

If a runaway process is overwriting data or a mis-configured application is deleting objects, `pause` gives you an immediate stop button:

```bash
ceph osd set pause
# Identify and stop the problematic process
# Verify data integrity
ceph osd unset pause
```

## Use Case - Atomic Configuration Change

When changing CRUSH rules or pool settings that could cause PG reassignment, pausing I/O ensures no writes are in flight during the change:

```bash
ceph osd set pause

# Apply CRUSH rule change
ceph osd crush rule create-replicated new_rule default host

# Apply pool change
ceph osd pool set mypool crush_rule new_rule

# Resume I/O
ceph osd unset pause
```

## Difference from Other Data-Movement Flags

| Flag | Effect |
|------|--------|
| pause | Stops all client reads AND writes |
| norecover | Stops recovery only |
| nobackfill | Stops backfill only |
| noscrub | Stops light scrubbing only |

`pause` is the most disruptive because it directly impacts application availability.

## Monitoring Client I/O During pause

While paused, you can check that clients are truly blocked:

```bash
# Check cluster I/O rates - io section should show no client reads/writes
ceph status

# Check for in-flight operations on OSDs
ceph tell osd.* dump_ops_in_flight
```

## Using pause in Scripts

```bash
#!/bin/bash
ceph osd set pause
echo "Cluster paused. Press Enter to resume."
read
ceph osd unset pause
echo "Cluster resumed."
```

## Summary

The `pause` and `unpause` operations provide an immediate, cluster-wide I/O freeze that is useful for emergency interventions and atomic configuration changes. Because it directly impacts application availability, it should be used only when the situation requires a complete I/O halt, and it should be unpaused immediately once the required operation is complete.
