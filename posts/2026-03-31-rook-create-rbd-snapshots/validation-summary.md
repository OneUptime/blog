# Validation Summary: How to Create RBD Snapshots

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Rook operator for Ceph storage on Kubernetes)
- Ceph RBD (RADOS Block Device) snapshots
- `rbd` CLI tool
- Kubernetes VolumeSnapshot API (`snapshot.storage.k8s.io/v1`)
- Kubernetes PersistentVolumeClaim with dataSource restore
- Rook Ceph CSI driver (`csi-rbdplugin-snapclass`)

## Sources Consulted
- Ceph official documentation — RBD Snapshots: https://docs.ceph.com/en/latest/rbd/rbd-snapshot/
- Ceph official documentation — RBD CLI reference: https://docs.ceph.com/en/latest/man/8/rbd/
- Rook documentation — Ceph Block Storage Snapshots: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Rook documentation — Toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Kubernetes documentation — VolumeSnapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes documentation — CSI Volume Cloning and Restore: https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/

## Issues Found
No technical issues found.

## Review Notes
- The `rbd snap protect` / `rbd snap unprotect` commands are correct and still functional. However, starting with Ceph Octopus (v15.x), clone format v2 no longer strictly requires snapshot protection before cloning. The advice in the post remains valid as a best practice and is correct for environments using clone format v1.
- The VolumeSnapshot API version `snapshot.storage.k8s.io/v1` is GA since Kubernetes 1.20. Clusters running older versions would need `v1beta1`, but this is unlikely to be relevant for current deployments.
- The default `volumeSnapshotClassName: csi-rbdplugin-snapclass` matches Rook's example manifests. Users with custom installations may have a different class name.
