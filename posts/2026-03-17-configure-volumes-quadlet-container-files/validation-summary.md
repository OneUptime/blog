# Validation Summary: How to Configure Volumes in Quadlet Container Files

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Container volume mounts
- Podman named volumes
- SELinux volume labels
- tmpfs mounts

## Sources Consulted
- Podman `podman-container.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman `podman-volume.unit(5)` documentation: https://docs.podman.io/en/latest/markdown/podman-volume.unit.5.html
- Podman Quadlet basic usage documentation: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- Podman `podman-run(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html

## Issues Found
- The verification command inspected `webapp`, but current Quadlet defaults name a container `systemd-$name` unless `ContainerName=` is set. Changed the command to inspect `systemd-webapp`, matching the default container name generated from `webapp.container`.

## Review Notes
The `Volume=`, `.volume` reference, `Tmpfs=`, `PublishPort=`, `Environment=`, and systemd user commands are consistent with current Podman Quadlet documentation. The `.volume` examples rely on Quadlet's default `systemd-` prefix for the actual Podman volume name, while references such as `dbdata.volume:/path` correctly point to the corresponding Quadlet volume unit.
