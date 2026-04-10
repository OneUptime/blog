# Validation Summary: How to Configure BlueStore Checksums for Data Integrity

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph BlueStore
- Rook (Ceph Kubernetes operator)
- CephBlockPool CRD
- RADOS benchmarking tools

## Sources Consulted
- Ceph BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph Checksummer.h source code (checksum type enum): https://github.com/ceph/ceph/blob/main/src/common/Checksummer.h
- Ceph rados man page: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph Pools documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found

1. **`sha1` listed as a supported checksum algorithm**: BlueStore does not support SHA1. The valid checksum types defined in the Ceph source (`Checksummer.h`) are: `none`, `crc32c`, `crc32c_16`, `crc32c_8`, `xxhash32`, `xxhash64`. Removed `sha1` from the list.

2. **`bluestore_block_size` used instead of `bluestore_csum_block_size`**: In the "Viewing Current Configuration" section, the command `ceph config get osd bluestore_block_size` was shown. `bluestore_block_size` controls the size of the main block device for BlueStore, not checksum granularity. Changed to `bluestore_csum_block_size` to match the checksum context and be consistent with the later "Checksum Block Size" section.

3. **`bluestore_csum_type` used as a pool parameter in Rook YAML**: The Rook CephBlockPool `parameters` field sets pool-level properties. The per-pool checksum property is `csum_type` (without the `bluestore_` prefix). `bluestore_csum_type` is an OSD-level global config option. Changed to `csum_type` in the YAML.

4. **`rados stat` claimed to force a checksum read**: `rados stat` is a metadata-only operation that returns object size and modification time — it does not read data and therefore does not trigger checksum verification. Changed to `rados get`, which performs an actual data read and triggers BlueStore checksum verification.

## Review Notes
- The default checksum block size of 4096 bytes is correct for HDD-backed OSDs. For SSD-backed OSDs, `bluestore_min_alloc_size` defaults to 16 KiB, which may result in a different effective checksum block size. The post could mention this nuance in a future update.
- The claim that CRC32c overhead is "under 2%" is reasonable for typical workloads with hardware-accelerated CRC32c (SSE4.2) but is not an officially documented figure.
- The `ceph tell osd.* config set` command for runtime configuration is correct and useful advice.
