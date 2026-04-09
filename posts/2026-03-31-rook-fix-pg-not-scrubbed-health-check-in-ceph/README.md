# How to Fix PG_NOT_SCRUBBED Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Placement Group, Health Check, Scrub

Description: Learn how to fix PG_NOT_SCRUBBED in Ceph, a warning that some placement groups have not been scrubbed within the configured interval, leaving data integrity unverified.

---

## What Is PG_NOT_SCRUBBED?

`PG_NOT_SCRUBBED` is a Ceph health warning that fires when one or more Placement Groups have not been scrubbed (light data integrity check) within the `osd_scrub_max_interval` period (default: 7 days). Regular scrubbing is essential for detecting data corruption early.

A "scrub" compares object metadata across replicas to detect inconsistencies. It does not read object data - that requires a "deep scrub". PGs that are never scrubbed may harbor inconsistencies that go undetected until data is needed.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] PG_NOT_SCRUBBED: 48 pgs not scrubbed in time
    pg 2.0 not scrubbed since 2026-03-17
    pg 2.4 not scrubbed since 2026-03-15
```

List all PGs that need scrubbing:

```bash
ceph pg dump -f json | jq -r '.pg_map.pg_stats[] | select(.last_scrub_stamp < (now - 604800 | todate)) | [.pgid, .last_scrub_stamp] | @tsv'
```

## Why PGs Might Not Get Scrubbed

- Scrubbing is restricted to a narrow time window
- The cluster was under heavy load during scrub windows
- `noscrub` flag is set cluster-wide
- Many new PGs were added and haven't been scrubbed yet

## Fix Steps

### Step 1 - Check if Scrubbing is Disabled

```bash
ceph osd dump | grep noscrub
```

If `noscrub` is set, re-enable:

```bash
ceph osd unset noscrub
```

### Step 2 - Check Scrub Time Window Configuration

```bash
ceph config get osd osd_scrub_begin_hour
ceph config get osd osd_scrub_end_hour
```

If the window is too narrow (e.g., only 1 hour per night), widen it:

```bash
ceph config set osd osd_scrub_begin_hour 20
ceph config set osd osd_scrub_end_hour 8
```

### Step 3 - Manually Trigger Scrubs on Overdue PGs

Scrub specific PGs manually:

```bash
ceph pg scrub 2.0
ceph pg scrub 2.4
```

Scrub all PGs in a pool:

```bash
ceph osd pool scrub <pool-name>
```

Scrub all PGs on a specific OSD:

```bash
ceph osd scrub 2
```

### Step 4 - Tune Scrub Aggressiveness

Allow more scrubs per OSD simultaneously:

```bash
ceph config set osd osd_scrub_during_recovery true
ceph config set osd osd_scrub_min_interval 86400
ceph config set osd osd_scrub_max_interval 604800
ceph config set osd osd_scrub_chunk_min 5
ceph config set osd osd_scrub_chunk_max 25
```

## Monitoring Scrub Status

Check the last scrub time for all PGs:

```bash
ceph pg dump -f json | jq -r '.pg_map.pg_stats[] | [.pgid, .last_scrub_stamp] | @tsv' | sort -k2 | head -20
```

## Summary

`PG_NOT_SCRUBBED` warns that PGs have exceeded the maximum scrub interval, leaving data integrity unverified. Fix it by checking if `noscrub` is set and removing it, widening the scrub time window, and manually triggering scrubs on overdue PGs. Regular scrubbing is critical for early detection of data corruption and should not be suppressed for extended periods.
