# Validation Summary: How to Configure AKS Storage Classes with Azure Disk Performance Tiers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes StorageClass, PersistentVolumeClaim, Deployment, and VolumeSnapshot resources
- Azure Disk CSI driver
- Azure managed disks: Standard HDD, Standard SSD, Premium SSD, Premium SSD v2, and Ultra Disk
- Azure Key Vault and Disk Encryption Sets
- Azure CLI and kubectl

## Sources Consulted
- Microsoft Learn: Create and manage persistent volumes with Azure Disks in AKS - https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk
- Microsoft Learn: Concepts - Storage in AKS - https://learn.microsoft.com/en-us/azure/aks/concepts-storage
- Microsoft Learn: Use a customer-managed key to encrypt Azure managed disks in AKS - https://learn.microsoft.com/en-us/azure/aks/azure-disk-customer-managed-keys
- Microsoft Learn: Enable Ultra Disk support on AKS - https://learn.microsoft.com/en-us/azure/aks/use-ultra-disks
- Microsoft Learn: Select a disk type for Azure IaaS VMs - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Microsoft Learn: Scalability and performance targets for VM disks - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-scalability-targets
- Microsoft Learn: Performance tiers for Azure managed disks - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-change-performance
- Azure Disk CSI driver parameters - https://github.com/kubernetes-sigs/azuredisk-csi-driver/blob/master/docs/driver-parameters.md
- Azure Disk CSI driver perfProfile documentation - https://github.com/kubernetes-sigs/azuredisk-csi-driver/blob/master/docs/perf-profiles.md
- Kubernetes documentation: Storage Classes - https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes documentation: Persistent Volumes - https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
- The post described `managed-csi` as Premium SSD. Current AKS documentation says `managed-csi` is Standard SSD and `managed-csi-premium` is Premium SSD, so this was corrected.
- The Premium SSD StorageClass used `perfProfile: "P30"` as if it selected an Azure Premium SSD performance tier. Azure Disk CSI documentation defines `perfProfile` as block-device tuning with values such as `None`, `Basic`, and `Advanced`; it is not a Premium SSD tier selector. I removed the invalid parameter and clarified that Premium SSD baseline performance follows the requested disk size.
- The PVC requested `256Gi` while the surrounding text intended P30 performance. Azure Premium SSD P30 is the 1 TiB tier, so I updated the PVC, expansion example, and snapshot restore PVC to use `1Ti`/`2Ti` consistently.
- Several disk limit claims were outdated or imprecise. I updated Standard HDD, Premium SSD, and Ultra Disk maximums to match current Azure disk documentation, and clarified the AKS StorageClass parameter limits for Ultra Disk IOPS and throughput.
- The customer-managed key setup omitted the AKS cluster identity permission on the Disk Encryption Set. AKS documentation requires the cluster identity to have access to the Disk Encryption Set, so I added the `az role assignment create` command.
- The Key Vault permission names were changed to the lower-case form shown in the AKS customer-managed key documentation.

## Review Notes
The YAML manifests use current Kubernetes APIs and documented Azure Disk CSI parameters. The monthly cost column remains approximate; exact Azure managed disk pricing varies by region, redundancy, and date, so it should be refreshed before publication if the post needs pricing precision.
