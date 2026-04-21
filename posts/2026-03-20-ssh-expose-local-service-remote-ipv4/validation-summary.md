# Validation Summary: How to Expose a Local Service to a Remote IPv4 Network via SSH

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH client
- SSH remote port forwarding
- OpenSSH client configuration (`ssh_config`)
- OpenSSH server configuration (`sshd_config`)
- `GatewayPorts`
- `autossh`
- Debian/Ubuntu `apt`

## Sources Consulted
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- Debian `autossh(1)` manual: https://manpages.debian.org/bookworm/autossh/autossh.1.en.html
- Debian `apt(8)` manual: https://manpages.debian.org/bookworm/apt/apt.8.en.html

## Issues Found
- The basic `ssh -R 8080:localhost:3000` example was followed by a claim that anyone connecting to `203.0.113.10:8080` would be forwarded. OpenSSH binds remote TCP listening sockets to loopback by default, so I changed the explanation to say that `localhost:8080` on the remote server is forwarded, and that external clients require a non-loopback bind.
- The specific IPv4 bind example said it required `GatewayPorts yes`. OpenSSH `sshd_config(5)` documents `GatewayPorts yes` as forcing wildcard binds, while `GatewayPorts clientspecified` allows the client to select the bind address. I changed the example and server configuration to `GatewayPorts clientspecified`.
- The multiple-port forwarding command used trailing backslashes followed by spaces and inline comments. In Bash, that does not continue the command correctly and causes subsequent `-R` lines to be executed as separate commands. I moved the comments above the command and left clean line-continuation backslashes.

## Review Notes
- `GatewayPorts yes` is still valid when the desired behavior is a wildcard bind, but it is not the precise setting for binding to one specific IPv4 address requested by the SSH client.
- OpenSSH command and configuration syntax was checked with the local OpenSSH client (`ssh -G`) and the installed OpenSSH 9.6p1 man pages. `autossh` was not installed locally, so its options were validated against the Debian package man page.
- The author GitHub link redirects to the canonical `github.com/nawazdhandala` URL and returned HTTP 200.
