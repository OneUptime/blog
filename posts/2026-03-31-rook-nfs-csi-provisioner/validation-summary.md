# Validation Summary: How to Use the NFS CSI Provisioner with Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph NFS (CephNFS)
- NFS CSI Driver (`rook-ceph.nfs.csi.ceph.com`)
- Kubernetes StorageClass, PersistentVolumeClaim, Deployment
- CephFilesystem (CephFS)

## Sources Consulted
- Rook NFS CSI Driver documentation: https://rook.io/docs/rook/latest/Storage-Configuration/NFS/nfs-csi-driver/
- Rook NFS StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/nfs/storageclass.yaml
- Rook CephNFS documentation: https://rook.io/docs/rook/latest/CRDs/ceph-nfs-crd/
- Kubernetes Deployment API reference (apps/v1)

## Issues Found

1. **CephObjectStore incorrectly listed as supported backend (line 17)**: The post stated NFS CSI works with `CephFilesystem` or `CephObjectStore`. The official Rook docs explicitly state "RGWs cannot be used for the CSI driver." Fixed to state only `CephFilesystem` is supported and added a note that RGW/CephObjectStore is not supported by the NFS CSI driver.

2. **Incorrect NFS server name in StorageClass**: The post used `rook-ceph-nfs-my-nfs-0.rook-ceph.svc` (numeric suffix with service domain). The correct naming pattern per official examples is `rook-ceph-nfs-my-nfs-a` (letter suffix, no service domain). Fixed to `rook-ceph-nfs-my-nfs-a`.

3. **Fabricated `share: /data` parameter**: The StorageClass included a `share: /data` parameter that does not exist in the NFS CSI StorageClass spec. NFS exports are dynamically created by the CSI provisioner. Removed this parameter entirely.

4. **Wrong CSI secret names**: The post used `rook-csi-nfs-provisioner` and `rook-csi-nfs-node` as secret names. The NFS CSI driver shares secrets with the CephFS CSI provisioner, so the correct names are `rook-csi-cephfs-provisioner` and `rook-csi-cephfs-node`. Fixed all secret name references.

5. **Missing required StorageClass parameters**: The post was missing three required parameters: `clusterID: rook-ceph`, `fsName: myfs`, and `pool: myfs-replicated`. These are necessary for the CSI provisioner to know which CephFilesystem and pool to use. Added all three.

6. **Missing controller-expand-secret parameters**: The official StorageClass includes `csi.storage.k8s.io/controller-expand-secret-name` and `csi.storage.k8s.io/controller-expand-secret-namespace` parameters for volume expansion support. Added these along with `allowVolumeExpansion: true`.

7. **Removed `volumeBindingMode: Immediate`**: This was not present in the official example and is not needed. Replaced with `allowVolumeExpansion: true` which is in the official example.

8. **Deployment YAML missing required `selector` and pod labels**: The Deployment spec was missing the required `spec.selector.matchLabels` field and `template.metadata.labels`, which would cause a validation error when applying. Added both with `app: my-app`.

9. **Incorrect explanation of PV creation**: The post stated the CSI provisioner "creates a subdirectory within the `/data` NFS export." Since there is no static `/data` export, this was corrected to state that the provisioner "dynamically creates an NFS export."

10. **Updated StorageClass description**: Replaced the explanation about the `server` parameter to also describe the `fsName`, `pool`, and shared secret parameters, since these are important for correct configuration.

## Review Notes
- The `nfsCluster`, `fsName`, and `pool` values in the StorageClass are example placeholders (`my-nfs`, `myfs`, `myfs-replicated`). Readers will need to substitute their own CephNFS cluster name and CephFilesystem/pool names.
- The NFS CSI driver provisioner name (`rook-ceph.nfs.csi.ceph.com`) uses the Rook namespace as a prefix. If Rook is installed in a namespace other than `rook-ceph`, the provisioner name will differ accordingly.
- The Deployment example uses `nginx:1.25` which is a valid image tag but may become outdated over time.
