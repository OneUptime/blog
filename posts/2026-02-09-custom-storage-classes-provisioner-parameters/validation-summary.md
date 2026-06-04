# Validation Summary: How to Create Custom StorageClasses with Specific Provisioner Parameters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StorageClass
- Kubernetes PersistentVolumeClaim and PersistentVolume
- AWS EBS CSI driver
- GKE Compute Engine Persistent Disk CSI driver
- Azure Disk CSI driver
- Rook-Ceph RBD CSI
- NetApp Trident
- Local Persistent Volumes
- kubectl
- jq

## Sources Consulted
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes default StorageClass documentation: https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Amazon EKS StorageClass documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- AWS EBS CSI Driver StorageClass parameters: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/parameters.md
- AWS EBS CSI Driver tagging documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver/blob/master/docs/tagging.md
- GKE Compute Engine Persistent Disk CSI driver documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- GCP Compute Persistent Disk CSI driver parameters: https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver
- Azure Disk CSI driver parameters: https://github.com/kubernetes-sigs/azuredisk-csi-driver/blob/master/docs/driver-parameters.md
- Rook-Ceph RBD block storage documentation: https://rook.github.io/docs/rook/latest-release/Storage-Configuration/Block-Storage-RBD/block-storage/
- NetApp Trident Kubernetes object documentation: https://docs.netapp.com/us-en/trident/trident-reference/objects.html

## Issues Found
- AWS EBS `tagSpecification_*` examples used `Name=...|Value=...`, which is not the EBS CSI driver StorageClass tag format. Changed them to `key=value` entries such as `Application=Database`.
- The GCP Persistent Disk example described `disk-encryption-kms-key` as labels. Changed the comment to identify it as a customer-managed encryption key, and clarified `replication-type` values as `regional-pd` or `none`.
- The Azure Disk Premium SSD example used deprecated `ReadWrite` caching and a multi-line tags value. Changed caching to `ReadOnly`, normalized `kind` to `managed`, and changed tags to the documented comma-separated `key=value` format.
- The NetApp Trident `solidfire-san` StorageClass included `snapshotPolicy` and `exportPolicy`, which are ONTAP-oriented volume options rather than SolidFire SAN parameters. Removed those parameters from the SolidFire example.
- The testing section tried to verify StorageClass parameters with `kubectl get pv -o yaml | grep -A 20 "parameters"`, but PV objects do not generally expose the original StorageClass parameters. Replaced it with a command that describes the PV bound to the test PVC.
- The PVC storage aggregation command summed Kubernetes capacity strings with `awk`, which can silently mix units incorrectly. Replaced it with a `jq` expression that parses binary units and reports totals in Gi.

## Review Notes
- The examples are still provider-specific and depend on installed CSI drivers, cloud account permissions, supported regions, disk type availability, and quota limits.
- For topology-constrained storage backends, `WaitForFirstConsumer` remains the safer default unless there is a specific reason to provision immediately.
