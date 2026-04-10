# Validation Summary: How to Configure Storage Devices in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (BlueStore OSD backend)
- Rook (Ceph operator for Kubernetes)
- cephadm (Ceph orchestrator/deployment tool)
- RocksDB (embedded DB used by BlueStore)
- Kubernetes (CRD configuration for Rook)

## Sources Consulted
- Ceph official documentation: BlueStore configuration (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph official documentation: cephadm OSD service spec / DriveGroup (https://docs.ceph.com/en/latest/cephadm/services/osd/)
- Ceph official documentation: ceph-volume (https://docs.ceph.com/en/latest/ceph-volume/)
- Rook official documentation: CephCluster CRD storage configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph official documentation: Device selection filters for DriveGroups (https://docs.ceph.com/en/latest/cephadm/services/osd/#device-selection)

## Issues Found

1. **Incorrect DB device description (line 16):** The original text described the DB device as storing "RocksDB metadata (OSD state, WAL journal)." The parenthetical incorrectly implied that the WAL journal is stored on the DB device. In BlueStore, the DB device stores RocksDB SST files (object metadata and OSD state), while the WAL (write-ahead log) is a separate component stored on the WAL device. Fixed the parenthetical to "SST files containing object metadata and OSD state."

2. **Incorrect Rook CephCluster metadataDevice example (lines 82-93):** The example listed `nvme0n1` as a separate data device entry with `metadataDevice: "nvme0n1"` pointing to itself. This is nonsensical — `metadataDevice` should be specified in the config of the HDD data device, pointing to the fast NVMe device that should store its metadata. Fixed by moving `metadataDevice: "nvme0n1"` into the `sdb` device config and removing the redundant `nvme0n1` device entry.

3. **Incorrect cephadm osdsPerDevice syntax (lines 140-143):** The example used `config: osdsPerDevice: "4"` which is Rook CRD syntax (camelCase string under a config key). In cephadm DriveGroup specs, the correct field is `osds_per_device: 4` (snake_case integer) at the top level of the spec. Fixed to use the correct cephadm syntax.

## Review Notes
- The `kubectl exec -it rook-ceph-tools` command for listing devices in Rook is a simplification. The toolbox runs as a Deployment, so the actual pod name includes a random suffix. Using `deploy/rook-ceph-tools` would be more precise. Additionally, `ceph-volume inventory` runs on the local host's block devices, which may not be meaningful from within the toolbox container. This is a common documentation pattern but could confuse users in practice.
- The post covers both cephadm and Rook approaches well but readers should note that the device filter syntax (rotational, size, vendor, model) applies to cephadm DriveGroup specs specifically. Rook uses a different device selection mechanism via its CRD.
