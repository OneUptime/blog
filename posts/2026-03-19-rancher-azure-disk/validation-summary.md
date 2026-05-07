# Validation Summary: How to Configure Azure Disk Storage in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Azure Disk CSI driver
- Azure managed disks
- Helm
- kubectl
- Volume snapshots

## Sources Consulted
- Azure Disk CSI Driver upstream repository: https://github.com/kubernetes-sigs/azuredisk-csi-driver
- Azure Disk CSI Driver chart README: https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/charts/README.md
- Azure Disk CSI Driver parameters: https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/docs/driver-parameters.md
- Azure Disk CSI Driver chart values: https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/charts/latest/azuredisk-csi-driver/values.yaml
- AKS CSI storage drivers: https://learn.microsoft.com/en-us/azure/aks/csi-storage-drivers
- AKS Azure Disk volume provisioning: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk
- Azure managed disk caching guidance: https://learn.microsoft.com/en-us/azure/virtual-machines/premium-storage-performance#disk-caching
- Azure managed disk encryption overview: https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption-overview
- ZRS managed disks: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-deploy-zrs
- Incremental snapshots for managed disks: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-incremental-snapshots
- Kubernetes VolumeSnapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- CSI snapshot controller docs: https://kubernetes-csi.github.io/docs/snapshot-controller.html

## Issues Found
- The self-managed installation step enabled the Azure Disk driver but not the chart's snapshot components, even though later sections relied on snapshots. I updated the Helm install command to include `--set snapshot.enabled=true`.
- The post implied the same installation guidance applied equally to AKS and self-managed clusters. I corrected the wording to distinguish the managed AKS driver from the upstream driver used on self-managed Rancher/RKE clusters.
- The prerequisites omitted a key self-managed requirement: Azure cloud-provider configuration and disk permissions for the driver identity. I added that prerequisite.
- The verification command used a grep pipeline for CSI driver discovery. I replaced it with `kubectl get csidriver disk.csi.azure.com`, which directly checks the installed driver object.
- The StatefulSet example was incomplete because it referenced `serviceName: mysql` without defining the required headless Service. I added the Service manifest and the missing `kubectl apply` command.
- The caching section incorrectly described `ReadWrite` as only for OS disks. I corrected the explanation to reflect current Azure guidance, including that `ReadWrite` is deprecated for Azure Disk CSI usage and that Premium SSD v2 and Ultra disks require `None`.
- The encryption section implied extra configuration was needed for Azure-managed encryption. I corrected it to state that Azure managed disks are encrypted at rest by default and that the shown StorageClass example is for customer-managed keys via a disk encryption set.
- The snapshot section omitted the requirement for VolumeSnapshot CRDs and a snapshot controller. I added that prerequisite and clarified the AKS versus self-managed cluster behavior.
- The ZRS section was too broad. I corrected it to note that ZRS support applies to Premium SSD and Standard SSD managed disks.
- The log collection command was underspecified for multi-container controller pods. I updated it to include `--all-containers=true`.
- The troubleshooting note for pending PVCs was too generic for AKS versus self-managed clusters. I clarified that Azure cloud-provider credentials and disk permissions are specifically a self-managed cluster concern.

## Review Notes
- The StorageClass examples are technically valid, but marking `azure-premium-ssd` as the default class can change cluster-wide behavior if another default StorageClass already exists.
- On AKS, built-in StorageClasses such as `managed-csi` and `managed-csi-premium` may already satisfy many use cases without creating additional defaults.
