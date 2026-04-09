# How to Fix POOL_HAS_TARGET_SIZE_BYTES_AND_RATIO Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Pool, Health Check, Autoscaler

Description: Learn how to fix POOL_HAS_TARGET_SIZE_BYTES_AND_RATIO in Ceph, a warning that a pool has both target_size_bytes and target_size_ratio configured simultaneously.

---

## What Is POOL_HAS_TARGET_SIZE_BYTES_AND_RATIO?

`POOL_HAS_TARGET_SIZE_BYTES_AND_RATIO` is a Ceph health warning that fires when a pool has both `target_size_bytes` and `target_size_ratio` set at the same time. These two settings are mutually exclusive hints for the PG autoscaler - having both set creates an ambiguous configuration where the autoscaler does not know which hint to prefer.

When both are set, Ceph uses `target_size_ratio` and ignores `target_size_bytes`, but the warning indicates a misconfiguration that should be cleaned up.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] POOL_HAS_TARGET_SIZE_BYTES_AND_RATIO: 2 pool(s) have both target_size_bytes and target_size_ratio set
    pool 'volumes' has target_size_bytes 1073741824 and target_size_ratio 0.2
    pool 'images' has target_size_bytes 536870912 and target_size_ratio 0.1
```

Check both settings for all pools:

```bash
for pool in $(ceph osd pool ls); do
  bytes=$(ceph osd pool get $pool target_size_bytes 2>/dev/null)
  ratio=$(ceph osd pool get $pool target_size_ratio 2>/dev/null)
  echo "$pool - $bytes / $ratio"
done
```

## Understanding the Two Settings

| Setting | Description |
|---|---|
| `target_size_bytes` | Absolute expected size in bytes |
| `target_size_ratio` | Fraction of total cluster capacity |

Use `target_size_bytes` when you know the exact size. Use `target_size_ratio` when you want the pool target to scale proportionally with cluster growth.

## Fix - Remove One of the Two Settings

### Option A - Keep Only target_size_bytes

Remove the ratio hint:

```bash
ceph osd pool set volumes target_size_ratio 0.0
ceph osd pool set images target_size_ratio 0.0
```

Verify only bytes remain:

```bash
ceph osd pool get volumes target_size_bytes
ceph osd pool get volumes target_size_ratio
```

### Option B - Keep Only target_size_ratio

Remove the bytes hint:

```bash
ceph osd pool set volumes target_size_bytes 0
ceph osd pool set images target_size_bytes 0
```

Then verify:

```bash
ceph osd pool get volumes target_size_ratio
```

### Option C - Clear Both Settings

If you want the autoscaler to work from actual usage data:

```bash
ceph osd pool set volumes target_size_bytes 0
ceph osd pool set volumes target_size_ratio 0.0
```

## Batch Fix for All Affected Pools

Script to remove `target_size_ratio` from all pools that have both set:

```bash
for pool in $(ceph osd pool ls); do
  ratio=$(ceph osd pool get $pool target_size_ratio 2>/dev/null | awk '{print $2}')
  bytes=$(ceph osd pool get $pool target_size_bytes 2>/dev/null | awk '{print $2}')
  if [ -n "$ratio" ] && [ -n "$bytes" ] && [ "$ratio" != "0" ] && [ "$bytes" != "0" ]; then
    echo "Fixing pool $pool"
    ceph osd pool set $pool target_size_ratio 0.0
  fi
done
```

## Summary

`POOL_HAS_TARGET_SIZE_BYTES_AND_RATIO` is a misconfiguration warning indicating that a pool has contradictory autoscaler hints. Fix it by deciding which hint is appropriate for each pool and zeroing out the other. Use `target_size_bytes` for known fixed-size pools and `target_size_ratio` for pools that should scale proportionally with your cluster.
