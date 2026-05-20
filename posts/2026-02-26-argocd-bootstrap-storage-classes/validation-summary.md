# Validation Summary: How to Bootstrap Storage Classes with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications, sync waves, sync hooks, sync options, and AppProject resource restrictions
- Kubernetes StorageClass, PersistentVolumeClaim, PersistentVolume reclaim policy, and volume binding modes
- AWS EBS CSI driver on EKS
- Google Compute Engine Persistent Disk CSI driver on GKE
- Azure Disk CSI driver on AKS
- Kustomize overlays

## Sources Consulted
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Amazon EKS StorageClass documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- AWS EBS CSI driver parameters: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- GCE Persistent Disk CSI driver documentation: https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver
- Microsoft AKS Azure Disk CSI StorageClass documentation: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk
- Microsoft AKS CSI storage drivers documentation: https://learn.microsoft.com/en-us/azure/aks/csi-storage-drivers

## Issues Found
- The AWS EBS CSI examples used `fsType`. The AWS EBS CSI driver documents `csi.storage.k8s.io/fstype` as the StorageClass parameter, so the AWS snippets were updated.
- The default encrypted AWS example set `kmsKeyId: ""`. AWS documents `kmsKeyId` as a full key ARN and says omitting it uses the default regional EBS key, so the empty parameter was removed and the comment was corrected.
- The GKE example did not specify the CSI filesystem parameter. Added `csi.storage.k8s.io/fstype: ext4` to align with CSI StorageClass conventions.
- The AKS example used `enableEncryptionAtHost`, which is not listed in the AKS Azure Disk CSI StorageClass parameter table. Replaced it with `diskEncryptionSetID`, the documented parameter for Azure Disk customer-managed encryption at rest.
- The EKS default StorageClass removal example used the deprecated in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Updated it to the current EBS CSI provisioner `ebs.csi.aws.com` and the CSI filesystem parameter.
- The post said deleting a StorageClass while PVCs reference it can cause data loss. Kubernetes reclaim behavior ties data deletion to PVC/PV deletion and reclaim policy, not StorageClass deletion, so the wording was changed to future provisioning failures.
- The text referred to `ignoreDifferences` in ArgoCD project configuration. `ignoreDifferences` is an Application-level mechanism, and the provider-created class does not need to be included in the Application, so the guidance was corrected.
- The AppProject `clusterResourceWhitelist` explanation implied it directly limits who can modify storage resources. The wording was corrected to explain that it restricts which ArgoCD projects may deploy those resources.
- The PostSync validation hook did not create or mount a PVC, so it could not validate StorageClass provisioning. The example was updated to create a test PVC and mount it in the Job.

## Review Notes
The YAML snippets were parsed successfully after edits. The validation hook uses `storageClassName: gp3-encrypted`; readers using another cloud overlay should change that name to match the StorageClass they want to test.
