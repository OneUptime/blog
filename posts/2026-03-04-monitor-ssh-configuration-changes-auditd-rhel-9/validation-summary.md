# Validation Summary: How to Monitor SSH Configuration Changes with auditd on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux Audit framework
- auditd
- auditctl
- augenrules
- ausearch
- OpenSSH server and client configuration
- Bash
- systemd journal logging

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Auditing the system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/auditing-the-system_security-hardening
- Red Hat Enterprise Linux 9 "Considerations in adopting RHEL 9", OpenSSH server drop-in configuration: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/considerations_in_adopting_rhel_9/assembly_security_considerations-in-adopting-rhel-9
- Red Hat Enterprise Linux 9 "Configuring the OpenSSH server and client by using RHEL system roles": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-secure-communication-by-using-the-ssh-and-sshd-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- `auditctl(8)` manual page from the Linux audit userspace package: https://man7.org/linux/man-pages/man8/auditctl.8.html
- `audit.rules(7)` manual page from the Linux audit userspace package: https://man7.org/linux/man-pages/man7/audit.rules.7.html
- `ausearch(8)` manual page from the Linux audit userspace package: https://man7.org/linux/man-pages/man8/ausearch.8.html

## Issues Found
- The rules file watched `/etc/systemd/system/sshd.service`, which is not present on a default RHEL system unless an administrator has copied or replaced the packaged unit. Because audit watch paths must exist, this could cause rule loading to fail. Removed that file watch and added a command to create and monitor the local drop-in directory instead.
- The authorized keys example watched `/etc/ssh/authorized_keys/` even though that directory is only valid when a site has configured a matching `AuthorizedKeysFile` path. Removed the unconditional watch and added a note to add it only after confirming that configured directory exists.
- The root authorized keys example watched `/root/.ssh/`, which can be absent on a fresh system. Added an `install -d` command so the sample rule has an existing directory to watch.
- The alert script stored only `HH:MM:SS` as its last check time. That can miss events across date boundaries and is less robust than the audit tool's checkpoint support. Updated it to use `ausearch --checkpoint`.

## Review Notes
The post uses audit watch rules with `-w`, which Red Hat documentation still uses for simple file-change examples. The upstream audit manual notes that syscall-style path or directory rules are preferred for performance in larger policies, so a future enhancement could convert the examples to `-a always,exit -F arch=... -F path=... -F perm=...` or `-F dir=...` syntax.
