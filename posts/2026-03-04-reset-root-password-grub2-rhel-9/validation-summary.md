# Validation Summary: How to Reset the Root Password Using GRUB2 on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- GRUB2 boot parameter editing
- initramfs `rd.break` recovery mode
- `chroot`
- `passwd`
- SELinux relabeling
- RHEL installation media rescue mode

## Sources Consulted
- Red Hat Enterprise Linux 9, Configuring basic system settings, "Resetting the root password": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index#resetting-the-root-password_changing-and-resetting-the-root-password-from-the-command-line
- Red Hat Enterprise Linux 9, Configuring basic system settings, temporary GRUB boot changes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index#making-temporary-changes-to-a-grub-menu_managing-systems-using-the-rhel-9-web-console
- Red Hat Enterprise Linux 8, Managing, monitoring, and updating the kernel, "Resetting the root password using an installation disk": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/managing_monitoring_and_updating_the_kernel/index#resetting-the-root-password-using-an-installation-disk_assembly_making-temporary-changes-to-the-grub-menu
- Red Hat Enterprise Linux 8, Managing, monitoring, and updating the kernel, "Resetting the root password using rd.break": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/managing_monitoring_and_updating_the_kernel/index#resetting-the-root-password-using-rdbreak_assembly_making-temporary-changes-to-the-grub-menu

## Issues Found
- The GRUB kernel-line example used `linuxefi`. Red Hat's RHEL 9 documentation shows the editable kernel line beginning with `linux`, so the text and example were updated to match RHEL 9.
- The SELinux explanation said the shadow file was changed "without SELinux context" and that login would always fail without relabeling. This was softened to match Red Hat's guidance that relabeling is required because SELinux context issues can prevent login.
- The verification step only showed SSH root login. Because root SSH login can be disabled by policy or default configuration, the post now says to use console login or SSH only when root SSH login is allowed.
- The installation-media alternative used `touch /.autorelabel`. Red Hat's installation-media rescue procedure removes `/.autorelabel` after changing the password, so the command was changed to `rm -f /.autorelabel` and the final command sequence now exits the chroot and rescue shell.

## Review Notes
The primary `rd.break` workflow is consistent with Red Hat's RHEL 9 documentation: add `rd.break`, boot with `Ctrl+x`, remount `/sysroot` read-write, `chroot /sysroot`, run `passwd`, create `/.autorelabel`, and exit. The post's timing estimate for SELinux relabeling is reasonable, but Red Hat documents it qualitatively as potentially taking a long time rather than giving a fixed range.
