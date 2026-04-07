# How to Troubleshoot Slow Snapshot Trimming in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Snapshot, Trimming, Performance, Troubleshooting

Description: Learn how to diagnose and resolve slow snapshot trimming in Ceph, understand what causes trim delays, and tune OSD settings to speed up snapshot object removal.

---

## What is Snapshot Trimming?

When you delete a snapshot in Ceph, the cluster must identify and remove all objects that were only referenced by that snapshot (and no longer needed by any current version or other snapshot). This process is called snapshot trimming. If trimming falls behind, it causes:

- Elevated OSD CPU usage
- PG state showing "snaptrim" or "snaptrim_wait"
- Storage that appears not to be freed after snapshot deletion

## Step 1: Check for Active Snaptrim

```bash
ceph pg dump | grep snaptrim
```

Or check via health:

```bash
ceph health detail | grep snaptrim
```

Example output:
```text
HEALTH_WARN 24 pgs snaptrimming; 8 pgs snaptrim_wait
```

## Step 2: Check Snaptrim Queue Length

```bash
ceph pg dump pgs_brief | grep snaptrim
```

This shows all PGs currently in a snaptrim-related state. You can also check snaptrim activity per-PG with more detail:

```bash
ceph pg dump | grep -E "snaptrim|snaptrim_wait"
```

## Step 3: Monitor OSD CPU During Snaptrim

```bash
kubectl -n rook-ceph top pods -l app=rook-ceph-osd --sort-by=cpu
```

High CPU on specific OSDs indicates active trimming.

## Step 4: Check Snaptrim Sleep and Rate Settings

```bash
ceph config get osd osd_snap_trim_sleep
ceph config get osd osd_snap_trim_sleep_hdd
ceph config get osd osd_snap_trim_sleep_ssd
```

Default sleep values:
- `osd_snap_trim_sleep`: 0 seconds (no sleep)
- `osd_snap_trim_sleep_hdd`: 5 seconds between trim operations

## Step 5: Throttle Snaptrim (if impacting performance)

If snaptrim is causing latency spikes, slow it down:

```bash
# Add a 100ms pause between each trim operation
ceph config set osd osd_snap_trim_sleep 0.1

# For HDD OSDs, increase the sleep
ceph config set osd osd_snap_trim_sleep_hdd 10
```

## Step 6: Speed Up Snaptrim (if too slow)

If snaptrim is falling far behind:

```bash
# Reduce sleep
ceph config set osd osd_snap_trim_sleep 0.0

# Increase the number of concurrent snap trim operations per OSD (default is 2)
ceph config set osd osd_pg_max_concurrent_snap_trims 4
```

## Step 7: Check for Blocked Snaptrim Due to Recovery

If the cluster is recovering, snaptrim may be paused:

```bash
ceph status | grep "recovery\|backfill"
```

Snaptrim priority is lower than recovery. Wait for recovery to complete.

## Step 8: Ensure Snaptrim is Not Disabled

Verify that snap trimming has not been manually disabled on OSDs:

```bash
ceph config get osd osd_snap_trim_sleep
```

If the sleep value was set very high to pause trimming, reset it to allow trimming to proceed:

```bash
ceph config set osd osd_snap_trim_sleep 0.0
```

## Preventing Snaptrim Backlogs

- Avoid deleting many snapshots at once
- Keep snapshot count per image/pool reasonable (< 50)
- Schedule snapshot deletions during off-peak hours

```bash
# Delete snapshots in batches with sleep between
for snap in $(rbd snap ls mypool/myimage --format json | jq -r '.[].name' | head -5); do
  rbd snap rm mypool/myimage@$snap
  sleep 5
done
```

## Summary

Slow snapshot trimming in Ceph occurs when deletion of snapshot objects falls behind. Diagnose with `ceph pg dump | grep snaptrim` and monitor OSD CPU usage. Control trim speed with `osd_snap_trim_sleep` settings - increase sleep to reduce performance impact, decrease it to accelerate trimming. Avoid mass snapshot deletion and instead delete snapshots gradually with pauses between operations to prevent trim backlogs.
