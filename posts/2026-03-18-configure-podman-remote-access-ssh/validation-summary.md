# Validation Summary: How to Configure Podman Remote Access over SSH

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman remote client and system connections
- Podman API service and systemd socket activation
- SSH key authentication
- OpenSSH client configuration and connection multiplexing
- systemd login lingering
- Bash shell scripting

## Sources Consulted
- Podman `podman-system-connection-add` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-add.1.html
- Podman `podman-remote` official documentation: https://docs.podman.io/en/stable/markdown/podman-remote.1.html
- Podman `podman` official documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman `podman-system-service` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- systemd `loginctl` official documentation: https://www.freedesktop.org/software/systemd/man/loginctl.html
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/OpenBSD-7.7/ssh_config.5
- OpenSSH `sshd(8)` manual for `authorized_keys` options: https://man.openbsd.org/OpenBSD-5.4/sshd.8

## Issues Found
- The introduction stated that Podman uses SSH as its transport layer for remote connections. Podman remote connections can use SSH, Unix sockets, or TCP, so this was changed to say that Podman can use SSH for remote connections.
- The SSH configuration section created a `Host podman-remote` entry, but the saved Podman connection URI used `remote-host`. Because OpenSSH applies host-specific settings by the host alias used in the command, Podman would not reliably use the multiplexing settings. The SSH config host and related test/troubleshooting commands were changed to `remote-host` to match the Podman connection URI.

## Review Notes
The examples assume a rootless Podman service using `/run/user/<uid>/podman/podman.sock`, which is consistent with Podman remote documentation when the SSH URL includes an explicit socket path. The `loginctl enable-linger` command may require appropriate local policy or administrative permissions on some distributions, but the command itself matches Podman's documented systemd socket setup.
