# Validation Summary: How to Configure compression_algorithm Per Pool in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (BlueStore OSD backend)
- Rook (Ceph operator for Kubernetes)
- CephBlockPool and CephFilesystem CRDs (ceph.rook.io/v1)
- Compression algorithms: snappy, lz4, zstd, zlib
- rados bench (Ceph benchmarking tool)
- kubectl

## Sources Consulted
- Ceph official documentation on BlueStore compression: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Rook documentation on CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook documentation on CephFilesystem CRD: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Ceph CLI reference for `ceph osd pool set/get` compression parameters
- `zstd`, `lz4`, and `gzip` CLI tool man pages

## Issues Found
1. **Incorrect benchmark shell script**: The original script used a for-loop (`for algo in snappy lz4 zstd zlib; do ... cat /var/log/syslog | $algo > /tmp/test.$algo`) that attempted to invoke `snappy` and `zlib` as command-line tools. Neither `snappy` nor `zlib` has a standard CLI tool — only `zstd` and `lz4` have standalone CLI compressors. The `zlib` library is used internally by `gzip`, but there is no `zlib` command. Fixed the script to use `zstd -c`, `lz4 -c`, and `gzip -c` (for zlib), and added a note explaining that snappy lacks a standard CLI tool and should be benchmarked via `rados bench` on actual Ceph pools instead.

## Review Notes
- The compression mode values used (`aggressive`, `passive`) are correct. The full set of valid modes is: `none`, `passive`, `aggressive`, `force`.
- The `COMPRESS_BYTES_USED` and `COMPRESS_UNDER_BYTES` field names in `ceph df detail` output may appear with spaces instead of underscores depending on the Ceph version, but the concept and the command are correct.
- The CRD structures (CephBlockPool with `spec.parameters` and CephFilesystem with `spec.dataPools[].parameters`) are accurate for current Rook versions.
- The algorithm speed/ratio characterizations in the comparison table are reasonable generalizations, though actual performance varies significantly by data type and hardware.
