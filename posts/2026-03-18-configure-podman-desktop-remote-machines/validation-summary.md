# Validation Summary: How to Configure Podman Desktop with Remote Machines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Desktop
- Podman remote client connections
- SSH
- systemd user sockets
- Container image build, save, and load workflows

## Sources Consulted
- Podman Desktop remote access documentation: https://podman-desktop.io/docs/podman/podman-remote
- Podman `podman-system-connection-add` documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-add.1.html
- Podman `podman-system-connection-list` documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-list.1.html
- Podman `podman-system-connection-default` documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-default.1.html
- Podman `podman-system-connection-remove` documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-remove.1.html
- Podman `podman-system-service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman-remote` documentation: https://docs.podman.io/en/stable/markdown/podman-remote.1.html
- Podman `podman-build` documentation: https://docs.podman.io/en/latest/markdown/podman-build.1.html
- Podman `podman-load` documentation: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman `podman-save` documentation: https://docs.podman.io/en/v4.4/markdown/podman-save.1.html

## Issues Found
- The sample connection-list output used a non-root SSH user with the rootful socket path `/run/podman/podman.sock` and an RSA-style identity. Updated it to use the rootless socket path `/run/user/1000/podman/podman.sock` and an ed25519 identity, matching the rest of the article and current Podman Desktop guidance.
- The Podman Desktop section implied a generic UI flow for adding SSH connection details directly. Current Podman Desktop documentation describes loading remote SSH connections from `podman system connection list`, so the steps were corrected to enable remote system connections and verify the saved CLI connection.
- The troubleshooting section suggested checking for a Podman TCP listener with `ss -tlnp | grep podman`, but the article's workflow uses SSH to a Unix socket. Replaced it with a direct SSH reachability check.

## Review Notes
Most CLI examples are consistent with current Podman documentation. The article intentionally uses a numeric `/run/user/1000/...` socket path; that is valid as an example, but users with a different UID should substitute the socket path reported by the remote host.
