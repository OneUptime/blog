# Validation Summary: How to Configure AKS Ephemeral OS Disks for Faster Node Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure VM ephemeral OS disks
- Azure VM sizes and local storage
- Azure CLI
- Kubernetes node pools

## Sources Consulted
- Microsoft Learn: AKS storage concepts, ephemeral OS disk behavior and AKS defaults: https://learn.microsoft.com/en-us/azure/aks/concepts-storage
- Microsoft Learn: Create node pools in AKS, including ephemeral OS disk requirements: https://learn.microsoft.com/en-us/azure/aks/create-node-pools
- Microsoft Learn: Azure VM ephemeral OS disks, placement options, size requirements, and lifecycle behavior: https://learn.microsoft.com/en-ie/azure/virtual-machines/ephemeral-os-disks
- Microsoft Learn: Azure CLI `az aks create` reference for `--node-osdisk-type` and `--node-osdisk-size`: https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az aks nodepool add` reference for `--node-osdisk-type` and `--node-osdisk-size`: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest
- Microsoft Learn: Dsv5 VM size series, showing no local storage and no ephemeral OS disk support: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv5-series
- Microsoft Learn: Ddsv5 VM size series, showing local temp storage sizes and ephemeral OS disk support: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/ddsv5-series
- Microsoft Learn: Azure managed disk performance tiers, including P10 baseline IOPS: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-change-performance
- Microsoft Learn: Azure managed disk types and Premium SSD sizes: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types

## Issues Found
- The post used `Standard_D4s_v5`, `Standard_D8s_v5`, and related plain Dsv5/Esv5 examples as ephemeral OS disk-compatible SKUs. Microsoft documentation states Dsv5 has no local storage and does not support ephemeral OS disks. I changed the examples to diskful SKUs such as `Standard_D4ds_v5` and `Standard_D8ds_v5`.
- The VM compatibility command labeled `maxDataDiskCount` as cache size, which is incorrect. I changed the example to report local temp storage for `Standard_D4ds_v5`.
- The post described ephemeral OS disk placement as only cache or temp disk and said OS cache was the default/preferred placement. Current Azure VM documentation includes cache, temp disk, and NVMe placement, and AKS/VM behavior depends on VM SKU. I updated the explanation.
- The `--kubelet-disk-type Temporary` example incorrectly claimed that the flag forces the OS disk onto the resource disk. `kubeletDiskType` controls kubelet/container data placement, not ephemeral OS disk placement. I removed the flag from the AKS CLI example and clarified the distinction.
- The performance table claimed a 128GB Premium SSD managed disk provides 5,000 IOPS. Microsoft documentation lists P10 baseline performance as 500 IOPS. I corrected the table and made the comparison VM-size-specific.
- The limitations section repeated the incorrect `Standard_D4s_v5` cache-size claim. I updated it to the `Standard_D4ds_v5` temp disk size and local-storage requirement.

## Review Notes
Azure pricing varies by region, offer, and date. The post's cost examples remain approximate and should be refreshed periodically against the Azure pricing page or calculator.
