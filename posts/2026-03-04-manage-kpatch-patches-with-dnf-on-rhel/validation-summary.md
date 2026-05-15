# Validation Summary: How to Manage kpatch Patches with DNF on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- kpatch kernel live patching
- DNF and kpatch-dnf
- dnf-automatic
- subscription-manager
- RPM package queries and changelogs

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Applying patches with kernel live patching: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/applying-patches-with-kernel-live-patching_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 9 documentation: Managing, monitoring, and updating the kernel: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_monitoring_and_updating_the_kernel/index
- Red Hat Enterprise Linux 9 documentation: Automating software updates in RHEL 9: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_automating-software-updates-in-rhel-9_managing-software-with-the-dnf-tool

## Issues Found
- The post referenced `rhel-9-for-x86_64-livepatch-rpms` as a live patching repository. Red Hat's current RHEL 9 documentation describes kpatch packages as RPMs from Red Hat repositories and uses the `kpatch-dnf` plugin to subscribe supported kernels to live patches, so the setup command was changed to install `kpatch` and `kpatch-dnf`, then run `dnf kpatch auto`.
- The post generated kpatch package names by rewriting `uname -r`, producing names such as `kpatch-patch-5_14_0-362_8_1-el9_3`. Red Hat documents package names such as `kpatch-patch-5_14_0-362_8_1` with the `el9_3` value in the package version-release, not in the package name. Example package references were corrected.
- The install and update commands used manually constructed package names or globs. Red Hat documents `dnf install "kpatch-patch = $(uname -r)"` and `dnf update "kpatch-patch = $(uname -r)"` for the running kernel, so those commands were updated.
- The removal section said removing the package unloads the module immediately. Red Hat documents that the running kernel remains patched until the next reboot after package removal, so the removal note was corrected to verify after reboot.

## Review Notes
The `dnf-automatic` configuration is valid for applying security updates through DNF, but kpatch support for future kernels is handled by the `kpatch-dnf` subscription workflow. Empty `kpatch-patch` packages can be installed when no live patch exists yet, and `kpatch list` does not show empty packages.
