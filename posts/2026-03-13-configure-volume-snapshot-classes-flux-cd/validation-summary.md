# Validation Summary: How to Configure Volume Snapshot Classes with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass resources
- Kubernetes CronJob and RBAC resources
- CSI external-snapshotter
- Flux CD GitRepository and Kustomization resources
- AWS EBS CSI Driver
- Rook-Ceph CSI drivers
- Longhorn CSI snapshots and backups
- kubectl

## Sources Consulted
- Kubernetes Volume Snapshot Classes documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CSI external-snapshotter documentation: https://kubernetes-csi.github.io/docs/external-snapshotter.html
- external-snapshotter v7.0.2 release notes and manifests: https://github.com/kubernetes-csi/external-snapshotter/releases/tag/v7.0.2
- external-snapshotter CRD kustomization: https://github.com/kubernetes-csi/external-snapshotter/blob/v7.0.2/client/config/crd/kustomization.yaml
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- AWS EBS CSI Driver tagging documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/tagging.md
- Rook-Ceph snapshot documentation: https://www.rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Rook-Ceph RBD and CephFS VolumeSnapshotClass examples: https://github.com/rook/rook/tree/master/deploy/examples/csi
- Longhorn CSI VolumeSnapshot documentation: https://longhorn.io/docs/latest/snapshots-and-backups/csi-snapshot-support/

## Issues Found
- The external-snapshotter Flux example only applied `./deploy/kubernetes/snapshot-controller`, which installs the snapshot controller but not the `VolumeSnapshot` CRDs. Added a separate Flux `Kustomization` for `./client/config/crd` and made the controller depend on it.
- The AWS EBS `VolumeSnapshotClass` used EC2-style tag values such as `Key=Environment,Value=production`. The AWS EBS CSI driver expects `tagSpecification_*` values in `key=value` form, so these were changed to `Environment=production` and `ManagedBy=flux-cd`.
- The Rook-Ceph `VolumeSnapshotClass` examples included unsupported `csi.storage.k8s.io/volumesnapshot/*` parameter keys, including an incorrect content-name key. Removed those keys and kept the Rook-supported `clusterID` and snapshotter secret parameters.

## Review Notes
- `external-snapshotter` v7.0.2 is older than the latest release available during review, but it still uses the GA `snapshot.storage.k8s.io/v1` APIs and supports the Kubernetes version range implied by the post.
- CSI volume snapshots are crash-consistent at the storage layer unless the application is quiesced separately; that is worth calling out in a future content update, especially for databases.
