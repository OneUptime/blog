# Validation Summary: How to Set Up Priority-Based Storage Classes in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes StorageClass, PersistentVolumeClaim
- Ceph RBD (RADOS Block Device) CSI driver
- Ceph CRUSH rules and device classes
- RBD QoS (Quality of Service) configuration

## Sources Consulted
- Rook official documentation — Block Storage (RBD) StorageClass configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook CephBlockPool CRD reference: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph documentation — RBD QoS configuration options: https://docs.ceph.com/en/latest/rbd/rbd-config-ref/
- Ceph documentation — `ceph osd pool set` valid pool properties: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph documentation — `rbd config` CLI for pool/image-level overrides: https://docs.ceph.com/en/latest/man/8/rbd/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found

### Issue 1: StorageClasses missing required CSI secret parameters
**What was wrong:** The standard-priority and bulk-priority StorageClasses were missing all required CSI secret parameters (`provisioner-secret`, `controller-expand-secret`, `node-stage-secret`). The high-priority StorageClass had `provisioner-secret` but was missing `controller-expand-secret` and `node-stage-secret`. Without these parameters, volume provisioning will fail (CSI driver cannot authenticate to the Ceph cluster), volume expansion won't work despite `allowVolumeExpansion: true`, and pods cannot mount the provisioned volumes.

**What was changed:** Added the full set of required CSI secret parameters to all three StorageClasses:
- `csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner`
- `csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph`
- `csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner`
- `csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph`
- `csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node`
- `csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph`

**Why:** These are required by the Rook CSI RBD provisioner as documented in the official Rook StorageClass examples. The provisioner secret authenticates the CSI controller for volume creation, the node-stage secret authenticates nodes for mounting volumes, and the controller-expand secret is needed when `allowVolumeExpansion` is enabled.

### Issue 2: Incorrect QoS commands using `ceph osd pool set`
**What was wrong:** The QoS section used `ceph osd pool set <pool> rbd_qos_iops_limit <value>` and `ceph osd pool set <pool> rbd_qos_bps_limit <value>`. The `rbd_qos_*` settings are RBD client-side configuration options, not pool properties. The `ceph osd pool set` command only accepts pool properties (like `size`, `min_size`, `pg_num`, `crush_rule`, `compression_mode`, etc.) and would reject `rbd_qos_iops_limit` as an unrecognized key.

The comment also referenced the MClock scheduler, which is misleading — MClock is Ceph's OSD-level I/O scheduler (for prioritizing client I/O vs recovery vs scrub), not the mechanism behind `rbd_qos_*` settings which operate at the librbd client level.

**What was changed:** Replaced `ceph osd pool set` commands with `rbd config pool set` commands, which is the correct CLI for setting pool-level RBD configuration overrides. Updated the comment to accurately describe the behavior (per-image QoS applied at pool level) and removed the incorrect MClock reference.

**Why:** `rbd config pool set` is the correct mechanism for setting RBD configuration options at the pool level, as documented in the Ceph `rbd` CLI reference. These settings apply as defaults to every RBD image within the pool.

## Review Notes
- The CephBlockPool definitions use `parameters.crush_rule` with named rules (e.g., `nvme-rule`). This is valid — Rook passes these through as pool parameters. However, these CRUSH rules must exist in the cluster before the pools are created. The post assumes they are pre-configured, which is a reasonable assumption for a tutorial focused on StorageClass setup rather than CRUSH hierarchy configuration.
- The post omits `imageFormat` and `imageFeatures` from the StorageClass parameters. This is acceptable — recent Rook/Ceph versions default to format 2 with layering, which is the standard configuration.
- The compression parameters (`compression_mode: aggressive`, `compression_algorithm: zstd`) in the HDD pool CephBlockPool are correctly placed in `spec.parameters` and use valid Ceph values.
- The PVC examples use correct Kubernetes API and valid resource quantities (`100Gi`, `5Ti`).
- The monitoring commands (`ceph osd pool stats`) are correct for viewing pool-level I/O statistics.
