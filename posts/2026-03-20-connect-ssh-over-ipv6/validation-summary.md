# Validation Summary: How to Connect to SSH Servers over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH client (`ssh`, `ssh-keyscan`, `ssh-keygen`)
- SCP (OpenSSH `scp`)
- SFTP (OpenSSH `sftp`)
- rsync over SSH
- SSH client configuration (`~/.ssh/config`, `AddressFamily`)
- IPv6 addressing (global addresses, link-local, brackets notation)
- Networking utilities: `dig`, `nc` (netcat), `ip`, `ping6`

## Sources Consulted
- OpenSSH `ssh(1)` man page — https://man.openbsd.org/ssh.1
- OpenSSH `ssh_config(5)` man page (AddressFamily option) — https://man.openbsd.org/ssh_config.5
- OpenSSH `scp(1)` man page (IPv6 bracket requirement) — https://man.openbsd.org/scp.1
- OpenSSH `ssh-keyscan(1)` man page — https://man.openbsd.org/ssh-keyscan.1
- OpenSSH `sftp(1)` man page — https://man.openbsd.org/sftp.1
- rsync(1) man page (`-e` option) — https://download.samba.org/pub/rsync/rsync.1
- RFC 6724 — Default Address Selection for IPv6
- RFC 3986 §3.2.2 — bracketed IPv6 host notation in URIs

## Issues Found
- **SCP examples missing brackets around IPv6 addresses** (lines 87, 90, 93). SCP uses `:` as the host/path separator, so an IPv6 address like `2001:db8::10` written as `user@2001:db8::10:/path` is ambiguous and parses incorrectly. The OpenSSH `scp(1)` man page requires square brackets around IPv6 addresses (e.g., `user@[2001:db8::10]:/path`). The post's own Summary section correctly notes this convention, so the body examples were inconsistent with the author's stated guidance. Updated all three SCP examples to use bracket notation.

## Review Notes
- `ping6` is being phased out in favor of `ping -6` (modern iputils on Linux makes `ping6` a symlink to `ping`, which auto-detects address family). The command still works on most systems, so it was left as-is, but `ping -6` would be more future-proof.
- `AddressFamily any` is the OpenSSH default. The comment "Prefer IPv6 but fall back to IPv4" describes typical resolver behavior on glibc-based systems (per RFC 6724), but `any` itself does not enforce IPv6 preference inside SSH — the order is determined by `getaddrinfo()`. Acceptable as a pragmatic description.
- The `-L "[::1]:8080:localhost:80"` example is correctly bracketed for IPv6 bind addresses in the `bind_address:port:host:hostport` syntax used by `ssh -L`.
- All other commands, flags, and config syntax verified against current OpenSSH documentation.
