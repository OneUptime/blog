# Validation Summary: How to Disable IPv6 on Linux with GRUB Kernel Parameters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel boot parameters
- GRUB 2
- `grubby`
- Ubuntu/Debian system boot configuration
- RHEL/CentOS/Fedora boot configuration
- IPv6 kernel and sysctl behavior

## Sources Consulted
- Linux kernel IPv6 documentation: https://www.kernel.org/doc/html/latest/networking/ipv6.html
- Linux kernel command-line parameter documentation: https://docs.kernel.org/admin-guide/kernel-parameters.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- GNU GRUB manual (`GRUB_CMDLINE_LINUX` and `GRUB_CMDLINE_LINUX_DEFAULT`): https://www.gnu.org/software/grub/manual/grub/grub.html
- Ubuntu `update-grub` man page: https://manpages.ubuntu.com/manpages/questing/man8/update-grub.8.html
- Ubuntu documentation for modifying kernel boot parameters: https://documentation.ubuntu.com/real-time/rt-conf/how-to/modify-kernel-boot-parameters/
- Ubuntu Community Help Wiki (`grub.cfg` regeneration on kernel updates): https://help.ubuntu.com/community/Grub2/Setup
- Red Hat Enterprise Linux 8 kernel management documentation (`grubby --update-kernel=ALL`): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/managing_monitoring_and_updating_the_kernel/
- Red Hat Enterprise Linux 9 kernel command-line documentation (`--update-bls-cmdline` and BLS behavior): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/configuring-kernel-command-line-parameters_managing-monitoring-and-updating-the-kernel
- Red Hat Enterprise Linux 9.3 release notes (`--update-bls-cmdline`): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.3_release_notes/new-features

## Issues Found
- The post said the GRUB method makes IPv6 "completely absent from the kernel". Kernel documentation is narrower: `ipv6.disable=1` disables IPv6 functionality, prevents IPv6 addresses from being added, and prevents opening IPv6 sockets. I changed that wording to avoid overstating what the parameter guarantees.
- The Ubuntu example used `GRUB_CMDLINE_LINUX_DEFAULT`, which GRUB documents as applying only to the default boot entry. I changed the example to `GRUB_CMDLINE_LINUX` so the parameter is applied to all Linux boot entries, matching the post's permanence claim and its own summary.
- The RHEL `grubby` example used `--update-kernel=DEFAULT`, which only targets the default entry. Red Hat documents `--update-kernel=ALL` for updating all boot entries, so I changed the add, verify, and remove examples accordingly.
- The section comparing `ipv6.disable=1` to `ipv6.disable_ipv6_mod=1` used a parameter name that is not documented as a supported kernel parameter. I replaced it with the documented `ipv6.disable_ipv6=1` parameter and corrected the explanation.
- The verification section claimed `sysctl net.ipv6.conf.all.disable_ipv6` "should return 1". Kernel sysctl documentation notes that reading `conf/all/disable_ipv6` is not an authoritative indicator of overall IPv6 state, so I removed that claim and clarified the comment.
- The RHEL `grub2-mkconfig` guidance was incomplete for current releases. I updated it to note the current `/boot/grub2/grub.cfg` path, the `--update-bls-cmdline` requirement on RHEL 9.3+ when propagating `GRUB_CMDLINE_LINUX` into BLS snippets, and the older UEFI path caveat.
- The direct `grub.cfg` inspection example only used the Debian/Ubuntu path. I added the RHEL/CentOS/Fedora `grub2` path so the example matches the distros discussed in the post.
- The re-enable example used a brittle `sed` command that could fail once `ipv6.disable=1` is the first or only kernel argument. I replaced it with a safe manual edit instruction.

## Review Notes
- RHEL 9 has version-specific behavior around BLS handling. The post now notes the `--update-bls-cmdline` requirement for RHEL 9.3+; older RHEL/CentOS UEFI layouts may still use `/boot/efi/EFI/redhat/grub.cfg`.
- Red Hat documents that newly installed kernels inherit previously configured command-line parameters, with a caveat for RHEL 9.0. That edge case is not covered in the post, but the main commands are now aligned with current supported documentation.
