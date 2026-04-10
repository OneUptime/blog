# Validation Summary: How to Configure MDS Cache Memory Limit in Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph (MDS - Metadata Server)
- CephFS (Ceph Filesystem)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (resource limits, pod configuration)

## Sources Consulted
- Ceph MDS Cache Configuration documentation: https://docs.ceph.com/en/reef/cephfs/cache-configuration/
- Ceph source code `src/common/options/mds.yaml.in` for config option defaults
- Ceph source code `src/mds/MDSDaemon.cc` for admin socket commands
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook source code `pkg/apis/ceph.rook.io/v1/types.go` for MetadataServerSpec struct
- Rook GitHub Issue #8143 regarding MDS cache memory limit behavior
- Ceph Hardware Recommendations: https://docs.ceph.com/en/latest/start/hardware-recommendations/

## Issues Found

### 1. Nonexistent `metadataServer.config` CRD field (Critical)
**What was wrong:** The post showed a YAML snippet using `spec.metadataServer.config.MDS_CACHE_MEMORY_LIMIT` to set the cache limit. This field does not exist in the Rook CephFilesystem CRD. Rook automatically derives `mds_cache_memory_limit` from the pod's Kubernetes memory resource limit using a `cacheMemoryLimitFactor` (default 0.5).
**What was changed:** Replaced the incorrect YAML example with one that correctly sets `resources.limits.memory` on the `metadataServer` spec, and explained how Rook calculates the cache limit. Also increased the memory limit from 12Gi to 16Gi to be consistent with the 8GB cache target and Rook's default 0.5 factor.

### 2. Incorrect `mds_cache_trim_threshold` description (Major)
**What was wrong:** The post described `mds_cache_trim_threshold` as "start trimming when cache is 90% full (default 0.9)." This is incorrect -- `mds_cache_trim_threshold` is an integer threshold for the number of dentries that can be trimmed per cycle (default 256K), not a float percentage.
**What was changed:** Removed the `mds_cache_trim_threshold` command and replaced it with `mds_cache_trim_interval` (which controls how often the trim tick fires, default 1 second), which is more useful for tuning.

### 3. Incorrect `mds_cache_trim_decay_rate` description (Major)
**What was wrong:** The post described `mds_cache_trim_decay_rate` as "trim interval in seconds (default 5)." The actual default is 1.0, and it is an exponential half-life for the trim counter decay, not a trim interval.
**What was changed:** Corrected the comment to describe it as a "decay half-life for the trim counter" with accurate default value and behavior explanation.

### 4. Fragile `ceph daemon` command (Moderate)
**What was wrong:** The post used `ceph daemon mds.$(ceph mds stat | awk '/active/ {print $1}') cache status` which requires direct admin socket access and uses fragile awk parsing of `ceph mds stat` output. This would not work reliably from a Rook toolbox pod.
**What was changed:** Replaced with `ceph tell mds.myfs:0 cache status` which works remotely from the toolbox pod and uses the standard MDS name format.

### 5. Insufficient memory headroom recommendation (Moderate)
**What was wrong:** The post recommended "at least 20% above the MDS cache limit" for Kubernetes memory limits. MDS uses approximately 130% of its cache size in total RAM under normal conditions, so 20% headroom is insufficient and could lead to OOM kills.
**What was changed:** Changed to "50-100% above the MDS cache limit" with a note about MDS using ~130% of cache size in total RAM.

### 6. Summary section referenced nonexistent CRD field
**What was wrong:** Referenced `MDS_CACHE_MEMORY_LIMIT` config parameter in the CRD.
**What was changed:** Updated to correctly reference `cacheMemoryLimitFactor` and `ceph config set` as the two methods for controlling the cache limit.

## Review Notes
- The byte calculations throughout the post (4GB, 8GB, 16GB) are all correct.
- The default MDS cache memory limit of 4GB is correctly stated.
- The `ceph config set/get mds mds_cache_memory_limit` commands are correct.
- The sizing recommendations (4GB for <10M files, 8-16GB for 10-100M files, 16-32GB for >100M files) are reasonable guidelines.
- The `ceph mds stat` and `ceph fs status` commands for monitoring are correct.
