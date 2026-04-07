# Validation Summary: How to Set Minimum and Maximum Blob Sizes for Compression

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph BlueStore compression
- Rook Ceph Operator (CephBlockPool CRD)
- Ceph CLI (`ceph config set/get`, `ceph osd pool set/get`)

## Sources Consulted
- Ceph official documentation on BlueStore compression configuration: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Rook documentation on CephBlockPool CRD: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph source code for BlueStore default configuration values

## Issues Found
No technical issues found.

## Review Notes
- The table descriptions for max blob size settings say "Maximum SSD blob compressed size" and "Maximum HDD blob compressed size", which could be read as "the maximum size of the compressed output." In reality, these control the maximum blob size that BlueStore will use when writing compressed data — larger writes are split into blobs of this size before compression. The wording is slightly ambiguous but not technically incorrect in context.
- Default values in the table (min SSD: 8KB, min HDD: 128KB, max SSD: 64KB, max HDD: 512KB) are correct for current Ceph releases.
- All `ceph config set/get` and `ceph osd pool set/get` command syntax is correct.
- The Rook CephBlockPool YAML correctly uses `spec.compressionMode` and `spec.parameters` for pool-level compression settings, which Rook passes through to Ceph.
- Byte value calculations in commands are all correct (e.g., 16384 = 16KB, 262144 = 256KB, 131072 = 128KB, 1048576 = 1MB).
