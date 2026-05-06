# Validation Summary: How to Browse Storage Classes in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- StorageClass
- Persistent Volumes and PersistentVolumeClaims
- kubectl
- AWS EBS CSI
- Google Kubernetes Engine Persistent Disk CSI

## Sources Consulted
- Portainer documentation, Kubernetes volumes: https://docs.portainer.io/user/kubernetes/volumes
- Kubernetes documentation, Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes documentation, Change the default StorageClass: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Google Cloud documentation, Use the Compute Engine persistent disk CSI Driver: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- AWS documentation, Create a storage class for Amazon EKS: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html

## Issues Found
- The Portainer navigation was inaccurate. The post said to browse to `Storage` or `Volumes` and then click `Storage Classes`, but Portainer documents StorageClasses under `Volumes` with a `Storage` tab. I updated the steps and the explanatory sentence to match the current UI.
- The storage class overview implied that names like `Standard`, `SSD`, and `NFS` are universal class names and that `Standard` means HDD-backed storage. Kubernetes defines StorageClasses as cluster-specific, so I changed this wording to describe typical storage characteristics instead of treating those names as guaranteed defaults.
- The `Provisioner` example used the deprecated in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Current documentation uses CSI provisioners such as `ebs.csi.aws.com`, so I updated the example and tightened the surrounding field descriptions.
- The `Reclaim Policy` and `Volume Binding Mode` explanations were slightly oversimplified. I corrected them to reflect Kubernetes behavior for dynamically provisioned PVs and `WaitForFirstConsumer`.
- The CLI example used `kubectl get storageclasses`. While plural resource names are commonly accepted, Kubernetes documentation uses `kubectl get storageclass`, so I aligned the example with the documented form.
- The GKE example was labeled as a standard storage class even though it used `pd-ssd`. I renamed it to an SSD storage class and added the recommended `volumeBindingMode: WaitForFirstConsumer`.
- The decision tree used `Standard HDD storage class`, which is not a Kubernetes-wide default, and referred to `Ceph` generically for RWX storage. I changed those branches to `general-purpose storage class`, `SSD-backed storage class`, and `CephFS` for the RWX example.

## Review Notes
`kubectl` is not installed in the local review environment, so command validation was done against official Kubernetes documentation rather than local `--help` output.
