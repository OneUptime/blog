# Validation Summary: How to Create and Attach Azure Managed Disks to Virtual Machines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Disks
- Azure Virtual Machines
- Azure CLI
- Azure PowerShell Az.Compute
- ARM templates
- Linux disk partitioning, formatting, mounting, and fstab
- Windows PowerShell disk initialization and formatting

## Sources Consulted
- Microsoft Learn: Azure CLI `az disk` reference - https://learn.microsoft.com/en-us/cli/azure/disk?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm disk` reference - https://learn.microsoft.com/en-us/cli/azure/vm/disk?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm` reference - https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Microsoft Learn: Add a disk to a Linux VM - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/add-disk
- Microsoft Learn: Format and mount managed disks to Azure Linux VMs - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disks-format-mount-data-disks-linux
- Microsoft Learn: Attach a data disk to a Windows VM with PowerShell - https://learn.microsoft.com/en-us/azure/virtual-machines/windows/attach-disk-ps
- Microsoft Learn: Azure managed disk types - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Microsoft Learn: Azure premium storage disk caching guidance - https://learn.microsoft.com/en-us/azure/virtual-machines/premium-storage-performance
- Microsoft Learn: ARM template reference for `Microsoft.Compute/disks` API version `2023-04-02` - https://learn.microsoft.com/en-us/azure/templates/microsoft.compute/2023-04-02/disks
- Microsoft Learn: `New-AzDiskConfig` PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.compute/new-azdiskconfig
- Microsoft Learn: `Add-AzVMDataDisk` PowerShell reference - https://learn.microsoft.com/en-us/powershell/module/az.compute/add-azvmdatadisk

## Issues Found
- The description said the post covered the Azure portal, but the article covers Azure CLI, PowerShell, and ARM templates. Updated the description to match the actual content.
- The managed disk type list omitted Premium SSD v2. Added Premium SSD v2 and adjusted the production workload wording accordingly.
- The size/performance explanation implied all listed disk types scale IOPS and throughput by disk size. Updated it to clarify that Standard HDD, Standard SSD, and Premium SSD performance is size/tier-based, while Premium SSD v2 and Ultra Disk performance is configured separately.
- The first `az disk create` example used `--os-type Linux` for an empty data disk. Removed it because the official empty managed data disk examples do not require an OS type.
- The Linux initialization comments implied new data disks typically appear as `/dev/sdc`. Added a clarification that Azure Linux VMs can use SCSI or NVMe device names depending on VM generation and size.
- The caching example used `az vm disk attach` to change caching on an already attached disk. Replaced it with `az vm update --disk-caching 0=ReadOnly`, which is the documented update command for disk caching by LUN.

## Review Notes
The Linux example uses `fdisk` and ext4, which is technically valid for the shown disk sizes. Microsoft documentation currently demonstrates `parted` with GPT and XFS and includes separate examples for SCSI and NVMe devices; a future editorial pass could modernize the Linux walkthrough more broadly without changing the core Azure disk guidance.
