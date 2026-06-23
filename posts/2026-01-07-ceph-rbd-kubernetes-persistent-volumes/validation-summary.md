# Validation Summary: How to Configure Ceph RBD Block Storage for Kubernetes Persistent Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RBD
- Ceph pools and RBD image features
- Rook-Ceph Operator
- Kubernetes PersistentVolumes, PersistentVolumeClaims, and StorageClasses
- Kubernetes CSI and VolumeSnapshots
- Prometheus ServiceMonitor resources

## Sources Consulted
- Ceph Block Devices and Kubernetes documentation: https://docs.ceph.com/en/latest/rbd/rbd-kubernetes/
- Ceph RBD configuration reference: https://docs.ceph.com/en/reef/rbd/rbd-config-ref/
- Ceph pool operations documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph placement group autoscaling documentation: https://docs.ceph.com/en/pacific/rados/operations/placement-groups/
- Ceph rbd(8) man page for kernel RBD map options: https://docs.ceph.com/en/reef/man/8/rbd/
- Rook RBD StorageClass example: https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/storageclass.yaml
- Rook CephBlockPool CRD documentation: https://github.com/rook/rook/blob/master/Documentation/CRDs/Block-Storage/ceph-block-pool-crd.md
- Rook toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/
- Rook CephCluster monitoring specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The post used `ceph osd pool set kubernetes rbd_default_features 61`, but `rbd_default_features` is an RBD configuration override, not a regular OSD pool property. Changed it to `rbd config pool set kubernetes rbd_default_features layering,exclusive-lock,object-map,fast-diff,deep-flatten`.
- The Rook toolbox deployment was used before being created. Added the official toolbox deployment command and rollout check before the first `kubectl exec ... deploy/rook-ceph-tools` command.
- The CephCluster comment identified `quay.io/ceph/ceph:v18.2.0` as Quincy. Corrected the comment to Reef v18.
- The Kubernetes prerequisite claimed `v1.20+`, which is not accurate across current Rook releases. Changed it to require a Kubernetes version supported by the chosen Rook release.
- The monitoring examples can fail without Prometheus Operator CRDs when Rook monitoring or ServiceMonitor resources are enabled. Added this prerequisite.
- The Rook RBD StorageClass snippets omitted the controller-publish secret parameters shown in the official Rook example. Added them to both StorageClass examples.
- The StorageClass included comments about `volumeBindingMode` but did not set the field. Added `volumeBindingMode: Immediate` to match the documented behavior.
- The performance StorageClass used `lock_on_read=0`, but the kernel RBD option is a flag (`lock_on_read`) that enables lock-on-read behavior. Removed that invalid map option and kept the valid `queue_depth=128` option.

## Review Notes
The remaining examples are generally accurate, but production deployments should pin Rook manifest URLs or Helm chart versions instead of using the moving `master` branch for the toolbox manifest.
