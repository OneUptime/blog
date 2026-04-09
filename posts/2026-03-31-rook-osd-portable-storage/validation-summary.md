# Validation Summary: How to Configure OSD Portable vs Non-Portable Storage in Rook-Ceph

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (container orchestration)
- CephCluster CRD (Custom Resource Definition)
- OSD (Object Storage Daemon) management
- PVC (Persistent Volume Claim) backed storage

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook OSD Management documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/

## Issues Found
1. **Removed deprecated `storeType: bluestore` config field.** In the "Non-Portable OSD with Device Filter" example, the `config` block included `storeType: bluestore`. This field is no longer documented in current Rook-Ceph versions. Bluestore has been the only supported OSD backend since Rook v1.3 (filestore was removed), making this field unnecessary and potentially misleading to readers who might think other store types are available. Removed the line, keeping the valid `osdsPerDevice: "1"` config.

## Review Notes
- All other configuration fields (`portable`, `tuneFastDeviceClass`, `storageClassDeviceSets`, `deviceFilter`, `osdsPerDevice`, `useAllNodes`, `useAllDevices`, `storage.nodes`) are confirmed valid against current Rook documentation.
- The `portable: true` / `portable: false` semantics are accurately described: portable OSDs can be rescheduled across nodes during failover, while non-portable OSDs are pinned to the node where the PVC is bound.
- The kubectl commands use correct label selectors (`app=rook-ceph-osd` for OSD pods, `ceph.rook.io/DeviceSet=<name>` for device set PVCs) consistent with Rook's labeling conventions.
- The `ceph osd metadata` and `ceph health detail` commands are correct Ceph CLI usage.
- The NVMe device filter regex `^nvme[0-9]n[0-9]` works for single-digit device/namespace numbers, which covers most common setups. A more comprehensive pattern like `^nvme[0-9]+n[0-9]+` could handle multi-digit numbering but is not strictly necessary for a tutorial.
- The comparison table accurately reflects the trade-offs between portable and non-portable OSDs.
