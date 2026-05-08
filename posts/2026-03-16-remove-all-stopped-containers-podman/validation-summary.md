# Validation Summary: How to Remove All Stopped Containers in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux shell commands
- xargs
- cron
- systemd user timers

## Sources Consulted
- Podman container prune official documentation: https://docs.podman.io/en/v5.0.2/markdown/podman-container-prune.1.html
- Podman ps official documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman system prune official documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman volume option official documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html

## Issues Found
- Clarified the `podman container prune` explanation. Official documentation defines it as removing all stopped containers; the post now describes `exited` and `created` as examples rather than the full exhaustive set.
- Added `--size` to the `podman ps` examples that display `{{.Size}}`, because Podman documents size display as enabled by the `--size` / `-s` flag.
- Corrected the `podman system prune --force` description. Official documentation says volumes are not pruned by default; volumes are included only when `--volumes` is used.

## Review Notes
Podman was not installed in the local environment, so command verification was performed against the official Podman documentation rather than local `--help` output. The remaining commands and flags match the documented Podman CLI behavior.
