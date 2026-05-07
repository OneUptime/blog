# Validation Summary: How to Create Storage Classes in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- StorageClass
- PersistentVolumeClaim (PVC)
- PersistentVolume (PV)
- AWS EBS CSI driver
- NFS CSI driver
- kubectl

## Sources Consulted
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Change the default StorageClass task: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Rancher Dynamically Provisioning New Storage documentation: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/manage-clusters/create-kubernetes-persistent-storage/manage-persistent-storage/dynamically-provision-new-storage
- Amazon EKS Create a storage class documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Kubernetes CSI NFS driver parameters: https://github.com/kubernetes-csi/csi-driver-nfs/blob/master/docs/driver-parameters.md

## Issues Found
- The post used the deprecated in-tree AWS EBS provisioner `kubernetes.io/aws-ebs` in multiple StorageClass examples. I changed those examples to the current AWS EBS CSI provisioner `ebs.csi.aws.com` because the in-tree AWSElasticBlockStore driver was deprecated in Kubernetes v1.19 and removed in v1.27.
- The `fast-storage` example used the in-tree `fsType` parameter. I changed it to `csi.storage.k8s.io/fstype`, which is the current parameter name for the AWS EBS CSI driver.
- The `premium` tier example used `iopsPerGB` with an AWS EBS example that had been updated to CSI. I changed it to `iops: "5000"` to keep the example valid and directly compatible with the current AWS EBS CSI parameter set.
- The allowed-topologies example used the generic AWS zone label with an AWS EBS provisioner example. I changed the provisioner to `ebs.csi.aws.com`, added `volumeBindingMode: WaitForFirstConsumer`, and changed the topology key to `topology.ebs.csi.aws.com/zone` to match the AWS EBS CSI driver documentation.
- The post stated too absolutely that most Rancher-managed clusters come with a default StorageClass and that PVCs without `storageClassName` will use the default. I corrected this to reflect Kubernetes behavior: a default is only used if one exists.
- The troubleshooting section said only one StorageClass should be marked as default. I corrected this to match Kubernetes documentation: multiple defaults are allowed, but Kubernetes uses the most recently created default for PVCs that omit `storageClassName`, so keeping only one default is still the recommended practice.
- The Rancher UI navigation was slightly imprecise. I updated it to match the current documented flow: **Cluster Management** -> open the cluster -> **Explore** -> **Storage** -> **Storage Classes**.

## Review Notes
- The post is now technically valid, but the AWS-backed examples assume the AWS EBS CSI driver is installed and available in the target cluster.
- Rancher UI labels are product-specific and can vary slightly by Rancher release. The navigation path was checked against Rancher v2.14 documentation on 2026-05-07.
- The `v2.6 or later` prerequisite was left unchanged, but readers on older Rancher releases may see minor UI differences compared with the current Rancher documentation.
