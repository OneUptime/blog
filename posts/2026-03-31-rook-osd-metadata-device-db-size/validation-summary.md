# Validation Summary: How to Configure OSD Metadata Device and Database Size in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph BlueStore OSD backend
- Ceph OSD metadata devices (block.db and block.wal)
- Kubernetes CephCluster CRD
- Kubernetes StorageClassDeviceSets (PVC-based OSD provisioning)
- ceph-volume LVM management

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook PVC-based cluster documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/pvc-cluster/
- Ceph BlueStore Configuration Reference: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph ceph-volume LVM documentation: https://docs.ceph.com/en/latest/ceph-volume/lvm/
- Kubernetes API Quantity specification (for storage unit validation)

## Issues Found

### 1. Incorrect claim about BlueStore default DB size formula
- **What was wrong:** The post stated "Ceph's default formula allocates roughly 4% of the data device size for the DB. For a 4 TB HDD that is 160 GiB, which is generous." This conflates Ceph's sizing recommendation range (1-4% depending on workload) with an automatic default formula. In reality, ceph-volume divides the available space on the metadata device equally among the OSDs sharing it rather than applying a fixed percentage. Additionally, the 160 GiB figure (from the 4% claim) was internally inconsistent with the blog's own "1 GiB per 1 TB" sizing guidance in the next section.
- **What was changed:** Replaced with accurate language stating that Ceph recommends 1-4% depending on workload type (1-2% for RBD, up to 4% for RGW), and that without an explicit `databaseSizeMB`, ceph-volume divides available metadata device space equally among OSDs.
- **Why:** The original claim could lead readers to incorrect sizing assumptions. The corrected text matches Ceph's official BlueStore configuration reference.

### 2. Incorrect reference to `metadataPVCTemplate` field name
- **What was wrong:** The prose stated "specify a separate `metadataPVCTemplate` inside the device set" — but `metadataPVCTemplate` is not a real Rook CRD field name. The actual mechanism is adding a `volumeClaimTemplates` entry with `metadata.name` set to `"metadata"`.
- **What was changed:** Replaced with "add a volume claim template named `metadata` inside the device set" which accurately describes the mechanism.
- **Why:** Using a non-existent field name could confuse readers searching the Rook documentation. The YAML example itself was already correct; only the prose description was inaccurate.

## Review Notes
- The post does not mention the device class restriction: ceph-volume will refuse to use a metadata device of the same device class (HDD, SSD, NVMe) as the OSD data devices, causing provisioning to fail. This is an important operational caveat documented in the Rook docs that readers should be aware of.
- The `ceph-volume lvm list` verification command shown running from the toolbox pod is a common pattern, though in some Rook configurations the toolbox may not have visibility into host LVM devices. Running from within an OSD pod is sometimes more reliable.
- The post omits `useAllDevices: false` in the CephCluster example, which is commonly paired with `useAllNodes: false` in Rook documentation examples. This is not technically wrong (it defaults appropriately when specific devices are listed) but could be noted for completeness.
- Rook supports three naming conventions for volume claim templates in device sets: `data`, `metadata`, and `wal`. The post correctly demonstrates `data` and `metadata` but does not mention that a separate `wal` volume claim template is also supported for further separation.
