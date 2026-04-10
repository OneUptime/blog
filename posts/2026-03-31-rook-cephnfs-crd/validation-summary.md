# Validation Summary: How to Create a CephNFS CRD in Rook for NFS Exports

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- NFS Ganesha (NFS server daemon)
- CephFS (Ceph filesystem)
- Kubernetes CRDs (Custom Resource Definitions)
- Kubernetes CSI (Container Storage Interface)
- Kubernetes StorageClass

## Sources Consulted
- Rook CephNFS CRD Specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Rook NFS Storage Configuration: https://rook.io/docs/rook/latest/Storage-Configuration/NFS/nfs/
- Rook NFS CSI Driver Documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/NFS/nfs-csi-driver/
- Rook CephNFS CRD Documentation: https://rook.io/docs/rook/latest/CRDs/ceph-nfs-crd/
- Rook GitHub repository CephNFS examples: https://github.com/rook/rook/blob/master/Documentation/CRDs/ceph-nfs-crd.md

## Issues Found
1. **StorageClass parameter name incorrect**: The `nfsClusterID` parameter in the NFS StorageClass was incorrect. The correct parameter name is `nfsCluster`. Changed `nfsClusterID: my-nfs` to `nfsCluster: my-nfs`.

## Review Notes
- The `spec.rados.pool` and `spec.rados.namespace` fields used in the CephNFS CR examples are deprecated in modern Rook versions. Rook internally sets the pool to `.nfs` and the namespace to the CephNFS resource name. The fields are still accepted (not removed), so the YAML will apply without errors, but users should be aware they can omit the entire `spec.rados` section in current versions.
- The architecture diagram, Ceph CLI commands (`ceph nfs export ls`, `ceph nfs cluster info`), service naming pattern (`rook-ceph-nfs-my-nfs-a`), pod labels (`app=rook-ceph-nfs`), placement spec structure, and NFS CSI provisioner name (`rook-ceph.nfs.csi.ceph.com`) are all correct.
- The post correctly notes that CephFilesystem must exist as a prerequisite before creating the CephNFS resource.
