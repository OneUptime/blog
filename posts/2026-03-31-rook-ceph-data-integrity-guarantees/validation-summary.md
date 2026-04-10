# Validation Summary: How to Understand Ceph Data Integrity Guarantees

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- BlueStore (Ceph's default OSD backend since Luminous)
- RocksDB (metadata store used by BlueStore)
- RADOS (Reliable Autonomic Distributed Object Store)
- Rook (Kubernetes operator for Ceph)
- Erasure coding

## Sources Consulted
- Ceph BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph source code `src/common/Checksummer.h` for definitive list of supported checksum types: https://github.com/ceph/ceph/blob/main/src/common/Checksummer.h
- Ceph Pool Operations documentation: https://docs.ceph.com/en/reef/rados/operations/pools/
- Ceph rados man page: https://manpages.debian.org/unstable/ceph-common/rados.8.en.html
- Ceph rados source code (`rados.cc`) for stdin `-` support: https://github.com/ceph/ceph/blob/main/src/tools/rados/rados.cc
- Red Hat Ceph Storage 4 Scrubbing Options documentation

## Issues Found
- **Incorrect checksum algorithm listed**: The post listed `sha1` as a supported `bluestore_csum_type` algorithm. SHA-1 is not implemented in BlueStore's checksum system. The actual supported types are: `crc32c` (default), `xxhash32`, `xxhash64`, `crc32c_16`, `crc32c_8`, and `none`. The `crc32c_16` and `crc32c_8` variants are truncated CRC32C checksums that reduce metadata overhead at the cost of weaker error detection. Fixed by replacing `sha1` with `crc32c_16, crc32c_8` in the supported algorithms list.

## Review Notes
- All CLI commands (`ceph config get`, `ceph osd pool get/set`, `ceph pg dump`, `ceph pg repair`, `ceph health detail`, `rados put/get/bench`) use correct syntax and valid flags.
- The pool-level scrub interval parameters (`scrub_min_interval`, `deep_scrub_interval`) are valid pool-level overrides of the global OSD settings.
- The `rados put testobj - -p mypool` syntax correctly uses `-` for stdin input, confirmed in Ceph source code.
- Default scrub intervals (daily for light scrub, weekly for deep scrub) are accurate.
- The description of BlueStore's WAL and RocksDB usage is accurate.
- The `rados bench` commands use correct syntax for write and sequential read benchmarks.
