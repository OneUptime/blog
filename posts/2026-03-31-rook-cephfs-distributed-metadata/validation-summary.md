# Validation Summary: How to Configure CephFS Distributed Metadata Cache in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- Ceph MDS (Metadata Server)
- Kubernetes CRDs (CephFilesystem)
- kubectl

## Sources Consulted
- [Rook CephFilesystem CRD documentation (latest)](https://rook.io/docs/rook/latest-release/CRDs/Shared-Filesystem/ceph-filesystem-crd/)
- [Rook CephFilesystem CRD source (master)](https://github.com/rook/rook/blob/master/Documentation/CRDs/Shared-Filesystem/ceph-filesystem-crd.md)
- [Rook PR #16556 - Allow overriding MDS cache memory limit](https://github.com/rook/rook/pull/16556) (merged Oct 2025)
- [Rook Issue #16551 - Allow overriding the MDS Cache Memory limit setting](https://github.com/rook/rook/issues/16551)
- [Rook Issue #8143 - MDS configuration mds_cache_memory_limit is not set as expected](https://github.com/rook/rook/issues/8143)
- [Ceph MDS Cache Configuration (Reef)](https://docs.ceph.com/en/reef/cephfs/cache-configuration/)
- [Ceph MDS Cache Configuration (latest)](https://docs.ceph.com/en/latest/cephfs/cache-configuration/)
- [New in Luminous: CephFS Metadata Server Memory Limits](https://ceph.io/en/news/blog/2017/new-luminous-cephfs-metadata-server-memory-limits/)
- [Clyso - MDS Memory Management](https://docs.clyso.com/docs/kb/cephfs/mds-memory-management/)
- [Rook API Specification](https://rook.io/docs/rook/latest/CRDs/specification/)

## Issues Found

### Issue 1: `mds_cache_trim_threshold` description was incorrect
- **What was wrong:** The post described `mds_cache_trim_threshold` as a "fraction of cache limit at which trimming begins." This is incorrect. It is the number of entries trimmed per tick, used to throttle the cache trimming rate (default ~64K entries). It works with `mds_cache_trim_decay_rate` to prevent the MDS from spending too much time trimming.
- **What was changed:** Updated the description to "number of entries trimmed per tick to throttle cache trimming rate."
- **Why:** The original description confused this throttle parameter with a memory-fraction threshold, which could mislead readers into setting it as a decimal fraction rather than an entry count.

### Issue 2: `metadataServer.config` field does not exist in Rook CephFilesystem CRD
- **What was wrong:** The post claimed MDS cache settings are configured via a `metadataServer.config` map in the CephFilesystem CRD YAML. This field does not exist. Rook automatically calculates `mds_cache_memory_limit` from the pod's memory resource limit using a hardcoded factor (0.5 for limits, 0.8 for requests). Since Rook PR #16556 (merged Oct 2025), `cacheMemoryLimitFactor` and `cacheMemoryRequestFactor` fields were added to `MetadataServerSpec` to allow overriding these ratios.
- **What was changed:** Removed the nonexistent `config` map from both YAML examples. Updated the text to explain Rook's auto-calculation mechanism and the `cacheMemoryLimitFactor` field. Adjusted memory limit values so the math is consistent (e.g., 16 GiB limit * 0.5 factor = 8 GiB cache). Updated the summary section to reference the correct mechanism.
- **Why:** Using the nonexistent `config` field would cause validation errors when applying the CRD. Readers need to know the actual mechanism (resource limits + factor) to correctly configure MDS cache sizing.

### Issue 3: Resource limits inconsistent with cache sizing
- **What was wrong:** In the first YAML example, the memory limit was 12 GiB with a config-based cache of 8 GiB. With Rook's actual mechanism (50% of limit), 12 GiB would yield only 6 GiB cache. In the second example, the memory limit was 8 GiB with a config-based cache of 6 GiB, but 50% of 8 GiB is only 4 GiB.
- **What was changed:** Adjusted memory limits to be consistent: first example uses 16 GiB limit (yielding 8 GiB cache), second example uses 12 GiB limit (yielding 6 GiB cache).
- **Why:** Readers need consistent examples where the resource limits and resulting cache sizes align correctly.

## Review Notes
- The example `cache status` output shown in the post is simplified and does not match the actual verbose JSON output from `ceph tell mds.<id> cache status`. Since it is labeled as an example, this is acceptable for illustrative purposes but readers should expect more detailed output in practice.
- The `mds_cache_memory_limit` default of 4 GiB is correct for modern Ceph versions (Reef, Squid). Earlier versions (Luminous) defaulted to 1 GiB.
- The `ceph tell mds.myfs:0` daemon addressing format using `<fsname>:<rank>` is valid in modern Ceph versions.
- The `MDS_CACHE_OVERSIZED` health warning code is accurate.
- The runtime `ceph tell` method for tuning cache settings is correct and remains the recommended approach for live tuning without pod restarts.
