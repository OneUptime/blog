# Validation Summary: How to Restrict SSH Access to Specific Users or Groups on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH server (sshd) on Ubuntu
- sshd_config directives: AllowUsers, AllowGroups, DenyUsers, DenyGroups, PermitRootLogin, Match, ForceCommand, AllowTcpForwarding, X11Forwarding, PermitTTY
- Linux user/group management: groupadd, usermod, gpasswd, getent
- systemd service management for ssh.service
- sudoers configuration

## Sources Consulted
- sshd_config(5) man page (OpenSSH)
- sshd(8) man page
- usermod(8), gpasswd(8), getent(1) man pages
- OpenSSH manual pages on openssh.com
- Ubuntu Server documentation for OpenSSH

## Issues Found
No technical issues found.

Verification details:
- The stated evaluation order (`DenyUsers`, `AllowUsers`, `DenyGroups`, `AllowGroups`) matches the sshd_config(5) man page exactly, including the claim that an explicit deny takes priority over an allow.
- The `user@host` pattern syntax for `AllowUsers` (e.g. `bob@192.168.1.100`, `carol@10.0.0.*`) is supported per the PATTERNS section in ssh_config(5).
- All directives shown inside `Match` blocks (`ForceCommand`, `AllowTcpForwarding`, `X11Forwarding`, `PermitTTY`) are valid Match-conditional keywords.
- `Match` criteria used (`User`, `Group`, `Address`) are all listed as available criteria in the man page.
- `sudo sshd -t` is the correct config-test command.
- `sudo systemctl restart ssh` is correct on Ubuntu (`ssh.service` is the canonical unit name; `sshd.service` is an alias).
- `/var/log/auth.log` is the correct location for SSH authentication logs on Ubuntu.
- `getent passwd | awk -F: '$3 >= 1000 {print $1}'` correctly lists regular (non-system) user accounts; UID >= 1000 is the Ubuntu convention.
- `getent group sshusers | cut -d: -f4` correctly extracts the comma-separated member list from the /etc/group format.
- The sudoers line `%sudousers ALL=(ALL:ALL) ALL` is valid syntax.
- `gpasswd -d username sshusers` is the correct command to remove a user from a supplementary group.

## Review Notes
- On Ubuntu 22.10+ and 24.04, sshd is socket-activated (`ssh.socket`). Restarting `ssh.service` still works for configuration changes because the per-connection sshd reads the config on each new connection. The post's restart instructions remain correct in practice.
- The `ForceCommand /usr/bin/rsync --server --daemon .` example is a minimal demonstration of ForceCommand. For real-world restricted rsync access, the `rrsync` wrapper script (shipped with rsync) is generally preferred because it enforces path/operation restrictions. The example as written is technically valid but is more illustrative than production-ready.
- The post correctly recommends `PermitRootLogin no`; on modern Ubuntu the default is `prohibit-password`, so explicitly setting `no` is a meaningful hardening step.
- Whitespace handling note: if the `sshusers` group has no members, the `comm`/`cut`/`tr` pipeline at the end could emit a stray empty line, but this is an edge-case formatting nit, not a correctness issue.
