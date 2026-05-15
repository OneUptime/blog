# Validation Summary: How to Load and Unload Kernel Modules on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 kernel modules
- kmod tools: `lsmod`, `modinfo`, `modprobe`, `insmod`, `depmod`
- systemd `modules-load.d` and `systemd-modules-load.service`
- `/etc/modprobe.d/` module option configuration
- DKMS

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing kernel modules": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/managing-kernel-modules_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9 kernel management guide PDF, Chapter 3 "Managing kernel modules": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_monitoring_and_updating_the_kernel/configuring-the-grub-2-boot-loader-by-using-rhel-system-roles_managing-monitoring-and-updating-the-kernel
- systemd `modules-load.d` manual: https://www.freedesktop.org/software/systemd/man/latest/modules-load.d.html
- systemd `systemd-modules-load.service` manual: https://www.freedesktop.org/software/systemd/man/251/systemd-modules-load.html
- Linux man-pages `modprobe(8)`: https://man7.org/linux/man-pages/man8/modprobe.8.html
- Linux man-pages `modinfo(8)`: https://man7.org/linux/man-pages/man8/modinfo.8.html
- Linux man-pages `lsmod(8)`: https://man7.org/linux/man-pages/man8/lsmod.8.html
- Linux man-pages `depmod(8)`: https://man7.org/linux/man-pages/man8/depmod.8.html
- Local `kmod` command help for `modprobe`, `modinfo`, and `depmod`

## Issues Found
- The command for counting loaded modules used `lsmod | wc -l`, which includes the header line. Changed it to `lsmod | tail -n +2 | wc -l` so the count reflects loaded modules only.
- The example for reading a current module parameter used `/sys/module/bridge/parameters/multicast_igmp_version`, which is not a reliable module parameter path for the `bridge` module. Changed it to `/sys/module/bonding/parameters/miimon`, matching the `bonding` examples used earlier in the post.
- The DKMS install example implied `dkms` is directly available on a default RHEL system. Added a note that it must come from EPEL or another repository that provides it.

## Review Notes
Most module-management commands and configuration paths were accurate for RHEL 9 and current `kmod`/systemd behavior. Red Hat's documentation confirms RHEL 9 modules are stored under `/lib/modules/$(uname -r)/kernel/<SUBSYSTEM>/`, use compressed `.ko.xz` object files, are loaded and removed with `modprobe`, and can be configured for boot loading through `/etc/modules-load.d/*.conf`.
