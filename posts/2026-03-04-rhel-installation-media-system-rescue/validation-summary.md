# Validation Summary: How to Use the RHEL Installation Media for System Rescue

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux rescue mode
- GRUB2 bootloader recovery
- dracut/initramfs rebuilding
- XFS and ext4 filesystem repair
- SELinux relabeling and permissive mode
- LVM volume activation and mounting
- NetworkManager/nmcli networking

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using rescue mode, `/mnt/sysroot`, `chroot`, and manual LVM mounting: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_from_installation_media/troubleshooting-after-installation_rhel-installer
- Red Hat Enterprise Linux 9 documentation: Reinstalling GRUB and current `grub2-mkconfig` path for BIOS and UEFI systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_monitoring_and_updating_the_kernel/updating-the-secure-boot-revocation-list_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 8 documentation: Reinstalling GRUB and older UEFI `grub2-mkconfig` path: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/managing_monitoring_and_updating_the_kernel/index
- Red Hat Enterprise Linux 8 documentation: Checking and repairing XFS and ext2/ext3/ext4 file systems: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_file_systems/checking-and-repairing-a-file-system__managing-file-systems
- Red Hat Enterprise Linux 9 documentation: `dhclient` deprecation and NetworkManager DHCP behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.5_release_notes/deprecated-functionalities
- Red Hat Enterprise Linux 9 documentation: Configuring Ethernet connections with `nmcli`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-an-ethernet-connection_configuring-and-managing-networking
- Red Hat Enterprise Linux SELinux documentation: SELinux enforcing/permissive configuration values: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/changing-selinux-states-and-modes_using-selinux

## Issues Found
- The UEFI GRUB recovery commands used package names and a `grub2-mkconfig` output path that are not correct for current RHEL releases. Updated the package reinstall command to use the documented `grub2-efi`, `shim`, `grub2-tools`, and `grub2-common` packages, and added separate `grub2-mkconfig` commands for RHEL 9 and later versus RHEL 8 and earlier.
- The networking example used `dhclient`, which is deprecated in RHEL 9 and not distributed in later major releases. Replaced it with `nmcli` commands to list NetworkManager profiles and bring up a wired profile.

## Review Notes
The filesystem repair examples are valid as short examples, but real rescue work should identify the actual block devices and account for separate `/boot`, `/boot/efi`, LVM, encrypted devices, and the XFS dirty-log workflow documented by Red Hat.
