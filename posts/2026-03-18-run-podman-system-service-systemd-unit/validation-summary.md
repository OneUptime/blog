# Validation Summary: How to Run podman system service as a systemd Unit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman system service
- Podman REST API
- systemd user and system units
- systemd socket activation
- journald
- loginctl lingering
- Bash and curl

## Sources Consulted
- Podman `podman-system-service` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman API reference for `GET /libpod/_ping`: https://docs.podman.io/en/latest/_static/api.html
- systemd `loginctl` official documentation: https://www.freedesktop.org/software/systemd/man/loginctl.html
- systemd `systemd.service` official documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd `systemd.socket` official documentation: https://www.freedesktop.org/software/systemd/man/systemd.socket.html
- systemd `systemd.unit` official documentation: https://www.freedesktop.org/software/systemd/man/systemd.unit.html
- systemd `systemd.exec` official documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html

## Issues Found
- The Podman health check examples used `http://localhost/v4.0.0/libpod/_ping`. Podman's API reference documents `_ping` endpoints as unversioned, so the examples were changed to `http://localhost/libpod/_ping`.
- The custom socket section said it defined a socket unit for a different socket path or TCP listener, but the provided example only configures a Unix socket path. The wording was changed to "different Unix socket path" to match the actual configuration and avoid implying an unsecured TCP listener setup.

## Review Notes
- The default Podman socket activation flow, rootless and rootful socket paths, `--time 0` behavior, systemd drop-in override syntax, journald commands, and lingering behavior were consistent with the official documentation.
- Podman's documentation warns that exposing the API over TCP grants broad access and should not be done without mutual TLS or equivalent protections. The post now avoids presenting a TCP listener example.
