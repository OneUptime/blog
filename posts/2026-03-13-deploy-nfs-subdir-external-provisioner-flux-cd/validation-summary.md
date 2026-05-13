# Validation Summary: How to Deploy NFS Subdir External Provisioner with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- NFS Subdir External Provisioner
- Linux NFS client mount options
- Helm charts

## Sources Consulted
- NFS Subdir External Provisioner README and chart documentation: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner
- NFS Subdir External Provisioner Helm chart values and templates: https://github.com/kubernetes-sigs/nfs-subdir-external-provisioner/tree/master/charts/nfs-subdir-external-provisioner
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization health check documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Linux nfs(5) manual page: https://man7.org/linux/man-pages/man5/nfs.5.html

## Issues Found
- The Helm chart's generated StorageClass would default `allowVolumeExpansion` to `true`, but the NFS Subdir External Provisioner documentation states resize/expansion operations are not supported. Added `allowVolumeExpansion: false` to the chart values and clarified the StorageClass comment.
- The additional StorageClasses used `cluster.local/nfs-subdir-external-provisioner`, but Flux can generate a Helm release name that changes the chart's default provisioner name. Added `storageClass.provisionerName: cluster.local/nfs-subdir-external-provisioner` so the chart-created StorageClass, Deployment environment, and manually defined StorageClasses match.
- The main `pathPattern` used unsupported fallback syntax in the annotation expression. Replaced it with the documented `${.PVC.namespace}/${.PVC.name}` pattern and corrected the explanatory comment.
- The NFS mount options included `intr`, but the Linux NFS client ignores `intr` after kernel 2.6.25. Removed the option and adjusted the timeout comment to match the Linux NFS-over-TCP default semantics.
- The Flux Kustomization health check targeted the Deployment created by Helm. Flux documentation recommends health-checking the HelmRelease when a Kustomization applies HelmRelease objects, so the health check now targets the HelmRelease.
- The NFSv4.1 best-practice note claimed better atomic operations compared to NFSv3. Reworded it to the more precise stateful protocol features provided by NFSv4.1.

## Review Notes
- The tutorial remains tied to NFS Subdir External Provisioner chart version `4.0.18`, which is the latest release shown by the upstream project at review time but dates from 2023.
- The post correctly notes that Kubernetes does not include an internal NFS dynamic provisioner and that NFS Subdir External Provisioner creates subdirectories on an existing NFS export.
