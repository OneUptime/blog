# Validation Summary: How to Resize RHEL Virtual Hard Disks in Hyper-V Without Data Loss

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Hyper-V
- VHDX virtual hard disks
- PowerShell Hyper-V module
- Linux SCSI device rescans
- cloud-utils-growpart
- LVM
- XFS

## Sources Consulted
- Microsoft Learn: Resize-VHD Hyper-V cmdlet: https://learn.microsoft.com/powershell/module/hyper-v/resize-vhd
- Microsoft Learn: Get-VHD Hyper-V cmdlet: https://learn.microsoft.com/powershell/module/hyper-v/get-vhd
- Microsoft Learn: New-VHD Hyper-V cmdlet: https://learn.microsoft.com/powershell/module/hyper-v/new-vhd
- Microsoft Learn: Add-VMHardDiskDrive Hyper-V cmdlet: https://learn.microsoft.com/powershell/module/hyper-v/add-vmharddiskdrive
- Microsoft Learn: Online Virtual Hard Disk Resizing Overview: https://learn.microsoft.com/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/dn282286(v=ws.11)
- Red Hat Customer Portal: How to rescan the SCSI bus to add or remove a SCSI device without rebooting the computer: https://access.redhat.com/solutions/3941
- Red Hat Customer Portal: What is growpart utility and how to use it?: https://access.redhat.com/solutions/5540131
- Red Hat Enterprise Linux 8 documentation: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_logical_volumes/
- Red Hat Enterprise Linux 9 documentation: Increasing the size of an XFS file system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/increasing-the-size-of-an-xfs-file-system_managing-file-systems
- Local command help: `growpart --help`

## Issues Found
- The post implied that online VHDX resizing is generally available on newer Hyper-V versions. Microsoft documents that online resize requires a VHDX attached to a SCSI controller, so the text now states that requirement explicitly.
- The new-disk Hyper-V example did not specify the SCSI controller. The PowerShell example now uses `-ControllerType SCSI`, matching the online storage workflow used by the guest rescan command.
- The no-downtime and data-preservation wording was too absolute. The description and introduction now clarify that those statements depend on meeting online resize requirements and applying the steps to the correct disk and volume.

## Review Notes
The LVM and filesystem commands are valid for a typical RHEL installation using LVM on `/dev/sda3`, a root logical volume at `/dev/mapper/rhel-root`, and XFS mounted at `/`. Future improvements could mention checking the actual partition number, volume group name, logical volume path, and filesystem type with `lsblk -f`, `pvs`, and `lvs` before running the commands.
