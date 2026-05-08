# Validation Summary: How to Run Podman Containers as systemd Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Quadlet
- systemd user and system services
- Linux container service management
- journalctl

## Sources Consulted
- Podman documentation: podman-systemd.unit / Quadlet, https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman documentation: podman-generate-systemd, https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- systemd loginctl documentation, https://www.freedesktop.org/software/systemd/man/loginctl.html
- Local systemd CLI version check with `systemctl --version`

## Issues Found
- Quadlet services were activated with `systemctl enable --now`, but Podman documents Quadlet-generated services as transient units that cannot be enabled with `systemctl enable`; the generator applies the `[Install]` section during generation. Changed the Quadlet activation examples to use `systemctl start` after `daemon-reload`.
- The Quadlet example later used `podman logs myapp`, but Quadlet defaults the container name to `systemd-myapp`. Added `ContainerName=myapp` so the later Podman commands match the example container name.
- The generated unit file example wrote into `~/.config/systemd/user/` without creating that directory first. Added `mkdir -p ~/.config/systemd/user/`.
- The post presented `podman generate systemd` as a current alternative without noting its deprecation. Updated the generated-unit wording and summary to identify it as a legacy conversion path and recommend Quadlet for new deployments.
- The post claimed automatic boot startup for rootless user services without mentioning lingering. Added the documented `loginctl enable-linger "$USER"` command for boot startup without an active login session.

## Review Notes
The examples are version-sensitive because Quadlet behavior has evolved across Podman releases. Current Podman documentation recommends Quadlet and marks `podman generate systemd` deprecated, though the command is not currently planned for removal.
