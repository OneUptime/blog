# Validation Summary: How to Rebuild the Initramfs After Kernel Module Changes on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- dracut
- initramfs
- lsinitrd
- Linux kernel modules
- DKMS
- LVM, LUKS, multipath, and boot storage configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing, monitoring, and updating the kernel": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_monitoring_and_updating_the_kernel/
- Red Hat Enterprise Linux 9 documentation, "Automatically installing RHEL" IBM Z initramfs/zipl warning: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automatically_installing_rhel/
- dracut(8) Linux manual page: https://man7.org/linux/man-pages/man8/dracut.8.html
- dkms(8) manual page: https://manpages.debian.org/stretch/dkms/dkms.8.en.html

## Issues Found
- The introduction said DKMS-managed module changes always require rebuilding initramfs. Changed this to DKMS-managed modules needed during early boot, because modules not used for early boot do not need to be included in initramfs.
- The DKMS section implied `REMAKE_INITRD=yes` is the expected automatic rebuild mechanism. Reworded this to say some DKMS packages rebuild from package hooks or DKMS configuration and that users should verify package behavior.
- The LUKS example checked for `cryptsetup` before running the rebuild command. Reordered the example so it rebuilds first, then verifies the generated image.
- The automated script treated `xfs` and `dm_mod` as universally essential modules and searched literally for `dm_mod`, which can miss `dm-mod.ko` paths in initramfs output. Changed this to expected host-specific patterns and used `grep -E` with `dm[-_]mod`.
- Added the Red Hat documented IBM Z / s390x caveat to run `zipl` after manual initramfs regeneration.

## Review Notes
The core dracut commands, `--force` usage, explicit image/kernel arguments, and `lsinitrd` verification examples are consistent with Red Hat and dracut documentation. `dracut --regenerate-all` is available in dracut as an alternative to looping over `/lib/modules`, but the loop shown in the post is still technically valid.
