# Validation Summary: How to Use journald Events Logger with Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- systemd journal (`journald`)
- `journalctl`
- `containers.conf`
- Bash

## Sources Consulted
- Podman `podman-events` documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman `podman-info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- `containers.conf` official source documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- systemd `journalctl` documentation: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd `journald.conf` documentation: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd `systemd-journald.service` documentation: https://www.freedesktop.org/software/systemd/man/systemd-journald.service.html

## Issues Found
- The post stated that `journald` is the default on most Linux distributions with systemd. I changed this to say the default depends on the platform and should be verified with `podman info`, which matches `containers.conf(5)`.
- The `journalctl` field-filter example used `PODMAN_EVENT=die`. I changed it to `PODMAN_EVENT=died` because Podman documents `died` as the journal field value; `die` is only mapped to `died` for Docker-compatible `podman events --filter` usage.
- The `journalctl --user` examples were missing the systemd caveat that user-journal queries require persistent user journals. I added that note to keep the rootless examples accurate.
- The storage and retention section incorrectly treated `journald.conf` as a per-user config under `~/.config/systemd/...` and used `systemctl --user` against `systemd-journald`. I corrected this to system-wide `journald` configuration under `/etc/systemd/journald.conf` and `/etc/systemd/journald.conf.d/*.conf`, with a drop-in example and service restart.
- The troubleshooting section used `systemctl --user status systemd-journald` and `journalctl --user -t podman --verify`, which do not match how `systemd-journald` and `journalctl --verify` work. I corrected those commands and replaced the final backend check with `podman info --format '{{.Host.EventLogger}}'`.

## Review Notes
- Validated against current Podman and systemd documentation as of 2026-05-07.
- Podman is not installed in this workspace, so Podman-specific commands were verified against official documentation rather than executed locally.
