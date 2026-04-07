# Validation Summary: How to Size a Ceph Cluster for Mixed Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (CRUSH maps, OSD device classes, pools, erasure coding)
- Kubernetes (StorageClasses, CSI provisioner)
- Ceph RBD CSI driver

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook StorageClass examples: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Ceph CRUSH rule documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/#crush-rules
- Ceph OSD device class documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes
- Ceph CLI reference for `ceph osd crush rule create-replicated`

## Issues Found
1. **Missing `kubectl exec` prefix on SSD and HDD CRUSH rule commands**: The NVMe CRUSH rule command correctly used `kubectl exec -it -n rook-ceph deploy/rook-ceph-tools --` but the SSD and HDD rule commands were bare `ceph` commands. In a Rook-managed cluster, all `ceph` CLI commands must be executed inside the toolbox pod. Added the `kubectl exec` prefix to both commands for consistency and correctness.

2. **StorageClass definitions missing required CSI parameters**: The StorageClasses only had `pool` and `clusterID` parameters. The Rook CSI RBD provisioner requires additional parameters to function: `imageFormat`, `imageFeatures`, and CSI secret references (`provisioner-secret-name`, `provisioner-secret-namespace`, `node-stage-secret-name`, `node-stage-secret-namespace`). Without these, PVC provisioning would fail. Added the required parameters and a `reclaimPolicy` field.

## Review Notes
- The `ceph osd df tree class <class>` command syntax used in the monitoring section may not be supported in all Ceph versions. In older versions, users may need to use `ceph osd df tree` without class filtering and inspect the output manually.
- The erasure-coded HDD pool (`archive-pool-hdd`) is defined as a `CephBlockPool`. While Rook supports erasure-coded block pools, RBD on erasure-coded pools requires a separate replicated metadata pool. If used with RGW (object storage), this works natively. The post could clarify this nuance in a future update.
- The hardware sizing numbers (e.g., 200K IOPS from NVMe, 5GB/s from SSD tier) are reasonable targets but actual performance depends heavily on workload patterns, network configuration, and Ceph tuning.
