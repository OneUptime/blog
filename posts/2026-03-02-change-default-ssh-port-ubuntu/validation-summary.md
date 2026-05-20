# Validation Summary: How to Change the Default SSH Port on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- OpenSSH server and client
- sshd_config
- UFW
- iptables and netfilter-persistent
- systemd
- AppArmor
- scp, rsync, and sftp

## Sources Consulted
- Ubuntu Server documentation: OpenSSH server - https://ubuntu.com/server/docs/how-to/security/openssh-server/
- Ubuntu manpage: sshd_config(5) - https://manpages.ubuntu.com/manpages/questing/man5/sshd_config.5.html
- Ubuntu Server documentation: Firewalls / UFW - https://ubuntu.com/server/docs/how-to/security/firewalls/
- Local Ubuntu manpages: ssh(1), scp(1), sftp(1), sshd(8), sshd_config(5), ufw(8)
- Local command help: iptables --help, ufw --help

## Issues Found
- The "Creating a Systemd Drop-in for Port Persistence" section recommended overriding the packaged `ssh.service` `ExecStart` command. This is unnecessary and risky on Ubuntu because the packaged service already starts `sshd` with its normal configuration path, and Ubuntu documents `/etc/ssh/sshd_config.d/` snippets as the preferred way to keep local OpenSSH configuration separate from package defaults. Changed the section to create `/etc/ssh/sshd_config.d/99-custom-port.conf`, validate with `sshd -t`, and restart `ssh`. Also updated the revert commands to remove that snippet if it was created.
- The logging section said `grep "Invalid user" /var/log/auth.log | wc -l` counted failed attempts on the new port. That command counts matching invalid-user log entries, not specifically attempts to the new local SSH port. Updated the comment to accurately describe what the command does.

## Review Notes
The remaining commands and configuration examples were technically valid: `Port` supports multiple entries, `ListenAddress` supports address-and-port forms, Ubuntu uses `systemctl restart ssh.service` / `ssh`, UFW supports simple port rules and comments, `iptables -A INPUT -p tcp --dport 2222 -j ACCEPT` is syntactically valid, and the documented `ssh`, `scp`, and `sftp` port flags are correct.
