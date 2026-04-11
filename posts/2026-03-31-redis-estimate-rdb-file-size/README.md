# How to Estimate Redis RDB File Size Before Snapshot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RDB, Persistence, Storage

Description: Estimate the expected RDB snapshot file size using memory usage, compression ratios, and key type analysis to plan disk space before triggering BGSAVE.

---

Before triggering a Redis BGSAVE, it is useful to estimate how large the resulting RDB file will be. This helps you avoid disk-full failures and plan backup storage requirements.

## Why RDB Size Differs from Memory Usage

The RDB file is almost always smaller than `used_memory` because:

1. **Compression**: Strings, lists, and sets are compressed with LZF by default
2. **Encoding efficiency**: Compact encodings (ziplist, listpack, intset) take less space than full hash table overhead
3. **No fragmentation**: Memory includes allocator fragmentation; the RDB file does not
4. **No overhead structures**: Internal Redis metadata, client buffers, and LRU clocks are not included

Typical RDB-to-memory ratio: 40-70% of `used_memory`

## Quick Estimation from Memory Stats

```bash
redis-cli INFO memory
```

```text
used_memory:2147483648           # 2 GB total memory used
used_memory_dataset:1879048192   # 1.75 GB is actual data
used_memory_overhead:268435456   # 256 MB is Redis overhead
mem_fragmentation_ratio:1.15
```

Estimate RDB size from `used_memory_dataset`:

```text
Estimated RDB size = used_memory_dataset * compression_factor
```

For typical string-heavy workloads:
- Compression factor: 0.5 to 0.7
- Expected RDB: 1.75 GB * 0.6 = ~1.05 GB

## Checking a Previous RDB for Calibration

If you have a recent RDB file, check its actual size:

```bash
ls -lh /var/lib/redis/dump.rdb
redis-cli INFO memory | grep used_memory_dataset:
```

Calculate the actual ratio:

```bash
RDB_SIZE=$(du -b /var/lib/redis/dump.rdb | cut -f1)
DATASET=$(redis-cli INFO memory | grep used_memory_dataset: | cut -d: -f2 | tr -d '\r')
echo "Compression ratio: $(echo "scale=2; $RDB_SIZE / $DATASET" | bc)"
```

## Analyzing Key Types for Better Estimates

Different data types compress differently:

```bash
# Count keys by type
for type in string hash list set zset; do
    count=$(redis-cli --scan --pattern "*" | head -10000 | while read k; do
        redis-cli TYPE "$k"
    done | grep -c "$type" || true)
    echo "$type: $count"
done
```

General compression expectations:

| Data Type | Compression Factor |
| --- | --- |
| Small strings (< 44 bytes) | 0.8-1.0 (embstr, minimal savings) |
| Large strings | 0.3-0.7 (LZF compression) |
| Hashes (small, ziplist encoded) | 0.4-0.6 |
| Lists (ziplist/listpack encoded) | 0.4-0.6 |
| Sets (intset encoded) | 0.2-0.4 |
| Sorted sets (skiplist encoded) | 0.6-0.8 |

## Checking Available Disk Space

Before BGSAVE, verify sufficient disk space:

```bash
# Check current RDB file size
ls -lh $(redis-cli CONFIG GET dir | tail -1)/$(redis-cli CONFIG GET dbfilename | tail -1)

# Check available space in Redis data directory
df -h $(redis-cli CONFIG GET dir | tail -1)
```

During BGSAVE, Redis writes a temporary file alongside the existing RDB. You need enough space for both:

```text
Required free space = (estimated RDB size) * 2 + 10% buffer
```

## Triggering BGSAVE for Exact Measurement

On a test or staging instance, force a save and measure the result:

```bash
# Trigger BGSAVE and wait for completion
redis-cli BGSAVE
while [ $(redis-cli INFO persistence | grep rdb_current_bgsave_time_sec | cut -d: -f2 | tr -d '\r') != "-1" ]; do
    sleep 1
done

# Measure the resulting file
ls -lh $(redis-cli CONFIG GET dir | tail -1)/$(redis-cli CONFIG GET dbfilename | tail -1)
```

## Setting Up Disk Space Alerts

Automate disk space checks before BGSAVE:

```bash
#!/bin/bash
REDIS_DIR=$(redis-cli CONFIG GET dir | tail -1)
DATASET_BYTES=$(redis-cli INFO memory | grep used_memory_dataset: | cut -d: -f2 | tr -d '\r')
ESTIMATED_RDB=$((DATASET_BYTES * 7 / 10))  # Assume 70% compression
AVAILABLE=$(df -B1 "$REDIS_DIR" | tail -1 | awk '{print $4}')
NEEDED=$((ESTIMATED_RDB * 2))

if [ "$AVAILABLE" -lt "$NEEDED" ]; then
    echo "WARNING: Insufficient disk space for BGSAVE"
    echo "Available: $((AVAILABLE / 1024 / 1024)) MB, Needed: $((NEEDED / 1024 / 1024)) MB"
fi
```

## Summary

Estimate Redis RDB file size by multiplying `used_memory_dataset` by a compression factor of 0.5-0.7 for typical workloads. Use the actual size of previous RDB files to calibrate your estimate for your specific data types. Always ensure available disk space is at least twice the estimated RDB size before triggering BGSAVE, as Redis writes a temporary file alongside the existing snapshot during the save.
