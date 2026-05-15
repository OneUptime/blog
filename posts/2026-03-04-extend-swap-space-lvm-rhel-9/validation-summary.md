# Validation Summary: How to Extend Swap Space Using LVM on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux swap
- LVM2 logical volumes and volume groups
- `/etc/fstab`
- systemd mount and swap units
- SELinux file context restoration

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Getting started with swap": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/getting-started-with-swap_managing-storage-devices
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing logical volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Linux man-pages, `mkswap(8)`: https://man7.org/linux/man-pages/man8/mkswap.8.html
- Linux man-pages, `swapon(8)` / `swapoff(8)`: https://man7.org/linux/man-pages/man8/swapon.8.html
- Linux man-pages, `fstab(5)`: https://man7.org/linux/man-pages/man5/fstab.5.html
- Linux man-pages, `lvcreate(8)` and `vgextend(8)`: https://man7.org/linux/man-pages/man8/lvcreate.8.html and https://man7.org/linux/man-pages/man8/vgextend.8.html

## Issues Found
- Added `systemctl daemon-reload` after creating or changing `/etc/fstab` swap entries. Red Hat's RHEL 9 swap documentation includes this step so systemd regenerates its mount and swap units after fstab changes.
- Replaced the cheat-sheet `sed` command for updating a swap UUID with a safer expression that only changes the leading `UUID=` field on swap lines and preserves the rest of the fstab entry. The original command was broad and could alter more of the line than intended.

## Review Notes
- The main procedure is consistent with Red Hat's documented RHEL 9 flow for extending swap on an LVM2 logical volume: `swapoff`, resize the LV, `mkswap`, and `swapon`.
- The post uses `lvextend` while Red Hat's swap-specific example uses `lvresize`; this is acceptable for growth because Red Hat's LVM documentation documents `lvextend` for extending logical volumes.
