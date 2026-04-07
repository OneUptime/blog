# Validation Summary: How to Size a Ceph Cluster for Kubernetes PVCs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph (RBD block volumes, CephFS)
- Kubernetes PersistentVolumeClaims (PVCs)
- kubectl CLI
- Ceph RBD CLI (`rbd du`)
- Kubernetes ResourceQuota
- Prometheus kubelet volume metrics

## Sources Consulted
- Kubernetes PVC documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/#storage-resource-quota
- Rook-Ceph documentation on volume expansion: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Ceph RBD CLI reference (`rbd du`): https://docs.ceph.com/en/latest/man/8/rbd/
- Kubernetes kubelet volume stats metrics: https://kubernetes.io/docs/reference/instrumentation/metrics/

## Issues Found
- **PVC Demand Forecasting script used wrong awk column**: The script used `awk '{print $6}'` to extract PVC capacity from `kubectl get pvc -A --no-headers` output. With the `-A` flag, the columns are: NAMESPACE(1), NAME(2), STATUS(3), VOLUME(4), CAPACITY(5), ACCESS MODES(6), STORAGECLASS(7), AGE(8). Column 6 is ACCESS MODES (e.g., "RWO"), not CAPACITY. Changed `$6` to `$5` to correctly extract the capacity values.

## Review Notes
- The Python script for calculating total PVC storage only handles the `Gi` suffix. PVCs with `Ti`, `Mi`, or other units would not be parsed correctly. This is acceptable for a simplified example but worth noting.
- The volume expansion section states it works "without pod restart," which is correct for RBD volumes when the StorageClass has `allowVolumeExpansion: true`, but the post does not mention this prerequisite.
- The overcommit ratio guidance (1.5x-3x) and the raw capacity calculation (including 0.8 factor for metadata overhead) are reasonable industry conventions.
