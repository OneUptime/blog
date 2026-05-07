# Validation Summary: How to Configure the Podman System Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman REST API
- Docker-compatible API tooling
- systemd socket activation
- Unix sockets
- TCP and mutual TLS

## Sources Consulted
- Podman official documentation: `podman-system-service(1)` - https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman official API reference - https://docs.podman.io/en/latest/_static/api.html
- systemd official documentation: `systemd.socket(5)` - https://www.freedesktop.org/software/systemd/man/systemd.socket.html
- systemd official documentation: `systemd.service(5)` - https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The rootless socket examples hard-coded `/run/user/$(id -u)`. Podman's official documentation defines the rootless default as `$XDG_RUNTIME_DIR/podman/podman.sock`, so the examples were updated to use `$XDG_RUNTIME_DIR`.
- The systemd section enabled the user socket but did not mention linger for availability after reboot without an interactive login. Added `loginctl enable-linger "$USER"`, matching the official Podman example.
- The TCP/TLS example said to use TLS but started the service without any TLS flags. Updated the command to include `--tls-cert`, `--tls-key`, and `--tls-client-ca`, which are the documented Podman options for mutual TLS.
- The Docker compatibility section described setting `DOCKER_HOST` as creating a symlink. Updated the wording because it sets an environment variable and does not create a filesystem symlink.
- The rootful socket permission example used one-time `chown` and `chmod` commands against the socket file. Replaced them with a systemd socket drop-in using `SocketMode`, `SocketUser`, and `SocketGroup`, so the settings are applied when systemd creates the socket.

## Review Notes
The post is technically relevant and the remaining commands align with the current Podman and systemd documentation. Podman's API service grants full access as the user running the service, so TCP exposure should remain limited to carefully controlled environments with mutual TLS or SSH forwarding.
