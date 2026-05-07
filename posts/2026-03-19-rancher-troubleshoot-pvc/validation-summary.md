# Validation Summary: How to Troubleshoot Persistent Volume Claims in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- `kubectl`
- PersistentVolumes (PVs)
- PersistentVolumeClaims (PVCs)
- StorageClasses
- CSI drivers
- Linux NFS/iSCSI client tooling

## Sources Consulted
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Change the Default StorageClass: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Kubernetes Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Node-specific Volume Limits: https://kubernetes.io/docs/concepts/storage/storage-limits/
- Kubernetes `kubectl delete` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes Well-Known Labels, Annotations and Taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Rancher iSCSI Volumes: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/create-kubernetes-persistent-storage/manage-persistent-storage/install-iscsi-volumes
- Longhorn install prerequisites: https://longhorn.io/docs/latest/deploy/install/

## Issues Found
- The description of PVC phase `Lost` was too narrow. I changed it to reflect that the claim has lost its bound PV reference, commonly because the PV was deleted or became unavailable.
- The post said to "update the PVC" when the referenced `StorageClass` does not exist. I changed this to recreating the PVC with a valid `StorageClass`, which is the safer and generally correct remediation.
- The "No Default StorageClass" section was outdated for modern Kubernetes behavior. I updated it to note that a PVC with no `storageClassName` remains without a class and dynamic provisioning does not occur until a class is specified or a default becomes available.
- The `WaitForFirstConsumer` explanation was incomplete. I clarified that binding is expected to wait until a consuming pod is created and scheduled.
- The node package example used an incorrect RPM package name for iSCSI and omitted common distro differences. I replaced it with distro-appropriate examples: `open-iscsi`/`nfs-common` for Debian-based systems and `iscsi-initiator-utils`/`nfs-utils` for RPM-based systems.
- The `kubectl delete volumeattachment <name> --grace-period=0` recommendation was misleading because grace-period handling is not the right focus for this resource. I replaced it with a standard delete command and explicitly noted that it should only be used after confirming the storage backend no longer shows the volume as attached.
- The topology section implied all volumes are zonal. I narrowed that wording to zonal volumes only.

## Review Notes
- The remaining commands and resource names are technically valid for current Kubernetes documentation.
- Some troubleshooting steps are intentionally generic because CSI controller pod names, log container names, and backend remediation vary by storage provider.
