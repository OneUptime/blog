# How to Configure Auto-Update in Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Auto-Update

Description: Learn how to enable Podman auto-update for containers managed by Quadlet so they automatically pull and deploy new images.

---

> Keep your Quadlet containers up to date by enabling Podman's auto-update feature, which checks for new images and restarts containers with the latest version.

Podman's auto-update feature works with Quadlet to automatically update containers when new images are pushed to the registry. By adding the `AutoUpdate` directive to your Quadlet file, you opt in to automatic image updates managed by a systemd timer.

---

## Enabling Auto-Update in a Quadlet File

```ini
# ~/.config/containers/systemd/webapp.container

[Unit]
Description=Web application with auto-update

[Container]
Image=docker.io/myorg/webapp:latest
PublishPort=8080:80

# Enable registry-based auto-update
AutoUpdate=registry

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Auto-Update Policies

| Policy | Behavior |
|--------|----------|
| `registry` | Checks if the registry image digest differs from the local image digest |
| `local` | Checks if the image digest in local storage differs from the container's image |

## Registry-Based Auto-Update

The `registry` policy compares the local image digest with the registry:

```ini
[Container]
Image=docker.io/myorg/webapp:latest
# Check registry for newer images
AutoUpdate=registry
```

## Local-Based Auto-Update

The `local` policy checks if the local image has been updated (e.g., by `podman pull` or a build):

```ini
[Container]
Image=localhost/myapp:latest
# Check local storage for newer images
AutoUpdate=local
```

## Enabling the Auto-Update Timer

Podman includes a systemd timer that runs `podman auto-update` periodically:

```bash
# Enable the auto-update timer for rootless
systemctl --user enable --now podman-auto-update.timer

# Check the timer status
systemctl --user status podman-auto-update.timer

# View when the next check will run
systemctl --user list-timers podman-auto-update.timer
```

## Running Auto-Update Manually

```bash
# Check for updates without applying them
podman auto-update --dry-run

# Apply available updates
podman auto-update
```

## Auto-Update with Health Checks

Combine auto-update with health checks for safer updates:

```ini
# ~/.config/containers/systemd/webapp.container
[Unit]
Description=Web app with auto-update and health check

[Container]
Image=docker.io/myorg/webapp:latest
AutoUpdate=registry
HealthCmd=curl -f http://localhost:80/ || exit 1
HealthInterval=15s
HealthRetries=3
HealthStartPeriod=30s
Notify=healthy
PublishPort=8080:80

[Service]
Restart=on-failure
Type=notify

[Install]
WantedBy=default.target
```

## Verify Auto-Update Configuration

```bash
# Reload and start
systemctl --user daemon-reload
systemctl --user start webapp.service

# Check auto-update label on the container
podman inspect systemd-webapp --format '{{index .Config.Labels "io.containers.autoupdate"}}'

# Dry run to see what would be updated
podman auto-update --dry-run
```

## Summary

Quadlet's `AutoUpdate` directive enables automatic image updates for your containers. Use `registry` to check remote registries or `local` to check local storage. Enable the `podman-auto-update.timer` to run checks periodically, and combine with health checks for safer updates that roll back if the new image fails.
