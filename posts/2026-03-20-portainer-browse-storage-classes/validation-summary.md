# Validation Summary: How to Browse Storage Classes in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- StorageClass
- PersistentVolumeClaim (PVC)
- PersistentVolume (PV)
- `kubectl`
- `jq`
- AWS EBS CSI driver
- Azure Disk CSI driver
- Google Compute Engine Persistent Disk CSI driver
- NFS Subdir External Provisioner
- Rancher Local Path Provisioner

## Sources Consulted
- Portainer Kubernetes volumes documentation: https://docs.portainer.io/2.33-lts/user/kubernetes/volumes
- Kubernetes StorageClass concepts: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes task for changing the default StorageClass: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Kubernetes Persistent Volumes concepts: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- AWS EBS CSI driver StorageClass parameters: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- Azure Disk CSI driver parameters: https://github.com/kubernetes-sigs/azuredisk-csi-driver/blob/master/docs/driver-parameters.md
- AKS Azure Disk CSI storage class documentation: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk
- GKE Compute Engine persistent disk CSI driver documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- GCE PD CSI driver repository docs: https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver
- NFS Subdir External Provisioner README: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner
- Rancher Local Path Provisioner README: https://github.com/rancher/local-path-provisioner

## Issues Found
- The Portainer navigation path was incorrect. I changed it to `Volumes` → `Storage`, which matches current Portainer documentation for browsing storage classes.
- The post claimed Portainer exposes full StorageClass configuration directly in that view. I corrected this to reflect that Portainer lets you browse storage classes and the volumes inside them, while full object details are obtained with `kubectl`.
- The example list used inconsistent or outdated provisioner names. I updated the AWS `gp2` example to the CSI provisioner and corrected the NFS provisioner name to the official `nfs-subdir-external-provisioner` identifier.
- The NFS StorageClass example mixed provisioner deployment settings (`server`, `path`, `readOnly`) into the StorageClass and enabled volume expansion even though `nfs-subdir-external-provisioner` does not support resize. I removed the unsupported fields and kept the valid `archiveOnDelete` parameter.
- The default StorageClass explanation was wrong. Kubernetes allows multiple default StorageClasses; in that case, a PVC without an explicit `storageClassName` uses the most recently created default. I corrected the explanation.
- The PVC query labeled as “using the default StorageClass” was inaccurate because empty or unset `storageClassName` is not the same thing as actively using the current default. I replaced it with a command that resolves the current default StorageClass and filters PVCs by that class name.
- I tightened two operational claims for accuracy: the migration example now notes that writes should be stopped or quiesced first, and the conclusion now scopes `WaitForFirstConsumer` to topology-constrained backends and `allowVolumeExpansion` to drivers that support it.

## Review Notes
- The `kubernetes.io/no-provisioner` example remains valid for local/static storage classes, but it does not provide dynamic provisioning. It is still reasonable to show in a Portainer browsing example because Portainer lists available storage classes, not only dynamically provisioned ones.
