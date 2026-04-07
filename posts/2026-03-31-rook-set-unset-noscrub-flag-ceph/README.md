# How to Set and Unset the noscrub Flag in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Scrub, Flag, Maintenance

Description: Learn how to use the Ceph noscrub flag to pause light scrubbing across the cluster and when it is appropriate to disable this data integrity check.

---

Ceph performs two types of scrubbing: light scrubbing (scrub) that checks object metadata and checksums, and deep scrubbing that reads and verifies all object data. The `noscrub` flag disables the light scrub while leaving deep scrubs unaffected unless you also set `nodeep-scrub`.

## What Scrubbing Does

During a scrub, Ceph's primary OSD for each PG:

1. Compares object lists and metadata across all replica OSDs
2. Verifies checksums where available
3. Reports any inconsistencies via `ceph health detail`

Light scrubs run frequently (daily by default) and are less I/O intensive than deep scrubs.

## Setting the noscrub Flag

```bash
ceph osd set noscrub
```

Verify:

```bash
ceph osd dump | grep flags
ceph status
# HEALTH_WARN: noscrub flag(s) set
```

## Use Case - Reducing I/O During Busy Periods

Scrubbing consumes IOPS. During peak load or a backup window, you may want to pause it:

```bash
ceph osd set noscrub
# Wait for peak period to pass
ceph osd unset noscrub
```

## Use Case - Preventing Alerts During Maintenance

During a rolling upgrade, light scrubs may find apparent inconsistencies that are actually temporary states. Disabling scrub avoids false alerts:

```bash
ceph osd set noscrub
# Perform rolling OSD upgrade
ceph osd unset noscrub
```

## Checking Current Scrub Status

To see which PGs are currently scrubbing:

```bash
ceph pg dump | grep scrubbing
```

To check the last scrub time for a pool:

```bash
ceph pg dump --format json | jq '.pg_stats[] | select(.pgid | startswith("1.")) | {pgid, last_scrub_stamp}'
```

## Per-Pool Scrub Control

You can also control scrub at the pool level:

```bash
# Disable scrub for a specific pool
ceph osd pool set mypool noscrub true

# Re-enable
ceph osd pool set mypool noscrub false
```

## Manually Triggering a Scrub

After removing the flag, you can trigger an immediate scrub on a PG or pool:

```bash
# Scrub a specific PG
ceph pg scrub 1.0

# Scrub all PGs in a pool
ceph osd pool scrub mypool
```

## Unsetting noscrub

```bash
ceph osd unset noscrub
```

After unsetting, scrubbing resumes according to the configured schedule.

```bash
ceph osd dump | grep flags
ceph health
```

## Summary

The `noscrub` flag temporarily pauses light scrubbing to reduce I/O load during high-traffic periods or maintenance windows. It should be used as a short-term measure because extended periods without scrubbing increase the risk of undetected data inconsistencies. Always re-enable scrubbing as soon as the triggering condition is resolved.
