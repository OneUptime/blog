# How to Configure Hit Set Settings (Bloom Filter) for Cache Tiering in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CacheTiering, BloomFilter, Storage

Description: Learn how to configure Ceph cache tiering hit set parameters using Bloom filters to control object promotion decisions and prevent cache pollution from large sequential scans.

---

Ceph cache tiering uses hit set tracking to decide when to promote an object from the backing pool to the cache pool. Without hit sets, every object access would trigger promotion, filling the cache with data accessed only once. Bloom filter-based hit sets provide a memory-efficient way to track access patterns and implement scan resistance.

## What Is a Hit Set?

A hit set is a time-windowed data structure that records which objects have been accessed during a specific period. Ceph maintains multiple overlapping hit sets, each covering a `hit_set_period` time window. When an object needs promotion, Ceph checks how many recent hit sets contain that object.

If the object appears in at least `min_read_recency_for_promote` recent windows, it is considered hot and promoted to cache.

## Bloom Filter Hit Sets

The Bloom filter is a space-efficient probabilistic data structure that tracks object access. It has a small false-positive rate (may report an object as accessed when it was not) but never has false negatives (never misses a truly accessed object).

```text
Advantages of Bloom filter hit sets:
- Very low memory footprint (a few MB for millions of objects)
- Fast O(1) lookup per object
- False positive rate tunable via filter size
```

## Configuring Hit Set Parameters

```bash
# Set the hit set type
ceph osd pool set cache-pool hit_set_type bloom

# Number of hit set windows to maintain
# More windows = longer "memory" of recent accesses
ceph osd pool set cache-pool hit_set_count 12

# Duration of each hit set window in seconds
# 12 windows x 3600 seconds = 12 hours of access history
ceph osd pool set cache-pool hit_set_period 3600

# Minimum number of recent hit sets an object must appear in before promotion
# 2 means the object must be accessed in 2 different 1-hour windows
ceph osd pool set cache-pool min_read_recency_for_promote 2

# For writes (writeback mode): minimum write hit count for promotion
ceph osd pool set cache-pool min_write_recency_for_promote 2
```

## Understanding the Parameters

```text
Parameter                   Effect
hit_set_count=12           Maintain 12 hit set windows
hit_set_period=3600        Each window covers 1 hour
Total access history       12 hours

min_read_recency=1         Promote after any single access (aggressive)
min_read_recency=2         Promote after access in 2 different windows (balanced)
min_read_recency=4         Promote only very frequently accessed objects (conservative)
```

## Scan Resistance

The key value of hit sets is scan resistance. If a client reads 1 million objects sequentially (a backup scan), each object appears in only one hit set window. With `min_read_recency_for_promote=2`, none of these scan objects get promoted, protecting the cache from being flooded with cold scan data.

Contrast this with a truly hot object accessed 10 times per hour for several hours - it appears in many hit set windows and gets promoted correctly.

## Checking Hit Set Configuration

```bash
ceph osd pool get cache-pool hit_set_type
ceph osd pool get cache-pool hit_set_count
ceph osd pool get cache-pool hit_set_period
ceph osd pool get cache-pool min_read_recency_for_promote
```

## Monitoring Hit Sets in Action

```bash
# List current hit sets for the cache pool
ceph pg 2.0 query | python3 -c "
import json, sys
d = json.load(sys.stdin)
info = d.get('info', {})
hs = info.get('hit_set_history', {})
print('Hit sets:', len(hs.get('history', [])))
"
```

## Tuning for Different Workloads

```text
Workload          Recommended Settings
Random access     hit_set_count=12, period=3600, min_recency=2
Sequential scans  hit_set_count=6,  period=600,  min_recency=3
Mixed workload    hit_set_count=12, period=1800, min_recency=2
```

## Summary

Hit set parameters control which objects get promoted to the Ceph cache tier. Bloom filter hit sets provide memory-efficient scan resistance by requiring objects to be accessed across multiple time windows before promotion. Configure `hit_set_count`, `hit_set_period`, and `min_read_recency_for_promote` together to define how "hot" an object must be before it earns a place in the fast cache pool.
