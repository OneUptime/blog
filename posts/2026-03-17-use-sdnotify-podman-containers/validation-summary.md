# Validation Summary: How to Use sdnotify with Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet `.container` units
- systemd service units
- sd_notify / NOTIFY_SOCKET
- Python Unix datagram sockets
- Container health checks

## Sources Consulted
- Podman `podman-systemd.unit(5)` / Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-create(1)` `--sdnotify` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- systemd `sd_notify(3)` documentation: https://www.freedesktop.org/software/systemd/man/latest/sd_notify.html
- Local `systemd.service(5)` manual for `Type=notify`, `READY=1`, `STATUS=`, and `WATCHDOG=1`

## Issues Found
- The post described the Podman `--sdnotify` default and the Quadlet `Notify=` default as if they were the same setting. I changed the wording to distinguish the CLI `--sdnotify` modes from Quadlet `Notify=`, where `Notify=` defaults to `false` and the runtime handles startup notification.
- The Python `NOTIFY_SOCKET` example only worked for filesystem Unix sockets. systemd may also provide Linux abstract namespace sockets using an `@` prefix, so I updated the example to translate `@` to the leading NUL byte Python expects.
- The status update snippet used `sock` without defining it in that snippet. I replaced it with a small `notify()` helper so the example is self-contained and handles the same socket address rules.

## Review Notes
- Podman documentation confirms `--sdnotify=healthy` requires a health check and sends readiness only after the container becomes healthy.
- `WATCHDOG=1` is valid sd_notify syntax, but it only has practical effect when the corresponding systemd service is configured for watchdog monitoring.
