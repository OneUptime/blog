# Validation Summary: How to Configure Auto-Update for Specific Containers Only in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Quadlet systemd units
- Podman auto-update
- systemd user services

## Sources Consulted
- Podman `podman-auto-update(1)` official documentation: https://docs.podman.io/en/stable/markdown/podman-auto-update.1.html
- Podman `podman-systemd.unit(5)` official documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-inspect(1)` official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html

## Issues Found
- The examples used `podman inspect frontend` and `podman inspect database`, but Quadlet names generated containers with a `systemd-` prefix by default unless `ContainerName=` is set. Added explicit `ContainerName=frontend`, `ContainerName=database`, and `ContainerName=api` so the later inspect commands target the containers shown in the examples.
- The database example used `Volume=pgdata.volume:/var/lib/postgresql/data`, which is a Quadlet `.volume` unit reference and implies a corresponding `pgdata.volume` file. Changed it to `Volume=pgdata:/var/lib/postgresql/data` so the standalone container example uses a regular named volume.

## Review Notes
The main auto-update behavior is correct: Podman auto-update is opt-in via the `io.containers.autoupdate` label or Quadlet `AutoUpdate=` field, and `podman auto-update --dry-run` is the documented way to check update availability without pulling images or restarting services. The `registry` policy requires fully qualified image references, which the examples use.
