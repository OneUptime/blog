# Validation Summary: How to Use LVM Logical Volumes with Rook-Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Ceph (distributed storage system, v19.2.0 / Squid)
- Kubernetes (container orchestration)
- LVM2 (Linux Logical Volume Manager)
- BlueStore OSD (Ceph object storage daemon)
- Device Mapper (Linux kernel framework for LVM)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook storage configuration (device selection): https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/#storage-selection-settings
- LVM2 man pages: pvcreate(8), vgcreate(8), lvcreate(8), lvs(8), wipefs(8)
- Ceph BlueStore metadata separation documentation: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Existing validated Rook blog posts in this repository for cross-referencing CephCluster YAML patterns

## Issues Found

1. **Incorrect symlink direction in comments (Step 4)**: The YAML comments described `dm-0` as a "symlink to /dev/ceph-vg/osd-data-0", but the relationship is reversed — `/dev/ceph-vg/osd-data-0` is a symlink that points to the device-mapper device `/dev/dm-N`. Changed comments from "symlink to" to "device-mapper device for" to accurately describe the relationship.

2. **Incorrect field reference in text (Step 4)**: The text said "use the full path via the `config` field" but the accompanying YAML example correctly places the LV path in the device `name` field, not the `config` field. The `config` field is used for additional options like `metadataDevice`, not for the primary device path. Corrected the text to say "use the full LV path in the device `name` field".

3. **Missing `wipefs` and `pvcreate` in Step 6**: The NVMe device preparation for the metadata volume group was missing the `wipefs -a` and `pvcreate` commands that were correctly included in Step 1 for the data disk. Without `pvcreate`, `vgcreate` would fail on a device not initialized as a physical volume. Added the missing preparation commands for consistency and correctness.

## Review Notes
- The Ceph container image tag `quay.io/ceph/ceph:v19.2.0` references Ceph Squid. This is current as of the post date but readers should verify the latest stable tag for their deployment.
- The post correctly recommends `useAllDevices: false` when using LVM to prevent Rook from claiming unintended devices — this is an important best practice.
- The `metadataDevice` config option places both WAL and DB on the specified device. For more granular control (separate WAL and DB devices), Rook also supports `databaseSizeMB` and `walSizeMB` config options, but this is beyond the scope of this tutorial.
- The troubleshooting section covers the most common LVM-related OSD failures accurately.
