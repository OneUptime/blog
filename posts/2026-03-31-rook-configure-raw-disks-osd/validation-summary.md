# Validation Summary: How to Configure Raw Disks for Rook-Ceph OSD Provisioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Ceph BlueStore (OSD backend)
- Kubernetes (CephCluster CRD, kubectl)
- LUKS (disk encryption)
- Linux disk utilities (wipefs, dd, sgdisk, lsblk, blockdev)

## Sources Consulted
- Rook-Ceph official documentation: CephCluster CRD specification (https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/)
- Rook-Ceph PVC-based cluster documentation (https://rook.io/docs/rook/latest-release/CRDs/Cluster/pvc-cluster/)
- Rook GitHub release notes for v1.3.0 (https://github.com/rook/rook/releases/tag/v1.3.0)
- Rook GitHub issue #3379: Deprecate directory-based and Filestore OSDs (https://github.com/rook/rook/issues/3379)
- Ceph BlueStore documentation (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)

## Issues Found
- **Directory-based OSDs section was outdated:** The post recommended using the `directories` field in the CephCluster storage spec for testing environments. This option was deprecated and removed in Rook v1.3 (2020) and has not been available for several years. The section was rewritten to use PVC-based OSDs via `storageClassDeviceSets`, which is the current recommended approach for test environments without dedicated raw block devices. A note was added clarifying the historical `directories` option removal.

## Review Notes
- The `encryptedDevice: "true"` config key under `storage.config` is the correct method for enabling OSD encryption in host-based clusters. There is no `security.osd.encrypted` field in the CephCluster CRD as sometimes incorrectly referenced online.
- The `deviceFilter` regex `^nvme[0-9]n1` only matches single-digit NVMe controller indices (nvme0n1 through nvme9n1). Systems with 10+ NVMe drives would need `^nvme[0-9]+n1`. This is a minor edge case and the table correctly shows the specific matches.
- The disk wiping commands use correct arithmetic for zeroing the end of a disk via `blockdev --getsz` sector-to-MiB conversion.
- All kubectl commands use correct label selectors for Rook-Ceph resources.
- The three device selection methods (useAllDevices, deviceFilter, explicit device list) and their YAML structures are accurate per current Rook CRD specification.
