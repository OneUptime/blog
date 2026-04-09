# Validation Summary: How to Enable Compression for RGW Object Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RADOS Gateway / RGW)
- Rook (Kubernetes Ceph operator)
- BlueStore compression (pool-level)
- RGW compression plugin (daemon-level)
- AWS CLI (S3-compatible testing)
- radosgw-admin CLI

## Sources Consulted
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph RGW Compression Documentation: https://docs.ceph.com/en/latest/radosgw/compression/
- Ceph RGW Placement Documentation: https://docs.ceph.com/en/latest/radosgw/placement/
- Ceph Monitoring Documentation (ceph df detail columns): https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Rook CephObjectStore CRD Documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/

## Issues Found

### 1. Non-existent `rgw_compression_type` config key (Method 2)
- **What was wrong:** The post used `ceph config set client.rgw rgw_compression_type zlib` to configure RGW-level compression. The config key `rgw_compression_type` does not exist in Ceph. RGW-level compression is configured per zone placement target using `radosgw-admin zone placement modify --compression <type>`.
- **What was changed:** Replaced the incorrect `ceph config set` command with the correct `radosgw-admin zone placement modify` command. Restructured Method 2 to accurately describe RGW daemon-level compression.

### 2. Rook CephObjectStore YAML mislabeled as RGW-level compression
- **What was wrong:** The Rook CephObjectStore YAML was placed under "Method 2: RGW-Level Compression Plugin", but `dataPool.compressionMode` and `dataPool.parameters.compression_algorithm` configure BlueStore pool-level compression on the underlying RADOS pool, not RGW daemon-level compression. The Rook CRD does not expose RGW-level compression configuration.
- **What was changed:** Moved the Rook CephObjectStore YAML into a new "Method 1b" section that correctly identifies it as pool-level compression configured declaratively through Rook. Also changed `compressionMode: aggressive` to `parameters.compression_mode: aggressive` to use the standard pool parameters format.

### 3. Wrong subcommand and flag for per-storage-class compression
- **What was wrong:** The command used `radosgw-admin zonegroup placement modify --rgw-zonegroup default`. The correct subcommand is `zone placement modify` (not `zonegroup`), and the correct flag is `--rgw-zone` (not `--rgw-zonegroup`).
- **What was changed:** Corrected to `radosgw-admin zone placement modify --rgw-zone default`.

### 4. Incorrect `ceph df detail` column names
- **What was wrong:** The post referenced `COMPRESS_UNDER_BYTES` and `COMPRESS_BYTES_USED` as column names from `ceph df detail`. The actual column headers are `UNDER COMPR` and `USED COMPR`.
- **What was changed:** Corrected to `UNDER COMPR` and `USED COMPR`.

### 5. Summary section referenced non-existent config key
- **What was wrong:** The summary mentioned `rgw_compression_type` which does not exist.
- **What was changed:** Replaced with `radosgw-admin zone placement modify`.

## Review Notes
- The official Ceph docs note that it is typical to enable either pool-level (BlueStore) or RGW-level compression, not both simultaneously. Added this guidance to the post.
- The Ceph docs caution that zstd has high CPU overhead for BlueStore when compressing small amounts of data; `snappy` is the default BlueStore algorithm. The post recommends zstd for pool-level compression, which is valid but readers should be aware of the CPU trade-off.
- The `head-object` test in the AWS CLI section will show the original `ContentLength` of the object, not the compressed on-disk size. Compression savings are only visible through `ceph df detail` or `radosgw-admin bucket stats`, not through S3 API metadata. This is not incorrect in the post but could be clarified.
