# Validation Summary: How to Set compression_mode Per Pool in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph BlueStore compression
- Rook Ceph Operator (CephBlockPool CRD)
- kubectl CLI
- jq for JSON parsing

## Sources Consulted
- Ceph official documentation on BlueStore compression: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph CLI reference for `ceph osd pool set`: https://docs.ceph.com/en/latest/rados/operations/pools/

## Issues Found
No technical issues found.

## Review Notes
- The four compression modes (`none`, `passive`, `aggressive`, `force`) are accurately described and match the Ceph BlueStore documentation.
- The CephBlockPool CRD YAML uses the correct `parameters` map for setting `compression_algorithm` and `compression_mode`, consistent with Rook's CRD spec.
- The CLI syntax `ceph osd pool set <pool> compression_mode <value>` is correct.
- All referenced compression algorithms (snappy, lz4, zstd, zlib) are valid BlueStore compression algorithms.
- The `ceph df detail` JSON output fields (`compress_bytes_used`, `compress_under_bytes`) are correct for monitoring compression statistics.
- The compression ratio calculation (`compress_under_bytes / compress_bytes_used`) correctly represents the original-to-compressed ratio, where values above 1.0 indicate savings.
- The `compression_min_blob_size` and `compression_max_blob_size` pool parameters are valid and correctly used.
- The section title "Combine Compression Mode with Min Compression Hint" is slightly informal — these are blob size thresholds, not RADOS hints — but this is a stylistic choice rather than a technical error.
