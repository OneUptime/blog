# Validation Summary: How to Configure Ceph Block Storage on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Rook-Ceph (Rook operator + Ceph)
- Ceph RBD (RADOS Block Device)
- Kubernetes (PersistentVolume, PersistentVolumeClaim, StorageClass)
- Ceph CSI driver (`rook-ceph.rbd.csi.ceph.com`)
- Kubernetes VolumeSnapshot / VolumeSnapshotClass (`snapshot.storage.k8s.io/v1`)
- PostgreSQL (used as example workload)

## Sources Consulted
- Rook CephBlockPool CRD reference: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook Block Storage configuration guide: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- ceph-csi RBD storageclass example: https://github.com/ceph/ceph-csi/blob/devel/examples/rbd/storageclass.yaml
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Ceph rbd CLI man page: https://docs.ceph.com/en/reef/man/8/rbd/
- Rook CSI common-issues troubleshooting: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-csi-common-issues/

## Issues Found
No technical issues found.

Verified items:
- `CephBlockPool` CRD fields (`failureDomain`, `replicated.size`, `requireSafeReplicaSize`, `erasureCoded.dataChunks/codingChunks`, `parameters.compression_mode/target_size_ratio/min_size`, `mirroring.enabled`, `quotas.maxSize`) are all valid in current Rook.
- StorageClass parameters for the `rook-ceph.rbd.csi.ceph.com` provisioner — including `clusterID`, `pool`, `imageFormat: "2"`, the six `csi.storage.k8s.io/*-secret-*` keys, and `csi.storage.k8s.io/fstype` — match the official ceph-csi example.
- `imageFeatures: layering,exclusive-lock,object-map,fast-diff` is a valid combination (dependency order satisfied: object-map requires exclusive-lock; fast-diff requires object-map).
- `snapshot.storage.k8s.io/v1` is the current GA version for VolumeSnapshot / VolumeSnapshotClass / VolumeSnapshotContent.
- `rbd perf image iotop --pool=<pool>` is valid (requires the `rbd_support` ceph-mgr module).
- The `csi-rbdplugin-provisioner` deployment does contain a `csi-rbdplugin` container, so `kubectl logs -l app=csi-rbdplugin-provisioner -c csi-rbdplugin` is a valid command.
- The default Rook-Ceph CSI secret names `rook-csi-rbd-provisioner` and `rook-csi-rbd-node` are correct.
- PostgreSQL Deployment manifest is well-formed; `PGDATA` set to a subdirectory of the mount point (`/var/lib/postgresql/data/pgdata`) is the correct pattern when mounting a fresh volume at `/var/lib/postgresql/data`.

## Review Notes
- The `imageFeatures: layering,exclusive-lock,object-map,fast-diff` combination requires a node kernel of 5.3 or newer to attach. Talos Linux ships modern kernels so this is fine in practice, but worth noting for readers on customized images.
- The `rbd perf image iotop` command requires the `rbd_support` Ceph Manager module to be enabled (it is enabled by default in current Ceph releases).
- The example snapshot name `postgres-snapshot-20240115` uses a 2024 date even though the post is dated 2026; this is purely cosmetic and does not affect correctness.
- Setting `storageclass.kubernetes.io/is-default-class: "true"` on `ceph-block` will mark it the default; readers should ensure no other default StorageClass exists in the cluster to avoid the "multiple default" warning.
