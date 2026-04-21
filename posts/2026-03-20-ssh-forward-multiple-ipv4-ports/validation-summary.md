# Validation Summary: How to Forward Multiple IPv4 Ports Through a Single SSH Connection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH client (`ssh`)
- SSH local and remote port forwarding
- OpenSSH client configuration (`~/.ssh/config`)
- ControlMaster connection multiplexing
- autossh
- Bash scripting

## Sources Consulted
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config.5
- GNU Bash Reference Manual, Escape Character: https://www.gnu.org/software/bash/manual/html_node/Escape-Character.html
- autossh(1) man page: https://manpages.debian.org/bullseye/autossh/autossh.1.en.html

## Issues Found
- The first multi-line `ssh` example said "Forward 3 ports" while defining four forwards. Changed it to "Forward 4 ports".
- The command examples placed comments after trailing backslashes. Bash only treats a backslash immediately followed by a newline as a continuation, so those snippets would break. Removed the inline comments from continued command lines.
- The ControlMaster examples used separate `ssh -fN ... -S ...` invocations to add forwards. Replaced them with `ssh -O forward ... -S ...`, the documented OpenSSH control command for requesting forwardings from an active multiplexing master without executing a remote command.
- The autossh startup script did not set `ExitOnForwardFailure yes`. Added it so autossh only treats setup as successful when all requested forwards are established.

## Review Notes
- The revised bash snippets parse with `bash -n`, and the `~/.ssh/config` examples parse with `ssh -G`.
- The `ss -tlnp` check is Linux-specific; it is valid for a Linux script but would need an alternative on macOS/BSD.
- Remote forwarding without an explicit remote bind address uses the server-side default loopback binding unless overridden by SSH server configuration; exposing it beyond the remote host would require a bind address and compatible `GatewayPorts` settings.
