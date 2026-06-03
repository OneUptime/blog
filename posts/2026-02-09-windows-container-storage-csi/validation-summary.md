# Validation Summary: How to Configure Windows Container Storage with CSI Drivers on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Windows containers
- Container Storage Interface (CSI)
- Azure Disk CSI driver
- Azure Files CSI driver
- PersistentVolumes and PersistentVolumeClaims
- StorageClasses
- StatefulSets
- VolumeSnapshots
- Azure Kubernetes Service (AKS)

## Sources Consulted
- Kubernetes Windows Storage documentation: https://kubernetes.io/docs/concepts/storage/windows-storage/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- AKS CSI storage drivers documentation: https://learn.microsoft.com/en-us/azure/aks/csi-storage-drivers
- AKS Azure Disk persistent volume documentation: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk
- AKS Azure Files persistent volume documentation: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-files
- Azure Disk CSI driver parameters: https://github.com/kubernetes-sigs/azuredisk-csi-driver/blob/master/docs/driver-parameters.md
- Azure Files CSI driver parameters: https://github.com/kubernetes-sigs/azurefile-csi-driver/blob/master/docs/driver-parameters.md
- Kubernetes CSI Windows documentation: https://kubernetes-csi.github.io/docs/csi-windows.html
- Microsoft SQL Server Linux container documentation: https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment
- GCE Persistent Disk CSI driver Windows support documentation: https://github.com/kubernetes-sigs/gcp-compute-persistent-disk-csi-driver
- Amazon EKS EBS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html

## Issues Found
- The AKS installation section used Helm commands for the open-source Azure Disk CSI driver. AKS documentation recommends enabling the managed CSI driver with `az aks update --enable-disk-driver`, so the commands were updated.
- The supported-driver list included Local Path Provisioner as a CSI driver. Removed it because it is not a CSI driver.
- The Windows storage explanation implied ReFS support in the Kubernetes container storage path. Updated the wording to match Kubernetes documentation that Windows container layers are NTFS-based.
- The Azure Disk StorageClass used an unsupported `encryption: enabled` parameter. Removed it and noted that Azure managed disks are encrypted at rest by default.
- Azure Disk examples included Linux `uid` and `gid` mount options. Removed them because Kubernetes documents Linux UID/GID filesystem features as unsupported on Windows nodes.
- The high-performance Premium_ZRS example set `ReadWrite` caching and Ultra/PremiumV2 performance parameters. Updated it to a safer Premium_ZRS example using `ReadOnly` caching and `WaitForFirstConsumer`.
- The StatefulSet used the Linux-only `mcr.microsoft.com/mssql/server:2022-latest` SQL Server image on Windows nodes. Replaced it with a Windows Server Core container that writes to the mounted volumes.
- The Azure Files Windows StorageClass included Linux SMB/CIFS mount options such as `dir_mode`, `file_mode`, `uid`, `gid`, and `mfsymlinks`. Removed those options for the Windows-focused example.
- The volume expansion section said Windows filesystem resize happens automatically. Updated it to note that Kubernetes documents online mounted filesystem expansion as unsupported for Windows and that remounting or restarting may be required.
- The Ultra SSD StorageClass included Linux `uid` and `gid` mount options. Removed them.
- Corrected the tag from `Window` to `Windows`.

## Review Notes
The YAML snippets were parsed successfully after the edits. The post remains an Azure-focused example; provider support and exact behavior can vary by managed Kubernetes service version, CSI driver version, Windows Server version, and whether CSI Proxy is installed on Windows nodes.
