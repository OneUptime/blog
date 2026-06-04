# Validation Summary: How to Set Up Dynamic Provisioning with Multiple StorageClasses

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes StorageClasses
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StatefulSets
- Kubernetes ResourceQuota
- AWS EBS CSI Driver
- AWS EFS CSI Driver
- Rook Ceph RBD and CephFS CSI Drivers
- kubectl, jq, and awk

## Sources Consulted
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Dynamic Volume Provisioning documentation: https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ResourceQuota API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- Amazon EKS StorageClass parameters reference for EBS: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Amazon EBS volume types documentation: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html
- Kubernetes AWS EFS StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/#aws-efs
- Rook CephFS filesystem storage documentation: https://rook.io/docs/rook/v1.20/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- AWS EBS CSI Driver documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver

## Issues Found
- The `application-logs` PVC requested `100Gi` from an `st1` EBS StorageClass. AWS documents `st1` volumes as supporting sizes from `125 GiB` to `16 TiB`, so the request was changed to `125Gi`.
- The total provisioned storage monitoring command stripped all non-numeric characters and always printed `Gi`, which would misreport values such as `1Ti` as `1Gi`. The `awk` snippet now converts common Kubernetes binary units to Gi before summing.
- The ResourceQuota example combined StorageClass-specific storage quota resources with a `PriorityClass` `scopeSelector`. Kubernetes only allows PriorityClass-scoped quotas to track pod compute-related resources, not PVC storage resources. The unsupported `scopeSelector` was removed.

## Review Notes
- The StorageClass, PVC, StatefulSet, topology, and CSI examples use current Kubernetes API versions and field names.
- The AWS EBS, AWS EFS, and Rook Ceph CSI parameter examples are provider-specific and require the corresponding CSI drivers, secrets, filesystems, pools, and AWS resources to exist in the target cluster.
