# Validation Summary: What Data Can You Safely Store on an Azure VM Temporary Disk?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Microsoft Azure Virtual Machines
- Azure managed disks and local temporary storage
- Azure Virtual Machine Scale Sets
- Azure Spot Virtual Machines
- Azure ephemeral OS disks
- Azure Backup and encryption at host
- Azure Linux Agent (`waagent`) and cloud-init
- Linux `lsblk` and `findmnt` utilities
- Windows page files, Linux swap, and SQL Server `tempdb`

## Sources Consulted

- [Ephemeral OS disks and local temporary storage](https://learn.microsoft.com/en-us/azure/virtual-machines/ephemeral-os-disks)
- [Format and mount temporary disks on Azure Linux VMs](https://learn.microsoft.com/en-us/azure/virtual-machines/linux/disks-format-mount-temp-disks-linux)
- [Temporary NVMe disks FAQ](https://learn.microsoft.com/en-us/azure/virtual-machines/enable-nvme-temp-faqs)
- [Azure VM sizes with no local temporary disk](https://learn.microsoft.com/en-us/azure/virtual-machines/azure-vms-no-temp-disk)
- [Use the D: drive as a data drive on a Windows VM](https://learn.microsoft.com/en-us/azure/virtual-machines/windows/change-drive-letter)
- [Maintenance for Azure virtual machines](https://learn.microsoft.com/en-us/azure/virtual-machines/maintenance-and-updates)
- [Frequently asked questions about Azure VM disks](https://learn.microsoft.com/en-us/azure/virtual-machines/faq-for-disks)
- [Redeploy a Windows VM to a new Azure node](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/redeploy-to-new-node-windows)
- [Automatic instance repairs with Azure Virtual Machine Scale Sets](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-automatic-instance-repairs)
- [Reimage a virtual machine in a scale set](https://learn.microsoft.com/en-us/azure/virtual-machine-scale-sets/virtual-machine-scale-sets-reimage-virtual-machine)
- [Azure Spot Virtual Machines](https://learn.microsoft.com/en-us/azure/virtual-machines/spot-vms)
- [Azure Linux VM Agent overview](https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/agent-linux)
- [Create a swap file for an Azure Linux VM](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/create-swap-file-linux-vm)
- [Place SQL Server tempdb on ephemeral storage](https://learn.microsoft.com/en-us/azure/azure-sql/virtual-machines/windows/tempdb-ephemeral-storage)
- [Server-side encryption of Azure managed disks](https://learn.microsoft.com/en-us/azure/virtual-machines/disk-encryption)
- [Azure VM Backup FAQ](https://learn.microsoft.com/en-us/azure/backup/backup-azure-vm-backup-faq)
- [`lsblk(8)` manual](https://man7.org/linux/man-pages/man8/lsblk.8.html)
- [`findmnt(8)` manual](https://man7.org/linux/man-pages/man8/findmnt.8.html)

## Issues Found

- The lifecycle list grouped all scale-set reimage and healing operations as events that can erase temporary storage. Current Azure Virtual Machine Scale Sets documentation states that the default `Replace` automatic-repair action does not preserve the local temporary disk, while the `Reimage` and `Restart` actions do preserve it for instances with persistent OS disks. The list now names scale-set replacement or another repair action that recreates the instance. It separately identifies reimaging a VM that uses an ephemeral OS disk, for which Azure documents that local data is lost.

## Review Notes

- Windows page-file placement varies by VM generation and storage interface. The post's qualified wording ("commonly" and "often") is accurate: many SCSI-based Marketplace images use the temporary disk, while newer temporary-NVMe VM families can place the page file on the persistent OS disk by default.
- The `lsblk` and `findmnt` commands are syntactically valid. The selected `lsblk` columns are appropriate for interactive disk identification, and `findmnt` with no operands lists mounted filesystems.
- All external links in the post returned successful HTTP responses during validation.
