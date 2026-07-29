# Validation Summary: Azure Disk Resized but the Guest OS Still Shows the Old Size

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Azure Virtual Machines
- Azure managed disks and shared disks
- Azure CLI and JMESPath queries
- Linux SCSI and NVMe disk discovery
- Linux partitions, XFS, ext4, and `growpart`
- Linux LVM physical volumes, volume groups, and logical volumes
- Windows Disk Management
- Windows PowerShell Storage cmdlets
- MBR and GPT partitioning
- Azure Disk Encryption and Storage Spaces

## Sources Consulted

- Microsoft Learn: Expand virtual hard disks on a Linux VM (https://learn.microsoft.com/en-us/azure/virtual-machines/linux/expand-disks)
- Microsoft Learn: Expand virtual hard disks attached to a Windows virtual machine (https://learn.microsoft.com/en-us/azure/virtual-machines/windows/expand-disks)
- Microsoft Learn: Manage and expand Windows VM data disks (https://learn.microsoft.com/en-us/azure/virtual-machines/windows/tutorial-manage-data-disk)
- Microsoft Learn: Troubleshoot Azure disk resize failures (https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-disk-resize)
- Microsoft Learn: Can't extend a volume on an Azure Windows VM (https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/cannot-extend-volume-windows-vm)
- Microsoft Learn: Can't extend an OS volume because a recovery partition blocks the extension (https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/cannot-extend-volume-recovery-partition)
- Microsoft Learn: Cannot extend an encrypted OS volume in Windows (https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/cannot-extend-encrypted-os-volume)
- Microsoft Learn: Can't extend a SQL Server marketplace VM volume (https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/cannot-extend-volume-sql-server)
- Microsoft Learn: Enable shared disks for Azure managed disks (https://learn.microsoft.com/en-us/azure/virtual-machines/disks-shared-enable)
- Microsoft Learn: Azure managed disk types and billing (https://learn.microsoft.com/en-us/azure/virtual-machines/disks-types)
- Microsoft Learn: Azure CLI `az disk` reference (https://learn.microsoft.com/en-us/cli/azure/disk?view=azure-cli-latest)
- Microsoft Learn: `Update-HostStorageCache` (https://learn.microsoft.com/en-us/powershell/module/storage/update-hoststoragecache?view=windowsserver2025-ps)
- Microsoft Learn: `Resize-Partition` (https://learn.microsoft.com/en-us/powershell/module/storage/resize-partition?view=windowsserver2025-ps)
- Microsoft Learn: Extend a basic or dynamic volume in Windows and Windows Server (https://learn.microsoft.com/en-us/windows-server/storage/disk-management/extend-a-basic-volume)
- Red Hat documentation: Increasing the size of an XFS file system (https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_file_systems/increasing-the-size-of-an-xfs-file-system_managing-file-systems)
- Red Hat documentation: LVM logical volume administration (https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/logical_volume_manager_administration/LV)
- Ubuntu manpage: `growpart` (https://manpages.ubuntu.com/manpages/noble/man1/growpart.1.html)
- Linux manual page: `resize2fs(8)` (https://man7.org/linux/man-pages/man8/resize2fs.8.html)

## Issues Found

- The storage-layer diagram described a partition table or LVM physical volume as a single alternative, omitted the LVM volume group, and made a logical volume look mandatory. It now identifies the partition and LVM stack as optional and includes the physical volume, volume group, and logical volume in the correct order.
- The Linux rescan section stated that a reboot does not expand the partition or filesystem. On images configured for automatic root-disk growth, such as supported Ubuntu images using cloud-init, those layers can be expanded during boot. The text now distinguishes that behavior from a reboot alone.
- The Windows PowerShell example was described for a generic simple volume even though `Resize-Partition` applies to a partition and the standard extension workflow requires a supported filesystem. The example is now scoped to a basic-disk NTFS or ReFS partition with adjacent unallocated space.
- The Windows troubleshooting list treated a dynamic disk or encryption alone as a reason for **Extend Volume** to be unavailable. Windows can extend eligible dynamic volumes, and the documented Azure Disk Encryption failure is specifically caused by a blocking System Reserved partition. The list now names unsupported filesystems, the precise Azure Disk Encryption layout issue, and clustered shared-disk or Storage Spaces layouts that require separate procedures.
- The SQL Server marketplace VM caveat called its storage pool "managed," which is not the term used by the Azure procedure. It now refers to the preconfigured storage pool created by the marketplace deployment.
- The troubleshooting table collapsed the LVM physical-volume and logical-volume layers into the partition/filesystem steps. It now distinguishes partition expansion, `pvresize` or logical-volume expansion, and filesystem expansion.

## Review Notes

- The Azure CLI command names, flags, output modes, property names, and JMESPath projections were checked against the installed Azure CLI and current Microsoft CLI documentation.
- The Linux rescan, `growpart`, XFS, ext4, LVM, and verification commands are valid for the layouts described. Device names and LVM paths remain intentionally illustrative and must be replaced with values discovered on the target VM.
- Online resize eligibility remains scenario-dependent. Current Azure documentation excludes OS disks and shared disks from ordinary live resize and imposes additional rules when Standard HDD, Standard SSD, or Premium SSD disks cross the 4 TiB boundary.
- The four links in the post's Official Documentation section resolve to the intended Microsoft Learn guidance.
