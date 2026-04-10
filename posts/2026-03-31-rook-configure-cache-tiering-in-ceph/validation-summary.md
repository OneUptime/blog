# Validation Summary: How to Configure Cache Tiering in Ceph (Deprecated in Reef)

## Status
validated

## Post Type
Tutorial / Legacy Reference Guide

## Technologies Covered
- Ceph (cache tiering, BlueStore)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands)
- RADOS (Ceph object store CLI)

## Sources Consulted
- Ceph official documentation on cache tiering: https://docs.ceph.com/en/reef/rados/operations/cache-tiering/
- Ceph Reef release notes (deprecation notice for cache tiering)
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph official documentation on pool operations and parameters

## Issues Found

1. **Overstated deprecation certainty (line 15):** The post said cache tiering "is being removed from future releases." The official Ceph Reef docs say it "might be removed without much notice," which is less certain. Changed to "may be removed in future releases without much notice."

2. **Incorrect comment for `cache_target_dirty_ratio` (line 56):** The comment said "Flush and evict when cache is 80% full." `cache_target_dirty_ratio` specifically controls when *dirty* (modified) objects are flushed, not overall cache fullness or eviction. Eviction of clean objects is controlled by `cache_target_full_ratio`. Changed to "Start flushing dirty objects when 80% of cache contains modified data."

3. **Incorrect comment for `hit_set_count` (line 63):** The comment said "Minimum access count before object is promoted." `hit_set_count` controls the number of HitSet time periods to retain, not an access count threshold. The actual promotion threshold is controlled by `min_read_recency_for_promote` / `min_write_recency_for_promote`. Changed to "Number of hit set periods to retain for tracking promotion."

4. **Wrong cache mode for tier removal (line 76):** The post used `forward` mode when removing cache tiers. The official Ceph documentation specifies `proxy` mode for this step. `proxy` mode redirects requests to the base pool while allowing in-flight operations to complete. Changed `forward` to `proxy`.

## Review Notes
- The `cache_target_dirty_ratio` value of 0.8 is significantly higher than the default of 0.4 shown in official docs. While not incorrect, this is an aggressive setting that delays flushing and could cause write stalls if the cache fills up quickly. Readers should tune this based on their workload.
- The `bluestore_cache_size_ssd` value of 3221225472 (3 GiB) matches the default value. The command is valid but would be a no-op on a default configuration. Readers may want to adjust this to a larger value if they have available memory.
- All `ceph osd tier` commands use correct syntax and parameter ordering.
- The removal procedure order (mode change, flush, remove-overlay, remove-tier) is correct per official documentation.
- The post appropriately warns that cache tiering is deprecated and recommends BlueStore as the modern alternative.
