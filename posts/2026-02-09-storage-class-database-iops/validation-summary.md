# Validation Summary: How to Configure Storage Class Parameters for Optimal Database IOPS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StorageClass, PersistentVolumeClaim, StatefulSet
- AWS EBS CSI Driver and EBS gp3/io2 volumes
- Google Kubernetes Engine Persistent Disk CSI Driver
- Azure Disk CSI Driver for AKS
- PostgreSQL, MySQL, MongoDB, ClickHouse storage considerations
- fio benchmarking
- Prometheus node-exporter disk metrics and PrometheusRule alerts

## Sources Consulted
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/
- Amazon EKS StorageClass parameter reference for EBS CSI: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Amazon EBS volume types: https://aws.amazon.com/ebs/volume-types/
- GKE Compute Engine Persistent Disk CSI Driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- Google Cloud Extreme Persistent Disk documentation: https://docs.cloud.google.com/compute/docs/disks/extreme-persistent-disk
- AKS Azure Disk CSI StorageClass parameter documentation: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk
- Linux xfs(5) manual page: https://man7.org/linux/man-pages/man5/xfs.5.html
- Linux kernel ext4 journaling documentation: https://www.kernel.org/doc/html/latest/filesystems/ext4/journal.html
- MongoDB production notes for Linux filesystems: https://www.mongodb.com/docs/manual/administration/production-notes/

## Issues Found
- Corrected the AWS gp3 explanation. gp3 IOPS and throughput are provisioned independently of volume size; gp2 is the EBS type where baseline IOPS scales with size.
- Updated gp3 comments to avoid outdated fixed maximums and to describe IOPS and throughput as provisioned values with current provider limits.
- Removed the Google `provisioned-throughput-on-create` setting from the `pd-extreme` StorageClass example because that parameter is for Hyperdisk provisioned throughput, not pd-extreme Persistent Disk.
- Corrected Azure Ultra Disk parameter casing from `diskIOPSReadWrite` and `diskMBpsReadWrite` to the documented `DiskIOPSReadWrite` and `DiskMBpsReadWrite`.
- Replaced AWS EBS CSI `fsType` parameters with the documented `csi.storage.k8s.io/fstype` parameter.
- Changed the PostgreSQL StatefulSet from three standalone replicas to one replica, since the example does not configure PostgreSQL replication.
- Removed `nobarrier` from the XFS MySQL mount options because the XFS barrier/nobarrier mount options have been removed from modern Linux kernels.
- Replaced `data=writeback` in the analytics ext4 example because it weakens data ordering guarantees and is not a safe generic database recommendation.
- Replaced the manual `resize2fs` command with PVC inspection guidance because CSI filesystem expansion is normally handled by kubelet, and `resize2fs` is ext4-specific and device-path dependent.
- Updated the best-practice note about volume sizing so it does not incorrectly imply all volume types gain baseline IOPS from larger sizes.

## Review Notes
- YAML snippets were parsed locally with PyYAML after edits.
- `kubectl` was not installed in the local environment, so command behavior was checked against official Kubernetes documentation rather than local CLI help.
