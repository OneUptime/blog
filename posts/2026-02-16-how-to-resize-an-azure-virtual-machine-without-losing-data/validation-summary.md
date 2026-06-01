# Validation Summary: How to Resize an Azure Virtual Machine Without Losing Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Virtual Machines
- Azure VM resizing
- Azure CLI
- Azure public IP addresses
- Azure availability sets
- Azure managed disks and temporary disks

## Sources Consulted
- Microsoft Learn: Resize a virtual machine: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/resize-vm
- Microsoft Learn: Azure CLI `az vm` command reference: https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm availability-set` command reference: https://learn.microsoft.com/en-us/cli/azure/vm/availability-set?view=azure-cli-latest
- Microsoft Learn: Public IP addresses in Azure: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses
- Microsoft Learn: Format and mount temporary disks on Azure Linux VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disks-format-mount-temp-disks-linux
- Microsoft Learn: Azure VM sizes with no local temporary disk: https://learn.microsoft.com/en-us/azure/virtual-machines/azure-vms-no-temp-disk
- Microsoft Learn: Select a disk type for Azure IaaS VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types

## Issues Found
- The post originally said every VM resize deallocates the VM. Microsoft documents that resizing a running VM restarts it, and deallocation is only required in some cases, such as when the target size is unavailable on the current hardware cluster. Updated the explanation accordingly.
- The dynamic public IP note originally tied possible IP changes to a restart. Microsoft documents that dynamic public IP addresses are released on stop/deallocate. Updated the wording to tie this risk to deallocation.
- The Azure portal instructions used the older/incorrect "Settings" location and said the portal shows which sizes require deallocation. Current Microsoft documentation places Size under "Availability + scale" and says stopping the VM may reveal more sizes. Updated those steps.
- The availability set CLI example selected all VMs in any availability set in the resource group instead of the VMs in the intended availability set. Replaced it with commands that get the target availability set ID, filter VMs by that ID, and use `--ids` for deallocate, resize, and start.
- The availability set guidance implied rolling resize was always possible. Microsoft documents that if the target size is not available on the current cluster, all VMs in the availability set may need to be deallocated. Updated the load balancer note to apply rolling resize only when the target size is available on the current cluster.
- The temporary disk note was too narrow about Linux device naming and data loss conditions. Updated it to state that `/dev/sdb` is common but not universal, and that temporary disks are not persistent and can lose data when the VM moves hosts during stop/deallocate or resize.

## Review Notes
- Azure CLI is not installed in this workspace, so command validation was performed against the current Microsoft Learn Azure CLI reference rather than local `az --help` output.
- Downtime estimates vary by VM size, OS, and allocation conditions; the post's estimate is reasonable as an operational expectation but is not guaranteed by Microsoft documentation.
