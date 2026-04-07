# Validation Summary: How to Tune D3N Cache Size for Optimal Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph D3N (Data, Datacenter, Delivery Network) datacache
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- Ceph admin socket (`ceph daemon` perf counters)
- Python scripting for metrics analysis

## Sources Consulted
- Ceph D3N Data Cache documentation: https://docs.ceph.com/en/reef/radosgw/d3n_datacache/
- Ceph RGW Data Caching and CDN documentation: https://docs.ceph.com/en/latest/radosgw/rgw-cache/
- Ceph Performance Counters documentation: https://docs.ceph.com/en/reef/dev/perf_counters/

## Issues Found

1. **Incorrect D3N config key name (fixed):** The post used `d3n_l1_datacache_size` as the Ceph config key in two locations (Starting Configuration and Adjusting Cache Size sections). The correct config key is `rgw_d3n_l1_datacache_size` — all RGW-specific config options in Ceph require the `rgw_` prefix. Updated all three occurrences (`ceph config set` and `ceph config get` commands) to use the correct key name.

## Review Notes
- The D3N perf counter names used in the Python script (`d3n_cache_hit`, `d3n_cache_miss`, `d3n_cache_eviction`) and the nested `.get('val', 0)` access pattern are not explicitly documented. Actual counter names and structure should be verified with `ceph daemon <name> perf schema` on a running RGW instance. The approach is conceptually sound but counter names may differ in practice.
- The cache directory path `/var/lib/ceph/rgw/cache` is used as an example but is not a Ceph default. D3N requires explicitly setting the path via `rgw_d3n_l1_datacache_persistent_path`. The post could benefit from mentioning this config key.
- The D3N cache is purged on each RGW restart, which is worth noting since the post recommends restarting RGW after resizing — this means the cache will need to warm up again from scratch.
- Objects must be larger than 4 MB to be cached by D3N, which limits the working set analysis approach shown in the post.
- The byte calculations for 10 GB (10737418240) and 50 GB (53687091200) are correct.
