# How to Fix PG_NOT_DEEP_SCRUBBED Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Placement Group, Health Check, Deep Scrub

Description: Learn how to fix PG_NOT_DEEP_SCRUBBED in Ceph, a warning that placement groups have not been deep scrubbed within the configured interval for full data verification.

---

## What Is PG_NOT_DEEP_SCRUBBED?

`PG_NOT_DEEP_SCRUBBED` is a Ceph health warning that fires when Placement Groups have not been deep scrubbed within the `osd_deep_scrub_interval` period (default: 7 days). A deep scrub reads the actual object data and verifies checksums against stored values, providing a thorough integrity check.

Unlike a regular scrub (which only checks metadata), a deep scrub can detect silent data corruption (bit rot) where data changes on disk without any filesystem-level error. Deep scrubs are more I/O intensive but essential for long-term data integrity.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] PG_NOT_DEEP_SCRUBBED: 32 pgs not deep-scrubbed in time
    pg 3.1 not deep-scrubbed since 2026-03-14
```

List PGs sorted by oldest deep scrub first:

```bash
ceph pg dump --format=json | jq -r '.pg_map.pg_stats[] | "\(.pgid) \(.last_deep_scrub_stamp)"' | sort -k2 | head -20
```

## Why Deep Scrubs Get Skipped

- `nodeep-scrub` flag is set
- High I/O load caused scrubs to be postponed
- Deep scrub window is too restrictive
- PGs were recently created

## Fix Steps

### Step 1 - Check if nodeep-scrub is Set

```bash
ceph osd dump | grep nodeep
```

Remove it if set:

```bash
ceph osd unset nodeep-scrub
```

### Step 2 - Check Deep Scrub Window

```bash
ceph config get osd osd_deep_scrub_interval
ceph config get osd osd_scrub_begin_hour
ceph config get osd osd_scrub_end_hour
```

Widen the scrub window:

```bash
ceph config set osd osd_scrub_begin_hour 18
ceph config set osd osd_scrub_end_hour 9
```

### Step 3 - Manually Trigger Deep Scrubs

Trigger a deep scrub on specific PGs:

```bash
ceph pg deep-scrub 3.1
ceph pg deep-scrub 3.4
```

Deep scrub all PGs in a pool:

```bash
for pg in $(ceph pg ls-by-pool <pool-name> --format=json | jq -r '.[].pgid'); do
  ceph pg deep-scrub "$pg"
done
```

Deep scrub all PGs on a specific OSD:

```bash
ceph osd deep-scrub osd.2
```

### Step 4 - Schedule Deep Scrubs During Off-Peak Hours

Configure the scrub window specifically for deep scrubs:

```bash
ceph config set osd osd_deep_scrub_interval 604800
ceph config set osd osd_scrub_load_threshold 0.5
```

Reduce I/O impact of scrubs by adding a sleep between scrub operations:

```bash
ceph config set osd osd_scrub_sleep 0.1
```

## Monitoring Deep Scrub Progress

```bash
ceph pg dump | grep scrubbing
watch "ceph -s | grep scrub"
```

Check last deep scrub times:

```bash
ceph pg dump --format=json | jq -r '.pg_map.pg_stats[] | "\(.pgid) \(.last_deep_scrub_stamp)"' | sort -k2 | head -20
```

## Impact on Cluster I/O

Deep scrubs are I/O intensive. Schedule them during maintenance windows for production clusters:

```bash
ceph osd set nodeep-scrub  # disable during business hours
ceph osd unset nodeep-scrub  # re-enable during maintenance
```

## Summary

`PG_NOT_DEEP_SCRUBBED` means some PGs have not had their data checksums fully verified within the configured interval. Fix it by removing the `nodeep-scrub` flag, widening the scrub window, and manually triggering deep scrubs on overdue PGs. Regular deep scrubbing is critical for detecting bit rot and silent data corruption - do not suppress it indefinitely.
