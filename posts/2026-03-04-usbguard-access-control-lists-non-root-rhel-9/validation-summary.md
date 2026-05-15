# Validation Summary: How to Configure USBGuard Access Control Lists for Non-Root Users on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- USBGuard
- USBGuard IPC access control files
- Linux users and groups
- systemd and journalctl

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Authorizing users and groups to use the USBGuard IPC interface": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- USBGuard configuration documentation, "IPC ACCESS CONTROL": https://usbguard.github.io/documentation/configuration
- USBGuard `usbguard-daemon.conf(5)` manual page: https://www.mankier.com/5/usbguard-daemon.conf
- USBGuard `usbguard(1)` manual page: https://www.mankier.com/1/usbguard

## Issues Found
No technical issues found.

## Review Notes
The post's examples use manual ACL files instead of the `usbguard add-user` helper. That is supported by the USBGuard configuration documentation as long as `IPCAccessControlFiles` points to the ACL directory and the files have mode `0600`. The RHEL documentation also documents `usbguard add-user` as an alternative workflow.
