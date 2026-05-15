# Validation Summary: How to Boot from an Older Kernel When the Current Kernel Fails on RHEL

## Status
validated

## Post Type
Tutorial / Recovery guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux kernel packages
- GRUB boot loader
- grubby
- DNF
- RPM
- systemd journal

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing, monitoring, and updating the kernel, "Setting a kernel as default" and kernel command-line parameter procedures: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/
- Red Hat Enterprise Linux 9 documentation: Considerations in adopting RHEL 9, boot loader menu hidden by default and GRUB menu access keys: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_kernel_considerations-in-adopting-rhel-9
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool, configuring DNF and excluding packages from DNF operations: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_configuring-yum_managing-software-with-the-dnf-tool
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool, removing installed packages: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- DNF command reference, command-line `--exclude` behavior: https://dnf.readthedocs.io/en/stable/command_ref.html
- dnf.conf(5) manual page, `installonly_limit` default and minimum: https://www.man7.org/linux/man-pages/man5/dnf.conf.5.html
- Red Hat Customer Portal references for changing the default kernel and removing old kernels on RHEL 8/9/10: https://access.redhat.com/solutions/4326431 and https://access.redhat.com/solutions/1227

## Issues Found
- The permanent DNF exclusion example used `exclude=kernel*` in `/etc/dnf/dnf.conf`. RHEL 9 documentation describes the persistent configuration option as `excludepkgs`, so the command was changed to append `excludepkgs=kernel*`.
- The command for removing the permanent exclusion matched the old setting name. It was updated from matching `^exclude=kernel` to `^excludepkgs=kernel` so it removes the corrected configuration line.

## Review Notes
- The GRUB menu access instructions are accurate for RHEL 9.1 and later; Red Hat also documents repeatedly pressing `F8` as another option, but the existing `Esc` and `Shift` guidance is correct.
- The `grubby --set-default` examples match Red Hat's documented approach. Index-based selection is supported, but administrators should verify the intended index because boot entry ordering can change when kernels are installed or removed.
- The `installonly_limit=5` example is technically valid. In a production guide, editing the existing `[main]` section instead of blindly appending a duplicate option would be cleaner, but the shown setting name and value are correct.
