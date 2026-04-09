# How to Configure Hit Set Settings for Cache Tiering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Cache Tiering, Bloom Filter, Performance

Description: Configure Ceph cache tier hit set settings including Bloom filter parameters to accurately track object access patterns for promotion decisions.

---

## What Are Hit Sets

Hit sets are data structures used by Ceph cache tiering to track which objects have been accessed recently. The cache tier uses hit sets to decide whether to promote an object from the cold (backing) tier to the hot (cache) tier.

Each hit set records object accesses over a time window. When an object appears in enough recent hit sets, it is promoted to the cache.

## Hit Set Types

Ceph supports three hit set types:

```text
bloom            - Bloom filter (probabilistic, space-efficient, may have false positives)
explicit_hash    - Exact hash set (more accurate, more memory)
explicit_object  - Exact object set (tracks full object names, most memory)
```

The Bloom filter is recommended for production because it uses far less memory while providing good accuracy for promotion decisions.

## Bloom Filter Basics

A Bloom filter is a probabilistic data structure that can answer "was this object accessed?" with:
- **No false negatives**: If the filter says "not seen," it was definitely not accessed
- **Possible false positives**: The filter may sometimes say "seen" for objects that weren't

The false positive rate depends on the number of entries and the filter size. Ceph's Bloom implementation is tuned automatically based on the `hit_set_count` and `hit_set_period`.

## Key Hit Set Parameters

```bash
# View current hit set settings
ceph osd pool get <cache-pool> hit_set_type
ceph osd pool get <cache-pool> hit_set_count
ceph osd pool get <cache-pool> hit_set_period
ceph osd pool get <cache-pool> hit_set_fpp
```

### hit_set_type

The type of data structure to use:

```bash
ceph osd pool set mycache hit_set_type bloom
```

### hit_set_count

How many hit sets to maintain simultaneously. Each covers one `hit_set_period` window. More hit sets = longer memory of access patterns:

```bash
# Keep 4 hit sets (covers 4 * period of access history)
ceph osd pool set mycache hit_set_count 4
```

### hit_set_period

Duration (in seconds) of each hit set window. After this period, the oldest hit set is discarded and a new one started:

```bash
# Each hit set covers 3600 seconds (1 hour)
ceph osd pool set mycache hit_set_period 3600
```

### hit_set_fpp (False Positive Probability)

The target false positive rate for the Bloom filter (0.0 to 1.0):

```bash
# 10% false positive rate
ceph osd pool set mycache hit_set_fpp 0.10

# Stricter: 1% false positive rate (uses more memory)
ceph osd pool set mycache hit_set_fpp 0.01
```

## Complete Hit Set Configuration Example

```bash
# Cache pool setup
ceph osd pool create fast-cache 64 64 replicated
ceph osd tier add cold-data fast-cache
ceph osd tier cache-mode fast-cache writeback

# Configure hit sets
ceph osd pool set fast-cache hit_set_type bloom
ceph osd pool set fast-cache hit_set_count 6
ceph osd pool set fast-cache hit_set_period 3600
ceph osd pool set fast-cache hit_set_fpp 0.05

# Set promotion threshold (check last N hit sets; promote if found in any)
ceph osd pool set fast-cache min_read_recency_for_promote 2
ceph osd pool set fast-cache min_write_recency_for_promote 2
```

## How Promotion Decisions Work

The promotion logic uses hit sets as follows:

```text
1. Object X is accessed (read)
2. Ceph checks the last min_read_recency_for_promote hit sets
3. If object X is found in any of those hit sets:
   - Promote object X to cache tier
4. If not found:
   - Serve from backing tier, record access in current hit set
```

## Monitoring Hit Set Behavior

```bash
# Check cache tier stats
ceph df detail | grep -A 5 fast-cache

# View cache tier I/O breakdown
ceph osd pool stats fast-cache

# Check promotion/eviction activity
ceph daemon osd.0 perf dump | grep tier
```

## Memory Considerations

Each Bloom filter hit set uses memory proportional to the number of objects in the pool and the FPP setting. Estimate memory usage:

```text
memory_per_hit_set = (objects * 1.44 * log2(1/fpp)) / 8 bytes
total_hit_set_memory = memory_per_hit_set * hit_set_count
```

For 1 million objects with FPP=0.05 and count=4:

```text
memory = (1,000,000 * 1.44 * log2(20)) / 8
       = (1,000,000 * 1.44 * 4.32) / 8
       = ~0.78 MB per hit set * 4 = ~3.1 MB
```

Bloom filters are very space-efficient for this use case.

## Summary

Cache tier hit sets in Ceph use Bloom filters to probabilistically track object access patterns over time. Key parameters are `hit_set_count` (number of time windows to remember), `hit_set_period` (duration of each window), and `hit_set_fpp` (Bloom filter false positive probability). An object is promoted to the cache tier when it appears in enough recent hit sets, controlled by `min_read_recency_for_promote`. Tuning these parameters balances cache effectiveness against memory usage and promotion overhead.
