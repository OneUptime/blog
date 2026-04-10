# Validation Summary: How to Set Cache Age Settings (Flush and Evict) in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (cache tiering subsystem)
- Rook (Ceph operator for Kubernetes, referenced in tags)
- Kubernetes (referenced in tags)

## Sources Consulted
- Ceph Cache Tiering official documentation: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- Ceph Pools documentation: https://docs.ceph.com/en/quincy/rados/operations/pools/
- Ceph Cache Pool developer documentation: https://docs.ceph.com/en/quincy/dev/cache-pool/
- Ceph cache-tiering.rst source on GitHub: https://github.com/ceph/ceph/blob/main/doc/rados/operations/cache-tiering.rst

## Issues Found

### 1. Incorrect description of age/ratio interaction (lines 17-18, 36-44, 46)

**What was wrong:** The post described `cache_min_flush_age` and `cache_min_evict_age` as independent OR triggers alongside ratio thresholds. It stated flush/evict could trigger based on age alone ("even if dirty ratio is below the threshold", "even if the cache is not full") and presented the interaction as "EITHER ratio exceeded OR age exceeded."

**What was changed:** Corrected to reflect that age parameters are gating mechanisms, not independent triggers. Ratio thresholds (`cache_target_dirty_ratio`, `cache_target_full_ratio`) trigger the flush/eviction process, and age thresholds determine which objects are eligible. Both conditions must be met simultaneously (AND logic, not OR). Updated the bullet descriptions, the interaction diagram, and the explanation of edge cases (age=0, very large age values).

**Why:** Per official Ceph documentation, `cache_min_flush_age` defines "the minimum age of an object before the cache tiering agent flushes" it, and `cache_min_evict_age` defines "the minimum age of an object before it will be evicted." These are prerequisites/gates on ratio-triggered operations, not independent triggers. Setting age too high with active ratio pressure can cause the cache to fill up because objects cannot be flushed/evicted until they meet the age requirement.

## Review Notes
- All `ceph osd pool set` and `ceph osd pool get` command syntax is correct and matches official documentation.
- Parameter names (`cache_min_flush_age`, `cache_min_evict_age`, `cache_target_dirty_ratio`, `cache_target_full_ratio`) are all valid Ceph pool parameters.
- Values are specified in seconds, which is correct per Ceph documentation.
- Ceph cache tiering is deprecated starting in Ceph Reef (v18.x). The post does not mention this deprecation, which could be relevant for readers using newer Ceph versions. The underlying commands remain functional for older versions.
- The `watch "ceph osd pool stats cache-pool"` monitoring approach is valid but provides limited insight into whether evictions are age-driven vs ratio-driven. More detailed information would require examining the cache tiering agent logs.
