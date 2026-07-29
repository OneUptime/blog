# Validation Summary: Recover an Azure Linux VM After fstab, GRUB, or Kernel Failure

## Status
validated

## Post Type
Troubleshooting and disaster-recovery guide

## Technologies Covered
- Microsoft Azure Virtual Machines
- Azure Boot diagnostics
- Azure Serial Console
- Azure CLI and the `vm-repair` extension
- Azure Linux Auto Repair (ALAR)
- Linux `/etc/fstab`, UUID-based mounts, and `mount`
- GRUB and UEFI/EFI boot configuration
- Linux kernels and initramfs/initrd
- Hyper-V Linux drivers
- Linux chroot recovery environments
- Logical Volume Manager (LVM)
- ext2, ext3, ext4, and XFS filesystem repair
- systemd and journald

## Sources Consulted
- Microsoft Learn: Azure CLI `az vm boot-diagnostics` reference - https://learn.microsoft.com/en-us/cli/azure/vm/boot-diagnostics?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az extension` reference - https://learn.microsoft.com/en-us/cli/azure/extension?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az vm repair` reference - https://learn.microsoft.com/en-us/cli/azure/vm/repair?view=azure-cli-latest
- Microsoft Learn: Troubleshoot Linux VM boot issues due to fstab errors - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/linux-virtual-machine-cannot-start-fstab-errors
- Microsoft Learn: Use Azure Linux Auto Repair (ALAR) to fix a Linux VM - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/repair-linux-vm-using-alar
- Microsoft Learn: Repair a Linux VM by using Azure Virtual Machine repair commands - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/repair-linux-vm-using-azure-virtual-machine-repair-commands
- Microsoft Learn: Troubleshoot Azure Linux virtual machine boot errors - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/boot-error-troubleshoot-linux
- Microsoft Learn: Troubleshoot Azure VM allocation failures - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/allocation-failure
- Microsoft Learn: Azure Linux virtual machine fails to boot after applying kernel changes - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/kernel-related-boot-issues
- Microsoft Learn: Troubleshoot LIS/Hyper-V driver issues on Linux virtual machines - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/troubleshoot-lis-driver-issues-on-linux-vms
- Microsoft Learn: Azure Serial Console for Linux - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/serial-console-linux
- Microsoft Learn: Troubleshoot Linux VM device name changes in Azure - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/troubleshoot-device-names-problems
- Microsoft Learn: How to troubleshoot the chroot environment in a Linux rescue VM - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/chroot-environment-linux
- Microsoft Learn: Use a Linux troubleshooting VM with the Azure CLI - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/troubleshoot-recovery-disks-linux
- Microsoft Learn: Troubleshoot Linux VM boot issues due to filesystem errors - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/linux-recovery-cannot-start-file-system-errors
- Azure ALAR repository and action documentation - https://github.com/Azure/ALAR
- util-linux `lsblk(8)` manual - https://man7.org/linux/man-pages/man8/lsblk.8.html
- util-linux `findmnt(8)` manual - https://man7.org/linux/man-pages/man8/findmnt.8.html
- e2fsprogs `e2fsck(8)` manual - https://man7.org/linux/man-pages/man8/e2fsck.8.html
- xfsprogs `xfs_repair(8)` manual - https://man7.org/linux/man-pages/man8/xfs_repair.8.html

## Issues Found
- The extension setup block unconditionally ran both `az extension add` and `az extension update`. The add command can fail when the extension is already installed, while the current Azure CLI provides `az extension add --upgrade` specifically to install an absent extension or update an installed one. Replaced the two commands with `az extension add --name vm-repair --upgrade`.
- The disk-discovery command requested the `MOUNTPOINTS` column, which was added in newer util-linux releases and is unavailable on some older Linux distributions that can be encountered during Azure recovery. Replaced it with the broadly supported `MOUNTPOINT` column; this retains the information needed to distinguish mounted rescue-VM storage from the copied disk.
- The illustrative chroot snippet assumed `/mnt/repair` already existed and bind-mounted `/dev` without separately mounting `/dev/pts`. Added creation of the repair mountpoint and changed the virtual-filesystem mounts to the documented proc, sysfs, `/dev`, `/dev/pts`, and `/run` sequence so terminal- and package-related operations work correctly inside the chroot.
- The filesystem guidance referred generically to "ext filesystems." Clarified that `e2fsck` applies to ext2, ext3, and ext4, matching the tool's documented scope.

## Review Notes
The Boot diagnostics, `az vm repair create/run/restore`, and ALAR examples match the current Azure CLI and Microsoft ALAR documentation. The listed ALAR action names and comma-separated action syntax are current. The post correctly warns that device layouts, LVM collisions, XFS, Btrfs, encryption, mdraid, firmware generation, and distribution-specific boot tooling require tailored handling.

Azure Serial Console also requires working Boot diagnostics, suitable Azure RBAC permissions, an Azure Resource Manager VM, and normally a password-authenticated guest account. VM repair scripts require outbound HTTPS connectivity from the repair VM and sufficient resource-group permissions. These operational prerequisites do not invalidate the recovery workflow, but should be confirmed before an incident.
