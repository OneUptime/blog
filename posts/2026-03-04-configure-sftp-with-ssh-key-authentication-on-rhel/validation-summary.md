# Validation Summary: How to Configure SFTP with SSH Key Authentication on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- OpenSSH server (`sshd`)
- SFTP
- SSH key authentication
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 10 documentation: "Setting key-based authentication as the only method on an OpenSSH server" - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/securing_networks/setting-key-based-authentication-as-the-only-method-on-an-openssh-server
- Red Hat Enterprise Linux 7 System Administrator's Guide, Chapter 12 OpenSSH - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-openssh
- OpenSSH `sshd_config(5)` manual page
- OpenSSH `sftp(1)` manual page
- OpenSSH `ssh-keygen(1)` manual page
- firewalld `firewall-cmd` manual page - https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The SSHD configuration disabled `PasswordAuthentication` but did not disable keyboard-interactive authentication. With PAM enabled, keyboard-interactive authentication can provide an equivalent password-based login path. Added `KbdInteractiveAuthentication no` to the `Match User sftpuser` block so the configuration accurately enforces key-only access.
- The SSHD configuration showed `Subsystem sftp internal-sftp` without clarifying that most RHEL/OpenSSH installations already have a `Subsystem sftp` line. Adding a duplicate subsystem line can make `sshd -t` fail. Changed the instruction to replace the existing `Subsystem sftp` line with the `internal-sftp` version.

## Review Notes
The commands and options for `ssh-keygen`, `sftp -i`, `sftp -b`, `sshd -t`, `systemctl restart sshd`, and `firewall-cmd --permanent --add-service=ssh` are valid. The post intentionally does not configure a chroot, so the sample `/uploads` directory must exist and be accessible to the SFTP user for that batch example to work.
