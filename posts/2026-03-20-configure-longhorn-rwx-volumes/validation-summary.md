# Validation Summary: How to Enable Longhorn ReadWriteMany (RWX) Volume Support

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (cloud-native distributed block storage for Kubernetes)
- Kubernetes (PersistentVolumeClaim, StorageClass, Deployment, StatefulSet)
- NFSv4 / NFS-Ganesha (used by Longhorn's share-manager for RWX volumes)
- nfs-common / nfs-utils (host-side NFS client packages)

## Sources Consulted
- [Longhorn ReadWriteMany (RWX) Volumes documentation](https://longhorn.io/docs/1.10.0/nodes-and-volumes/volumes/rwx-volumes/)
- [Longhorn StorageClass Parameters reference](https://longhorn.io/docs/1.11.0/references/storage-class-parameters/)
- [Longhorn create-volumes documentation](https://longhorn.io/docs/1.6.0/nodes-and-volumes/volumes/create-volumes/)
- [longhorn-manager share_manager_controller.go (GitHub)](https://github.com/longhorn/longhorn-manager/blob/master/controller/share_manager_controller.go)
- [SUSE Storage 1.10 RWX Volumes documentation](https://documentation.suse.com/cloudnative/storage/1.10/en/volumes/rwx-volumes.html)
- [Longhorn v1.1.0 RWX feature manual test cases](https://longhorn.github.io/longhorn-tests/manual/release-specific/v1.1.0/rwx_feature/)

## Issues Found

1. **Incorrect share-manager pod label selector.** The post used `-l app=longhorn-share-manager` to query share-manager pods and logs. Longhorn share-manager pods carry the label `longhorn.io/component=share-manager` (consistent with Longhorn's `longhorn.io/component` labeling convention used for instance-managers, etc.). Updated both `kubectl get pods` and `kubectl logs` commands in the "Monitoring RWX Share Manager" section to use `-l longhorn.io/component=share-manager`.

2. **Misleading comment on `nfsOptions` StorageClass parameter.** The original comment read `# Enable NFS over IP (required for RWX)`, which incorrectly implied that `nfsOptions` is what enables RWX. RWX is enabled by setting `accessModes: ReadWriteMany` on the PVC; `nfsOptions` is an optional parameter that customizes NFS mount options for the share-manager. Replaced the comment with `# Optional: customize NFS mount options for the RWX share-manager`.

3. **Inaccurate troubleshooting note about the share-manager NFS server.** The original text suggested checking for a missing `nfs-kernel-server` package and described the share-manager as needing "nfs-ganesha or kernel NFS server inside the pod". Longhorn's share-manager specifically runs NFS-Ganesha (a userspace NFS server) inside the pod and does not use the kernel NFS server, nor does it require a host-side NFS server package. Updated the comment to clarify this.

## Review Notes

- The `nfsOptions` parameter is valid (introduced in newer Longhorn releases) and `vers=4.1,noresvport` are valid NFS mount options. NFSv4.1 happens to also be Longhorn's default for RWX, so the example value is benign.
- The post correctly states RWX support was introduced in Longhorn v1.1.0.
- The CSI provisioner name `driver.longhorn.io` is correct.
- The `numberOfReplicas`, `staleReplicaTimeout`, `fsType`, and `allowVolumeExpansion` fields are all valid for Longhorn StorageClasses.
- The default Longhorn StorageClass mount options for RWX (per current docs) actually include `softerr,timeo=600,retrans=5`; the example in the post overrides these with reasonable but different values, which is fine for illustration.
- The PVC, Deployment, and StatefulSet manifests are syntactically correct and use current Kubernetes API versions (`v1`, `apps/v1`).
- The `kubectl exec ${POD} -- ...` test pattern works correctly with `-o name` output (which prefixes with `pod/`).
