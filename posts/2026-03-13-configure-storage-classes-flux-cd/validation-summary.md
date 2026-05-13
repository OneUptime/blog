# Validation Summary: How to Configure Storage Classes with Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes StorageClass, PersistentVolume, and PersistentVolumeClaim resources
- Flux CD Kustomization resources
- Kustomize overlays and JSON 6902 patches
- AWS EBS CSI driver StorageClass parameters
- Rook-Ceph RBD and CephFS StorageClasses
- kubectl verification commands

## Sources Consulted
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Change the Default StorageClass task: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Amazon EKS StorageClass parameters reference: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Amazon EBS gp3 volume documentation: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- Rook-Ceph RBD StorageClass documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook-Ceph CephFS StorageClass documentation: https://rook.github.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/

## Issues Found
- The AWS EBS gp3 example set `kmsKeyId: ""` while saying this used the default EBS key. AWS documents `kmsKeyId` as the full ARN of a custom key and says omitting it uses the default key, so the parameter was removed and replaced with a clarifying comment.
- The Rook-Ceph examples enabled `allowVolumeExpansion` but omitted controller expansion secret parameters shown in Rook's official StorageClass examples. Added the `controller-expand-secret-name` and `controller-expand-secret-namespace` parameters for both RBD and CephFS.
- The staging gp3 Kustomize patch lowered IOPS to `1000`, but gp3 includes a 3,000 IOPS baseline and AWS documents gp3 performance starting at that baseline. Updated the example and surrounding text to keep gp3 at baseline IOPS.
- The post claimed Flux applies the default StorageClass change atomically. Flux reconciles desired state, but this is not an atomic transaction across multiple Kubernetes resources. Reworded the statement to say Flux reconciles the old and new default settings together from a single commit.
- The best-practices section said two default StorageClasses cause unpredictable PVC provisioning. Kubernetes documents defined behavior: if multiple defaults exist, PVCs without `storageClassName` use the most recently created default StorageClass. Updated the guidance to avoid multiple defaults while describing the actual behavior.

## Review Notes
The remaining examples use current Kubernetes `storage.k8s.io/v1` StorageClass APIs and current Flux `kustomize.toolkit.fluxcd.io/v1` Kustomization syntax. The Kustomize examples are illustrative snippets for separate overlay files, even though they are shown in a single fenced block.
