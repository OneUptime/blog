# Validation Summary: How to View Auto-Update Status and Logs in Podman

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman auto-update
- systemd user services and timers
- journalctl
- Bash
- Python JSON parsing

## Sources Consulted
- Podman official documentation: podman-auto-update(1), https://docs.podman.io/en/v5.8.0/markdown/podman-auto-update.1.html
- Podman official documentation: podman-systemd.unit(5), https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman official documentation: podman-container-inspect(1), https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman source: auto-update CLI output struct and JSON formatting, https://github.com/containers/podman/blob/main/cmd/podman/auto-update.go
- systemd journalctl help/man page, https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local systemd command help for systemctl and journalctl syntax.

## Issues Found
- The JSON parsing example said "Parse with jq" but used a Python one-liner. Changed the comment to "Parse with Python" so the description matches the command.
- The `true` status description said it "Was updated in the last run", which can be read as applying to the `--dry-run` check shown above it. Changed it to "Updated during a real auto-update run" to match Podman's documented `UPDATED` values.

## Review Notes
The commands are written for rootless/user systemd units using `--user`. Rootful deployments would use the corresponding system-level `systemctl` and `journalctl` invocations instead.
