# Validation Summary: How to Check and Change SELinux Modes (Enforcing, Permissive, Disabled) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux modes and states
- SELinux command-line tools: `getenforce`, `sestatus`, `setenforce`, `semanage`, `ausearch`, `fixfiles`
- RHEL boot kernel parameters and `grubby`
- `/etc/selinux/config`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Changing SELinux states and modes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/changing-selinux-states-and-modes_using-selinux
- Red Hat Enterprise Linux 9 documentation: Using SELinux, troubleshooting and audit log guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- Linux man-pages: `setenforce(8)`: https://man7.org/linux/man-pages/man8/setenforce.8.html
- Linux man-pages: `semanage-permissive(8)`: https://man7.org/linux/man-pages/man8/semanage-permissive.8.html

## Issues Found
- The post said SELinux could be disabled permanently on RHEL 9 by setting `SELINUX=disabled` in `/etc/selinux/config`. RHEL 9 documentation uses the `selinux=0` kernel parameter through `grubby` for disabling SELinux, so the command was changed to `sudo grubby --update-kernel ALL --args selinux=0`.
- The re-enable procedure used `sudo touch /.autorelabel`. Red Hat documents `fixfiles -F onboot` so the relabel trigger includes the `-F` option; the command was changed to `sudo fixfiles -F onboot`.
- The re-enable procedure did not remove `selinux=0` or explicitly ensure a permissive boot before relabeling. Red Hat recommends removing the disabled kernel parameter and booting permissive for relabeling, so `grubby` commands were added to remove `selinux` and add `enforcing=0`.
- The final switch back to enforcing did not remove the permissive boot override. A `grubby --remove-args enforcing` command was added before the final reboot.

## Review Notes
The remaining commands and explanations match the RHEL 9 documentation: `getenforce` and `sestatus` report current mode, `setenforce 0` and `setenforce 1` switch temporarily between permissive and enforcing, `/etc/selinux/config` controls persistent enforcing/permissive mode, `semanage permissive -a httpd_t` configures a permissive domain, and `ausearch` is appropriate for checking SELinux AVC/audit messages.
