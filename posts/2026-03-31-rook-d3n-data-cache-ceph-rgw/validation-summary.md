# Validation Summary: How to Configure D3N Data Cache for Ceph RGW

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Pacific 16.x and later)
- Ceph RGW (RADOS Gateway)
- D3N (Datacenter-Data-Delivery Network) data cache
- NVMe/SSD local storage
- XFS filesystem

## Sources Consulted
- [D3N RGW Data Cache — Ceph Documentation (Reef)](https://docs.ceph.com/en/reef/radosgw/d3n_datacache/)
- [D3N RGW Data Cache — Ceph Documentation (Quincy)](https://docs.ceph.com/en/quincy/radosgw/d3n_datacache/)
- [D3N RGW Data Cache — Ceph Documentation (Latest)](https://docs.ceph.com/en/latest/radosgw/d3n_datacache/)
- [RGW Data Caching and CDN — Ceph Documentation](https://docs.ceph.com/en/latest/radosgw/rgw-cache/)
- [IBM Storage Ceph D3N Data Cache](https://www.ibm.com/docs/en/storage-ceph/7.0.0?topic=configuration-d3n-data-cache)
- [Red Hat Ceph Storage 7 Object Gateway Guide — Basic Configuration](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/7/html/object_gateway_guide/basic-configuration)
- [D3N: A multi-layer cache for the rest of us (original paper)](https://www.ccs.neu.edu/home/pjd/papers/ekaynar_bigdata19.pdf)
- [ceph/ceph source — rgw_d3n_datacache.h](https://github.com/ceph/ceph/blob/main/src/rgw/driver/rados/rgw_d3n_datacache.h)

## Issues Found

1. **D3N acronym expansion was incorrect (2 occurrences)**
   - Wrong: "Datacenter-scale Distributed Durable Data-caching Networking"
   - Fixed to: "Datacenter-Data-Delivery Network"
   - Why: The official Ceph documentation and the original research paper define D3N as "Datacenter-Data-Delivery Network."

2. **All configuration parameter names were incorrect**
   - The post used fabricated `rgw_d3n_l2_*` parameter names. The correct parameters are `rgw_d3n_l1_*`:
     - `rgw_d3n_l2_datacache_enabled` → `rgw_d3n_l1_local_datacache_enabled`
     - `rgw_d3n_l2_cache_dir` → `rgw_d3n_l1_datacache_persistent_path`
     - `rgw_d3n_l2_datacache_size` → `rgw_d3n_l1_datacache_size`
   - Why: These are the actual Ceph configuration options as documented in official Ceph docs.

3. **Non-existent `rgw_d3n_l2_datacache_lib` parameter removed**
   - The post claimed D3N supports switching between "rados" and "file" backends via `rgw_d3n_l2_datacache_lib`. This parameter does not exist. D3N is exclusively a local filesystem cache.
   - Why: D3N caches data on local NVMe/SSD storage only; there is no RADOS pool backend option.

4. **"Creating the Cache Pool" section removed entirely**
   - The section instructed users to create a RADOS pool (`ceph osd pool create d3n-cache 64 64 replicated`) for D3N caching. D3N does not use RADOS pools — it uses a local filesystem directory.
   - Why: Following these instructions would create an unnecessary pool with no connection to D3N functionality.

5. **"File-System Based Cache (Alternative)" section corrected**
   - Renamed to "Preparing the NVMe Cache Directory" since filesystem caching is the only D3N approach, not an alternative.
   - Removed the duplicate incorrect configuration commands from this section.
   - Retained the correct NVMe mount/setup commands.

6. **Minor text corrections**
   - "local NVMe or SSD pool" → "local NVMe or SSD storage" (intro paragraph)
   - "A local NVMe/SSD pool" → "A local NVMe/SSD device or directory" (prerequisites)
   - "point it to the cache pool" → "point it to a local cache directory" (config section)
   - "local NVMe filesystem or RADOS pool" → "local NVMe or SSD filesystem" (summary)

## Review Notes
- The cache directory contents are purged each time the RGW daemon restarts, per official docs. The post does not mention this — worth noting in a future revision.
- D3N will not cache objects encrypted by RGW encryption. This limitation is not mentioned in the post.
- D3N requires `rgw_max_chunk_size` to equal `rgw_obj_stripe_size`; otherwise D3N is silently disabled. This important caveat is absent.
- Objects smaller than 4 MB are not cached by D3N. This is not mentioned.
- The `ceph daemon` perf dump command for monitoring is a valid approach, though the official docs primarily recommend checking log files with the `debug_rgw_datacache` subsystem for D3N-related diagnostics.
- The LRU eviction claim could not be definitively confirmed against official documentation but is a reasonable description of the general behavior.
