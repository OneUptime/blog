# Validation Summary: How to Set Up Dynamic Volume Provisioning in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- StorageClass
- PersistentVolume and PersistentVolumeClaim
- StatefulSet
- CSI drivers and external provisioners
- AWS EBS CSI driver
- ResourceQuota
- kubectl

## Sources Consulted
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Dynamic Volume Provisioning documentation: https://kubernetes.io/docs/concepts/storage/dynamic-provisioning/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Service documentation (headless Services): https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Rancher dynamic provisioning documentation: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/manage-clusters/create-kubernetes-persistent-storage/manage-persistent-storage/dynamically-provision-new-storage
- Rancher Local Path Provisioner documentation: https://github.com/rancher/local-path-provisioner
- Amazon EKS StorageClass documentation for the AWS EBS CSI driver: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html

## Issues Found
- The prerequisites and CSI discovery section treated Rancher's Local Path Provisioner as a CSI driver. I corrected the prerequisite wording and clarified that `rancher.io/local-path` is a provisioner, not a `CSIDriver`, so it does not appear in `kubectl get csidrivers`.
- The AWS EBS `StorageClass` example used `fsType`, but the EBS CSI driver expects `csi.storage.k8s.io/fstype`. I updated the parameter key.
- The multi-tier example marked a second `StorageClass` as default even though Step 2 already created a default class. I removed the second default annotation to avoid the multiple-default behavior Kubernetes warns about.
- The StatefulSet example omitted the headless `Service` required by Kubernetes and used an application-specific manifest that was not a clean, documented reference for the storage behavior being explained. I replaced it with a standard headless-Service plus StatefulSet example aligned with the Kubernetes documentation.
- The Rancher UI instructions and troubleshooting commands were too provider-specific in places. I updated them to match current Rancher documentation and made the log/event troubleshooting steps generic across CSI drivers and other provisioners.

## Review Notes
- The concrete `StorageClass` examples are AWS EBS-specific. Readers using Azure Disk, GCE Persistent Disk, vSphere, NFS, Longhorn, or Local Path need to substitute the correct provisioner name and parameters for their backend.
- Kubernetes documentation notes that `ReadWriteOncePod` is preferred over `ReadWriteOnce` for production where the CSI driver supports it.
- `kubectl` was not installed in the workspace, so command verification relied on official Kubernetes, Rancher, and AWS documentation rather than local `kubectl --help` output.
