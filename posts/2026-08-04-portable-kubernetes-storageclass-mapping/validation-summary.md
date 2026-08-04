# Validation Summary: Portable Kubernetes Storage Without Cloud Disks in App Manifests

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses and dynamic provisioning
- Container Storage Interface (CSI) drivers
- Kubernetes volume snapshots and restores
- Amazon EKS and Amazon EBS CSI
- Azure Kubernetes Service and Azure Disk CSI
- Google Kubernetes Engine and Compute Engine persistent disk CSI
- Topology-aware volume binding and volume expansion

## Sources Consulted

- [Kubernetes Storage Classes](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes Persistent Volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes Volume Snapshot Classes](https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/)
- [Amazon EBS CSI driver on Amazon EKS](https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html)
- [Amazon EKS Auto Mode StorageClasses](https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html)
- [Amazon EBS encryption](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption.html)
- [CSI storage drivers on Azure Kubernetes Service](https://learn.microsoft.com/en-us/azure/aks/csi-storage-drivers)
- [Create and manage persistent volumes with Azure Disks on AKS](https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk)
- [Azure managed disk encryption FAQ](https://learn.microsoft.com/en-us/azure/virtual-machines/faq-for-disks)
- [Compute Engine persistent disk CSI driver on GKE](https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver)
- [Google Cloud default encryption at rest](https://docs.cloud.google.com/docs/security/encryption/default-encryption)

## Issues Found

- The `WaitForFirstConsumer` explanation referred to the Pod's "taints." Taints are set on nodes, while Pods declare tolerations. Changed the sentence to distinguish the Pod's tolerations from node taints so the scheduling terminology matches Kubernetes.

## Review Notes

- All five YAML snippets are syntactically valid and use current stable Kubernetes API versions.
- The AWS EBS, Azure Disk, and Google persistent disk provisioner names and StorageClass parameters match the current provider documentation.
- The distinction between the standard Amazon EBS CSI provisioner and the EKS Auto Mode provisioner is correct.
- The PVC snapshot restore data source, `ReadWriteOnce` and `ReadWriteOncePod` explanations, reclaim policy, expansion behavior, and `WaitForFirstConsumer` guidance match current Kubernetes documentation.
- The three `kubectl get` commands use valid current syntax. `volumesnapshotclass` is available only when the snapshot CRDs are installed, which the post correctly explains.
- Provider capabilities can vary by driver, cluster version, region, and installed snapshot components; the post already includes an appropriate verification caveat.
