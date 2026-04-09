# Validation Summary: How to Optimize Ceph for Random Write Workloads

## Status
validated

## Post Type
Tutorial / Performance Tuning Guide

## Technologies Covered
- Ceph (BlueStore, RocksDB, RADOS)
- Rook (CephCluster CRD)
- Linux I/O scheduler (mq-deadline, none)
- RBD (RADOS Block Device) client caching
- fio (Flexible I/O Tester) with rbd ioengine
- CRUSH rules and device classes

## Sources Consulted
- [BlueStore Configuration Reference — Ceph Documentation (Reef)](https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/)
- [Ceph Architecture — Ceph Documentation (Reef)](https://docs.ceph.com/en/reef/architecture/)
- [RBD Config Settings — Ceph Documentation (Reef)](https://docs.ceph.com/en/reef/rbd/rbd-config-ref/)
- [CephCluster CRD — Rook Documentation](https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- [Host Storage Cluster — Rook Documentation](https://rook.github.io/docs/rook/latest/CRDs/Cluster/host-cluster/)
- [OSD Config Reference — Ceph Documentation (Reef)](https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/)
- [os/bluestore: tune deferred_batch_ops separately for hdd and ssd — ceph/ceph PR #14435](https://github.com/ceph/ceph/pull/14435)

## Issues Found

1. **Incorrect write acknowledgement scope (line 12)**: The post stated writes must be "acknowledged by all OSDs in the pool." Per Ceph architecture docs, writes are acknowledged by all replicas in the placement group's acting set, not all OSDs in the entire pool. A pool with 64 PGs and size=3 may span many OSDs, but each individual write only touches the 3 OSDs in that PG's acting set. Changed to "all replicas in the placement group."

2. **Rook YAML did not configure WAL/DB separation (lines 31-49)**: The YAML comment claimed "separate WAL/DB per OSD" but the configuration simply listed two NVMe devices as data devices, which would create two separate OSDs with no WAL/DB separation. Per Rook CephCluster CRD docs, WAL/DB separation requires the `metadataDevice` field in the node config. Replaced with a correct example using `metadataDevice: "nvme0n1"` for WAL/DB and `sda` as the data device.

3. **Harmful HDD min_alloc_size advice removed (line 74)**: The post set `bluestore_min_alloc_size_hdd` to 4096 (4K). The default for HDD is 65536 (64K) to prevent fragmentation on rotational media. Setting 4K on HDDs causes severe fragmentation and performance degradation. Since this post targets SSD/NVMe random write workloads, the HDD setting was removed entirely.

4. **Missing OSD creation caveat for bluestore_min_alloc_size (line 73)**: `bluestore_min_alloc_size_ssd` is determined at OSD creation time and does not change for existing OSDs. The original wording implied it was a runtime tunable. Updated the comment to clarify it "takes effect on new OSDs only."

5. **Incorrect comment for RBD cache settings (line 91)**: The comment said "Increase write queue depth" but the commands configure RBD write-back cache size and dirty thresholds, not I/O queue depth. Changed to "Configure RBD write-back cache."

## Review Notes
- The `bluestore_min_alloc_size_ssd` default is already 4096 in Ceph Octopus and later, so this setting is only needed for clusters running Mimic or Nautilus (where the default was 16K for SSD). The post does not specify a Ceph version.
- The `bluestore_deferred_batch_ops` and `bluestore_deferred_batch_ops_ssd` options exist but documentation is sparse. The values used (16 and 32) are reasonable tuning parameters, though the defaults (64 for generic, 16 for SSD) may already be appropriate.
- The fio benchmarks use `--ioengine=rbd` which requires fio to be compiled with librbd support. This is not available in all fio packages and may require building from source or using the ceph-provided fio package.
- The `ceph daemon osd.0 perf dump` command requires running on the host where osd.0 is deployed and having access to the admin socket, which may not be straightforward in containerized Rook deployments.
- The write amplification estimate of "30-50K" for a 4K write is plausible but on the high end; typical amplification with 3x replication and BlueStore journaling is closer to 24-36K without heavy RocksDB compaction.
