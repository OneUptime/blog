# Validation Summary: How to Limit Recovery Impact on Client IO in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (container orchestration)

## Sources Consulted
- Ceph official documentation on OSD configuration options (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph man page for `ceph osd perf`
- Rook official documentation on CephCluster CRD (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook GitHub repository CRD documentation (Documentation/CRDs/Cluster/ceph-cluster-crd.md)

## Issues Found

### 1. Incorrect Rook CephCluster CRD YAML structure
- **What was wrong:** The `spec.cephConfig` section used `osd:` as the daemon target key. The Rook CephCluster CRD requires Ceph "who" syntax with wildcards — the correct key is `"osd.*"` (quoted, with the wildcard pattern).
- **What was changed:** Replaced `osd:` with `"osd.*":` in the YAML example.
- **Why:** Using bare `osd` would not correctly target all OSD daemons. The Rook operator expects the same "who" syntax used by `ceph config set`.

### 2. Misleading description of `osd_recovery_max_chunk`
- **What was wrong:** The section titled "Recovery Bandwidth Throttling" described the parameter as limiting "network bandwidth used for recovery." In reality, `osd_recovery_max_chunk` limits the maximum size of data chunks pushed during a recovery operation, not bandwidth directly.
- **What was changed:** Renamed the section to "Recovery Chunk Size Throttling" and corrected the description to accurately describe what the parameter controls. Also noted that 8388608 (8 MB) is the default value.
- **Why:** The original description could mislead readers into thinking this is a bandwidth rate limiter (like bytes/second), when it actually controls per-operation chunk size.

## Review Notes
- `osd_recovery_op_priority` is set to `3` in the "Practical Throttling Configuration" section and described as a "conservative" setting, but `3` is actually the default value. It is not technically incorrect, but readers may expect it to be a tuned-down value.
- `osd_max_backfills` is set to `1`, which is also the default value. Again not incorrect, but explicitly setting defaults can be useful for documentation purposes.
- `osd_recovery_max_chunk` is set to `8388608`, which is the default (8 MB). Consider using a lower value (e.g., 4 MB) to actually demonstrate throttling.
- The recovery sleep parameters (`osd_recovery_sleep`, `osd_recovery_sleep_hdd`, etc.) are ignored when the mClock scheduler is active, which is the default scheduler in Ceph Quincy and later. This is a significant caveat not mentioned in the post that could affect readers using modern Ceph versions.
- All `ceph config set` commands and `ceph osd perf` are syntactically correct and valid.
