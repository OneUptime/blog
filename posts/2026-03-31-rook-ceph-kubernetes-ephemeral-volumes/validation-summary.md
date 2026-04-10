# Validation Summary: How to Use Ceph with Kubernetes Ephemeral Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes (generic ephemeral volumes)
- Rook-Ceph (CSI driver)
- Ceph RBD (block storage)
- CephFS (shared filesystem)
- Kubernetes ResourceQuota

## Sources Consulted
- Kubernetes official documentation on Generic Ephemeral Volumes: https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#generic-ephemeral-volumes
- Kubernetes KEP-1698 (Generic Ephemeral Inline Volumes): GA in Kubernetes 1.23
- Rook-Ceph documentation on Block Storage (StorageClass): https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook-Ceph documentation on Shared Filesystem (CephFS): https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Kubernetes documentation on ResourceQuota: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found

1. **Wrong StorageClass in CephFS section**: The "Using CephFS for Ephemeral Shared Scratch Space" section specified `storageClassName: rook-ceph-block`, which provisions Ceph RBD (block) volumes, not CephFS. Changed to `storageClassName: rook-ceph-filesystem` to match the section's stated purpose of using CephFS.

2. **Wrong access mode in CephFS section**: The CephFS section used `ReadWriteOnce`, but since the section's purpose is shared scratch space across multiple Pods, changed to `ReadWriteMany` which is the access mode CephFS supports for multi-Pod access.

3. **Incorrect attribution of PVC creation to kubelet (two occurrences)**: The post stated "The kubelet creates a PVC" and "The kubelet handles PVC creation and deletion transparently." The kubelet is responsible for mounting volumes, not creating PVCs for generic ephemeral volumes. It is the kube-controller-manager (specifically its ephemeral volume controller) that watches for Pods with ephemeral volume specs and creates the corresponding PVCs. Changed both references from "kubelet" to "kube-controller-manager."

## Review Notes
- The CephFS section describes using generic ephemeral volumes for "shared ephemeral storage" across multiple Pods in a Job. However, generic ephemeral volumes create a per-Pod PVC (named `<pod-name>-<volume-name>`), so each Pod in a Job gets its own independent volume even with CephFS and ReadWriteMany. True shared ephemeral-like storage across Job Pods would require a regular PVC created separately. The YAML as fixed is valid and will work for a single Pod, but readers should understand that parallelism > 1 would give each Pod its own volume, not a shared one.
- The `emptyDir` comparison note "lost on node restart" is a reasonable simplification. More precisely, emptyDir is lost when the Pod is removed from the node (which includes node restarts, since Pods are not rescheduled to the same node with the same emptyDir).
