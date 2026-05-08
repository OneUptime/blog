# Validation Summary: How to Configure Container Readiness Notifications with systemd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet `.container` units
- systemd service units
- systemd dependency ordering
- Container health checks
- PostgreSQL, Redis, MySQL, and HTTP readiness checks

## Sources Consulted
- Podman Quadlet manual: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman run manual: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.unit manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- Local systemd 255 man pages for `systemd.service` and `systemd.unit`

## Issues Found
- The original examples used `Network=appnet.network` and `Volume=pgdata.volume` without providing corresponding `appnet.network` and `pgdata.volume` Quadlet files. Podman Quadlet treats names ending in `.network` and `.volume` as references to separate Quadlet units, and those files must exist. I changed the examples to ordinary Podman resource names, `Network=appnet` and `Volume=pgdata:/var/lib/postgresql/data`, so the shown `.container` examples are self-contained apart from the expected pre-created custom network.
- The dependent service example relied on container-name DNS but did not explicitly state that both containers need to share the same user-defined network. I added a short note before the web app configuration to make that requirement explicit.

## Review Notes
- `Notify=healthy` is current in Podman Quadlet and correctly delays the systemd startup notification until the Podman health check marks the container healthy.
- Quadlet sets `Type=notify` by default for `.container` units, so the explicit `Type=notify` line is valid but not strictly required.
- `After=` controls ordering and `Requires=` pulls in/fails with the dependency as described. For Quadlet-to-Quadlet dependencies, referencing the generated `database.service` is acceptable here because the generated service name for `database.container` is `database.service`; using `database.container` would also let Quadlet translate the dependency.
- Podman was not installed in the local environment, so validation used official documentation and the installed systemd man pages rather than running a Quadlet dry run.
