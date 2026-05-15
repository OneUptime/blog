# Validation Summary: How to Set Kernel Command-Line Parameters on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel command-line parameters
- GRUB2
- Boot Loader Specification (BLS) entries
- grubby
- sysctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring kernel command-line parameters - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Linux kernel documentation: The kernel's command-line parameters - https://docs.kernel.org/admin-guide/kernel-parameters.html
- Linux kernel documentation: IPv6 module parameters - https://docs.kernel.org/networking/ipv6.html
- Linux kernel documentation: Transparent Hugepage Support - https://docs.kernel.org/admin-guide/mm/transhuge.html
- Linux kernel documentation: Documentation for /proc/sys/kernel/ - https://www.kernel.org/doc/html/latest/admin-guide/sysctl/kernel.html

## Issues Found
- The `/etc/default/grub` section used the older UEFI output path `/boot/efi/EFI/redhat/grub.cfg`. Current RHEL 9 documentation uses `/boot/grub2/grub.cfg` for both BIOS and UEFI GRUB regeneration, and requires `--update-bls-cmdline` to overwrite BLS snippets from `GRUB_CMDLINE_LINUX`. Updated the command and surrounding explanation.
- The post described editing `/etc/default/grub` as the mechanism for all current and future kernels. Current RHEL 9 documentation says `grubby --update-kernel=ALL` updates BLS entries and newer RHEL 9 kernels inherit command-line arguments from the previous kernel, except the documented RHEL 9.0 caveat. Updated the wording to avoid overclaiming and to describe `/etc/default/grub` as GRUB defaults/BLS refresh.
- The huge pages example used `hugepages=1024 hugepagesz=2M`. Kernel documentation describes the pair as `hugepagesz=X hugepages=Y`; updated the example to `hugepagesz=2M hugepages=1024`.
- The `modules_disabled=1` example was shown as a kernel command-line parameter. `modules_disabled` is a `/proc/sys/kernel/` sysctl control, so the example was changed to `sudo sysctl -w kernel.modules_disabled=1`.

## Review Notes
- Most `grubby` examples match Red Hat's RHEL 9 documentation for adding and removing arguments from all or individual boot entries.
- Some tuning parameters, such as `isolcpus`, `intel_pstate=disable`, and `earlyprintk`, are valid but workload-, hardware-, and kernel-build-dependent. They should be tested before production use.
