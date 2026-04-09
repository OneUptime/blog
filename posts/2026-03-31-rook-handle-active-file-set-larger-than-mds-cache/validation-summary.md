# Validation Summary: How to Handle Active File Set Larger Than MDS Cache

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph / CephFS
- Ceph MDS (Metadata Server)
- Kubernetes (kubectl)
- Prometheus alerting rules
- Grafana

## Sources Consulted
- Ceph MDS Cache Configuration docs (Reef): https://docs.ceph.com/en/reef/cephfs/cache-configuration/
- Ceph MDS config options source (`mds.yaml.in`): https://github.com/ceph/ceph/blob/main/src/common/options/mds.yaml.in
- Ceph health messages docs: https://docs.ceph.com/en/reef/cephfs/health-messages/
- Ceph FS volumes/subvolumes docs: https://docs.ceph.com/en/reef/cephfs/fs-volumes/
- Rook CephFilesystem CRD docs: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook MetadataServerSpec source (`types.go`): https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook official filesystem.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/filesystem.yaml
- Ceph PR #32042 (mds_cache_memory_limit default change): https://github.com/ceph/ceph/pull/32042
- Rook issue #8143 (mds_cache_memory_limit auto-calculation): https://github.com/rook/rook/issues/8143
- Ceph Prometheus module docs: https://docs.ceph.com/en/latest/mgr/prometheus/

## Issues Found

1. **`mds_cache_oversized` incorrect casing**: The health check code is `MDS_CACHE_OVERSIZED` (uppercase) in `ceph status` output. Changed from `mds_cache_oversized` to `MDS_CACHE_OVERSIZED`.

2. **`spec.metadataServer.config` does not exist in Rook CRD**: The blog used a fabricated `config` field to set `mds_cache_memory_limit` directly. This field does not exist in the Rook `CephFilesystem` CRD and would be silently ignored. Rook automatically calculates `mds_cache_memory_limit` from `resources.limits.memory` multiplied by `cacheMemoryLimitFactor` (default ~0.5). Fixed the YAML to remove the `config` field, adjusted memory limits to `16Gi` so that the auto-calculated cache limit is ~8 GiB, and added an explanation of how Rook handles this.

3. **`mds_cache_trim_threshold` set to `0.7` (wrong value type)**: This option expects an integer count (default 256,000), not a ratio/fraction. Setting it to `0.7` would truncate to 0, causing unexpected behavior. Replaced with `mds_cache_reservation 0.10` which is the correct ratio-based option (default 0.05) for controlling when the MDS starts trimming its cache.

4. **`mds_cache_trim_decay_rate` set to `1` (the default)**: The value `1` is already the default, making this command a no-op. The post claimed this tunes aggressiveness, which is misleading. Changed to `0.5` to actually make trimming more aggressive (shorter half-life for the trim throttle decay).

5. **Prometheus alert expression semantically incorrect**: `ceph_mds_mem_rss / ceph_mds_mem_heap > 0.9` does not measure cache pressure — it compares process RSS to heap size, which is unrelated to cache utilization. Changed to `ceph_mds_mem_rss > 0.9 * ceph_mds_cache_size` which compares actual memory usage against the cache size limit.

## Review Notes
- The default `mds_cache_memory_limit` of 4 GiB is correct for Ceph Octopus (15.x) and later. Earlier versions defaulted to 1 GiB.
- The `ceph tell mds.* cache status` command syntax is correct — it broadcasts to all MDS daemons.
- The `ceph fs subvolumegroup pin` command with `export` pin type is correct.
- Prometheus metric names for Ceph MDS vary by Ceph version and exporter configuration. The alert rule may need adjustment depending on the specific metrics available in the deployment.
- The overall structure and approach of the post (diagnose, increase cache, tune trimming, scale MDS, monitor) is sound and follows recommended Ceph operational practices.
