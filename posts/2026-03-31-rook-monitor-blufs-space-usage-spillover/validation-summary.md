# Validation Summary: How to Monitor BluFS Space Usage and Spillover

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph BlueStore / BlueFS
- RocksDB (as embedded in BlueStore)
- ceph-bluestore-tool CLI
- Ceph admin socket (`ceph daemon`)
- Prometheus alerting (Ceph exporter metrics)
- Rook (context: Ceph on Kubernetes)

## Sources Consulted
- Ceph ceph-bluestore-tool man page: https://docs.ceph.com/en/latest/man/8/ceph-bluestore-tool/
- Ceph BlueFS source code (BlueFS.cc perf counter registration): https://github.com/ceph/ceph/blob/main/src/os/bluestore/BlueFS.cc
- Ceph Prometheus Module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- IBM Docs - Viewing Ceph BlueFS statistics: https://www.ibm.com/docs/en/storage-ceph/7.1.0?topic=bluefs-viewing-ceph-statistics-ceph-osds
- Debian manpage for ceph-bluestore-tool: https://manpages.debian.org/testing/ceph-osd/ceph-bluestore-tool.8.en.html

## Issues Found
1. **`bluefs stats` output description was incorrect.** The blog listed `db_total_bytes`, `db_used_bytes`, `slow_total_bytes`, and `slow_used_bytes` as "Expected output fields" of `ceph daemon osd.0 bluefs stats`. In reality, `bluefs stats` outputs a human-readable text table (not JSON), and those field names belong to the `perf dump` command's `bluefs` section. Fixed by clarifying that `bluefs stats` produces text output and that the structured fields come from the `perf dump` command shown earlier in the same section.

## Review Notes
- Setting `bluestore_bluefs_gift_ratio` to 0.02 is simply setting it to its default value. This is not incorrect but is redundant. Left as-is since explicitly stating the value can still be useful for documentation purposes.
- The Prometheus metrics (`ceph_bluefs_db_total_bytes`, etc.) are OSD-level perf counters exposed via the ceph-exporter daemon rather than the mgr prometheus module's statically defined metrics. The blog's description is accurate but users should be aware they need ceph-exporter (or equivalent) for these per-OSD metrics.
- The `bluestore allocator score block` command returns a fragmentation score, not BlueFS space usage directly. It's somewhat tangential to BlueFS monitoring but not incorrect to include in a broader monitoring context.
