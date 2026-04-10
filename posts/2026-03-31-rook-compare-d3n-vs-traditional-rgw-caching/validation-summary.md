# Validation Summary: How to Compare D3N vs Traditional RGW Caching

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- D3N (Datacenter Data Delivery Network) cache
- Ceph RADOS
- Redis (for D3N multi-RGW coordination)
- Rook (Ceph operator for Kubernetes)

## Sources Consulted
- Ceph official documentation - D3N RGW Data Cache (Reef): https://docs.ceph.com/en/reef/radosgw/d3n_datacache/
- Ceph official documentation - D3N RGW Data Cache (Latest): https://docs.ceph.com/en/latest/radosgw/d3n_datacache/
- Ceph upstream source - d3n_datacache.rst: https://github.com/ceph/ceph/blob/main/doc/radosgw/d3n_datacache.rst
- Ceph RGW configuration options source: https://github.com/ceph/ceph/blob/main/src/common/options/rgw.yaml.in

## Issues Found

### 1. Missing `rgw_` prefix on D3N configuration parameters
- **What was wrong:** The `ceph config set` commands used bare parameter names (`d3n_l1_local_datacache_enabled`, `d3n_l1_datacache_persistent_path`, `d3n_l1_datacache_size`) without the required `rgw_` prefix.
- **What was changed:** Added the `rgw_` prefix to all D3N parameters (e.g., `rgw_d3n_l1_local_datacache_enabled`).
- **Why:** Ceph config parameters for RGW require the `rgw_` prefix. Without it, `ceph config set` would not recognize the options.

### 2. Incorrect eviction policy (LFUDA)
- **What was wrong:** The post claimed D3N uses "LFUDA eviction for intelligent retention" and listed LFUDA in the comparison table.
- **What was changed:** Corrected to LRU (default) with random as an alternative, matching the `rgw_d3n_l1_eviction_policy` configuration option.
- **Why:** Per official Ceph documentation and source code, D3N supports `lru` (default) and `random` eviction policies, not LFUDA.

### 3. Incorrect claim about cache persistence
- **What was wrong:** The post stated D3N provides a "Persistent cache that survives RGW restarts" and listed cache persistence as "Yes" in the comparison table.
- **What was changed:** Corrected to indicate the cache is purged on every RGW restart. Updated the features list, comparison table, and summary paragraph.
- **Why:** Per official Ceph documentation, the D3N cache directory is purged on every RGW restart. The cache must be warmed up again after each restart.

### 4. Using `rados bench` for D3N benchmarking
- **What was wrong:** The benchmark section used `rados bench` to compare performance with and without D3N. `rados bench` operates at the RADOS layer, completely bypassing RGW and the D3N cache.
- **What was changed:** Replaced `rados bench` with S3-level client examples (`s3cmd`) and added a note explaining why `rados bench` is inappropriate for D3N testing. Also noted the 4 MiB minimum object size requirement for D3N caching.
- **Why:** D3N is a read cache inside the RGW process that activates on S3/Swift GET requests. Only S3-level benchmarking tools (s3cmd, warp, COSBench) can exercise the D3N cache path.

## Review Notes
- D3N only caches tail objects of objects larger than 4 MiB (by default, controlled by `rgw_max_chunk_size`). The post does not mention this constraint, which could surprise users testing with small objects. This was partially addressed by adding a comment in the benchmark section.
- D3N does not cache RGW-encrypted or RGW-compressed objects. This limitation is not mentioned in the post.
- D3N is disabled if `rgw_max_chunk_size` differs from `rgw_obj_stripe_size`. This constraint is not mentioned.
- The cache directory specified in `rgw_d3n_l1_datacache_persistent_path` must exist before starting the gateway. The post does not mention creating this directory.
- The benchmark throughput numbers (~300 MiB/s without D3N, ~1500 MiB/s with D3N) are illustrative estimates that will vary significantly based on hardware and configuration.
