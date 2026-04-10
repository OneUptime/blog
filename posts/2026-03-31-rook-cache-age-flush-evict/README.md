# How to Set Cache Age Settings (Flush and Evict) in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CacheTiering, Storage, Performance

Description: Learn how to configure cache_min_flush_age and cache_min_evict_age in Ceph to control how long objects must remain in the cache before they are eligible for flushing or eviction.

---

Cache age settings in Ceph define the minimum time an object must stay in the cache pool before it can be flushed to the backing pool or evicted. These settings prevent premature eviction of recently promoted objects and give the cache time to serve multiple reads before dirty data is written back.

## Age-Based Flush and Eviction

Ceph uses age thresholds alongside ratio thresholds to determine when to flush or evict objects:

- **Flush age**: Dirty objects must be older than this age before the cache tiering agent will flush them to the backing pool
- **Evict age**: Objects must be older than this age before they can be evicted from the cache tier

This time-based approach ensures that objects do not stay in the cache indefinitely, even during low-traffic periods.

## Setting Cache Age Parameters

```bash
# Objects must be in cache for at least 60 seconds before eligible for flush
ceph osd pool set cache-pool cache_min_flush_age 60

# Objects must be in cache for at least 300 seconds before eligible for eviction
ceph osd pool set cache-pool cache_min_evict_age 300
```

## Understanding the Age Interaction

Age and ratio settings work together:

```text
Flush triggers when BOTH:
  - cache_target_dirty_ratio is exceeded (ratio threshold met)
  - Object is dirty AND older than cache_min_flush_age (age threshold met)

Evict triggers when BOTH:
  - cache_target_full_ratio is exceeded (ratio threshold met)
  - Object is older than cache_min_evict_age (age threshold met)
```

Setting age to 0 means objects can be flushed or evicted as soon as ratio thresholds are exceeded. Setting age to a very large value (e.g., 86400 seconds = 24 hours) means objects stay in cache for at least one day even when ratio thresholds are exceeded, which can cause the cache to fill up if objects cannot age out fast enough.

## Practical Age Values

```text
Use Case               flush_age   evict_age   Notes
General purpose        60s         300s        Objects stay 5 min minimum
Bursty write workload  30s         120s        Quick flush of burst data
Long-lived hot data    300s        3600s       Keep hot objects 1 hour
Archival/backup        10s         30s         Flush quickly, no need to cache
```

## Verifying Age Settings

```bash
ceph osd pool get cache-pool cache_min_flush_age
ceph osd pool get cache-pool cache_min_evict_age
```

## Monitoring Age-Based Evictions

To see if evictions are age-driven vs ratio-driven, monitor the eviction rate relative to cache fullness:

```bash
watch "ceph osd pool stats cache-pool"
```

If evictions are occurring when the cache is well below `cache_target_full_ratio`, they are likely age-triggered. Increase `cache_min_evict_age` to keep objects in cache longer.

## Example: Keeping Hot Data Cached Longer

For a workload where objects are accessed in patterns (e.g., accessed in the morning, idle at night), set a longer evict age to prevent nighttime eviction of morning hot data:

```bash
ceph osd pool set cache-pool cache_min_flush_age 120
ceph osd pool set cache-pool cache_min_evict_age 7200   # 2 hours
```

This ensures objects stay in cache for at least 2 hours, preventing re-promotion latency for the next access cycle.

## Example: Aggressive Flush (Minimize Dirty Data)

For high-durability requirements where dirty data risk must be minimized:

```bash
ceph osd pool set cache-pool cache_min_flush_age 10    # Flush after 10 seconds
ceph osd pool set cache-pool cache_min_evict_age 60    # Evict after 1 minute
ceph osd pool set cache-pool cache_target_dirty_ratio 0.2  # Start flushing early
```

## Summary

`cache_min_flush_age` and `cache_min_evict_age` set minimum residence times in the cache pool before an object becomes eligible for flushing or eviction. They complement ratio-based thresholds by ensuring recently promoted objects are not immediately removed. Tune these values based on your workload's access patterns - longer ages for workloads with repeated access cycles, shorter ages for batch workloads that need fast dirty data turnover.
