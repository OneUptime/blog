# Validation Summary: How to Configure Azure Disk CSI Driver for AKS Persistent Volumes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes PersistentVolumes, PersistentVolumeClaims, StorageClasses, StatefulSets, and VolumeSnapshots
- Azure Kubernetes Service (AKS)
- Azure Disk CSI driver
- Azure managed disks, Premium SSD, Standard SSD, Ultra Disk, and ZRS disks
- Azure CLI
- Azure Monitor metrics
- Azure Disk Encryption Set and customer-managed keys

## Sources Consulted
- Microsoft Learn: Use Container Storage Interface (CSI) Drivers on Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/csi-storage-drivers
- Microsoft Learn: Create and manage persistent volumes with Azure Disks in AKS: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk
- Microsoft Learn: Enable Ultra Disk support on Azure Kubernetes Service (AKS): https://learn.microsoft.com/en-us/azure/aks/use-ultra-disks
- Microsoft Learn: az aks nodepool CLI reference: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool
- Microsoft Learn: az disk-encryption-set CLI reference: https://learn.microsoft.com/en-us/cli/azure/disk-encryption-set
- Kubernetes CSI external-snapshotter documentation: https://github.com/kubernetes-csi/external-snapshotter
- Kubernetes CSI external-snapshotter developer documentation: https://kubernetes-csi.github.io/docs/external-snapshotter.html

## Issues Found
- The default storage class description incorrectly said `managed-csi` uses Premium SSD and described `managed-csi-premium` as legacy. Updated it to reflect AKS documentation: `managed-csi` uses Standard SSD and `managed-csi-premium` uses Premium SSD.
- The Ultra Disk storage class examples used noncanonical Azure Disk CSI parameter names for IOPS and throughput. Updated `diskIOPSReadWrite` and `diskMBpsReadWrite` to the documented `DiskIOPSReadWrite` and `DiskMBpsReadWrite` names.
- The snapshot setup only installed snapshot CRDs from the upstream repository and omitted the required snapshot controller. Replaced that with the AKS-managed `az aks update --enable-snapshot-controller` flow and a CRD verification command.
- The `fio` performance test pod wrote to `/data/test` without mounting a persistent volume at `/data`. Updated the `kubectl run` example to mount the example PVC before running `fio`.
- The `diskEncryptionSetID` example used an incomplete Azure resource ID. Updated it to the full documented Disk Encryption Set resource ID format.

## Review Notes
The examples are generally accurate for current AKS CSI-based storage. Live cluster validation was not performed because this environment does not have `kubectl` configured or installed; commands were checked against official documentation and inspected for syntax and API correctness.
