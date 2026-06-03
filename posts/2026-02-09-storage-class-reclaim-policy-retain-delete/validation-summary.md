# Validation Summary: How to Configure StorageClass reclaimPolicy for Retain, Delete, and Recycle

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes
- Kubernetes PersistentVolumeClaims
- Kubernetes StorageClasses
- Kubernetes CronJobs and RBAC
- kubectl
- AWS EBS CSI Driver
- AWS CLI for EC2 volumes
- jq

## Sources Consulted
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/
- Kubernetes PersistentVolume API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes task for changing PV reclaim policy: https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/
- AWS EBS CSI Driver StorageClass parameters: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- AWS EBS CSI Driver volume tagging documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/tagging.md
- AWS CLI describe-volumes command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-volumes.html

## Issues Found
- The post stated broadly that Kubernetes supports three reclaim policies in the StorageClass context. Kubernetes PersistentVolumes still document `Retain`, `Delete`, and deprecated `Recycle`, but StorageClasses for dynamically provisioned volumes should use `Delete` or `Retain`. I clarified this distinction and noted that `Recycle` should not be used for new StorageClasses.
- The AWS EBS CSI Driver `tagSpecification_*` examples used `Name=...|Value=...`, which is not the documented EBS CSI format. I changed them to the supported `key=value` syntax.
- The retained-volume cleanup section implied that deleting retained PVs was cleanup for retained volumes. With the `Retain` policy, deleting the PV object does not delete the backing EBS volume. I changed the wording to make clear the job deletes old retained PV objects only after the underlying storage has been reviewed or cleaned up.

## Review Notes
- The `Recycle` reclaim policy remains documented for PersistentVolumes but is deprecated; future updates should avoid presenting it as a practical StorageClass option.
- The cleanup CronJob is still intentionally generic and Kubernetes-only. For a full AWS EBS cleanup workflow, a separate audited process would need to identify and delete the backing EBS volumes after data retention requirements are satisfied.
