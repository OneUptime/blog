# Validation Summary: How to Configure Auto-Update in Quadlet

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Quadlet / podman-systemd.unit
- systemd user services and timers
- Container health checks

## Sources Consulted
- Podman `podman-auto-update` documentation: https://docs.podman.io/en/v5.8.0/markdown/podman-auto-update.1.html
- Podman `podman-systemd.unit` / Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html

## Issues Found
- The auto-update policy table described updates as simply finding a "newer" digest/image. Podman documents this as a digest comparison: `registry` compares the local image digest with the remote registry digest, and `local` compares the container image digest with the digest in local container storage. Updated the wording to match Podman's documented behavior.
- The registry policy explanation said it compares the running container's image digest with the registry. Updated it to say it compares the local image digest with the registry.
- The health-check section described "safe rolling updates." Podman auto-update restarts systemd units and can roll back on failed restarts; it does not by itself implement rolling updates. Updated the wording to "safer updates."
- The verification command used `podman inspect webapp`, but a `webapp.container` Quadlet creates a Podman container named `systemd-webapp` by default unless `ContainerName=` is set. Updated the command to inspect `systemd-webapp`.

## Review Notes
The examples use fully qualified image references for `registry` auto-update, which is required by Podman. The `podman auto-update --dry-run`, timer, `AutoUpdate=registry`, `AutoUpdate=local`, `PublishPort`, health-check, and `Notify=healthy` examples match current Podman documentation.
