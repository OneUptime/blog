# Validation Summary: How to Configure StorageClasses on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes StorageClasses (storage.k8s.io/v1)
- Container Storage Interface (CSI)
- Rancher local-path-provisioner
- Rook-Ceph (RBD block storage and CephFS)
- Longhorn
- NFS CSI driver (nfs.csi.k8s.io)
- VolumeSnapshotClass (snapshot.storage.k8s.io/v1)
- kubectl

## Sources Consulted
- Kubernetes StorageClass reference: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Default StorageClass annotation: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Rancher local-path-provisioner releases: https://github.com/rancher/local-path-provisioner/releases (verified v0.0.26 exists; latest is v0.0.36)
- Rook-Ceph RBD block storage docs: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook-Ceph CephFS docs: https://rook.io/docs/rook/latest-release/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Longhorn StorageClass parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/
- NFS CSI driver parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md
- Kubernetes Volume Snapshot Classes: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/

## Issues Found
No technical issues found.

All code samples, provisioner names, parameter keys, and kubectl commands were verified against official documentation:

- StorageClass apiVersion (`storage.k8s.io/v1`) and field structure are correct.
- The default-class annotation `storageclass.kubernetes.io/is-default-class` is correct.
- `rancher.io/local-path` is the correct provisioner name for the local-path-provisioner; v0.0.26 is a real release.
- Rook-Ceph RBD provisioner (`rook-ceph.rbd.csi.ceph.com`) and all CSI secret parameter names (`provisioner-secret-name/namespace`, `controller-expand-secret-name/namespace`, `node-stage-secret-name/namespace`) match the official Rook docs. `imageFormat: "2"`, `imageFeatures: layering`, and `csi.storage.k8s.io/fstype` are valid.
- CephFS provisioner (`rook-ceph.cephfs.csi.ceph.com`) and parameters (`clusterID`, `fsName`, `pool`, secret references) are correct.
- Longhorn provisioner (`driver.longhorn.io`) and parameters (`numberOfReplicas`, `staleReplicaTimeout`, `fromBackup`, `fsType`) match the official reference.
- NFS CSI driver provisioner (`nfs.csi.k8s.io`) and parameters (`server`, `share`, `subDir`) are correct, including the `${pvc.metadata.namespace}` / `${pvc.metadata.name}` template variables.
- The VolumeSnapshotClass uses the correct `apiVersion: snapshot.storage.k8s.io/v1`, with the proper `csi.storage.k8s.io/snapshotter-secret-name/namespace` parameters and `deletionPolicy`.
- `allowedTopologies` structure with `matchLabelExpressions` and the `topology.kubernetes.io/zone` label is correct.
- Volume binding mode explanations (`Immediate` vs `WaitForFirstConsumer`) are accurate, including the recommendation to use `WaitForFirstConsumer` for local storage.
- All kubectl commands (`patch`, `get storageclass`, `describe`, `delete`, custom-columns output, `--field-selector reason=ProvisioningFailed`) are valid.

## Review Notes
- The local-path-provisioner version pinned in the install command (v0.0.26, released Dec 2023) still works but is roughly two years behind the current release (v0.0.36, May 2026). Readers may wish to use a newer tag for recent fixes and Kubernetes compatibility, but the linked manifest URL is valid.
- The recommended `imageFeatures: layering` is the safe minimum for the RBD StorageClass; with kernel 5.4+ (which Talos provides), the broader feature set `layering,exclusive-lock,object-map,fast-diff,deep-flatten` is also supported and shown later in the database-storage example — both forms are valid.
- The post does not explicitly mention that the Talos kubelet runs in a read-only root filesystem, which is why local-path-provisioner typically writes to a path under `/var/mnt` or a user-volume on Talos. Default `local-path-provisioner` config writes to `/opt/local-path-provisioner` which is ephemeral on Talos unless backed by a user volume — worth a future note but not incorrect as written.
- The CephFS StorageClass omits `csi.storage.k8s.io/fstype` (CephFS does not use one) which is correct.
