# Validation Summary: How to Create Custom kpatch Kernel Patches on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- kpatch
- kpatch-build
- Linux kernel live patching
- RPM/DNF kernel source and debuginfo packages

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Applying patches with kernel live patching": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/applying-patches-with-kernel-live-patching_assembly_managing-kernel-command-line-parameters-with-uki
- Red Hat Enterprise Linux 10 documentation, "Applying patches with kernel live patching": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_monitoring_and_updating_the_kernel/applying-patches-with-kernel-live-patching
- kpatch upstream README: https://github.com/dynup/kpatch
- kpatch-build upstream man page: https://github.com/dynup/kpatch/blob/master/man/kpatch-build.1
- kpatch upstream installation notes: https://github.com/dynup/kpatch/blob/master/doc/INSTALL.md
- kpatch upstream patch author guide: https://github.com/dynup/kpatch/blob/master/doc/patch-author-guide.md
- kpatch upstream command implementation: https://github.com/dynup/kpatch/blob/master/kpatch/kpatch

## Issues Found
- The `kpatch-build -v` option was incorrectly passed `$(uname -r)`. The upstream `kpatch-build` man page defines `-v|--vmlinux` as the original unstripped `vmlinux` file, so the command now uses `/usr/lib/debug/lib/modules/$(uname -r)/vmlinux`.
- The source RPM download command removed only `.x86_64` from `uname -r`, which is architecture-specific and fragile. It now derives the source RPM name from the installed running kernel package metadata with `rpm -q --qf '%{SOURCERPM}\n' kernel-core-$(uname -r)`.
- The dependency command installed generic `kernel-devel` and `kernel-debuginfo` packages, which can resolve to a kernel version other than the running kernel. It now requests `kernel-devel-$(uname -r)` and `kernel-debuginfo-$(uname -r)` so the build inputs match the target kernel.
- The example patch added `rcu_read_lock()` without a matching `rcu_read_unlock()`, which would be an unsafe kernel change. It was replaced with the upstream kpatch README's harmless `/proc/meminfo` string-change example.

## Review Notes
Custom kpatch modules can be useful, but Red Hat's supported live patch stream is delivered as `kpatch-patch` RPMs and custom patches require kernel-expert review. Upstream kpatch also notes that kpatch is in maintenance mode as Linux 6.19 moves toward `klp-build`, but the RHEL kpatch workflow remains technically relevant for current RHEL kernels.
