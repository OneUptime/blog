# Validation Summary: How to Use RBD Snapshot Rollback

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (PVC, VolumeSnapshot, Deployments)
- Linux block device mapping and filesystem mounting

## Sources Consulted
- Ceph official documentation for RBD commands (`rbd snap ls`, `rbd snap rollback`, `rbd snap create`, `rbd status`, `rbd device map/unmap`): https://docs.ceph.com/en/latest/rbd/rbd-snapshot/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CSI snapshot restore documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#volume-snapshot-and-restore-volume-from-snapshot-support
- kubectl reference for `scale` and `wait` commands: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
No technical issues found.

## Review Notes
- The post correctly uses `rbd device map` / `rbd device unmap` (the modern subcommand form). The older shorthand `rbd map` / `rbd unmap` also works but the longer form is the canonical syntax.
- The post accurately warns that rollback is destructive and recommends creating a pre-rollback snapshot, which is good practice.
- The Kubernetes VolumeSnapshot YAML correctly uses `dataSource` with `kind: VolumeSnapshot` and `apiGroup: snapshot.storage.k8s.io`, matching the current CSI snapshot specification.
- The rollback procedure correctly emphasizes stopping all clients before performing the rollback, which is a critical requirement — rolling back an image with active watchers will fail.
