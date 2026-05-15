# Validation Summary: How to Resolve 'Kernel Panic - Not Syncing' Boot Errors on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel boot process
- GRUB 2 and grubby
- dracut and initramfs
- XFS and ext4 filesystem repair
- LVM rescue recovery

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing, monitoring, and updating the kernel - configuring kernel command-line parameters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 documentation: Managing, monitoring, and updating the kernel - setting a kernel as default: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/setting-a-kernel-as-default_assembly_the-linux-kernel
- Red Hat Enterprise Linux 9 documentation: Managing file systems - checking and repairing a file system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/checking-and-repairing-a-file-system__managing-file-systems
- Red Hat Enterprise Linux 9 documentation: Interactively installing RHEL over the network - rescue mode and chroot path: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/interactively_installing_rhel_over_the_network/Red_Hat_Enterprise_Linux-9-Interactively_installing_RHEL_over_the_network-en-US.pdf
- Red Hat Enterprise Linux 9 documentation: Interactively installing RHEL from installation media - rootfs image is not initramfs troubleshooting: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/interactively_installing_rhel_from_installation_media/index
- dracut(8) manual page: https://man7.org/linux/man-pages/man8/dracut.8.html

## Issues Found
- The post said `uname -r` checks which kernel caused the panic after booting an older kernel. That command reports the currently running kernel, so the comment was changed to say it checks the kernel booted successfully.
- The filesystem repair example used generic `fsck` for the root filesystem before mentioning XFS. On RHEL 9, XFS is common and `fsck.xfs` is only a stub; Red Hat documents `xfs_repair` for XFS and `e2fsck` for ext filesystems. The example now activates LVM first, unmounts the filesystem, uses `e2fsck -f` for ext4, and uses `xfs_repair` for XFS.
- The GRUB root-device example added a new `root=` argument without removing an existing one. The command now removes the existing `root` argument before adding the replacement.
- The rescue mode section used `/mnt/sysimage` for the chroot path. RHEL 9 rescue documentation uses `/mnt/sysroot`, so the path was corrected.

## Review Notes
The commands are intentionally generic examples. Real recovery work should confirm the actual root device, filesystem type, and kernel version before running repair, removal, or bootloader commands.
