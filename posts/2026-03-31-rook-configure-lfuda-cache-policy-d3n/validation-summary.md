# Validation Summary: How to Configure LFUDA Cache Policy for D3N

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph D3N (Datacenter Data Delivery Network)
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- Cache eviction policies (LRU, Random)

## Sources Consulted
- Ceph source code: `src/common/options/rgw.yaml.in` — canonical D3N config option definitions with defaults and allowed values
- Ceph source code: `src/rgw/driver/rados/rgw_d3n_datacache.h` — eviction policy enum (`LRU=0, RANDOM=1`)
- Ceph source code: `src/rgw/driver/rados/rgw_d3n_datacache.cc` — eviction implementation and config validation (`ceph_assert` only allows "lru" or "random")
- Ceph official documentation: `doc/radosgw/d3n_datacache.rst`

## Issues Found

### 1. LFUDA eviction policy does not exist in D3N (Critical)
**What was wrong:** The entire post claimed D3N uses LFUDA (Least Frequently Used with Dynamic Aging) as its default and configurable eviction policy. This is completely incorrect. D3N only supports two eviction policies: `lru` (default) and `random`. Setting `rgw_d3n_l1_eviction_policy` to "lfuda" would trigger a `ceph_assert` failure and crash the RGW process.
**What was changed:** Rewrote the post to correctly describe LRU as the default eviction policy and Random as the alternative. Removed all LFUDA references and replaced with accurate LRU/Random descriptions. Updated the title, tags, description, and all sections accordingly.

### 2. Config option names missing `rgw_` prefix (Moderate)
**What was wrong:** The `ceph config set` commands and `ceph.conf` snippets used config names without the `rgw_` prefix: `d3n_l1_datacache_size`, `d3n_l1_local_datacache_enabled`, `d3n_l1_datacache_persistent_path`. The canonical names all start with `rgw_`.
**What was changed:** Corrected all config option names to use the full canonical prefix: `rgw_d3n_l1_datacache_size`, `rgw_d3n_l1_local_datacache_enabled`, `rgw_d3n_l1_datacache_persistent_path`.

### 3. Default cache path was incorrect (Minor)
**What was wrong:** The post used `/var/lib/ceph/rgw/cache` as the cache path. The actual default value for `rgw_d3n_l1_datacache_persistent_path` is `/tmp/rgw_datacache/`.
**What was changed:** Updated all references to use the correct default path `/tmp/rgw_datacache/`.

### 4. Monitoring via perf counters does not work for D3N (Moderate)
**What was wrong:** The post suggested using `ceph daemon rgw.myzone perf dump` to view D3N cache eviction counters. D3N does not register any dedicated perf counters.
**What was changed:** Replaced the perf dump monitoring approach with the correct method: enabling `debug_rgw_datacache` logging and checking journal/log entries for D3N cache activity.

### 5. Default cache size not mentioned (Minor)
**What was wrong:** The post did not mention the default cache size.
**What was changed:** Added notes that the default cache size is 1 GiB (per `rgw.yaml.in` config definition).

### 6. Comparison table was inaccurate (Moderate)
**What was wrong:** The comparison table compared LRU vs LFUDA. Since LFUDA doesn't exist in D3N, this was misleading.
**What was changed:** Replaced with an accurate LRU vs Random comparison table reflecting the two actual eviction policies.

## Review Notes
- The `ceph.conf` legacy option names (without `rgw_` prefix) may work due to `with_legacy: true` in the config definitions, but using canonical names with the `rgw_` prefix is the correct practice and required for `ceph config set` commands.
- Production deployments should use a dedicated cache directory (not `/tmp/`) since `/tmp` may be cleared on reboot. The default path `/tmp/rgw_datacache/` is suitable for testing but should be changed for production.
- The `rgw_d3n_l1_evict_cache_on_start` option (default: true) exists but was not covered in this post. It controls whether the cache directory is cleared when RGW starts.
