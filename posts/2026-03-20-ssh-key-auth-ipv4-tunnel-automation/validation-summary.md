# Validation Summary: How to Set Up SSH Key-Based Authentication for IPv4 Tunnel Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH key generation (`ssh-keygen`)
- OpenSSH `authorized_keys` restrictions
- OpenSSH client configuration (`ssh_config`)
- SSH local port forwarding
- autossh
- systemd service units
- IPv4-only SSH connections

## Sources Consulted
- OpenSSH `ssh-keygen(1)` manual: https://man.openbsd.org/ssh-keygen
- OpenSSH `sshd(8)` manual, `AUTHORIZED_KEYS FILE FORMAT`: https://man.openbsd.org/sshd#AUTHORIZED_KEYS_FILE_FORMAT
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- autossh project page: https://www.harding.motd.ca/autossh/
- autossh `autossh(1)` manual: https://manpages.debian.org/unstable/autossh/autossh.1.en.html
- systemd `systemd.service(5)` manual: https://www.freedesktop.org/software/systemd/man/254/systemd.service.html
- Local `systemd.syntax(7)` manual for unit-file line continuation syntax

## Issues Found
- **Invalid `authorized_keys` line wrapping**: The restricted key entry was shown across two physical lines with a trailing backslash. OpenSSH `authorized_keys` files require one key per line and do not use shell-style backslash continuation. This could leave the actual public key line unrestricted if copied literally. Fixed the example so the options and key are on a single line.
- **Forwarding destination was not scoped**: The original forced-command entry prevented shell access but did not restrict which destination the key could forward to. OpenSSH documents `permitopen="host:port"` for limiting `ssh -L` forwarding. Updated the entry to use `restrict,port-forwarding,permitopen="10.0.1.20:5432"` with the existing forced command.
- **`RequestTTY no` was described too broadly**: `RequestTTY no` prevents pseudo-tty allocation; it does not itself prevent remote shell or command execution. Added `SessionType none` to the client config and adjusted the comment.
- **autossh examples did not apply `ExitOnForwardFailure`**: The SSH config host included `ExitOnForwardFailure yes`, but the direct autossh examples used `tunneluser@203.0.113.10` rather than the configured host alias. Added `-o "ExitOnForwardFailure=yes"` to the direct autossh command and systemd service so autossh can retry when the forward cannot be established.

## Review Notes
- The `ssh-keygen -t ed25519 -f ... -N "" -C ...` command is valid for generating an Ed25519 key with an empty passphrase.
- `AddressFamily inet` is the correct OpenSSH client option for forcing IPv4 when connecting through the configured host alias.
- `ssh -fN` is valid for backgrounding SSH without executing a remote command; `-N` is appropriate for forwarding-only sessions.
- `autossh -M 0` is valid and disables autossh's monitor port; using OpenSSH `ServerAliveInterval` and `ServerAliveCountMax` is a documented way to make SSH exit when the connection becomes unresponsive.
- The systemd `ExecStart=` line continuation syntax is valid because systemd unit files concatenate lines ending in a backslash.
- `permitopen=` limits local `ssh -L` forwarding destinations. Environments that must also block remote `ssh -R` forwarding should enforce that separately in `sshd_config`, for example with a `Match` block and `AllowTcpForwarding local`.
