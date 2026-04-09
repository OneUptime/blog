# Validation Summary: How to Enable Compression for Ceph Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (BlueStore OSD backend)
- Rook (CephBlockPool CRD)
- CephFS
- Kubernetes (kubectl)
- rados CLI tool

## Sources Consulted
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph Pools documentation: https://docs.ceph.com/en/reef/rados/operations/pools/
- Ceph Monitoring a Cluster: https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Ceph Autoscaling Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Rook CephBlockPool CRD: https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found

1. **Incorrect `ceph df detail` column descriptions**: The post described `USED` as "actual bytes after compression" and `RAW USED` as "physical bytes stored (including replicas)". `RAW USED` is a global cluster metric, not a per-pool column. The correct per-pool columns for measuring compression are `STORED` (logical data), `USED` (raw bytes including replication), and the compression-specific `USED COMPR` and `UNDER COMPR` columns. Fixed to list the correct column names and descriptions.

2. **`ceph osd pool stats` listed for compression measurement**: This command shows I/O rate statistics (read/write ops and throughput), not storage usage or compression statistics. It is not useful for measuring compression savings. Removed from the "Measuring Compression Savings" section.

3. **Misleading `rados bench` comment**: The comment claimed "Write 1GB of compressible data" but `rados bench 30 write` is time-based (runs for 30 seconds), not size-based. Fixed the comment to accurately describe the operation.

## Review Notes
- BlueStore also supports `zlib` as a compression algorithm, which the post does not mention. This is not an error since the post doesn't claim to list all algorithms, but could be added for completeness.
- The Ceph documentation notes that `zstd` has higher CPU overhead compared to `snappy` and `lz4`, especially for small data chunks. The post's recommendation of `zstd` for cold/archival pools is appropriate since CPU overhead matters less for infrequent access patterns.
- `rados bench` writes zero-filled buffers by default, which are maximally compressible. This is fine for verifying that compression is enabled and working, but will show unrealistically high compression ratios compared to real-world data.
- The Rook CephBlockPool YAML uses both `compressionMode` (a direct CRD field) and `parameters.compression_algorithm` (passed through as a Ceph pool parameter). Both approaches are valid and correctly used.
