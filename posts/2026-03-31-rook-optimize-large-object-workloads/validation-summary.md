# Validation Summary: How to Optimize Ceph for Large Object Workloads

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Ceph (RADOS, RBD, CephFS, RGW)
- Rook (Ceph operator for Kubernetes)
- Erasure coding (jerasure plugin, Reed-Solomon Vandermonde)
- AWS S3-compatible API (boto3 multipart upload)
- Linux kernel network tuning (sysctl, TCP BBR)
- fio and rados bench (benchmarking tools)

## Sources Consulted
- Ceph RBD documentation: maximum object size defined by `RBD_MAX_OBJ_ORDER = 25` (2^25 = 32 MB) — https://docs.ceph.com/en/latest/rbd/
- Ceph RGW configuration reference for valid config keys (`rgw_max_chunk_size`, `rgw_put_obj_max_window_size`, `rgw_put_obj_min_window_size`, `rgw_multipart_min_part_size`) — https://docs.ceph.com/en/latest/radosgw/config-ref/
- Ceph erasure coding documentation (jerasure plugin, `reed_sol_van` technique) — https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/
- CephFS file layout documentation (`ceph.dir.layout` extended attributes) — https://docs.ceph.com/en/latest/cephfs/file-layouts/
- Cross-referenced with sibling post `2026-03-31-rook-optimize-rgw-large-object-workloads` which uses the correct parameter names
- Linux kernel TCP tuning documentation for sysctl parameters and BBR congestion control
- boto3 S3 multipart upload API documentation — https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html

## Issues Found

### 1. RBD object size exceeds maximum (line 22)
- **What was wrong:** The `rbd create` command used `--object-size 67108864` (64 MB). The maximum RBD object size is 32 MB, defined by `RBD_MAX_OBJ_ORDER = 25` (2^25 = 33554432 bytes). The command would fail with an error.
- **What was changed:** Changed to `--object-size 33554432` (32 MB) and updated the comment from "use 64 MB" to "use 32 MB (RBD maximum)".
- **Why:** 64 MB exceeds the hard-coded RBD maximum. Note: CephFS object_size of 64 MB (in the section below) is valid since CephFS uses `osd_max_object_size` (default 128 MB), not the RBD limit.

### 2. Invalid RGW config parameter `rgw_multipart_part_size` (line 42)
- **What was wrong:** `rgw_multipart_part_size` is not a valid Ceph RGW configuration parameter. Multipart part size is controlled client-side, not server-side. The valid server-side parameter is `rgw_multipart_min_part_size` (minimum allowed part size) or `rgw_max_chunk_size` (internal chunk size for writes).
- **What was changed:** Replaced with `rgw_max_chunk_size 67108864` (64 MB), which controls the maximum chunk size RGW uses when writing to RADOS — a genuine performance tuning knob for large object throughput.
- **Why:** The original parameter doesn't exist in any Ceph version. `rgw_max_chunk_size` achieves the intended optimization goal.

### 3. Invalid RGW config parameter `rgw_put_obj_window_size` (line 51)
- **What was wrong:** `rgw_put_obj_window_size` is not a valid Ceph config key. The correct parameter is `rgw_put_obj_max_window_size`.
- **What was changed:** Renamed to `rgw_put_obj_max_window_size`.
- **Why:** Confirmed correct name by cross-referencing with Ceph config reference and the sibling RGW large object post in this blog.

## Review Notes
- **`rgw_num_rados_handles`**: This parameter was deprecated in Ceph Nautilus and removed in later versions. In modern Ceph (Pacific, Quincy, Reef), it has no effect. The post doesn't specify a Ceph version, so this was left as-is, but readers on modern Ceph should be aware it is a no-op.
- **`rgw_thread_pool_size`**: Valid parameter but may have different defaults across Ceph versions. The value 256 is reasonable for a busy RGW instance.
- **Persistent sysctl config**: The `/etc/sysctl.d/99-ceph-large.conf` section only persists a subset of the runtime sysctl settings (missing `tcp_rmem` and `tcp_wmem`). Not technically wrong since it's framed as showing key settings, but readers should persist all tuned values for production use.
- **Python multipart upload code**: Syntactically correct and functional. Uses the standard boto3 S3 multipart API correctly. For production use, error handling and retry logic would be recommended, but that's beyond the scope of this tutorial.
- **Erasure coding math**: K=6, M=2 storage efficiency of 75% vs 33% for 3x replication is calculated correctly (K/(K+M) = 6/8 = 75%).
