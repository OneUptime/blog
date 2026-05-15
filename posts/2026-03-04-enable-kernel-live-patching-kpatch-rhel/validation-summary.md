# Validation Summary: How to Enable Kernel Live Patching with kpatch on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- kpatch
- kpatch-dnf
- DNF
- subscription-manager
- Linux kernel live patching

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Applying patches with kernel live patching": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/applying-patches-with-kernel-live-patching_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation, "Managing and monitoring security updates": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_and_monitoring_security_updates/installing-security-updates_managing-and-monitoring-security-updates
- kpatch(1) manual page reference for kpatch subcommands: https://manpages.debian.org/unstable/kpatch/kpatch.1.en.html

## Issues Found
- The prerequisites described `rhel-9-for-x86_64-baseos-rpms` as a kernel live patching repository. Red Hat documents kernel live patch packages as delivered through normal RHEL channels, so the comment was changed to describe enabling BaseOS only if needed.
- The automatic live patching section reinstalled `kpatch-dnf` instead of enabling automatic kpatch subscription. Changed it to `dnf kpatch auto`, which is the Red Hat-documented workflow.
- The command for checking available live patches used a package glob derived from `uname -r` that does not match Red Hat's documented package discovery workflow. Changed it to `dnf search "$(uname -r)"`.
- `kpatch info` was shown without a module argument, but the kpatch command requires a module name. Changed it to a concrete example module name.
- The plugin verification command used `dnf config-manager --dump kpatch-dnf`, which is not the documented kpatch-dnf status check. Changed it to `dnf kpatch status`.
- The removal section suggested unloading a live patch from the running kernel. Red Hat's RHEL 9 documentation states that reverting live patches without rebooting is not supported, so the section now removes the live patch package and reboots before verification.
- The reboot check commands used `needs-restarting` directly. Red Hat's RHEL 9 documentation shows this as the `dnf needs-restarting` subcommand, so both examples were updated.
- The limitations section claimed only critical and important security fixes are provided as live patches. Red Hat documents selected security and bug fixes and notes that not all critical or important CVEs can be addressed, so the wording was corrected.

## Review Notes
The tutorial is RHEL 9-specific because it uses the RHEL 9 BaseOS repository ID and Red Hat's RHEL 9 kpatch-dnf workflow. Live patch availability depends on Red Hat's supported kpatch cadence and the current minor release lifecycle.
