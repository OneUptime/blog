# Validation Summary: How to Reset the Root Password on RHEL When Locked Out

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GRUB 2
- dracut `rd.break`
- `chroot`
- `passwd`
- SELinux relabeling and `restorecon`
- RHEL rescue mode
- Linux audit and journald commands

## Sources Consulted
- Red Hat Enterprise Linux 9, Configuring basic system settings, "Resetting the root password": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_basic_system_settings/changing-and-resetting-the-root-password-from-the-command-line_managing-users-and-groups
- Red Hat Enterprise Linux 9, Managing, monitoring, and updating the kernel, "Understanding boot entries" and GRUB kernel command-line editing: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9, Interactively installing RHEL over the network, "Using rescue mode": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/interactively_installing_rhel_over_the_network/troubleshooting-after-installation_rhel-installer
- Red Hat Enterprise Linux 8, Managing, monitoring, and updating the kernel, `rd.break` root password reset and `restorecon` SELinux context recovery guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/managing_monitoring_and_updating_the_kernel/index
- Linux audit `ausearch(8)` manual page: https://man7.org/linux/man-pages/man8/ausearch.8.html

## Issues Found
- The GRUB interruption instruction said to press any key to stop the countdown. Red Hat's RHEL 9 guidance specifies any key except `Enter`, because `Enter` starts the highlighted boot entry. Updated the sentence to say "press any key except `Enter`."
- The rescue-mode alternative used `/mnt/sysimage` for the mounted installed system and chroot path. Current RHEL 9 rescue-mode documentation mounts the target system at `/mnt/sysroot` and recommends using `/mnt/sysroot` for `chroot`. Updated both rescue-mode steps accordingly.

## Review Notes
The primary `rd.break`, `mount -o remount,rw /sysroot`, `chroot /sysroot`, `passwd`, `touch /.autorelabel`, and exit flow matches Red Hat's RHEL 9 root-password reset procedure. The `linux`/`linuxefi` note is consistent with Red Hat GRUB documentation for BIOS and UEFI systems. The `ausearch -m AVC -ts recent` usage is valid according to the `ausearch(8)` manual.
