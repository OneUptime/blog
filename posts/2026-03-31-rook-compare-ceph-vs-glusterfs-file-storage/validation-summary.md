# Validation Summary: How to Compare Ceph vs GlusterFS for File Storage

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Ceph / CephFS
- GlusterFS
- Rook (Kubernetes operator for Ceph)
- Heketi (deprecated GlusterFS provisioner)
- Kubernetes StorageClass and PersistentVolume APIs
- CSI (Container Storage Interface)

## Sources Consulted
- Rook CephFS StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Ceph Foundation governance: https://ceph.io/en/foundation/
- CNCF project listing for Rook: https://www.cncf.io/projects/rook/
- Kubernetes GlusterFS in-tree volume plugin removal (KEP): https://kubernetes.io/blog/2023/08/15/kubernetes-v1-28-release/#removal-of-in-tree-integrations-with-cloud-providers
- Heketi project status on GitHub: https://github.com/heketi/heketi
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume API reference: https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
1. **Ceph community status incorrectly listed as "Active (CNCF)"**: Ceph is not a CNCF project. Rook (the Kubernetes operator) is a CNCF graduated project, but Ceph itself is governed by the Ceph Foundation under the Linux Foundation. Changed to "Active (Ceph Foundation, Linux Foundation)".
2. **Row label "Kubernetes operator" inaccurate for Heketi**: Heketi is a RESTful volume management API and dynamic provisioner, not a Kubernetes operator in the operator-pattern sense. Changed the row label to "Kubernetes integration" and clarified Rook as "Rook (operator)" to preserve the operator distinction for Rook while making the row label accurate for both entries.

## Review Notes
- The GlusterFS PersistentVolume example uses the in-tree `glusterfs` volume plugin, which was removed in Kubernetes 1.26. The post correctly labels this section as "Legacy," which is adequate.
- The CephFS StorageClass example omits CSI secret references (`csi.storage.k8s.io/provisioner-secret-name`, etc.) that would be needed in a production deployment. This is acceptable for a simplified comparison example.
- The performance comparison table uses qualitative ratings which are generally reasonable, though the "MDS bottleneck" note for random small I/O is slightly imprecise — MDS handles metadata, not data I/O — but is acceptable in a simplified comparison context since small I/O workloads often involve heavy metadata operations.
- GlusterFS POSIX compliance is listed as "Full," which is the community's general claim, though edge cases exist around locking behavior. This is acceptable for a high-level comparison.
