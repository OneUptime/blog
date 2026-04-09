# Validation Summary: How to Choose Between Host Storage and PVC Storage Clusters in Rook

## Status
validated

## Post Type
Architecture Guide / Decision Reference

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (OSD storage layer)
- Kubernetes (PersistentVolumeClaims, StorageClasses, node drain operations)

## Sources Consulted
- Rook official documentation: CephCluster CRD storage configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook official documentation: Storage Class Device Sets (https://rook.io/docs/rook/latest/CRDs/Cluster/pvc-cluster/)
- Rook official documentation: Host-based cluster (https://rook.io/docs/rook/latest/CRDs/Cluster/host-cluster/)
- Ceph documentation: OSD management commands (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- Kubernetes documentation: kubectl drain (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/)

## Issues Found
No technical issues found.

## Review Notes
- The `portable: true` behavior for PVC-based OSDs depends on the underlying StorageClass supporting volume detach/reattach across nodes. With local volume provisioners, `portable` should be set to `false`. The post doesn't call this out explicitly, but the context (cloud StorageClasses like `gp3`) makes the examples correct as presented.
- The `--delete-emptydir-data` flag on `kubectl drain` is the current correct flag, replacing the deprecated `--delete-local-data` flag. This is up to date.
- The hybrid deployment example is a useful pattern that is well-documented in Rook's official examples.
