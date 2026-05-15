# Validation Summary: How to Boot RHEL into Rescue Mode for System Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd targets (`rescue.target`, `emergency.target`)
- GRUB boot parameter editing
- Linux recovery commands (`systemctl`, `journalctl`, `mount`, `dnf`, `passwd`)
- NetworkManager

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing systemd and booting to rescue mode: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Changing and resetting the root password: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_basic_system_settings/index
- Red Hat Enterprise Linux 9 documentation: Considerations in adopting RHEL 9, NetworkManager and network scripts: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_networking_considerations-in-adopting-rhel-9
- systemd.special manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.special
- Local command help and unit definitions for `systemctl`, `journalctl`, `mount`, `rescue.target`, `rescue.service`, `emergency.target`, and `emergency.service`.

## Issues Found
- The post said rescue mode makes networking available and the diagram implied networking is active. Red Hat documents that rescue mode does not activate network interfaces, so the text and diagram now say network interfaces are not activated by default and can be started manually if needed.
- The GRUB instructions and example mentioned `linuxefi`. RHEL 9 documentation shows editing the `linux` line, so the instructions and example now use `linux`.
- The post said the rescue shell password was not required when booting from a GRUB edit. The systemd rescue service uses a sulogin rescue shell, so the post now says a root password prompt is expected.
- The post described local and root filesystem mounts too absolutely. Red Hat documents that rescue mode attempts to mount local filesystems, so the wording now accounts for mount failures and says root is typically remounted read-write unless a problem prevents it.
- The package reinstall example started both `NetworkManager` and `network`. RHEL 9 uses NetworkManager and no longer includes the legacy network-scripts package by default, so the `systemctl start network` line was removed.
- The root password reset example could imply it works without authenticating. The comment now clarifies that `passwd root` applies after authenticating to the rescue shell.

## Review Notes
The remaining commands are syntactically valid for the described recovery tasks. For a truly forgotten root password where the administrator cannot authenticate to rescue mode, RHEL's documented process uses `rd.break`, remounting `/sysroot`, `chroot`, `passwd`, and SELinux relabeling; that is adjacent to this article but outside its current rescue-mode focus.
