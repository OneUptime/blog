# Validation Summary: How to Install and Apply kpatch Patches Without Rebooting on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- kpatch
- DNF
- RPM
- Linux kernel live patching
- dnf-automatic
- systemd timers

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Applying patches with kernel live patching": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/applying-patches-with-kernel-live-patching_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation, "Installing security updates automatically": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_and_monitoring_security_updates/installing-security-updates_managing-and-monitoring-security-updates
- DNF documentation, "DNF Automatic": https://dnf.readthedocs.io/en/stable/automatic.html

## Issues Found
- The kernel variable comment claimed it removed the architecture, but `KVER=$(uname -r)` stores the full kernel release including architecture. Updated the comment to match the command.
- The kpatch package search command tried to construct an RPM name with `sed`, but the transformation did not match Red Hat's documented workflow and could miss the correct package. Replaced it with `dnf search "$(uname -r)"`, which Red Hat documents for finding the matching live patch package.
- The install examples manually constructed `kpatch-patch` package names and included an incorrect `-el9_3` name suffix. Replaced the install commands with `dnf install "kpatch-patch = $(uname -r)"`, the documented DNF package match syntax.
- The RPM query examples used the same incorrect manually constructed package name. Updated the examples to use the corrected package-name form for the shown kernel.
- The update command used a shell glob for `kpatch-patch*`. Replaced it with `dnf update "kpatch-patch"`, matching Red Hat's documented command for updating all installed kernel patch modules.
- The dnf-automatic timer used `dnf-automatic.timer`; Red Hat's security-update procedure enables `dnf-automatic-install.timer` for automatic installation. Updated the command accordingly.

## Review Notes
The post is technically valid after correction. Future improvements could mention `kpatch-dnf` and `dnf kpatch auto` for automatically subscribing future kernels to the live patch stream, but that is an enhancement rather than a required correction to this workflow.
