# Validation Summary: How to Create Volume Group Snapshots with Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook
- Ceph CSI
- CephFS
- Kubernetes
- CSI external-snapshotter
- VolumeGroupSnapshot
- PersistentVolumeClaim

## Sources Consulted
- Rook Ceph documentation, "Snapshots": https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Kubernetes CSI Developer Documentation, "Volume Group Snapshot Feature": https://kubernetes-csi.github.io/docs/group-snapshot-restore-feature.html
- Kubernetes CSI Developer Documentation, "CSI external-snapshotter": https://kubernetes-csi.github.io/docs/external-snapshotter.html
- Ceph CSI repository README support matrix: https://github.com/ceph/ceph-csi
- external-snapshotter v8.2.0 release notes: https://github.com/kubernetes-csi/external-snapshotter/releases/tag/v8.2.0

## Issues Found
- The post claimed Rook VolumeGroupSnapshot support for RBD volumes starting with Rook 1.13. Current official Rook documentation covers VolumeGroupSnapshot for CephFS, so the post was corrected to use the documented CephFS workflow.
- The examples used `groupsnapshot.storage.k8s.io/v1alpha1`, which has been removed from current external-snapshotter releases. The API version was updated to `groupsnapshot.storage.k8s.io/v1beta1` to match the supported CRDs in the pinned example release.
- The `VolumeGroupSnapshotClass` example used the RBD driver and RBD provisioner secret. Those values were changed to the CephFS CSI driver and CephFS provisioner secret so the example matches the supported Rook flow.
- The CRD installation commands referenced the `main` branch of `external-snapshotter`, which is a moving target. They were pinned to the `v8.2.0` release so the documented API version and manifests stay consistent.
- The verification text said `kubectl describe` would list the member `VolumeSnapshot` objects in status. That is no longer reliable in current group snapshot APIs, so the post was updated to use an owner-reference `jsonpath` query to enumerate the generated `VolumeSnapshot` objects.
- The restore section used a label selector that is not the documented Rook approach for identifying snapshots created by a group snapshot. It was replaced with the owner-reference query used in the verification section.
- The restore PVC example still used the RBD storage class. It was updated to `rook-cephfs` so the restore example matches the corrected CephFS snapshot workflow.
- The prerequisites were outdated. They were updated to reflect Kubernetes 1.31+, Ceph Squid (v19.0.0)+, and the `CSIVolumeGroupSnapshot` feature gate requirement for `external-snapshotter` v8.2+.

## Review Notes
- `external-snapshotter` v8.4.0 introduces `VolumeGroupSnapshot` `v1beta2` and deprecates `v1beta1`. This post now pins its CRD examples to `v8.2.0`, where `v1beta1` is the matching documented API. Revisit the post when the Rook/CephFS documentation and examples fully move to `v1beta2`.
