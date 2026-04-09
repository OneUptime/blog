# Validation Summary: How to Understand D3N (Datacenter Data Delivery Network) in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- D3N (Datacenter Data Delivery Network) cache layer
- Rook-Ceph Kubernetes operator
- CephObjectStore custom resource

## Sources Consulted
- Ceph official D3N documentation: https://docs.ceph.com/en/latest/radosgw/d3n_datacache/
- Ceph source code `src/common/options/rgw.yaml.in` for D3N config option definitions
- Ceph source code `src/rgw/rgw_d3n_datacache.cc` for eviction policy implementation (asserts only "lru" and "random")
- Ceph source code `src/rgw/rgw_perf_counters.h` and `rgw_perf_counters.cc` for perf counter definitions

## Issues Found

### 1. Incorrect eviction policy: LFUDA replaced with Random
- **What was wrong:** The post claimed D3N supports LRU and LFUDA eviction policies. The Ceph source code explicitly asserts only two values: `lru` and `random`. LFUDA is not a valid D3N eviction policy.
- **What was changed:** Replaced all references to LFUDA with `random`, updated the description and recommendation text accordingly.

### 2. Incorrect claim that D3N cache survives restarts
- **What was wrong:** The comparison table stated D3N cache "Survives restarts." In reality, the config option `rgw_d3n_l1_evict_cache_on_start` defaults to `true`, meaning the cache directory is purged every time the RGW daemon restarts. The official docs confirm: "Each time the RGW daemon is restarted the content of the cache directory is purged."
- **What was changed:** Updated the table to say "On disk but purged on restart by default" to accurately reflect the default behavior.

### 3. Incorrect D3N monitoring approach
- **What was wrong:** The post suggested using `radosgw-admin bucket stats` and `ceph tell rgw.* perf dump` to monitor D3N cache performance. Neither of these shows D3N-specific statistics. There are no D3N-specific perf counters in the Ceph perf counter system (D4N has counters, but D3N does not). The official documentation states that D3N monitoring is done via RGW log files containing the string "d3n" and the `debug_rgw_datacache` log subsystem.
- **What was changed:** Replaced the incorrect monitoring commands with the correct approach: enabling `debug_rgw_datacache` logging and grepping RGW logs for D3N activity.

## Review Notes
- D3N only caches "tail objects" (parts of objects larger than 4MB by default). It does not cache head objects, compressed objects (RGW-level compression), or encrypted objects (RGW-level encryption). The post does not mention this limitation, which could be added in a future update.
- Only D3N Layer 1 (L1) has been upstreamed to Ceph. The original D3N paper describes a multi-layer architecture, but only the local NVMe cache layer is implemented.
- The config section format `client.rgw.my-store` is valid but the actual daemon section name depends on how Rook names the RGW daemon instances. Users may need to check their specific daemon names.
- The default cache path is `/tmp/rgw_datacache/`, not the `/var/lib/ceph/rgw/cache` shown in the example, though setting a custom path is a valid and recommended practice.
