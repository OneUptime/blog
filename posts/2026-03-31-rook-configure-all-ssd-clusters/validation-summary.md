# Validation Summary: How to Configure Ceph for All-SSD Clusters

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (BlueStore, OSD, CRUSH)
- Rook (CephCluster CRD, CephBlockPool CRD)
- Kubernetes (Custom Resource Definitions)
- Python 3 (monitoring scripts)

## Sources Consulted
- [Ceph BlueStore Configuration Reference (Reef)](https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/)
- [Ceph OSD Configuration Reference](https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- [Ceph OSD Config Reference (GitHub source)](https://github.com/ceph/ceph/blob/main/doc/rados/configuration/osd-config-ref.rst)
- [Ceph BlueStore Config Reference (GitHub source)](https://github.com/ceph/ceph/blob/main/doc/rados/configuration/bluestore-config-ref.rst)
- [Ceph Performance Counters (Reef)](https://docs.ceph.com/en/reef/dev/perf_counters/)
- [Red Hat Ceph Storage 4 - Performance Counters](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/4/html/administration_guide/ceph-performance-counters)
- [Rook CephBlockPool CRD Documentation](https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- [Rook CephCluster CRD Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- [Rook pool.yaml example (GitHub)](https://github.com/rook/rook/blob/master/deploy/examples/pool.yaml)
- [IBM Storage Ceph - bluestore_min_alloc_size documentation](https://www.ibm.com/support/pages/ibm-storage-ceph-bluestore-osd-bluestoreminallocsize-bluestoreminallocsizehdd-bluestoreminallocsizessd-values-and-ramifications)

## Issues Found

1. **`bluestore_cache_size_ssd` misleading comment**: The original comment said "default is 1 GB for HDDs" which could mislead readers into thinking the SSD default is also 1 GB. The actual default for `bluestore_cache_size_ssd` is 3 GB. Updated the comment to "default is 3 GB for SSDs, 1 GB for HDDs" for clarity.

2. **`osd_class_update_on_start true` with incorrect comment**: The comment said "Disable SSD-specific rotational hints" but setting this to `true` (which is the default) actually *enables* auto-detection of device class on OSD start. The comment was factually wrong and the command was a no-op. Removed this line entirely.

3. **`osd_max_ops` does not exist**: The command `ceph config set osd osd_max_ops 512` used a non-existent Ceph configuration option. This command would fail at runtime. Removed the invalid command.

4. **Used generic thread/shard options instead of SSD-specific ones**: Changed `osd_op_num_threads_per_shard` and `osd_op_num_shards` to their SSD-specific variants `osd_op_num_threads_per_shard_ssd` and `osd_op_num_shards_ssd`, which is more appropriate for an all-SSD tuning guide and avoids affecting HDD OSDs in mixed clusters.

5. **`osd_backfill_scan_max` set to 256 (below default of 512)**: The original post set `osd_backfill_scan_max` to 256 in the "Optimize Recovery for SSDs" section, but the default is already 512. This would actually *reduce* backfill scan performance, which is counterproductive for SSD optimization. Removed this counterproductive setting.

6. **Monitoring script reported operation count as latency**: The original Python script printed `avgcount` (the number of operations) labeled as "Read lat (ms)" and "Write lat (ms)". The `avgcount` field is an operation count, not a latency value. Fixed the script to correctly calculate average latency as `sum / avgcount * 1000` (converting from seconds to milliseconds), with a guard against division by zero.

## Review Notes
- The `bluestore_min_alloc_size_ssd` default has been 4096 (4 KB) since Ceph Octopus. The command is correct but is a no-op on Octopus and later releases. A comment was added to note this is mainly useful for older releases.
- The CephBlockPool `parameters` section uses `crush_rule` and `compression_algorithm` as pass-through Ceph pool parameters. While Rook's native `deviceClass` field on the spec is the preferred way to target SSD device classes, the `crush_rule` parameter approach also works.
- The `osd_recovery_sleep_ssd` default is already 0 in modern Ceph releases when using the mClock scheduler. Setting it explicitly is still a valid safeguard.
- Thread/shard changes require OSD restarts to take effect, which is not mentioned in the post. Readers should be aware of this operational consideration.
