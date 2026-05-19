# Validation Summary: How to Configure systemd Service Hardening on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- systemd service units
- systemd sandboxing and hardening directives
- systemd-analyze security
- Linux capabilities
- seccomp system call filtering
- AppArmor and audit logging

## Sources Consulted
- systemd.exec official manual: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd-analyze official manual: https://www.freedesktop.org/software/systemd/man/systemd-analyze.html
- systemd.resource-control official manual: https://www.freedesktop.org/software/systemd/man/systemd.resource-control.html
- Ubuntu AppArmor documentation: https://ubuntu.com/server/docs/how-to/security/apparmor/
- Local Ubuntu systemd 255 man pages and CLI help: `systemd-analyze --help`, `man systemd.exec`, `man systemd-analyze`, `man systemd.resource-control`

## Issues Found
- The introduction overstated hardening guarantees by saying a service "can't" read outside designated directories, call dangerous syscalls, or escalate privileges. Updated the wording to describe limited access and reduced privilege-escalation paths, matching systemd's documented caveats.
- The `systemd-analyze security` score was described as 0 meaning fully hardened and 10 meaning no hardening. Updated it to match the official wording: an estimated exposure range of 0.0 to 10.0, where low means tight sandboxing and high means very little applied sandboxing.
- The `ProtectSystem=strict` explanation incorrectly said `/run` stays writable by default. Updated it to state that the documented excluded API filesystem subtrees are `/proc`, `/sys`, and `/dev`.
- The `RestrictAddressFamilies=` comment incorrectly described the directive as denying network namespace access. Updated it to describe the allow-list of socket address families.
- The `PrivateNetwork=yes` note incorrectly said it prevents all network access including loopback. Updated it to state that it creates a private network namespace with only the loopback device.
- The stricter `SystemCallFilter=` example could be misread as adding an exact allow list on top of the previous filters. Added an explicit reset before the exact allow-list example.
- The custom service template used deprecated `MemoryLimit=`. Replaced it with `MemoryMax=`, the current cgroup v2 resource-control directive.
- The troubleshooting section used SELinux AVC-oriented `ausearch` examples for file permission denials on an Ubuntu-focused article. Replaced that command with a journal-based AppArmor/audit denial search.

## Review Notes
The post is technically relevant and the remaining commands and configuration directives are valid for modern Ubuntu systemd releases. The nginx hardening example is still a template that must be tested against the exact packaged nginx configuration, paths, modules, and runtime needs before production use.
