# Validation Summary: How to Fix BLUEFS_AVAILABLE_SPACE Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore, BlueFS, RocksDB)
- Rook (Kubernetes Ceph operator)
- Kubernetes (PVC management, kubectl)
- Prometheus (alerting rules)
- LVM (logical volume management)

## Sources Consulted
- [Ceph Health Checks Documentation (Reef)](https://docs.ceph.com/en/reef/rados/operations/health-checks/) — verified BLUEFS_AVAILABLE_SPACE and BLUEFS_SPILLOVER health check definitions
- [ceph-bluestore-tool man page](https://docs.ceph.com/en/latest/man/8/ceph-bluestore-tool/) — verified `bluefs-bdev-expand` and `show-label` commands
- [ceph-objectstore-tool man page](https://docs.ceph.com/en/latest/man/8/ceph-objectstore-tool/) — confirmed `compact` is NOT a valid `--op` value
- [ceph-kvstore-tool man page](https://docs.ceph.com/en/latest/man/8/ceph-kvstore-tool/) — confirmed correct syntax for offline RocksDB compaction
- [BlueStore Configuration Reference (Reef)](https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/) — verified DB device sizing recommendations
- [Red Hat Ceph Storage 4 BlueStore Administration Guide](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/4/html/administration_guide/osd-bluestore) — cross-referenced DB sizing (4% for object/file/mixed, 1-2% for RBD)
- [Rook Cluster CRD Documentation](https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/) — verified storageClassDeviceSets volumeClaimTemplates YAML format
- [Ceph Prometheus Module Documentation](https://docs.ceph.com/en/latest/mgr/prometheus/) — verified Prometheus metric names
- [ceph/ceph PR #16045](https://github.com/ceph/ceph/pull/16045) — confirmed `ceph tell osd.X compact` command existence

## Issues Found
- **Incorrect offline compaction tool**: The post used `ceph-objectstore-tool --data-path /var/lib/ceph/osd/ceph-2 --op compact` for offline RocksDB compaction. The `compact` operation is not a valid `--op` for `ceph-objectstore-tool`. The documented operations are: info, log, remove, mkfs, fsck, repair, fuse, dup, export, export-remove, import, list, fix-lost, list-pgs, dump-super, meta-list, etc. **Fixed** by replacing with the correct tool: `ceph-kvstore-tool bluestore-kv /var/lib/ceph/osd/ceph-2 compact`, which is the documented method for offline RocksDB compaction in BlueStore OSDs.

## Review Notes
- The DB device sizing recommendations (4% recommended, 1% minimum) are accurate for general/mixed workloads per Ceph documentation. However, for pure RBD workloads, 1-2% is typically sufficient, and for RGW workloads, 4% is the minimum. The post generalizes correctly for a broad audience.
- The Prometheus alert rule uses `ceph_bluestore_db_total_bytes` and `ceph_bluestore_db_used_bytes` metrics, which are confirmed as valid Ceph MGR Prometheus module exports.
- The `ceph tell osd.2 compact` command for online compaction is correct — it sends the compact command to the OSD daemon via the monitor, equivalent to `ceph daemon osd.2 compact` run locally.
- The Rook YAML snippet for volumeClaimTemplates is structurally correct, though it omits `volumeMode: Block` and `accessModes` which are typically required in practice. This is acceptable for a snippet showing only the relevant sizing fields.
