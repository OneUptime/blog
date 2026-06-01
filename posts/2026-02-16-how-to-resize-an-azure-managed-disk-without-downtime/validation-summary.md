# Validation Summary: How to Resize an Azure Managed Disk Without Downtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Disks
- Azure Virtual Machines
- Azure CLI
- Azure PowerShell
- Terraform AzureRM provider
- Linux partition and filesystem resizing
- Windows PowerShell partition resizing
- LVM
- Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: Expand virtual hard disks on a Linux VM: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/expand-disks
- Microsoft Learn: Expand virtual hard disks attached to a Windows VM: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/expand-disks
- Microsoft Learn: Azure CLI `az disk`: https://learn.microsoft.com/en-us/cli/azure/disk
- Microsoft Learn: Azure managed disk types: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Microsoft Learn: Performance tiers for managed disks: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-change-performance
- Microsoft Learn: Server-side encryption of Azure managed disks: https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption
- Microsoft Learn: How to resize logical volume management devices that use Azure Disk Encryption: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/how-to-resize-encrypted-lvm
- Microsoft Learn: Get-PartitionSupportedSize: https://learn.microsoft.com/en-us/powershell/module/storage/get-partitionsupportedsize
- Microsoft Learn: Extend a basic or dynamic volume in Windows and Windows Server: https://learn.microsoft.com/en-us/windows-server/storage/disk-management/extend-a-basic-volume
- Microsoft Learn: Supported metrics for Microsoft.Compute/disks: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-disks-metrics
- Terraform Registry: `azurerm_managed_disk`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/managed_disk

## Issues Found
- The post stated that online resize applies to managed disks generally and that OS disk online resize works the same way as data disks. Azure documentation limits expand-without-downtime support to data disks, so the introduction, support section, OS disk section, and limitations were updated to make that distinction clear.
- The post omitted important online-resize limitations for shared disks and for expanding Standard HDD, Standard SSD, or Premium SSD disks beyond 4 TiB. Added those constraints to the online resize support section.
- The post implied Azure-level resize is almost instant in all cases. Updated this to note that Ultra Disks and Premium SSD v2 disks can take up to 10 minutes to reflect the new size and may require an OS rescan.
- The Terraform section said Terraform will resize in place without recreating the disk. This is generally true for disk size increases, but Terraform can deallocate attached VMs when Azure no-downtime requirements are not met. Updated the comment to include that caveat.
- The Premium SSD performance example incorrectly said resizing a P10 128 GiB disk to 256 GiB makes it P20 with 2,300 IOPS and 150 MB/s. Azure maps 256 GiB Premium SSD to P15 with 1,100 IOPS and 125 MB/s. Corrected the example.
- The performance tier update example used the generic `--set tier=P30` form. Updated it to the documented Azure CLI `--tier P30` option.
- The Azure Disk Encryption limitation was too broad. Microsoft documents Azure Disk Encryption data disk resize workflows, so the paragraph now advises using the ADE-specific workflow instead of saying online resize is categorically unsupported.

## Review Notes
The Linux and Windows OS-level resize commands are technically valid for common single-partition data disk layouts, but production systems should confirm the device name, partition scheme, filesystem type, and backup/snapshot state before resizing.
