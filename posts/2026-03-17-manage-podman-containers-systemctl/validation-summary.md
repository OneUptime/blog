# Validation Summary: How to Manage Podman Containers with systemctl

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman Quadlet
- systemd
- systemctl
- journalctl

## Sources Consulted
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman Quadlet basic usage documentation: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- Podman generate systemd documentation: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- systemctl local man page and `systemctl --help`
- journalctl local man page and `journalctl --help`
- systemd.unit local man page

## Issues Found
- The introduction mentioned generated units without noting that `podman generate systemd` is deprecated in current Podman documentation. I added a short clarification that Quadlet is recommended for new Podman systemd services and generated units remain supported for existing use.
- The enable/disable section implied `systemctl --user enable webapp.service` is generally the way to enable Quadlet services and described it as starting at boot. Current Podman Quadlet documentation says generated Quadlet services are transient and Quadlet applies `[Install]` information during generation, while generated unit files copied into the user unit path can be enabled with `systemctl --user enable`. I updated the comments and added a note explaining the Quadlet `[Install]` approach and the systemd user-service linger caveat.

## Review Notes
The listed `systemctl` lifecycle, status, inspection, daemon reload, and `journalctl` log filtering commands were verified against systemd help/man pages. `journalctl --user -u` is valid because `--user` converts `--unit` matches to user-unit matches.
