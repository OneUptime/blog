# How to Fix OSDMAP_FLAGS Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Flag, Configuration

Description: Learn how to resolve the OSDMAP_FLAGS health warning in Ceph when cluster-wide OSD flags are set that modify normal cluster behavior or disable safety features.

---

## Understanding OSDMAP_FLAGS

Ceph OSD maps have global flags that control cluster-wide behavior. `OSDMAP_FLAGS` fires when one or more of these flags are set. Some flags are set intentionally (e.g., `noout` during maintenance), but leaving them set indefinitely causes this health warning and can disable important cluster self-healing functions.

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN noout flag(s) set
[WRN] OSDMAP_FLAGS: noout flag(s) set
```

## Checking Which Flags Are Set

```bash
ceph osd dump | grep flags
```

The flags line near the top of the output shows all active flags:

```text
flags noout,norebalance
```

## Common Flags and Their Meanings

| Flag | Effect |
|------|--------|
| `noout` | OSDs will not be marked out even if down |
| `norebalance` | No data rebalancing after OSD changes |
| `nobackfill` | No backfill operations |
| `norecover` | No recovery operations |
| `nodown` | OSDs cannot be marked down |
| `pause` | Pauses all I/O |
| `full` | Cluster reports as full (set manually) |
| `noscrub` | No scrubbing |
| `nodeep-scrub` | No deep scrubbing |

## Unsetting Flags

Unset flags that are no longer needed:

```bash
# Unset individual flags
ceph osd unset noout
ceph osd unset norebalance
ceph osd unset nobackfill

# Unset other flags as needed
ceph osd unset norecover
```

Verify flags are cleared:

```bash
ceph osd dump | grep flags
```

## When to Keep Flags Set

Some flags are intentionally used during operations:

```bash
# Before OSD maintenance - prevent data migration
ceph osd set noout

# Do maintenance...
# OSD will not be marked out during this window

# After maintenance - restore normal behavior
ceph osd unset noout
```

Scrub flags during high I/O periods:

```bash
# Temporarily suppress scrubbing during peak hours
ceph osd set noscrub
ceph osd set nodeep-scrub

# Re-enable during off-peak
ceph osd unset noscrub
ceph osd unset nodeep-scrub
```

## Automating Flag Management

Use a cron job to auto-unset maintenance flags:

```bash
#!/bin/bash
# /usr/local/bin/ceph-unset-maintenance-flags.sh
NOOUT=$(ceph osd dump | grep flags | grep -c noout)
if [ "$NOOUT" -gt 0 ]; then
  echo "Unsetting noout flag"
  ceph osd unset noout
fi
```

## Muting Scheduled Maintenance Warnings

If you intentionally set `noout` for planned maintenance and do not want alerts:

```bash
ceph health mute OSDMAP_FLAGS 4h
```

## In Rook Deployments

Rook can set flags automatically during upgrades or operator restarts. Check if Rook set any flags:

```bash
kubectl -n rook-ceph logs deployment/rook-ceph-operator | grep "osd set"
```

If Rook set flags during an incomplete upgrade, restart the operator to allow it to clean up:

```bash
kubectl -n rook-ceph rollout restart deployment rook-ceph-operator
```

## Summary

`OSDMAP_FLAGS` warns that one or more cluster-wide OSD behavior flags are active. After maintenance windows, always unset flags like `noout`, `norebalance`, and `nobackfill` to restore normal cluster behavior. Never leave `pause` or `full` set unintentionally. Automate flag cleanup with scripts or cron jobs to prevent accidental long-term maintenance mode.
