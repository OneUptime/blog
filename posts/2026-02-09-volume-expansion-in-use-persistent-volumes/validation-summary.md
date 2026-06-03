# Validation Summary: How to Configure Volume Expansion for In-Use Persistent Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClass volume expansion
- CSI volume expansion
- kubectl
- AWS EBS CSI Driver and gp3 volumes
- Google Kubernetes Engine Persistent Disk CSI volume expansion
- Azure Disk CSI Driver on AKS
- Bash and jq

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-claim-v1/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Amazon EKS StorageClass parameter reference: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Amazon EBS volume modification documentation: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modify-volume.html
- Amazon EBS General Purpose SSD volume documentation: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html
- Google Kubernetes Engine volume expansion documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/volume-expansion
- Google Compute Engine Persistent Disk resize documentation: https://docs.cloud.google.com/compute/docs/disks/resize-persistent-disk
- Azure AKS Azure Disk CSI documentation: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk

## Issues Found
- The opening sentence implied all volume expansion is downtime-free. Updated it to clarify that no-downtime expansion depends on CSI driver and filesystem support.
- The PVC monitoring notes and status example showed `FileSystemResizePending: False` as a completion signal. Updated the explanation to say the condition is usually absent after completion and changed the example to show `FileSystemResizePending: True` while node filesystem resizing is still pending.
- The automated expansion script documented an optional namespace, but the argument parsing required a third argument for `NEW_SIZE`. Updated the script to support both `<pvc-name> <new-size>` and `<pvc-name> <namespace> <new-size>`.
- The StatefulSet PVC listing command used `kubectl get pvc -l app=postgres`, but the example `volumeClaimTemplates` did not apply that label to generated PVCs. Added the label to the template metadata.
- The AWS gp3 maximum size was listed as 16TB. Updated it to the current documented maximum of 64 TiB.
- The GCP limitation said all Persistent Disks can expand only every 6 hours. Updated it to clarify that this applies to Extreme Persistent Disk.
- The Azure Disk section said pod restart is required for filesystem resize and used the older/non-preferred `storageaccounttype` parameter. Updated it to reflect AKS documentation for no-downtime resize and use `skuName: Premium_LRS`.

## Review Notes
The commands and Kubernetes API versions are current. Volume expansion behavior remains provider- and driver-dependent, so teams should still verify their installed CSI driver version and StorageClass capabilities before using online expansion in production.
