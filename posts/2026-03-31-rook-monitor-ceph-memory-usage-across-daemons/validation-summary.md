# Validation Summary: How to Monitor Ceph Memory Usage Across Daemons

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (BlueStore OSDs, MONs, MGR daemons)
- Rook (Ceph operator for Kubernetes)
- Prometheus (monitoring and alerting)
- Kubernetes (resource limits, kubectl, cAdvisor)
- Prometheus Operator (PrometheusRule CRD)

## Sources Consulted
- Ceph MGR Prometheus Module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph perf counters documentation: https://docs.ceph.com/en/reef/dev/perf_counters/
- cAdvisor Prometheus metrics: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Ceph BlueFS source (BlueFS.cc): https://github.com/ceph/ceph/blob/main/src/os/bluestore/BlueFS.cc
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found

### Issue 1: `ceph_osd_stat_bytes_used` mislabeled as memory metric
- **What was wrong:** The metric `ceph_osd_stat_bytes_used` was listed under "OSD memory usage per daemon." This metric actually tracks OSD disk/storage space used, not daemon memory consumption.
- **What was changed:** Replaced the entire Prometheus metrics block. Moved `container_memory_working_set_bytes` (the correct memory metric, already present but listed last) to the top as the primary daemon memory metric. Added `container_spec_memory_limit_bytes` for calculating memory usage percentage. Added `ceph_bluestore_cache_bytes` as the relevant Ceph-specific memory metric for BlueStore cache utilization.
- **Why:** A post about memory monitoring should not present storage metrics as memory metrics. The container-level cAdvisor metrics are the correct and most reliable way to monitor Ceph daemon memory in Kubernetes.

### Issue 2: `ceph_bluefs_bytes{component="..."}` incorrect metric names and description
- **What was wrong:** The metrics `ceph_bluefs_bytes{component="db"}` and `ceph_bluefs_bytes{component="slow"}` do not exist in this format. The real BlueFS metrics are individually named (e.g., `ceph_bluefs_db_used_bytes`, `ceph_bluefs_slow_used_bytes`). Additionally, the comment "BlueStore cache size (alloc)" was incorrect — BlueFS tracks the internal filesystem used by RocksDB for metadata, not the BlueStore read cache.
- **What was changed:** Removed these incorrect metrics and replaced with `ceph_bluestore_cache_bytes`, which is the actual BlueStore cache memory metric from Ceph perf counters.
- **Why:** The original metrics had a fabricated name format and were mislabeled as cache/memory metrics when they track device storage allocation.

### Issue 3: `ceph tell mgr heap stats` invalid syntax
- **What was wrong:** `ceph tell mgr heap stats` is not valid — the `ceph tell` command requires the full daemon identifier. For the manager, this must be `ceph tell mgr.<name> heap stats` where `<name>` is the active manager instance name.
- **What was changed:** Changed `ceph tell mgr heap stats` to `ceph tell mgr.a heap stats` with a comment explaining that users should replace `a` with their active MGR name from `ceph mgr stat`.
- **Why:** The bare `mgr` target is not accepted by `ceph tell`. Unlike `osd.*` and `mon.*` which use wildcards, the manager requires an explicit instance name.

## Review Notes
- The `ceph tell osd.* heap stats` and `ceph tell mon.* heap stats` commands require TCMalloc to be the memory allocator. In some Ceph container builds, TCMalloc may not be enabled, causing these commands to fail with "tcmalloc not enabled." The post could mention this caveat but it is not incorrect as-is since most Rook/Ceph container images include TCMalloc.
- The `ceph_bluestore_cache_bytes` metric requires the MGR Prometheus module to have perf counter export enabled. In newer Ceph versions, this may need `exclude_perf_counters = false` to be set on the module.
- The BlueStore cache size defaults mentioned in the config section (implicitly via the set command) are correct: the defaults are 1 GiB for HDD and 3 GiB for SSD.
- The PrometheusRule alert definition is well-structured and uses correct PromQL syntax.
- The Rook CephCluster resource specification format is correct for current Rook versions.
