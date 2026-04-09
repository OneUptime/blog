# Validation Summary: How to Fix CACHE_POOL_NO_HIT_SET Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Ceph cache tiering (hit sets, bloom filters, promotion/eviction)
- RADOS (Reliable Autonomic Distributed Object Store)

## Sources Consulted
- Ceph official documentation — cache tiering: https://docs.ceph.com/en/reef/rados/operations/cache-tiering/ (fetched via GitHub raw source at https://raw.githubusercontent.com/ceph/ceph/main/doc/rados/operations/cache-tiering.rst)
- Ceph official documentation — health checks: https://docs.ceph.com/en/reef/rados/operations/health-checks/ (fetched via GitHub raw source at https://raw.githubusercontent.com/ceph/ceph/main/doc/rados/operations/health-checks.rst)

## Issues Found

### 1. Inaccurate deprecation alternatives
- **What was wrong:** The post stated cache tiering was deprecated "in favor of more efficient solutions like CephFS caching or BlueStore's built-in compression." BlueStore compression reduces storage footprint and is not an alternative to cache tiering (hot/cold data placement). CephFS caching is client-side and also not a direct replacement.
- **What was changed:** Replaced with accurate information: cache tiering was deprecated as of the Ceph Reef release, the community advises against new deployments, and actual alternatives include CRUSH device class rules for placing pools on faster storage and OS-level caching (dm-cache, bcache).
- **Why:** The original text conflated unrelated Ceph features with cache tiering alternatives, which could mislead readers into thinking BlueStore compression serves the same purpose.

### 2. Misleading hit set verification command
- **What was wrong:** The post suggested `rados -p cache-pool ls | grep -i hit` to "check that hit set activity is being recorded." Hit set data is managed internally by OSD PGs and does not appear as regular RADOS objects in `rados ls` output. This command would likely return no results and mislead users.
- **What was changed:** Replaced with `ceph osd pool get cache-pool hit_set_type`, `hit_set_count`, and `hit_set_period` commands, which directly confirm the hit set parameters are applied.
- **Why:** The original command would not produce meaningful output for verifying hit set configuration. The replacement commands directly query the pool's hit set settings.

## Review Notes
- The `target_max_bytes` value of `1073741824000` (commented as "1TB") in the "Configuring the Hit Set" section is actually 1000 GiB (~0.977 TiB). The official Ceph docs use `1099511627776` for 1 TiB. This is a minor discrepancy acceptable for illustrative purposes but worth noting.
- The post does not mention the `hit_set_fpp` (false positive probability) parameter for bloom filters, which appears in the official health check documentation. This is an optional tuning parameter and its omission is acceptable for a focused troubleshooting guide.
- The post correctly notes that cache tiering is deprecated. All commands, parameter names, and recommended values (hit_set_type bloom, hit_set_count 12, hit_set_period 14400) match the official Ceph documentation.
- All eviction/flushing parameters (cache_target_dirty_ratio, cache_target_full_ratio, cache_min_flush_age, cache_min_evict_age) and their example values are accurate per the documentation.
