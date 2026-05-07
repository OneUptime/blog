# Validation Summary: How to Run Radarr in a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Radarr
- Podman
- Podman networking
- Podman volume mounts and SELinux labels
- LinuxServer.io Radarr container image
- systemd
- Quadlet
- Download clients and indexers for media automation

## Sources Consulted
- LinuxServer.io Radarr image documentation: https://docs.linuxserver.io/images/docker-radarr/
- Podman `podman run` restart policy documentation: https://docs.podman.io/en/v4.6.1/markdown/options/restart.html
- Podman `podman run` volume labeling documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman generate systemd` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Servarr Radarr Quick Start Guide: https://wiki.servarr.com/radarr/quick-start-guide
- Servarr Radarr Settings documentation: https://wiki.servarr.com/radarr/settings
- Servarr Docker Guide: https://wiki.servarr.com/docker-guide

## Issues Found
- The container image used `docker.io/linuxserver/radarr:latest`. LinuxServer.io's current Radarr documentation uses `lscr.io/linuxserver/radarr:latest`, so all run, pull, and Quadlet examples were updated to the documented registry.
- The movie and downloads mounts used the private SELinux relabel suffix `:Z`. Because those paths are intended to be shared with download clients and media-server containers, they were changed to `:z`, which Podman documents as the shared volume label. The Radarr-only config directory remains `:Z`.
- The Quadlet section said one file path worked for rootless or root while using `%h`. This was clarified so `%h` is presented for rootless services, while root services should use absolute host paths.
- The Quadlet commands included `systemctl --user enable radarr.service`. Podman documents generated Quadlet services as transient and applies boot enablement from the `[Install]` section during generator reload, so the explicit `enable` command was removed.

## Review Notes
- Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than local `--help` output.
- `podman generate systemd` is correctly described as deprecated, and Quadlet is the appropriate recommended approach.
- The guide's Radarr setup flow, root folder path, indexer/download-client concepts, quality profile notes, and completed-download troubleshooting align with Servarr documentation.
