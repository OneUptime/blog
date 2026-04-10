# Validation Summary: How to Configure Different Compression Settings Per Pool

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph BlueStore (OSD backend with transparent compression)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl CLI)
- CephBlockPool CRD (Rook custom resource)
- Compression algorithms: snappy, zlib, zstd, lz4

## Sources Consulted
- Ceph BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph Perf Counters documentation: https://docs.ceph.com/en/reef/dev/perf_counters/
- Ceph Control Commands: https://docs.ceph.com/en/latest/rados/operations/control/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook pool.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/pool.yaml

## Issues Found

### 1. Incorrect command for per-OSD compression statistics
- **What was wrong:** The post used `ceph osd perf dump | grep compress` to get per-OSD compression statistics. `ceph osd perf dump` is not a valid Ceph command. `ceph osd perf` only shows commit and apply latency per OSD, with no compression data.
- **What was changed:** Replaced with `ceph tell osd.0 perf dump | grep compress`, which is the correct command to dump per-OSD performance counters (including BlueStore compression counters like `bluestore_compressed_allocated` and `bluestore_compressed_original`).
- **Why:** `ceph tell osd.N perf dump` is the standard remote command for retrieving detailed per-OSD perf counters.

### 2. Incorrect column names for `ceph df detail` output
- **What was wrong:** The post referenced `COMPRESS_BYTES_USED` and `COMPRESS_UNDER_BYTES` as column names in `ceph df detail` output. These are actually Prometheus metric names (`ceph_pool_compress_bytes_used`, `ceph_pool_compress_under_bytes`), not the CLI column headers.
- **What was changed:** Corrected to `USED COMPR` and `UNDER COMPR`, which are the actual column headers shown in `ceph df detail` CLI output.
- **Why:** Users following the tutorial would not find columns matching the original names in the CLI output.

## Review Notes
- The compression algorithm descriptions are reasonable generalizations. In practice, lz4 can be faster than snappy in many benchmarks, but the characterizations are close enough for a guidance-level overview.
- The `compression_min_blob_size` value of `"128"` (128 bytes) in the YAML example is very small compared to defaults (128KB for HDD, 8KB for SSD). While technically valid, readers should be aware these are illustrative values, not production recommendations.
- Ceph docs note that zstd is "not recommended for BlueStore due to high CPU overhead when compressing small amounts of data." The post recommends zstd for archive/backup pools which is reasonable, but readers should be aware of this caveat for mixed workloads.
- Even in `aggressive` or `force` mode, BlueStore applies a `compression_required_ratio` check (default 0.875) and stores uncompressed data if compression doesn't achieve that ratio. The post doesn't mention this nuance.
