# Validation Summary: How to Harden SSH on RHEL by Disabling Root Login and Password Authentication

## Status
validated

## Post Type
Tutorial / hardening guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH server
- `sshd_config`
- systemd service management
- SSH public key and password authentication

## Sources Consulted
- Red Hat Enterprise Linux 9 Securing networks documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/securing_networks/securing_networks
- Red Hat Enterprise Linux 9 RHEL system roles OpenSSH documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/automating_system_administration_by_using_rhel_system_roles/configuring-secure-communication-by-using-the-ssh-and-sshd-rhel-system-roles_automating-system-administration-by-using-rhel-system-roles
- OpenSSH `sshd_config(5)` manual page: https://man.openbsd.org/sshd_config
- OpenSSH `sshd(8)` Linux manual page: https://man7.org/linux/man-pages/man8/sshd.8.html
- Rocky Linux 9 / RHEL-compatible `openssh-server-8.7p1` `sshd_config(5)` manual page: https://rpm.pbone.net/manpage_idpl_102653699_numer_5_nazwa_sshd_config.html

## Issues Found
- `ClientAliveCountMax 0` was shown with a comment saying it disconnects idle sessions after 5 minutes. In the OpenSSH/RHEL-compatible manual, a zero `ClientAliveCountMax` disables connection termination. I changed it to `ClientAliveCountMax 1` and changed the comment to say "unresponsive sessions" rather than "idle sessions", because SSH client-alive messages detect an unresponsive client, not normal shell inactivity.
- The additional hardening snippet included `Protocol 2`. RHEL 9-era OpenSSH supports SSH protocol 2 only, and `Protocol` is not listed as a valid `sshd_config` keyword in the RHEL-compatible OpenSSH 8.7 manual. I removed the obsolete directive from the snippet.

## Review Notes
The main guidance for `PermitRootLogin no`, `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitEmptyPasswords no`, drop-in files under `/etc/ssh/sshd_config.d/`, `Match Address` exceptions, `sshd -t`, and `sshd -T` is consistent with Red Hat and OpenSSH documentation. Red Hat recommends `systemctl reload sshd` for many configuration changes; the post uses `restart`, which is also operationally valid but may be more disruptive.
