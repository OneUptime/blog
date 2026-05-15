# Validation Summary: How to Resolve 'Kernel Panic - Not Syncing' Boot Errors on RHEL 9

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GRUB 2
- systemd rescue targets
- dracut and initramfs
- RPM and DNF package management
- SELinux relabeling
- systemd journal logs
- SMART disk health checks

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systemd and booting to rescue/emergency targets: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Managing, monitoring, and updating the kernel, including GRUB configuration and kernel package overview: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_monitoring_and_updating_the_kernel/managing_monitoring_and_updating_the_kernel
- Red Hat Enterprise Linux 9 documentation: Using SELinux and relabeling with `fixfiles -F onboot`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/changing-selinux-states-and-modes_using-selinux
- Red Hat Enterprise Linux 9 documentation: dracut driver configuration examples using `add_drivers` and `dracut -f -v --regenerate-all`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_rhel_9_on_microsoft_azure/assembly_deploying-a-rhel-image-as-a-virtual-machine-on-microsoft-azure_cloud-content-azure
- dracut manual pages for `dracut`, `dracut.conf`, and `lsinitrd`: https://www.mankier.com/8/dracut, https://www.mankier.com/5/dracut.conf, https://www.mankier.com/1/lsinitrd
- RPM manual page for `rpm -q`, `-a`, and `--last`: https://rpm.org/docs/4.19.x/man/rpm.8.html
- systemd `journalctl` manual page for `-b` and `-p`: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- smartmontools `smartctl` documentation: https://www.smartmontools.org/

## Issues Found
- The kernel history command used `rpm -qa kernel --last`. Red Hat documents the install-time query form as `rpm -q --last <package_name>`, so it was changed to `rpm -q kernel --last`.
- The initramfs module check used `grep -i module`, which only lists broad module-related entries and does not verify whether a specific missing driver is present. Changed it to search for `module_name` in the initramfs contents.
- The hardware diagnostics example showed `memtest86+` as if it were a shell or GRUB command. Replaced it with guidance to run a memory test from system firmware or vendor diagnostics.
- The SELinux relabeling example used `touch /.autorelabel`. Red Hat's RHEL 9 guidance recommends `fixfiles -F onboot`, which creates `/.autorelabel` with the `-F` option for the next boot. Updated the command.
- The kernel reinstall example only reinstalled `kernel-core`. RHEL 9 splits the kernel into `kernel-core`, `kernel-modules-core`, and `kernel-modules`; reinstalling all three is more accurate when repairing a potentially corrupted kernel installation. Updated the command.

## Review Notes
The post is technically relevant and the remaining commands are broadly correct for RHEL 9. Some recovery steps still depend on where the panic occurs in the boot sequence; for example, `systemd.unit=rescue.target` helps only after the kernel and initramfs can reach systemd.
