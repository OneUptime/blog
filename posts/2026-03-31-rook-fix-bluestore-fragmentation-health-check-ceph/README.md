# How to Fix BLUESTORE_FRAGMENTATION Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, BlueStore, Fragmentation, Performance

Description: Learn how to diagnose and resolve the BLUESTORE_FRAGMENTATION health warning in Ceph when BlueStore block device allocation becomes heavily fragmented.

---

## Understanding BLUESTORE_FREE_FRAGMENTATION

BlueStore manages its own block allocator directly on top of raw devices. Over time, as objects are written and deleted, the free space on a BlueStore OSD can become fragmented - split into many small non-contiguous extents rather than a few large ones. `BLUESTORE_FREE_FRAGMENTATION` fires when the fragmentation score exceeds the warning threshold (default 0.8 on a scale of 0 to 1).

Check current health:

```bash
ceph health detail
```

Example output:

```text
HEALTH_WARN 1 OSD(s) have free space fragmentation above the warning threshold(0.800000)
[WRN] BLUESTORE_FREE_FRAGMENTATION: osd.4 0.830000
```

## Measuring Fragmentation Score

Check the current fragmentation score for each OSD:

```bash
ceph daemon osd.4 bluestore allocator score block
```

Or via Prometheus:

```bash
curl -s http://localhost:9283/metrics | grep bluestore_frag
```

In Rook:

```bash
kubectl -n rook-ceph exec -it <toolbox-pod> -- \
  ceph tell osd.* bluestore allocator score block
```

## Understanding the Fragmentation Score

The score ranges from 0.0 (no fragmentation) to 1.0 (completely fragmented):
- `< 0.4`: Tiny fragmentation, no action needed
- `0.4 - 0.7`: Small, acceptable fragmentation
- `0.7 - 0.9`: Considerable, but generally safe (default warning threshold is 0.8)
- `> 0.9`: Severe - may impact BlueStore's ability to allocate space

Fragmentation causes slower write performance because BlueStore must scatter writes across many small free extents instead of one contiguous region.

## Fix: Defragment by Rebalancing OSD Data

The primary way to defragment BlueStore is to temporarily set the OSD's reweight to 0 to migrate data off, then restore it:

```bash
# Reduce weight to migrate data off (triggers rebalancing away)
ceph osd reweight 4 0.0

# Wait for data to fully migrate off
ceph -w
# Wait until all PGs are active+clean

# Restore weight (data migrates back, landing contiguously)
ceph osd reweight 4 1.0
```

When data is written back to the OSD, it lands in contiguous free space, effectively defragmenting the disk.

## Configuring Fragmentation Thresholds

Adjust when the warning fires:

```bash
# Fragmentation warning threshold (default 0.8, set to 1 to disable)
ceph config set osd bluestore_warn_on_free_fragmentation 0.85

# Fragmentation check interval in seconds (default 3600)
ceph config set osd bluestore_fragmentation_check_period 1800
```

## Enabling BlueStore Compression

Compression can reduce fragmentation by writing smaller, more uniformly-sized objects:

```bash
ceph config set osd bluestore_compression_mode aggressive
ceph config set osd bluestore_compression_algorithm zstd
```

Note: Compression helps prevent future fragmentation but does not defrag existing data.

## Monitoring Fragmentation Trends

Track fragmentation over time with Prometheus:

```yaml
- alert: BlueStoreFragmentation
  expr: ceph_bluestore_fragmentation_micros > 800000
  for: 30m
  labels:
    severity: warning
  annotations:
    summary: "OSD {{ $labels.ceph_daemon }} fragmentation is {{ $value | humanize }}"
    description: "Consider defragmenting by reweighting the OSD to 0 and back."
```

Note: The `fragmentation_micros` perf counter stores the score multiplied by 1,000,000. A threshold of 800000 corresponds to a fragmentation score of 0.8.

## Automatic Defragmentation

Ceph does not have automatic defragmentation. The reweight approach is the primary tool. To automate it:

```bash
#!/bin/bash
# Find OSDs with fragmentation > 0.8 and report them
for osd in $(ceph osd ls); do
  score=$(ceph tell osd.$osd bluestore allocator score block 2>/dev/null | grep -oP '[\d.]+')
  if [ -n "$score" ]; then
    above=$(echo "$score > 0.8" | bc -l)
    if [ "$above" = "1" ]; then
      echo "Defragging osd.$osd (score: $score)"
    fi
  fi
done
```

## Summary

`BLUESTORE_FREE_FRAGMENTATION` warns that a BlueStore OSD's block allocator has a high fragmentation score, leading to degraded write performance. The primary fix is to temporarily set the OSD's reweight to 0.0 to migrate data off, then restore the reweight so data writes back contiguously. Adjust the `bluestore_warn_on_free_fragmentation` threshold to tune when warnings fire, and enable compression to reduce future fragmentation from varied object sizes.
