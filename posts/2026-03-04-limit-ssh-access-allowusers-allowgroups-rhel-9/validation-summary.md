# Validation Summary: How to Limit SSH Access with AllowUsers and AllowGroups on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH server (`sshd`)
- `sshd_config` access control directives
- Linux user and group management commands
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 Securing networks documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/securing_networks/securing_networks
- OpenBSD `sshd_config(5)` manual page: https://man.openbsd.org/sshd_config
- Local `sshd_config(5)` manual page for OpenSSH directive behavior and processing order
- Local `groupadd --help`, `usermod --help`, `gpasswd --help`, and `systemctl --help` output

## Issues Found
No technical issues found.

## Review Notes
The OpenSSH directives and examples are valid for RHEL-style OpenSSH server configuration. `AllowUsers`, `AllowGroups`, `DenyUsers`, and `DenyGroups` all require matching access checks to pass when combined, so the warning about testing from a second terminal is important. The `/etc/ssh/sshd_config.d/*.conf` drop-in approach is appropriate for RHEL 9 and later.
