# Validation Summary: How to Provision a Persistent Volume with Rook-Ceph RBD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CSI-based storage orchestrator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- Kubernetes PersistentVolumeClaim (PVC) and PersistentVolume (PV)
- Kubernetes Deployments and StatefulSets
- ceph-csi CSI driver

## Sources Consulted
- Rook official documentation: Block Storage (RBD) — https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook official documentation: Ceph CSI Drivers — https://rook.io/docs/rook/latest-release/Storage-Configuration/Ceph-CSI/ceph-csi-drivers/
- ceph-csi static PV documentation — https://github.com/ceph/ceph-csi/blob/devel/docs/static-pvc.md
- Kubernetes PersistentVolumeClaim API reference — https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StatefulSet documentation — https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes volume expansion documentation — https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims

## Issues Found
1. **Incorrect `rbd info` command for looking up the RBD image** (Checking PVC and PV Details section):
   - **What was wrong:** The command attempted to derive the RBD image name from the PV name by stripping the `pvc-` prefix and prepending `csi-vol-`. This is incorrect because the UUID in the PV name (`pvc-<uuid>`) is different from the UUID used in the RBD image name (`csi-vol-<different-uuid>`). The CSI driver generates a separate identifier for the RBD image, so the two UUIDs do not match.
   - **What was changed:** Replaced the `cut`-based derivation with a `jsonpath` query that reads the actual image name from the PV's CSI volumeAttributes (`{.spec.csi.volumeAttributes.imageName}`), which is the authoritative source for the RBD image name.
   - **Why:** The original command would fail to find the correct RBD image, returning an error or information about a nonexistent image.

## Review Notes
- The PVC, Deployment, StatefulSet, and static PV YAML manifests are all syntactically correct and use current Kubernetes API versions.
- The CSI driver name `rook-ceph.rbd.csi.ceph.com` is correct for the default `rook-ceph` operator namespace.
- The StatefulSet example correctly sets PGDATA to a subdirectory (`/var/lib/postgresql/data/pgdata`) to avoid the `lost+found` directory issue on formatted PVCs.
- The online volume expansion claim is accurate — ext4 and XFS support online resize without pod restarts when the StorageClass has `allowVolumeExpansion: true`.
- The static PV section correctly includes `nodeStageSecretRef` (the only required secret ref for RBD CSI); `nodePublishSecretRef` is not required.
- The Mermaid state diagram accurately represents the PVC lifecycle through CSI provisioning, attachment, and deletion with different reclaim policies.
