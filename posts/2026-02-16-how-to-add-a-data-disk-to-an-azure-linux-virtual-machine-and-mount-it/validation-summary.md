# Validation Summary: How to Add a Data Disk to an Azure Linux Virtual Machine and Mount It

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Virtual Machines
- Azure managed disks
- Azure CLI
- Linux block devices and filesystems
- `/etc/fstab`
- LVM
- Azure Monitor metrics

## Sources Consulted
- Microsoft Learn: Add a disk to a Linux VM - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/add-disk
- Microsoft Learn: Format and mount managed disks to Azure Linux VMs - https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disks-format-mount-data-disks-linux
- Microsoft Learn: Azure CLI `az vm disk attach` reference - https://learn.microsoft.com/en-us/cli/azure/vm/disk
- Microsoft Learn: Azure CLI `az disk create` reference - https://learn.microsoft.com/en-us/cli/azure/disk
- Microsoft Learn: Azure managed disk types - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types
- Microsoft Learn: Performance tiers for managed disks - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-change-performance
- Microsoft Learn: Virtual machine and disk performance - https://learn.microsoft.com/en-us/azure/virtual-machines/disks-performance
- Microsoft Learn: Supported metrics for Microsoft.Compute/disks - https://learn.microsoft.com/en-us/azure/azure-monitor/reference/supported-metrics/microsoft-compute-disks-metrics
- GNU Parted command help available in the local environment
- util-linux `mount` command help available in the local environment

## Issues Found
- The Standard HDD and Ultra Disk IOPS limits were outdated. Updated Standard HDD from a flat "up to 500 IOPS" to the current base and performance-plus limits, and updated Ultra Disk from 160,000 to 400,000 IOPS.
- The Premium SSD size examples used decimal GB/TB labels for Azure tiers that Microsoft documents in GiB/TiB. Updated those labels to GiB/TiB while preserving the tier, IOPS, and throughput values.
- The disk identification guidance assumed SCSI device names such as `/dev/sdc`. Added a note that newer Azure VM sizes can expose disks as NVMe devices and that readers should substitute the actual device name they identify.
- The `parted` example did not refresh the kernel partition table after creating the partition. Added `sudo partprobe /dev/sdc` so the new partition is available before running `lsblk`, `mkfs`, or `blkid`.
- The caching guidance said ReadWrite should only be used for OS disks. Updated it to match Microsoft guidance: use ReadWrite for data disks only when the application can properly handle flushing cached writes to persistent storage.

## Review Notes
The core Azure CLI examples, filesystem creation commands, fstab UUID guidance with `nofail`, LVM workflow, and Azure Monitor disk metric names were technically valid. The local environment did not have Azure CLI, `mkfs.xfs`, or LVM tools installed, so those command surfaces were verified against Microsoft Learn and standard Linux command references rather than executed end to end.
