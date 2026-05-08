# How to Enable Auto-Updates for a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Auto-Update, Image Management

Description: Learn how to enable automatic image updates for Podman containers so they always run the latest version of their image.

---

> Keep your Podman containers running the latest images by enabling auto-update with a simple label and a systemd timer.

Podman auto-update checks whether a container's image has been updated in the registry and, if so, pulls the new image and restarts the container. This keeps your services current without manual intervention.

---

## Prerequisites

Auto-update works with containers that:
1. Are managed by systemd (Quadlet or generated unit files)
2. Use a fully-qualified image name (e.g., `docker.io/library/nginx:latest`)
3. Have the `io.containers.autoupdate` label set, or use the `AutoUpdate` directive in a Quadlet file

## Enable Auto-Update with Quadlet

The simplest way is to use the `AutoUpdate` directive in a Quadlet file:

```ini
# ~/.config/containers/systemd/webapp.container

[Unit]
Description=Web application with auto-update

[Container]
Image=docker.io/myorg/webapp:latest
PublishPort=8080:80
# Enable auto-update
AutoUpdate=registry

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Enable Auto-Update with podman run

When creating a container manually before generating a systemd unit for it, add the label:

```bash
podman run -d \
  --name webapp \
  --label io.containers.autoupdate=registry \
  -p 8080:80 \
  docker.io/myorg/webapp:latest
```

The labeled container still needs to be run by a systemd unit that creates a new container on restart, such as a unit generated with `podman generate systemd --new`. A label alone is not enough for auto-update.

## Start the Auto-Update Timer

Enable the systemd timer that periodically checks for updates:

```bash
# Enable the timer for rootless containers
systemctl --user enable --now podman-auto-update.timer

# Verify the timer is active
systemctl --user list-timers podman-auto-update.timer
```

## Test Auto-Update

```bash
# Check what would be updated without applying changes
podman auto-update --dry-run

# Apply updates manually
podman auto-update
```

Example output:

```text
UNIT                    CONTAINER       IMAGE                              POLICY      UPDATED
webapp.service          abc123def456    docker.io/myorg/webapp:latest      registry    true
```

## Verify the Update

```bash
# Check the running image digest
podman inspect webapp --format '{{.Image}}'

# Check when the container was last started
podman inspect webapp --format '{{.State.StartedAt}}'

# View update logs
journalctl --user -u podman-auto-update.service --since "1 hour ago"
```

## Important Notes

- Always use mutable tags like `latest` or `stable` that get updated in the registry.
- Pinned digests (e.g., `nginx@sha256:abc123`) will never trigger an auto-update.
- The container must be running when auto-update checks occur.

## Summary

Enabling auto-update for Podman containers requires three things: a fully-qualified image reference, the `AutoUpdate=registry` directive (or the equivalent label), and the `podman-auto-update.timer` enabled. Use `--dry-run` to preview updates and check `journalctl` for update history.
