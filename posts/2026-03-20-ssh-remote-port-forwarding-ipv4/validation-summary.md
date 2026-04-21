# Validation Summary: How to Set Up SSH Remote Port Forwarding Over IPv4 (-R)

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenSSH `ssh` remote port forwarding (`-R`)
- OpenSSH `sshd_config` `GatewayPorts`
- OpenSSH `ssh_config` `RemoteForward`, `AddressFamily`, and keepalive options
- IPv4 TCP port binding and loopback/wildcard addresses
- Bash shell command line continuations

## Sources Consulted
- OpenBSD/OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenBSD/OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config.5
- OpenBSD/OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config.5
- GNU Bash Reference Manual, Escape Character: https://www.gnu.org/software/bash/manual/html_node/Escape-Character.html
- Local OpenSSH client check: `ssh -V` reported OpenSSH_9.6p1
- Local GNU Bash check: `bash --version` reported GNU bash 5.2.21

## Issues Found
- The basic diagram labeled the connecting host as `External Client`, which implied the default remote forward is externally reachable. OpenSSH binds remote forwards to loopback by default, so I changed the label to `Remote-side Client`.
- The default bind explanation said the remote port binds only to `127.0.0.1`. OpenSSH documents the default as loopback-only; for IPv4 that is `127.0.0.1`, so I clarified the wording.
- The specific IPv4 bind example said it required `GatewayPorts yes`. OpenSSH documents `GatewayPorts yes` as forcing wildcard binds and `GatewayPorts clientspecified` as allowing the client to select the bind address, so I changed the example and conclusion to use `clientspecified` for a specific IPv4 address and `yes` for wildcard binds.
- The multi-line `ssh -R` example placed comments after line-continuation backslashes. In Bash, a backslash must be paired with the newline for line continuation, so I removed those inline comments and left the command executable.

## Review Notes
The example IP `203.0.113.10` is from documentation address space and is appropriate as a placeholder. On some Linux distributions, the OpenSSH server systemd unit is named `ssh` rather than `sshd`, so the restart command may need distro-specific adjustment.
