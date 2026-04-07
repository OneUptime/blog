# Validation Summary: How to Understand D3N in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- D3N (Datacenter-Data-Delivery Network)
- Rook
- Object Storage caching

## Sources Consulted
- [D3N RGW Data Cache — Ceph Documentation (Reef)](https://docs.ceph.com/en/reef/radosgw/d3n_datacache/)
- [D3N RGW Data Cache — Ceph Documentation (Quincy)](https://docs.ceph.com/en/quincy/radosgw/d3n_datacache/)
- [RGW Data Caching and CDN — Ceph Documentation](https://docs.ceph.com/en/reef/radosgw/rgw-cache/)
- [Ceph Object Gateway Config Reference](https://docs.ceph.com/en/reef/radosgw/config-ref/)

## Issues Found

1. **Config parameter names missing `rgw_` prefix**: All D3N configuration parameters were written without the required `rgw_` prefix (e.g., `d3n_l1_local_datacache_enabled` instead of `rgw_d3n_l1_local_datacache_enabled`). This applied to `rgw_d3n_l1_local_datacache_enabled`, `rgw_d3n_l1_datacache_persistent_path`, and `rgw_d3n_l1_datacache_size` across both the `ceph config set` commands, `ceph.conf` snippets, and the verification commands. Fixed all occurrences to include the `rgw_` prefix.

2. **Incorrect eviction policy claim (LFUDA vs LRU)**: The post stated the default cache eviction policy is "LFUDA (Least Frequently Used with Dynamic Aging)". According to official Ceph documentation, the eviction policy is LRU (Least Recently Used) and it is the only valid choice (`rgw_d3n_l1_eviction_policy`, default: `lru`, valid choices: `lru`). Fixed to LRU.

3. **Unsubstantiated Redis claim**: The post listed "Redis - Optional distributed cache index for multi-RGW setups" as a D3N architecture component. The official Ceph D3N documentation does not mention Redis as a component of D3N. D3N operates as a local per-node cache. Removed the Redis bullet point.

4. **Cache backend description updated**: Changed "SSD or RAM directory" to "NVMe SSD, persistent memory, or tmpfs directory" to better match the official documentation which specifies NVMe flash, persistent memory (/dev/pmem), or tmpfs (/dev/shm) as backing stores.

5. **Summary paragraph updated**: The closing summary referenced "Redis coordination" and "LFUDA eviction" which were both incorrect. Updated to reference "libaio for async I/O" and "LRU eviction".

## Review Notes
- The default persistent path in the official docs is `/tmp/rgw_datacache/`, while the blog uses `/var/lib/ceph/rgw/cache`. The blog's choice is a reasonable production example path (not a default), so this was left as-is.
- D3N will not cache compressed or encrypted objects — this is an important caveat not mentioned in the post but is not an error, just additional context a reader might benefit from in a future update.
- D3N requires that `rgw_max_chunk_size` equals `rgw_obj_stripe_size`; if they differ, D3N is silently disabled. This constraint is not mentioned in the post.
- The cache directory contents are purged on each RGW restart — another operational detail worth noting in a future revision.
