# Validation Summary: How to Expand the OS Disk on an Azure Virtual Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machines
- Azure Managed Disks
- Azure CLI
- Linux partition and filesystem resizing
- Windows PowerShell Storage cmdlets
- Azure Portal

## Sources Consulted
- Microsoft Learn: Expand virtual hard disks on a Linux VM - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/expand-disks
- Microsoft Learn: Expand virtual hard disks attached to a Windows virtual machine - https://learn.microsoft.com/en-us/azure/virtual-machines/windows/expand-disks
- Microsoft Learn: Troubleshoot Azure disk resize failures - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-disk-resize
- Microsoft Learn: Azure CLI `az disk` reference - https://learn.microsoft.com/en-us/cli/azure/disk
- Microsoft Learn: Scalability and performance targets for VM disks - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-scalability-targets
- Microsoft Learn: Get-PartitionSupportedSize PowerShell cmdlet - https://learn.microsoft.com/en-us/powershell/module/storage/get-partitionsupportedsize
- Microsoft Learn: Resize-Partition PowerShell cmdlet - https://learn.microsoft.com/en-us/powershell/module/storage/resize-partition

## Issues Found
- The post said Azure online disk resize could allow OS disk expansion without deallocating the VM if the `Microsoft.Compute/LiveResize` feature was registered. Microsoft documentation currently says online resize is supported only for data disks and explicitly lists OS disks as unsupported for online resize. I changed the section to state that OS disks still require deallocation and limited the online-resize notes to supported data disk scenarios.
- The post said to make sure the VM size supports the target disk size and that most VM sizes support disks up to 4 TB. Microsoft documents the OS disk maximum as 4,095 GiB and notes the MBR 2 TiB usable-size limitation, so I clarified the OS disk and partition-table limits instead.
- The troubleshooting section recommended `cloud-utils` on RHEL/CentOS for `growpart`. Microsoft’s Linux VM resize guidance uses `cloud-utils-growpart` and `gdisk` on Red Hat-family systems, so I corrected the package names and added `cloud-guest-utils` for Ubuntu/Debian.

## Review Notes
The Azure CLI examples use current commands and parameters, including `az vm deallocate`, `az disk update --size-gb`, `az vm start`, and the JMESPath queries for OS disk ID/name. The Linux `growpart`, `resize2fs`, and `xfs_growfs` examples are valid for non-LVM root partitions; LVM-based images require additional PV/LV resize steps that could be covered in a future enhancement. The Windows PowerShell `Get-PartitionSupportedSize` and `Resize-Partition` examples are valid.
