# Validation Summary: How to Configure System Connections for Podman Farm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman system connections
- Podman farm builds
- SSH
- systemd user and system sockets
- Bash scripting

## Sources Consulted
- Podman system connection add documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-add.1.html
- Podman system connection documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection.1.html
- Podman system connection remove documentation: https://docs.podman.io/en/stable/markdown/podman-system-connection-remove.1.html
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman farm build documentation: https://docs.podman.io/en/latest/markdown/podman-farm-build.1.html
- Podman global options / remote access documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman info documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html

## Issues Found
- The socket enablement example showed only the rootless `systemctl --user enable --now podman.socket` command after listing both rootless and rootful socket paths. Added the correct rootful `sudo systemctl enable --now podman.socket` command so the rootful path is actionable.
- The `podman system connection list` example omitted the current `ReadWrite` column shown by current Podman documentation. Updated the example output to include `ReadWrite`.
- The batch script set `SSH_KEY="~/.ssh/podman_farm"`. Because `~` does not expand inside quotes in shell variable assignments, Podman would receive a literal tilde path. Changed it to `SSH_KEY="$HOME/.ssh/podman_farm"`.
- The summary stated that every connection needs an SSH identity file. Podman can prompt for a password or use `ssh-agent`, so an explicit identity file is optional. Updated the wording accordingly.

## Review Notes
The post is technically valid after the fixes. The hard-coded `/run/user/1000/podman/podman.sock` path in examples is accurate for a rootless user whose UID is 1000, but future improvements could mention adjusting it when the remote builder user has a different UID.
