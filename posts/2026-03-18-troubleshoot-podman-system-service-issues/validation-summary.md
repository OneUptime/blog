# Validation Summary: How to Troubleshoot Podman System Service Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Podman REST API
- systemd user and system services
- Linux rootless containers
- Linux storage and permissions
- curl and Unix sockets

## Sources Consulted
- Podman `podman-system-service` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman-system` official documentation: https://docs.podman.io/en/latest/markdown/podman-system.1.html
- Podman `podman-system-check` official documentation: https://docs.podman.io/en/stable/markdown/podman-system-check.1.html
- Podman `podman-system-migrate` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-migrate.1.html
- Podman `podman-system-reset` official documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-system-reset.1.html
- Podman `podman-system-prune` official documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman global options and rootless mode official documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman `podman-info` official documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman REST API documentation for `_ping`: https://docs.podman.io/en/latest/_static/api.html
- systemd `loginctl` manual for lingering and `show-user`: https://www.freedesktop.org/software/systemd/man/latest/loginctl.html

## Issues Found
- The manual service command used `podman system service --time 5 --log-level debug`. Podman documents `--log-level` as a root-level flag that must be specified before the subcommand, so this was changed to `podman --log-level debug system service --time 5`.
- The debugging section used `--log-level trace`, but Podman's documented log levels are `debug`, `info`, `warn`, `error`, `fatal`, and `panic`. This was changed to `--log-level debug`, and the comment was updated accordingly.
- The API ping examples used `/v4.0.0/libpod/_ping`. Podman's API documentation states that `_ping` endpoints are not versioned, so the curl examples were changed to `/libpod/_ping`.

## Review Notes
- `podman system check` is current in recent Podman releases, but older Podman installations may not include it.
- `podman system reset --force` is technically correct but destructive; the post already presents it as a fallback after migration.
