# Validation Summary: How to Mount a Rook-Ceph NFS Share in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (NFS-Ganesha)
- Kubernetes (PersistentVolume, PersistentVolumeClaim, Pods, Deployments)
- NFS (NFSv4.1)
- NFS CSI Driver (nfs.csi.k8s.io)
- CephFS

## Sources Consulted
- Kubernetes PersistentVolume NFS documentation: https://kubernetes.io/docs/concepts/storage/volumes/#nfs
- Kubernetes PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Rook-Ceph NFS documentation: https://rook.io/docs/rook/latest/Storage-Configuration/NFS/nfs/
- NFS CSI Driver StorageClass parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md

## Issues Found
- **Incorrect NFS CSI driver parameter name**: The StorageClass for the NFS CSI driver used `onDeletePolicy: delete` as a parameter. The correct parameter name is `onDelete`, not `onDeletePolicy`. Changed `onDeletePolicy` to `onDelete`. The valid values (`delete`, `retain`, `archive`) were correct.

## Review Notes
- The `showmount -e` troubleshooting command in the troubleshooting section relies on the NFSv3 mountd protocol. Since the post configures `nfsvers=4.1` and Rook-Ceph's NFS-Ganesha may be configured as NFSv4-only, `showmount` might not return results in some environments. This is not incorrect per se (NFS-Ganesha can support both v3 and v4), but readers should be aware of this limitation.
- All Kubernetes YAML manifests (PV, PVC, Pod, Deployment, StorageClass) are syntactically correct and use valid API fields.
- The static PV/PVC binding pattern with `storageClassName: ""` and `volumeName` is correctly demonstrated.
- The direct NFS volume mount in a pod spec is a valid Kubernetes feature.
- The claim that RBD does not support ReadWriteMany is accurate for filesystem-mode volumes (RBD only supports RWX in raw block mode).
