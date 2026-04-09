# Validation Summary: How to Deploy Ceph with Terraform on Azure

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (v1.13.0)
- Terraform (with AzureRM provider ~> 3.80, Helm provider ~> 2.12)
- Azure Kubernetes Service (AKS)
- Azure Managed Disks
- Azure Virtual Network
- Helm

## Sources Consulted
- Terraform AzureRM provider documentation for `azurerm_managed_disk`, `azurerm_kubernetes_cluster`, `azurerm_kubernetes_cluster_node_pool` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- AzureRM 3.0 upgrade guide — breaking changes for `encryption_settings` block (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/3.0-upgrade-guide)
- Rook-Ceph Helm chart repository (https://charts.rook.io/release)
- Rook-Ceph documentation and chart values (https://rook.io/docs/rook/latest/)
- Azure VM sizes — Lsv3-series storage-optimized VMs (https://learn.microsoft.com/en-us/azure/virtual-machines/lsv3-series)
- Azure Managed Disks Server-Side Encryption documentation (https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption)

## Issues Found
1. **Invalid `encryption_settings` block in `azurerm_managed_disk`**: The `encryption_settings { enabled = true }` block used the `enabled` argument which was removed in AzureRM provider 3.0. With provider version `~> 3.80`, this would cause a Terraform validation error. Since Azure managed disks are encrypted at rest by default using Server-Side Encryption (SSE) with platform-managed keys, the entire `encryption_settings` block was removed. If customer-managed keys (CMK) are desired, the block should instead contain `disk_encryption_key` and/or `key_encryption_key` sub-blocks.

## Review Notes
- The `azurerm_managed_disk.ceph_osd` resources are created but never attached to the AKS node VMs. There is no `azurerm_virtual_machine_data_disk_attachment` or equivalent mechanism, so these disks would not be available to Rook-Ceph. In AKS, attaching disks to VMSS-managed nodes requires additional configuration (e.g., using the Azure Disk CSI driver with a StorageClass, or VMSS data disk profiles).
- The `rook-ceph-cluster` Helm release sets `cephClusterSpec.storage.useAllDevices = false` but does not specify which devices Rook should use. Without additional configuration (e.g., `deviceFilter` or explicit device paths), Rook will not consume any storage devices.
- The `Standard_L8s_v3` VMs have built-in local NVMe SSDs that Rook could discover and use directly, potentially making the separate managed disks unnecessary for a local-storage approach.
- All other Terraform resource configurations, HCL syntax, Helm chart references, CLI commands, and networking settings are correct.
