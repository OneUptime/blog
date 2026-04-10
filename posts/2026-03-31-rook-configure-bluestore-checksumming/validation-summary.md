# Validation Summary: How to Configure BlueStore Checksumming

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Ceph BlueStore
- Rook Ceph Operator
- Kubernetes (kubectl)
- Ceph CLI (ceph config, ceph tell, ceph daemon, ceph pg)

## Sources Consulted
- [Ceph BlueStore Configuration Reference (Reef)](https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/)
- [Ceph Checksummer.h source (checksum type definitions)](https://github.com/ceph/ceph/blob/main/src/common/Checksummer.h)
- [Ceph BlueStore.h source (perf counter definitions)](https://github.com/ceph/ceph/blob/main/src/os/bluestore/BlueStore.h)
- [Rook CephCluster CRD Specification](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- [Rook CRD Specification (type definitions)](https://rook.io/docs/rook/latest/CRDs/specification/)
- [Rook Ceph Configuration Guide](https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/)

## Issues Found
1. **Incorrect perf counter names in "Verifying Checksums are Active" section**: The original post referenced `bluestore_csum_read` and `bluestore_csum_write` perf counters, which do not exist in Ceph. The only checksum-related BlueStore perf counter is `csum_lat` (checksum latency), defined as `l_bluestore_csum_lat` in `BlueStore.h`. Fixed the jq command to query `.bluestore.csum_lat` and updated the explanation to check `avgcount` for read-side checksum verification activity.

## Review Notes
- The list of supported checksum algorithms (`none`, `crc32c`, `crc32c_16`, `crc32c_8`, `xxhash32`, `xxhash64`) matches the `CSumType` enum in `Checksummer.h`. Some external references mention `sha1`/`sha256`/`sha512` but these are NOT supported by BlueStore checksumming — the blog post correctly omits them.
- The Rook `spec.cephConfig` YAML structure uses `osd` as a section key, which is valid per the CRD specification (`map[string]map[string]string`). Some Rook documentation examples use `"osd.*"` as an alternative pattern; both are valid Ceph config targets.
- The `csum_lat` counter only tracks checksum verification during reads, not checksum computation during writes. There is no separate write-side checksum perf counter in BlueStore.
- The `ceph tell osd.N config set` approach correctly applies a runtime-only config change that does not persist across OSD restarts.
