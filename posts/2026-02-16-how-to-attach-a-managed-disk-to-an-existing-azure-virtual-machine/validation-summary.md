# Validation Summary: How to Attach a Managed Disk to an Existing Azure Virtual Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Managed Disks
- Azure Virtual Machines
- Azure CLI
- Linux block devices, partitioning, filesystems, and `/etc/fstab`
- Windows PowerShell disk initialization and formatting
- Azure Monitor metrics

## Sources Consulted
- Azure CLI `az vm disk` reference: https://learn.microsoft.com/en-us/cli/azure/vm/disk?view=azure-cli-latest
- Azure CLI `az disk` reference: https://learn.microsoft.com/en-us/cli/azure/disk?view=azure-cli-latest
- Azure VM managed disk types: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Add a disk to a Linux VM with Azure CLI: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/add-disk
- Format and mount managed disks on Linux VMs: https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disks-format-mount-data-disks-linux
- Attach a data disk to a Windows VM with PowerShell: https://learn.microsoft.com/en-us/azure/virtual-machines/windows/attach-disk-ps
- Azure VM and disk performance: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-performance
- Azure managed disk redundancy options: https://learn.microsoft.com/en-us/azure/virtual-machines/disks-redundancy
- Azure Monitor supported metrics for `Microsoft.Compute/disks`: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-disks-metrics
- Azure Dsv5 size series: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/dsv5-series

## Issues Found
- The standalone disk creation section did not mention that a separately created disk must be in a compatible region and zone for the VM. Added a concise note before the `az disk create` example.
- The LRS explanation said copies are kept within a single datacenter. Updated this to Microsoft's current wording: a single physical location in the primary region.
- The Linux mounting section assumed SCSI-style names such as `/dev/sdc`. Current Azure Linux VM guidance notes that newer VM sizes can use NVMe names such as `/dev/nvme1n1`. Added guidance to replace the example device name and account for NVMe partition naming.
- The disk caching section said caching can be configured for each data disk. Premium SSD v2 and Ultra Disk do not support host caching, so the text now calls out those exceptions.
- The caching example was described as setting caching on an already attached disk, but `az vm disk attach --caching` sets the policy as part of attach. Updated the wording and command comment.

## Review Notes
Azure CLI commands, accepted SKU values, data disk attach/detach syntax, PowerShell disk commands, `/etc/fstab` UUID guidance, `nofail`, the `Standard_D4s_v5` eight-disk limit, and the Azure Monitor metric name were checked against official documentation and are technically valid. The local environment did not have the Azure CLI installed, so command validation used Microsoft Learn CLI reference rather than local `az --help` output.
