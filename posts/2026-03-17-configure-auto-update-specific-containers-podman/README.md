# How to Configure Auto-Update for Specific Containers Only in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Auto-Update, Selective Updates

Description: Learn how to enable auto-update for only specific Podman containers while keeping others on fixed versions.

---

> Selectively enable auto-update for specific containers by applying the auto-update label only to services that should receive automatic image updates.

Not every container should auto-update. Database containers might need careful version management, while web frontends can safely update automatically. Podman auto-update only affects containers with the explicit auto-update label.

---

## How Selective Auto-Update Works

Podman auto-update only checks containers that have the `io.containers.autoupdate` label (set via the `AutoUpdate` Quadlet directive). Containers without this label are ignored.

## Enable Auto-Update on Specific Containers

```ini
# ~/.config/containers/systemd/frontend.container

[Unit]
Description=Frontend - auto-updates enabled

[Container]
Image=docker.io/myorg/frontend:latest
ContainerName=frontend
PublishPort=8080:80
# This container will auto-update
AutoUpdate=registry

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/database.container
[Unit]
Description=Database - no auto-update

[Container]
Image=docker.io/library/postgres:16
ContainerName=database
Volume=pgdata:/var/lib/postgresql/data
Environment=POSTGRES_PASSWORD=secret
# No AutoUpdate directive - this container stays on its current image

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

```ini
# ~/.config/containers/systemd/api.container
[Unit]
Description=API - auto-updates enabled

[Container]
Image=docker.io/myorg/api:latest
ContainerName=api
PublishPort=3000:3000
# This container will auto-update
AutoUpdate=registry

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Verify Which Containers Are Configured

```bash
# Check auto-update status - only labeled containers appear
podman auto-update --dry-run

# Expected output shows only frontend and api:
# UNIT               CONTAINER   IMAGE                              POLICY      UPDATED
# frontend.service   abc123      docker.io/myorg/frontend:latest    registry    false
# api.service        def456      docker.io/myorg/api:latest         registry    false
# (database.service is not listed - it has no auto-update label)
```

## Check a Container's Auto-Update Label

```bash
# Check if a container has the auto-update label
podman inspect frontend --format '{{index .Config.Labels "io.containers.autoupdate"}}'
# Output: registry

podman inspect database --format '{{index .Config.Labels "io.containers.autoupdate"}}'
# Output: (empty - no label)
```

## Disable Auto-Update for a Container

Remove the `AutoUpdate` directive from the Quadlet file:

```ini
# Before: auto-update enabled
[Container]
Image=docker.io/myorg/api:latest
AutoUpdate=registry

# After: auto-update disabled
[Container]
Image=docker.io/myorg/api:latest
# AutoUpdate line removed
```

Then reload:

```bash
systemctl --user daemon-reload
systemctl --user restart api.service
```

## Strategy for Selective Updates

A common pattern:

| Service | Auto-Update | Reason |
|---------|------------|--------|
| Frontend | Yes | Low risk, easy to roll back |
| API | Yes | Frequently deployed |
| Database | No | Requires migration planning |
| Redis | No | Cache can be rebuilt but avoid surprise restarts |

## Summary

Podman auto-update is opt-in per container. Only containers with the `AutoUpdate` directive (or `io.containers.autoupdate` label) are checked and updated. Leave critical services like databases without the label to manage their updates manually, while enabling auto-update for services that benefit from automatic deployments.
